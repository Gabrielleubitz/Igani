import SwiftUI

// MARK: - Conversations list

/// Team chat: channels and direct messages, with unread counts (More → Team chat).
struct ChatHomeView: View {
    @Environment(Toasts.self) private var toasts
    @State private var overview: ChatOverview?
    @State private var failed: String?
    @State private var query = ""
    @State private var sheet: Sheet?

    enum Sheet: String, Identifiable { case channel, dm; var id: String { rawValue } }

    var body: some View {
        Group {
            if let o = overview {
                list(o)
            } else if let failed {
                LoadFailed(message: failed) { await load() }
            } else {
                IganiLoader(text: "Opening team chat").frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .screenBackground()
        .navigationTitle("Team chat")
        .searchable(text: $query, prompt: "Find a conversation")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button { sheet = .dm } label: { Label("Message someone", systemImage: "bubble.left") }
                    Button { sheet = .channel } label: { Label("New channel", systemImage: "number") }
                } label: { Image(systemName: "square.and.pencil") }
                .accessibilityLabel("New conversation")
            }
        }
        .sheet(item: $sheet) { s in
            switch s {
            case .channel:
                NewChannelSheet(people: (overview?.people ?? []).filter { $0.id != overview?.me.id }) { await load() }
            case .dm:
                PeopleSheet(title: "Message someone", people: overview?.people ?? [], meId: overview?.me.id ?? "", multi: false) { ids in
                    pendingDM = ids.first
                }
            }
        }
        .navigationDestination(item: $openDM) { id in
            ChatConversationView(channelId: id, title: "")
        }
        .onChange(of: sheet) { _, s in
            if s == nil, let p = pendingDM {
                pendingDM = nil
                Task { await startDM(p) }
            }
        }
        .task {
            #if DEBUG
            // -openChat <channel id> opens a conversation (for testing)
            if let c = UserDefaults.standard.string(forKey: "openChat") { UserDefaults.standard.removeObject(forKey: "openChat"); openDM = c }
            #endif
            while !Task.isCancelled {
                await load()
                try? await Task.sleep(for: .seconds(8))
            }
        }
        .refreshable { await load() }
    }

    @State private var pendingDM: String?
    @State private var openDM: String?

    private func list(_ o: ChatOverview) -> some View {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        let match: (ChatChannelRow) -> Bool = { q.isEmpty || $0.name.lowercased().contains(q) }
        let channels = o.channels.filter { !$0.isDM && ($0.member || $0.name == "general") && match($0) }
        let browse = o.channels.filter { !$0.isDM && !$0.member && $0.name != "general" && match($0) }
        let dms = o.channels.filter { $0.isDM && match($0) }
        return List {
            Section("Channels") {
                ForEach(channels) { c in row(c) }
            }
            if !browse.isEmpty {
                Section("More channels to join") {
                    ForEach(browse) { c in row(c) }
                }
            }
            Section("Direct messages") {
                ForEach(dms) { c in row(c) }
                if dms.isEmpty {
                    Button { sheet = .dm } label: { Label("Message a teammate", systemImage: "plus.bubble") }
                        .listRowBackground(Theme.card)
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
    }

    private func row(_ c: ChatChannelRow) -> some View {
        NavigationLink(value: ChatRoute.channel(c.id, c.title)) {
            HStack(spacing: 12) {
                if c.isDM {
                    Avatar(name: c.name, url: c.photoURL, size: 34)
                } else {
                    Image(systemName: c.isPrivate ? "lock.fill" : "number")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 34, height: 34)
                        .background(Theme.gradient(for: c.name), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(c.isDM ? c.name : c.name).font(.body.weight(c.unread > 0 ? .bold : .regular)).foregroundStyle(Theme.text).lineLimit(1)
                    if let t = c.topic, !t.isEmpty { Text(t).font(.caption).foregroundStyle(Theme.muted).lineLimit(1) }
                }
                Spacer()
                if c.mentions > 0 {
                    Text("\(c.mentions)").font(.caption2.weight(.bold)).foregroundStyle(.white).padding(.horizontal, 7).padding(.vertical, 3).background(Theme.red, in: Capsule())
                } else if c.unread > 0 {
                    Circle().fill(Theme.text.opacity(0.8)).frame(width: 8, height: 8).accessibilityLabel("\(c.unread) unread")
                }
            }
        }
        .listRowBackground(Theme.card)
    }

    private func load() async {
        do {
            if let o: ChatOverview = try await API.shared.act("chatOverview") {
                withAnimation(.snappy) { overview = o }
                failed = nil
            }
        } catch {
            if overview == nil { failed = error.localizedDescription }
        }
    }

    private func startDM(_ userId: String) async {
        struct Opened: Decodable { let id: String }
        do {
            if let o: Opened = try await API.shared.act("chatOpenDm", userId) { openDM = o.id }
        } catch { toasts.show(error.localizedDescription, tone: .warn) }
    }
}

extension String: @retroactive Identifiable { public var id: String { self } }

extension View {
    func chatRoutes() -> some View {
        navigationDestination(for: ChatRoute.self) { r in
            switch r {
            case .channel(let id, let title): ChatConversationView(channelId: id, title: title)
            case .dm(let userId, let name): ChatDMLoader(userId: userId, name: name)
            }
        }
    }
}

/// Opens (or makes) the direct conversation with a teammate, then shows it.
struct ChatDMLoader: View {
    let userId: String
    let name: String
    @State private var channelId: String?
    @State private var failed: String?
    var body: some View {
        Group {
            if let channelId { ChatConversationView(channelId: channelId, title: name) }
            else if let failed { LoadFailed(message: failed) { await open() } }
            else { ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity).screenBackground() }
        }
        .task { await open() }
    }
    private func open() async {
        struct Opened: Decodable { let id: String }
        do { if let o: Opened = try await API.shared.act("chatOpenDm", userId) { channelId = o.id } } catch { failed = error.localizedDescription }
    }
}

// MARK: - A conversation

struct ChatConversationView: View {
    let channelId: String
    let title: String
    @Environment(Toasts.self) private var toasts
    @Environment(\.dismiss) private var dismiss
    @State private var info: ChatChannelInfo?
    @State private var messages: [ChatMessage] = []
    @State private var people: [ChatPerson] = []
    @State private var meId = ""
    @State private var isAdmin = false
    @State private var more = false
    @State private var cursor: String?
    @State private var seenAt: Date?
    @State private var failed: String?
    @State private var draft = ""
    @State private var editing: ChatMessage?
    @State private var showInfo = false
    @State private var tick = 0
    @FocusState private var focused: Bool

    private var peopleBy: [String: ChatPerson] { Dictionary(people.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a }) }

    var body: some View {
        VStack(spacing: 0) {
            if info != nil {
                messageList
                if let info, !info.isDM, !info.member { joinBar(info) }
                mentionSuggestions
                composer
            } else if let failed {
                LoadFailed(message: failed) { await first() }
            } else {
                Spacer(); ProgressView(); Spacer()
            }
        }
        .screenBackground()
        .navigationTitle(info.map { $0.isDM ? $0.name : "#\($0.name)" } ?? title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if let info, !info.isDM {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showInfo = true } label: { Image(systemName: "info.circle") }.accessibilityLabel("Channel details")
                }
            }
        }
        .sheet(isPresented: $showInfo) {
            if let info {
                ChannelInfoSheet(info: info, team: people, isAdmin: isAdmin) { changed in
                    if changed == .left || changed == .archived { dismiss() } else { Task { await first() } }
                }
            }
        }
        .sheet(item: $editing) { m in
            EditMessageSheet(text: ChatText.display(m.body, people: peopleBy)) { text in
                let stored = ChatText.stored(text, people: people)
                if let i = messages.firstIndex(where: { $0.id == m.id }) { messages[i].body = stored; messages[i].edited = true }
                Task { try? await API.shared.run("chatEdit", ["messageId": m.id, "body": stored]) }
            }
        }
        .sensoryFeedback(.impact(weight: .light), trigger: tick)
        .onAppear { TabRouter.shared.chatOpen = true; ChatScreenTracker.open = channelId }
        .onDisappear { TabRouter.shared.chatOpen = false; if ChatScreenTracker.open == channelId { ChatScreenTracker.open = nil } }
        .task {
            await first()
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(2.5))
                await poll()
            }
        }
    }

    // messages, grouped like Slack: name and photo once per run, day dividers
    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 2) {
                    if more {
                        Button("Load earlier messages") { Task { await older() } }
                            .font(.footnote.weight(.semibold)).frame(maxWidth: .infinity).padding(.vertical, 10)
                    } else if let info {
                        intro(info).padding(.bottom, 14)
                    }
                    ForEach(Array(messages.enumerated()), id: \.element.id) { i, m in
                        let prev = i > 0 ? messages[i - 1] : nil
                        let newDay = prev.map { !Calendar.current.isDate($0.at, inSameDayAs: m.at) } ?? true
                        if newDay { dayDivider(m.at) }
                        let grouped = !newDay && prev?.userId == m.userId && prev?.deleted == false && m.at.timeIntervalSince(prev!.at) < 300
                        ChatMessageView(message: m, grouped: grouped, meId: meId, canDelete: m.userId == meId || isAdmin, people: peopleBy) { action in
                            handle(action, m)
                        }
                        .id(m.id)
                    }
                    if let last = messages.last, last.userId == meId, !last.pending, let seenAt, last.at <= seenAt {
                        Label("Seen", systemImage: "checkmark").font(.caption2).foregroundStyle(Theme.muted).frame(maxWidth: .infinity, alignment: .trailing).padding(.trailing, 8)
                    }
                    Color.clear.frame(height: 4).id("bottom")
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
            }
            .defaultScrollAnchor(.bottom)
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: messages.last?.id) { _, _ in withAnimation(.snappy) { proxy.scrollTo("bottom", anchor: .bottom) } }
        }
    }

    private func intro(_ info: ChatChannelInfo) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if info.isDM {
                Avatar(name: info.name, url: info.members.first { $0.id != meId }?.photoURL, size: 56)
            } else {
                Image(systemName: info.isPrivate ? "lock.fill" : "number").font(.title2.weight(.bold)).foregroundStyle(Theme.accent)
                    .frame(width: 56, height: 56).background(Theme.accent.opacity(0.15), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            Text(info.isDM ? info.name : "Welcome to #\(info.name)").font(.title3.weight(.bold)).foregroundStyle(Theme.text)
            Text(info.isDM ? "This is the start of your conversation with \(info.name). Only the two of you can see it." : info.isPrivate ? "A private channel: only its members can see it." : "Everyone on the team can read and join #\(info.name).")
                .font(.subheadline).foregroundStyle(Theme.muted)
        }
        .padding(.top, 20)
        .padding(.horizontal, 4)
    }

    private func dayDivider(_ d: Date) -> some View {
        HStack {
            Rectangle().fill(Theme.line).frame(height: 1)
            Text(Calendar.current.isDateInToday(d) ? "Today" : Calendar.current.isDateInYesterday(d) ? "Yesterday" : d.formatted(.dateTime.weekday(.wide).month(.wide).day()))
                .font(.caption.weight(.semibold)).foregroundStyle(Theme.muted)
                .padding(.horizontal, 10).padding(.vertical, 3)
                .glass(in: Capsule())
            Rectangle().fill(Theme.line).frame(height: 1)
        }
        .padding(.vertical, 10)
    }

    private func joinBar(_ info: ChatChannelInfo) -> some View {
        HStack {
            Text("Join #\(info.name) to get its new messages.").font(.footnote).foregroundStyle(Theme.muted)
            Spacer()
            Button("Join") { Task { try? await API.shared.run("chatJoin", info.id); await first() } }
                .buttonStyle(.borderedProminent).controlSize(.small)
        }
        .padding(.horizontal, 14).padding(.vertical, 8)
        .background(Theme.card)
    }

    // @mentions: suggestions for the word you're typing after "@"
    private var mentionQuery: String? {
        guard let at = draft.lastIndex(of: "@") else { return nil }
        let before = at == draft.startIndex ? " " : draft[draft.index(before: at)]
        guard before == " " || before == "\n" else { return nil }
        let q = String(draft[draft.index(after: at)...])
        return q.count <= 24 && !q.contains("\n") && !q.hasSuffix("  ") ? q : nil
    }

    @ViewBuilder private var mentionSuggestions: some View {
        if let q = mentionQuery {
            let options = people.filter { $0.id != meId && (q.isEmpty || $0.name.localizedCaseInsensitiveContains(q)) }.prefix(6)
            if !options.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(options)) { p in
                            Button {
                                if let at = draft.lastIndex(of: "@") { draft = String(draft[..<at]) + "@\(p.name) " }
                            } label: {
                                HStack(spacing: 6) {
                                    Avatar(name: p.name, url: p.photoURL, size: 22)
                                    Text(p.name).font(.footnote.weight(.semibold)).foregroundStyle(Theme.text)
                                }
                                .padding(.leading, 4).padding(.trailing, 10).padding(.vertical, 4)
                                .glass(in: Capsule(), interactive: true)
                            }
                        }
                    }
                    .padding(.horizontal, 12)
                }
                .padding(.vertical, 6)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
    }

    private var composer: some View {
        HStack(alignment: .bottom, spacing: 10) {
            TextField(info.map { $0.isDM ? "Message \($0.name)" : "Message #\($0.name)" } ?? "Message", text: $draft, axis: .vertical)
                .lineLimit(1...6)
                .focused($focused)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Theme.line))
            Button { Task { await send() } } label: {
                Image(systemName: "arrow.up").font(.headline.weight(.bold)).foregroundStyle(Theme.bg)
                    .frame(width: 38, height: 38)
                    .background(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? Theme.muted : Theme.accent, in: Circle())
            }
            .buttonStyle(ElasticStyle())
            .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            .accessibilityLabel("Send")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial)
        .animation(.snappy, value: mentionQuery)
    }

    // MARK: data

    private func apply(_ p: ChatPageData) {
        info = p.channel
        seenAt = p.channel.isDM ? p.readBy.first?.at : nil
        cursor = p.cursor
    }

    private func first() async {
        if people.isEmpty, let o: ChatOverview = try? await API.shared.act("chatOverview") {
            people = o.people
            meId = o.me.id
            isAdmin = o.isAdmin
        }
        do {
            guard let p: ChatPageData = try await API.shared.act("chatMessages", ["channelId": channelId]) else { return }
            apply(p)
            messages = p.messages
            more = p.more
            try? await API.shared.run("chatMarkRead", channelId)
            await ChatBadge.shared.refresh()
        } catch {
            failed = error.localizedDescription
        }
    }

    private func poll() async {
        guard let cursor, !messages.contains(where: \.pending) else { return }
        guard let p: ChatPageData = try? await API.shared.act("chatMessages", ["channelId": channelId, "since": cursor]) else { return }
        apply(p)
        var fresh = false
        for m in p.messages {
            if let i = messages.firstIndex(where: { $0.id == m.id }) { messages[i] = m } else { messages.append(m); fresh = true }
        }
        messages.sort { $0.at < $1.at }
        if fresh {
            try? await API.shared.run("chatMarkRead", channelId)
            if p.messages.contains(where: { $0.userId != meId }) { tick += 1 }
        }
    }

    private func older() async {
        guard let firstAt = messages.first?.at else { return }
        guard let p: ChatPageData = try? await API.shared.act("chatMessages", ["channelId": channelId, "before": ISO8601DateFormatter.chat.string(from: firstAt)]) else { return }
        messages.insert(contentsOf: p.messages, at: 0)
        more = p.more
    }

    private func send() async {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        let body = ChatText.stored(text, people: people)
        draft = ""
        let me = people.first { $0.id == meId }
        var temp = ChatMessage(id: "tmp-\(UUID().uuidString)", userId: meId, name: me?.name ?? "You", photo: me?.photo, body: body, at: Date(), edited: false, deleted: false, reactions: [])
        temp.pending = true
        withAnimation(.snappy) { messages.append(temp) }
        struct Sent: Decodable { let id: String; let at: Date }
        do {
            if let s: Sent = try await API.shared.act("chatSend", ["channelId": channelId, "body": body]), let i = messages.firstIndex(where: { $0.id == temp.id }) {
                messages[i].id = s.id
                messages[i].at = s.at
                messages[i].pending = false
                if info?.member == false { await first() }
            }
        } catch {
            if let i = messages.firstIndex(where: { $0.id == temp.id }) { messages[i].pending = false; messages[i].failed = true }
            toasts.show(error.localizedDescription, tone: .warn)
        }
    }

    private func handle(_ action: ChatMessageView.Action, _ m: ChatMessage) {
        switch action {
        case .react(let emoji):
            guard let i = messages.firstIndex(where: { $0.id == m.id }) else { return }
            var r = messages[i].reactions
            if let j = r.firstIndex(where: { $0.emoji == emoji }) {
                r[j].count += r[j].mine ? -1 : 1
                r[j].mine.toggle()
                if r[j].count <= 0 { r.remove(at: j) }
            } else {
                r.append(ChatReaction(emoji: emoji, count: 1, mine: true, names: ["You"]))
            }
            withAnimation(.snappy) { messages[i].reactions = r }
            tick += 1
            Task { try? await API.shared.run("chatReact", ["messageId": m.id, "emoji": emoji]) }
        case .edit:
            editing = m
        case .delete:
            guard let i = messages.firstIndex(where: { $0.id == m.id }) else { return }
            withAnimation(.snappy) { messages[i].deleted = true; messages[i].body = "" }
            Task { try? await API.shared.run("chatDelete", m.id) }
        case .copy:
            UIPasteboard.general.string = ChatText.display(m.body, people: peopleBy)
        }
    }
}

