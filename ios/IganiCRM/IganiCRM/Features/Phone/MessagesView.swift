import SwiftUI

/// Texts on your Igani number: one conversation per number, newest first.
struct ThreadsPane: View {
    @Binding var unread: Int
    @State private var state: Load<[SmsThread]> = .loading
    @State private var composing = false

    var body: some View {
        Group {
            switch state {
            case .loading: ScrollView { SkeletonRows(count: 7) }
            case .failed(let m): LoadFailed(message: m) { await load() }
            case .ready(let threads):
                if threads.isEmpty {
                    EmptyHint(icon: "message", title: "No texts yet", message: "Texts you send and get on your Igani number show up here.")
                } else {
                    List(threads) { t in
                        NavigationLink(value: CallRoute.thread(t.number, t.name)) { ThreadRow(thread: t) }
                            .listRowBackground(Theme.card)
                    }
                    .listStyle(.insetGrouped)
                    .scrollContentBackground(.hidden)
                }
            }
        }
        .overlay(alignment: .bottomTrailing) {
            Button { composing = true } label: {
                Image(systemName: "square.and.pencil").font(.title3.weight(.semibold)).foregroundStyle(Theme.bg)
                    .frame(width: 58, height: 58).background(Theme.accent, in: Circle())
                    .shadow(color: Theme.accent.opacity(0.4), radius: 14, y: 6)
            }
            .buttonStyle(ElasticStyle())
            .padding(20)
            .accessibilityLabel("New text")
        }
        .sheet(isPresented: $composing) { NewTextSheet() }
        .refreshable { await load() }
        .task {
            while !Task.isCancelled {
                await load()
                try? await Task.sleep(for: .seconds(20))
            }
        }
    }

    private func load() async {
        do {
            let t: [SmsThread] = try await API.shared.act("smsThreads") ?? []
            state = .ready(t)
            unread = t.reduce(0) { $0 + $1.unread }
        } catch {
            if state.value == nil { state = .failed(error.localizedDescription) }
        }
    }
}

struct ThreadRow: View {
    let thread: SmsThread
    var body: some View {
        HStack(spacing: 12) {
            ZStack(alignment: .topTrailing) {
                Avatar(name: thread.name ?? thread.display, size: 44)
                if thread.unread > 0 { Circle().fill(Theme.accent).frame(width: 12, height: 12).overlay(Circle().stroke(Theme.card, lineWidth: 2)) }
            }
            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(thread.name ?? thread.display).font(.subheadline.weight(thread.unread > 0 ? .bold : .semibold)).foregroundStyle(Theme.text).lineLimit(1)
                    Spacer()
                    Text(Fmt.relative(thread.last.at)).font(.caption).foregroundStyle(Theme.muted)
                }
                Text((thread.last.direction == "OUTBOUND" ? "You: " : "") + (thread.last.body.isEmpty && thread.last.media > 0 ? "📎 Photo" : thread.last.body))
                    .font(.subheadline).foregroundStyle(thread.unread > 0 ? Theme.text : Theme.muted).lineLimit(2)
            }
        }
        .padding(.vertical, 4)
    }
}

/// One conversation, with a composer. Polls for new messages while open.
struct ConversationView: View {
    let number: String
    let title: String?
    @Environment(Toasts.self) private var toasts
    @State private var convo: SmsConversation?
    @State private var failed: String?
    @State private var draft = ""
    @State private var sending = false
    @FocusState private var focused: Bool