extension ISO8601DateFormatter {
    static let chat: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
}

// MARK: - One message

struct ChatMessageView: View {
    enum Action { case react(String), edit, delete, copy }
    let message: ChatMessage
    let grouped: Bool
    let meId: String
    let canDelete: Bool
    let people: [String: ChatPerson]
    let onAction: (Action) -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            if grouped {
                Color.clear.frame(width: 36, height: 1)
            } else {
                Avatar(name: message.name, url: message.photoURL, size: 36)
            }
            VStack(alignment: .leading, spacing: 3) {
                if !grouped {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(message.name).font(.subheadline.weight(.bold)).foregroundStyle(Theme.text)
                        Text(Fmt.time(message.at)).font(.caption2).foregroundStyle(Theme.muted)
                    }
                }
                if message.deleted {
                    Text("This message was deleted.").font(.subheadline.italic()).foregroundStyle(Theme.muted)
                } else {
                    Text(ChatText.attributed(message.body, people: people, me: meId))
                        .font(.body)
                        .foregroundStyle(Theme.text)
                        .tint(Theme.accent)
                        .fixedSize(horizontal: false, vertical: true)
                    if message.edited { Text("(edited)").font(.caption2).foregroundStyle(Theme.muted) }
                    if message.failed { Label("Not sent", systemImage: "exclamationmark.circle.fill").font(.caption2).foregroundStyle(Theme.red) }
                    if !message.reactions.isEmpty { reactions }
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, grouped ? 2 : 6)
        .padding(.horizontal, 4)
        .opacity(message.pending ? 0.55 : 1)
        .contentShape(Rectangle())
        .contextMenu {
            if !message.deleted && !message.pending {
                ControlGroup {
                    ForEach(ChatText.emoji.prefix(4), id: \.self) { e in Button(e) { onAction(.react(e)) } }
                }
                Menu("More reactions") { ForEach(ChatText.emoji.dropFirst(4), id: \.self) { e in Button(e) { onAction(.react(e)) } } }
                Button { onAction(.copy) } label: { Label("Copy text", systemImage: "doc.on.doc") }
                if message.userId == meId { Button { onAction(.edit) } label: { Label("Edit", systemImage: "pencil") } }
                if canDelete { Button(role: .destructive) { onAction(.delete) } label: { Label("Delete", systemImage: "trash") } }
            }
        }
    }

    private var reactions: some View {
        HStack(spacing: 6) {
            ForEach(message.reactions, id: \.emoji) { r in
                Button { onAction(.react(r.emoji)) } label: {
                    HStack(spacing: 4) {
                        Text(r.emoji).font(.system(size: 14))
                        Text("\(r.count)").font(.caption.weight(.bold)).monospacedDigit().foregroundStyle(r.mine ? Theme.text : Theme.muted)
                    }
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(r.mine ? Theme.accent.opacity(0.2) : Theme.raised, in: Capsule())
                    .overlay(Capsule().strokeBorder(r.mine ? Theme.accent.opacity(0.6) : Theme.line))
                }
                .buttonStyle(PressStyle())
                .accessibilityLabel("\(r.emoji) \(r.count): \(r.names.joined(separator: ", "))")
            }
        }
        .padding(.top, 2)
    }
}