    var body: some View {
        VStack(spacing: 0) {
            if let convo {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 6) {
                            ForEach(Array(convo.messages.enumerated()), id: \.element.id) { i, m in
                                let prev = i > 0 ? convo.messages[i - 1] : nil
                                if prev == nil || m.at.timeIntervalSince(prev!.at) > 3600 {
                                    Text(Fmt.day(m.at)).font(.caption2.weight(.semibold)).foregroundStyle(Theme.muted).padding(.top, 10)
                                }
                                Bubble(message: m)
                                    .id(m.id)
                                    .transition(.asymmetric(insertion: .move(edge: .bottom).combined(with: .opacity), removal: .opacity))
                            }
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                    }
                    .defaultScrollAnchor(.bottom)
                    .onChange(of: convo.messages.count) { _, _ in
                        if let last = convo.messages.last { withAnimation(.snappy) { proxy.scrollTo(last.id, anchor: .bottom) } }
                    }
                }
                if let blocked = convo.blocked {
                    Text(blocked).font(.footnote).foregroundStyle(Theme.muted).multilineTextAlignment(.center).padding()
                } else {
                    composer
                }
            } else if let failed {
                LoadFailed(message: failed) { await load() }
            } else {
                Spacer()
                ProgressView()
                Spacer()
            }
        }
        .screenBackground()
        .navigationTitle(convo?.name ?? title ?? convo?.display ?? number)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: 4) {
                    if let id = convo?.leadId { NavigationLink(value: Route.lead(id)) { Image(systemName: "person.crop.circle") } }
                    Button { Task { do { try await Phone.shared.call(number, leadId: convo?.leadId, name: convo?.name) } catch { toasts.show(error.localizedDescription, tone: .warn) } } } label: { Image(systemName: "phone") }
                }
            }
        }
        .task {
            while !Task.isCancelled {
                await load()
                try? await Task.sleep(for: .seconds(8))
            }
        }
    }

    private var composer: some View {
        HStack(alignment: .bottom, spacing: 10) {
            TextField("Text message", text: $draft, axis: .vertical)
                .lineLimit(1...6)
                .focused($focused)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Theme.line))
            Button { Task { await send() } } label: {
                Image(systemName: "arrow.up").font(.headline.weight(.bold)).foregroundStyle(Theme.bg)
                    .frame(width: 38, height: 38).background(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? Theme.muted : Theme.accent, in: Circle())
            }
            .buttonStyle(ElasticStyle())
            .disabled(sending || draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            .accessibilityLabel("Send")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial)
    }

    private func load() async {
        do {
            if let c: SmsConversation = try await API.shared.act("smsConversation", number) {
                withAnimation(.snappy) { convo = c }
            }
        } catch {
            if convo == nil { failed = error.localizedDescription }
        }
    }

    private func send() async {
        let body = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !body.isEmpty else { return }
        sending = true
        defer { sending = false }
        do {
            if let b: SmsBubble = try await API.shared.act("sendText", ["to": number, "body": body]) {
                draft = ""
                withAnimation(.snappy) { convo?.messages.append(b) }
                if b.status == "failed" { toasts.show(b.error ?? "The text wasn’t delivered.", tone: .warn) }
            }
        } catch {
            toasts.show(error.localizedDescription, tone: .warn)
        }
    }
}

struct Bubble: View {
    let message: SmsBubble
    var mine: Bool { message.direction == "OUTBOUND" }
    var body: some View {
        HStack {
            if mine { Spacer(minLength: 50) }
            VStack(alignment: mine ? .trailing : .leading, spacing: 3) {
                Text(message.body.isEmpty && message.media > 0 ? "📎 Photo (open on the website)" : message.body)
                    .font(.body)
                    .foregroundStyle(mine ? Color(hex: 0x062E6F) : Theme.text)
                    .padding(.horizontal, 13)
                    .padding(.vertical, 9)
                    .background(mine ? AnyShapeStyle(Theme.accent) : AnyShapeStyle(Theme.raised), in: RoundedRectangle(cornerRadius: 19, style: .continuous))
                    .textSelection(.enabled)
                if mine, message.status == "failed" || message.status == "undelivered" {
                    Label(message.error ?? "Not delivered", systemImage: "exclamationmark.circle.fill").font(.caption2).foregroundStyle(Theme.red)
                } else if mine, message.status == "delivered" {
                    Text("Delivered").font(.caption2).foregroundStyle(Theme.muted)
                }
            }
            if !mine { Spacer(minLength: 50) }
        }
    }
}

/// Text a contact (searched) or any number.
struct NewTextSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var results: [DialerContact] = []
    @State private var picked: (String, String?)?

    var body: some View {
        NavigationStack {
            Group {
                if let picked {
                    ConversationView(number: picked.0, title: picked.1)
                } else {
                    List {
                        if PhoneFmt.clean(query).filter(\.isNumber).count >= 7 {
                            Button { picked = (PhoneFmt.clean(query), nil) } label: { Label("Text \(query)", systemImage: "message") }.listRowBackground(Theme.card)
                        }
                        ForEach(results) { c in
                            Button { picked = (c.phone, c.name) } label: {
                                HStack(spacing: 12) {
                                    Avatar(name: c.name, size: 36)
                                    VStack(alignment: .leading) {
                                        Text(c.name).foregroundStyle(Theme.text)
                                        Text([c.company, c.display].compactMap { $0 }.joined(separator: " · ")).font(.caption).foregroundStyle(Theme.muted)
                                    }
                                }
                            }
                            .listRowBackground(Theme.card)
                        }
                    }
                    .scrollContentBackground(.hidden)
                    .background(Theme.bg)
                    .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Name, business or number")
                    .task(id: query) {
                        try? await Task.sleep(for: .milliseconds(250))
                        results = (try? await API.shared.act("searchDialerContacts", query) as [DialerContact]?) ?? []
                    }
                }
            }
            .navigationTitle(picked == nil ? "New text" : "")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
            .routes()
        }
    }
}

// MARK: - Call lists