// MARK: - Sheets

struct EditMessageSheet: View {
    @State var text: String
    let onSave: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            TextField("Message", text: $text, axis: .vertical)
                .lineLimit(3...12)
                .padding(14)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .padding()
                .frame(maxHeight: .infinity, alignment: .top)
                .screenBackground()
                .navigationTitle("Edit message")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save") { onSave(text.trimmingCharacters(in: .whitespacesAndNewlines)); dismiss() }
                            .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                }
        }
        .presentationDetents([.medium])
    }
}

struct NewChannelSheet: View {
    let people: [ChatPerson]
    let onCreated: () async -> Void
    @Environment(\.dismiss) private var dismiss
    @Environment(Toasts.self) private var toasts
    @State private var name = ""
    @State private var topic = ""
    @State private var isPrivate = false
    @State private var members: Set<String> = []
    @State private var busy = false

    private var slug: String {
        name.lowercased().replacing(#/[^\p{L}\p{N}]+/#, with: "-").trimmingCharacters(in: CharacterSet(charactersIn: "-"))
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Image(systemName: "number").foregroundStyle(Theme.muted)
                        TextField("e.g. sales-floor", text: $name).textInputAutocapitalization(.never)
                    }
                    TextField("Topic (optional)", text: $topic)
                } footer: {
                    if !slug.isEmpty && slug != name { Text("Will be #\(slug)") }
                }
                .listRowBackground(Theme.card)
                Section {
                    Toggle(isOn: $isPrivate) { Label("Private", systemImage: "lock") }
                } footer: {
                    Text(isPrivate ? "Only the people in it can see it." : "Everyone on the team can read and join it.")
                }
                .listRowBackground(Theme.card)
                Section("Add people") {
                    ForEach(people) { p in
                        Button {
                            if members.contains(p.id) { members.remove(p.id) } else { members.insert(p.id) }
                        } label: {
                            HStack(spacing: 12) {
                                Avatar(name: p.name, url: p.photoURL, size: 30)
                                Text(p.name).foregroundStyle(Theme.text)
                                Spacer()
                                if members.contains(p.id) { Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.accent) }
                            }
                        }
                    }
                }
                .listRowBackground(Theme.card)
            }
            .scrollContentBackground(.hidden)
            .screenBackground()
            .navigationTitle("New channel")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { Task { await create() } }.disabled(slug.isEmpty || busy)
                }
            }
        }
    }

    private func create() async {
        busy = true
        defer { busy = false }
        struct Made: Decodable { let id: String }
        do {
            let _: Made? = try await API.shared.act("chatCreateChannel", ["name": name, "topic": topic, "private": isPrivate, "memberIds": Array(members)] as [String: Any])
            await onCreated()
            dismiss()
        } catch {
            toasts.show(error.localizedDescription, tone: .warn)
        }
    }
}