/// Businesses to cold-call, list by list (the website's Call lists).
struct CallListsPane: View {
    @State private var state: Load<[DialerList]> = .loading
    var body: some View {
        Group {
            switch state {
            case .loading: ScrollView { SkeletonRows(count: 6) }
            case .failed(let m): LoadFailed(message: m) { await load() }
            case .ready(let lists):
                if lists.isEmpty {
                    EmptyHint(icon: "list.bullet.rectangle", title: "No call lists yet", message: "On the website, use Find businesses on the Leads page to put businesses on a call list.")
                } else {
                    List(lists) { l in
                        NavigationLink(value: CallRoute.list(l.id, l.name)) {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text(l.name).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text)
                                    Spacer()
                                    Text("\(l.toCall) to call").font(.caption.weight(.semibold)).foregroundStyle(l.toCall > 0 ? Theme.accent : Theme.muted)
                                }
                                ProgressView(value: Double(l.total - l.toCall), total: Double(max(1, l.total))).tint(Theme.green)
                                Text([l.owner, "\(l.total) businesses"].compactMap { $0 }.joined(separator: " · ")).font(.caption).foregroundStyle(Theme.muted)
                            }
                            .padding(.vertical, 4)
                        }
                        .listRowBackground(Theme.card)
                    }
                    .listStyle(.insetGrouped)
                    .scrollContentBackground(.hidden)
                }
            }
        }
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        do { state = .ready((try await API.shared.act("dialerCallLists") as [DialerList]?) ?? []) } catch { state = .failed(error.localizedDescription) }
    }
}

/// One list: who's left to call (call-backs first). Swipe to skip or mark.
struct ProspectsView: View {
    let listId: String
    let name: String
    @Environment(Toasts.self) private var toasts
    @State private var state: Load<ProspectPage> = .loading

    var body: some View {
        Group {
            switch state {
            case .loading: ScrollView { SkeletonRows(count: 8) }
            case .failed(let m): LoadFailed(message: m) { await load() }
            case .ready(let page):
                List {
                    Section {
                        HStack {
                            LiveStat(label: "To call", value: "\(page.prospects.count)", icon: "phone.arrow.up.right")
                            LiveStat(label: "Done", value: "\(page.done)", icon: "checkmark.circle", tint: Theme.green)
                        }
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets())
                    }
                    Section {
                        ForEach(page.prospects) { p in
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(p.name).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text)
                                    HStack(spacing: 6) {
                                        if p.status == "CALLBACK" { Tag(text: "Call back", tint: Color(hex: 0xF6A15B)) }
                                        if let c = p.category { Text(c).lineLimit(1) }
                                        if p.attempts > 0 { Text("· \(p.attempts) tr\(p.attempts == 1 ? "y" : "ies")") }
                                    }
                                    .font(.caption).foregroundStyle(Theme.muted)
                                    if let a = p.askFor { Text("Ask for \(a)").font(.caption.weight(.semibold)).foregroundStyle(Theme.accent) }
                                }
                                Spacer()
                                Button { Task { await call(p, p.phone) } } label: {
                                    Image(systemName: "phone.fill").foregroundStyle(.white).frame(width: 40, height: 40).background(Theme.green, in: Circle())
                                }
                                .buttonStyle(ElasticStyle())
                            }
                            .padding(.vertical, 4)
                            .listRowBackground(Theme.card)
                            .contextMenu {
                                ForEach(p.otherPhones, id: \.e164) { o in
                                    Button { Task { await call(p, o.e164) } } label: { Label("Call \(o.label ?? "other") \(o.display)", systemImage: "phone") }
                                }
                            }
                            .swipeActions(edge: .trailing) {
                                Button { Task { await mark(p, "NOT_INTERESTED") } } label: { Label("Not interested", systemImage: "hand.raised") }.tint(Theme.muted)
                                Button { Task { await mark(p, "BAD_NUMBER") } } label: { Label("Bad number", systemImage: "xmark.octagon") }.tint(Theme.red)
                            }
                            .swipeActions(edge: .leading) {
                                Button { Task { await mark(p, p.status == "CALLBACK" ? "TO_CALL" : "CALLBACK") } } label: { Label(p.status == "CALLBACK" ? "To call" : "Call back", systemImage: "arrow.uturn.backward") }.tint(Color(hex: 0xF6A15B))
                            }
                        }
                    } footer: {
                        Text("After a good call, pick “Interested” in the wrap-up and the business becomes your lead.")
                    }
                }
                .listStyle(.insetGrouped)
                .scrollContentBackground(.hidden)
            }
        }
        .screenBackground()
        .navigationTitle(name)
        .refreshable { await load() }
        .task { await load() }
        .onChange(of: Phone.shared.wrapUp == nil) { _, done in if done { Task { await load() } } }
    }

    private func load() async {
        do {
            if let p: ProspectPage = try await API.shared.act("dialerProspects", listId) { state = .ready(p) }
        } catch { state = .failed(error.localizedDescription) }
    }

    private func call(_ p: DialerProspect, _ number: String) async {
        do { try await Phone.shared.call(number, prospectId: p.id, name: p.name) } catch { toasts.show(error.localizedDescription, tone: .warn) }
    }

    private func mark(_ p: DialerProspect, _ status: String) async {
        do {
            try await API.shared.run("setProspectStatus", ["prospectId": p.id, "status": status])
            await load()
        } catch { toasts.show(error.localizedDescription, tone: .warn) }
    }
}