struct PeopleSheet: View {
    let title: String
    let people: [ChatPerson]
    let meId: String
    let multi: Bool
    let onPick: ([String]) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var picked: Set<String> = []

    var body: some View {
        NavigationStack {
            List {
                ForEach(people.filter { query.isEmpty || $0.name.localizedCaseInsensitiveContains(query) }) { p in
                    Button {
                        if multi {
                            if picked.contains(p.id) { picked.remove(p.id) } else { picked.insert(p.id) }
                        } else {
                            onPick([p.id])
                            dismiss()
                        }
                    } label: {
                        HStack(spacing: 12) {
                            Avatar(name: p.name, url: p.photoURL, size: 36)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(p.id == meId ? "\(p.name) (you)" : p.name).foregroundStyle(Theme.text)
                                Text(p.roleLabel).font(.caption).foregroundStyle(Theme.muted)
                            }
                            Spacer()
                            if multi, picked.contains(p.id) { Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.accent) }
                        }
                    }
                    .listRowBackground(Theme.card)
                }
            }
            .scrollContentBackground(.hidden)
            .screenBackground()
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search the team")
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                if multi {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Add") { onPick(Array(picked)); dismiss() }.disabled(picked.isEmpty)
                    }
                }
            }
        }
    }
}

struct ChannelInfoSheet: View {
    enum Change { case edited, left, archived, added }
    let info: ChatChannelInfo
    let team: [ChatPerson]
    let isAdmin: Bool
    let onChange: (Change) -> Void
    @Environment(\.dismiss) private var dismiss
    @Environment(Toasts.self) private var toasts
    @State private var name = ""
    @State private var topic = ""
    @State private var adding = false
    @State private var confirmArchive = false

    var body: some View {
        NavigationStack {
            Form {
                if info.canManage {
                    Section("About") {
                        if info.name != "general" { TextField("Name", text: $name).textInputAutocapitalization(.never) }
                        TextField("Topic", text: $topic, axis: .vertical)
                        Button("Save") { Task { await save() } }
                    }
                    .listRowBackground(Theme.card)
                } else if let t = info.topic, !t.isEmpty {
                    Section("Topic") { Text(t) }.listRowBackground(Theme.card)
                }
                Section("\(info.members.count) \(info.members.count == 1 ? "member" : "members")") {
                    Button { adding = true } label: { Label("Add people", systemImage: "person.badge.plus") }
                    ForEach(info.members) { p in
                        HStack(spacing: 12) {
                            Avatar(name: p.name, url: p.photoURL, size: 30)
                            Text(p.name)
                            Spacer()
                            Text(p.roleLabel).font(.caption).foregroundStyle(Theme.muted)
                        }
                    }
                }
                .listRowBackground(Theme.card)
                if info.name != "general" {
                    Section {
                        if info.member {
                            Button("Leave channel", role: .destructive) {
                                Task { try? await API.shared.run("chatLeave", info.id); dismiss(); onChange(.left) }
                            }
                        }
                        if info.canManage {
                            Button("Archive channel", role: .destructive) { confirmArchive = true }
                        }
                    }
                    .listRowBackground(Theme.card)
                }
            }
            .scrollContentBackground(.hidden)
            .screenBackground()
            .navigationTitle(info.isPrivate ? "🔒 \(info.name)" : "#\(info.name)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .sheet(isPresented: $adding) {
                PeopleSheet(title: "Add people", people: team.filter { p in !info.members.contains { $0.id == p.id } }, meId: "", multi: true) { ids in
                    Task {
                        do { try await API.shared.run("chatAddMembers", ["channelId": info.id, "userIds": ids] as [String: Any]); onChange(.added) } catch { toasts.show(error.localizedDescription, tone: .warn) }
                    }
                }
            }
            .confirmationDialog("Archive #\(info.name) for everyone?", isPresented: $confirmArchive, titleVisibility: .visible) {
                Button("Archive", role: .destructive) {
                    Task {
                        do { try await API.shared.run("chatArchiveChannel", info.id); dismiss(); onChange(.archived) } catch { toasts.show(error.localizedDescription, tone: .warn) }
                    }
                }
            }
            .onAppear {
                name = info.name
                topic = info.topic ?? ""
            }
        }
    }

    private func save() async {
        do {
            var input: [String: Any] = ["channelId": info.id, "topic": topic]
            if info.name != "general" { input["name"] = name }
            try await API.shared.run("chatUpdateChannel", input)
            dismiss()
            onChange(.edited)
        } catch {
            toasts.show(error.localizedDescription, tone: .warn)
        }
    }
}
