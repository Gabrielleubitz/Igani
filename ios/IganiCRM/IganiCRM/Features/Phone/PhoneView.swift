import SwiftUI

/// The Phone tab: the keypad, recent calls, texts and call lists, from your own Igani number.
struct PhoneView: View {
    enum Pane: Hashable { case keypad, recents, messages, lists }
    @Environment(Session.self) private var session
    @State private var phone = Phone.shared
    @State private var pane: Pane = PhoneView.initialPane
    @State private var path = NavigationPath()
    @State private var unread = 0

    var body: some View {
        NavigationStack(path: $path) {
            VStack(spacing: 0) {
                LineBadge(setup: phone.setup)
                    .padding(.horizontal, 16)
                    .padding(.top, 4)
                GlassSegments(items: [(Pane.keypad, "Keypad", nil), (.recents, "Recent", nil), (.messages, "Texts", nil), (.lists, "Lists", nil)], selection: $pane, badge: { $0 == .messages ? unread : 0 })
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                Group {
                    switch pane {
                    case .keypad: KeypadPane()
                    case .recents: RecentsPane()
                    case .messages: ThreadsPane(unread: $unread)
                    case .lists: CallListsPane()
                    }
                }
                .frame(maxHeight: .infinity)
                .transition(.opacity)
            }
            .screenBackground()
            .navigationTitle("Phone")
            .navigationBarTitleDisplayMode(.inline)
            .routes()
            .toolbar {
                #if DEBUG
                if phone.setup == .demo {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { Task { await phone.simulateIncoming() } } label: { Image(systemName: "phone.arrow.down.left") }
                            .accessibilityLabel("Simulate an incoming call")
                    }
                }
                #endif
            }
            .task {
                await phone.prepare()
                #if DEBUG
                // -dial <number> places a call, -incoming 1 rings this phone (demo), for testing
                let d = UserDefaults.standard
                if let n = d.string(forKey: "dial") { d.removeObject(forKey: "dial"); do { try await phone.call(n) } catch { ToastCenter.shared?.show(error.localizedDescription, tone: .warn) } }
                if d.bool(forKey: "incoming") { d.removeObject(forKey: "incoming"); await phone.simulateIncoming() }
                #endif
            }
            .task {
                while !Task.isCancelled {
                    if let n: Int = try? await API.shared.act("smsUnread") { unread = n }
                    try? await Task.sleep(for: .seconds(30))
                }
            }
        }
    }

    static var initialPane: Pane {
        #if DEBUG
        switch UserDefaults.standard.string(forKey: "phonePane") {
        case "recents": return .recents
        case "messages": return .messages
        case "lists": return .lists
        default: return .keypad
        }
        #else
        return .keypad
        #endif
    }
}

/// Your line and whether calls can come in.
struct LineBadge: View {
    let setup: Phone.Setup
    var body: some View {
        HStack(spacing: 8) {
            Circle().fill(dot).frame(width: 8, height: 8)
                .overlay(Circle().stroke(dot.opacity(0.4), lineWidth: 4).scaleEffect(1.6))
            Text(text).font(.footnote.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1)
            Spacer(minLength: 4)
            if let note { Text(note).font(.caption).foregroundStyle(Theme.muted).lineLimit(1) }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 9)
        .glass(in: Capsule())
    }

    private var dot: Color {
        switch setup {
        case .ready: return Theme.green
        case .demo: return Theme.amber
        case .unavailable: return Theme.red
        default: return Theme.muted
        }
    }
    private var text: String {
        switch setup {
        case .ready(let line, _): return line.map { "Your line \($0)" } ?? "Ready to call"
        case .demo: return "Demo mode (no real calls)"
        case .unavailable(let m): return m
        default: return "Connecting to the phone service…"
        }
    }
    private var note: String? {
        switch setup {
        case .ready(_, let push): return push ? "Incoming calls on" : "Incoming calls ring in the app"
        case .demo: return "Development"
        default: return nil
        }
    }
}

// MARK: - Keypad

struct KeypadPane: View {
    @Environment(Toasts.self) private var toasts
    @State private var number = ""
    @State private var who: CallerId?
    @State private var matches: [DialerContact] = []
    @State private var busy = false
    @State private var lookup: Task<Void, Never>?
    @State private var tap = 0

    private let keys: [(String, String)] = [("1", ""), ("2", "ABC"), ("3", "DEF"), ("4", "GHI"), ("5", "JKL"), ("6", "MNO"), ("7", "PQRS"), ("8", "TUV"), ("9", "WXYZ"), ("*", ""), ("0", "+"), ("#", "")]

    var body: some View {
        VStack(spacing: 0) {
            // the number and who it is
            VStack(spacing: 6) {
                Text(number.isEmpty ? " " : PhoneFmt.pretty(number))
                    .font(.system(size: number.count > 13 ? 30 : 38, weight: .medium, design: .rounded))
                    .foregroundStyle(Theme.text)
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                    .contentTransition(.numericText())
                    .animation(.snappy(duration: 0.18), value: number)
                    .contextMenu {
                        Button { if let s = UIPasteboard.general.string { number = PhoneFmt.clean(s); identify() } } label: { Label("Paste", systemImage: "doc.on.clipboard") }
                        if !number.isEmpty { Button { UIPasteboard.general.string = number } label: { Label("Copy", systemImage: "doc.on.doc") } }
                    }
                callerLine
                    .frame(height: 22)
            }
            .padding(.horizontal, 24)
            .padding(.top, 6)

            // contacts that match what's typed
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(matches) { c in
                        Button {
                            number = c.phone
                            who = nil
                            identify()
                        } label: {
                            HStack(spacing: 8) {
                                Avatar(name: c.name, size: 26)
                                VStack(alignment: .leading, spacing: 0) {
                                    Text(c.name).font(.caption.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1)
                                    Text(c.display).font(.caption2).foregroundStyle(Theme.muted).lineLimit(1)
                                }
                            }
                            .padding(.leading, 5).padding(.trailing, 12).padding(.vertical, 5)
                            .background(Theme.card, in: Capsule())
                            .overlay(Capsule().strokeBorder(Theme.line))
                        }
                        .buttonStyle(PressStyle())
                    }
                }
                .padding(.horizontal, 16)
            }
            .frame(height: 44)
            .opacity(matches.isEmpty ? 0 : 1)

            Spacer(minLength: 4)

            // the keys
            LazyVGrid(columns: Array(repeating: GridItem(.fixed(84), spacing: 22), count: 3), spacing: 14) {
                ForEach(keys, id: \.0) { k in
                    KeyButton(digit: k.0, letters: k.1) {
                        guard number.count < 20 else { return }
                        number += k.0
                        tap += 1
                        identify()
                    } long: {
                        if k.0 == "0", number.isEmpty || !number.contains("+") { number = "+" + number; tap += 1 }
                    }
                }
            }

            // call and delete
            HStack(spacing: 22) {
                Color.clear.frame(width: 84, height: 84)
                Button { Task { await dial() } } label: {
                    ZStack {
                        Circle().fill(Theme.green).frame(width: 78, height: 78)
                            .shadow(color: Theme.green.opacity(0.45), radius: 16, y: 6)
                        if busy { ProgressView().tint(.white) } else { Image(systemName: "phone.fill").font(.system(size: 30, weight: .semibold)).foregroundStyle(.white) }
                    }
                }
                .buttonStyle(ElasticStyle())
                .disabled(busy || number.filter(\.isNumber).count < 3)
                .accessibilityLabel("Call")
                Button {
                    if !number.isEmpty { number.removeLast(); identify() }
                } label: {
                    Image(systemName: "delete.left.fill").font(.system(size: 24)).foregroundStyle(Theme.muted)
                        .frame(width: 84, height: 84)
                }
                .simultaneousGesture(LongPressGesture(minimumDuration: 0.5).onEnded { _ in number = ""; who = nil; matches = [] })
                .opacity(number.isEmpty ? 0 : 1)
                .accessibilityLabel("Delete")
            }
            .padding(.top, 14)
            .padding(.bottom, 18)
        }
        .sensoryFeedback(.impact(weight: .light, intensity: 0.6), trigger: tap)
        .onAppear {
            if let n = PendingDial.shared.take() { number = n; identify() }
        }
    }

    @ViewBuilder private var callerLine: some View {
        if let who, let title = who.title {
            HStack(spacing: 6) {
                if who.lead?.blocked == true { Image(systemName: "lock.fill").font(.caption2).foregroundStyle(Theme.amber) }
                Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.accent)
                if let s = who.subtitle { Text("· \(s)").font(.subheadline).foregroundStyle(Theme.muted) }
            }
            .lineLimit(1)
            .transition(.opacity.combined(with: .move(edge: .bottom)))
        } else if !number.isEmpty {
            Text(number.filter(\.isNumber).count >= 7 ? "Not in the CRM yet" : " ").font(.subheadline).foregroundStyle(Theme.muted)
        }
    }

    /// Who is this number, and contacts matching it (after a short pause in typing).
    private func identify() {
        lookup?.cancel()
        let n = number
        lookup = Task {
            try? await Task.sleep(for: .milliseconds(350))
            guard !Task.isCancelled else { return }
            let digits = n.filter(\.isNumber)
            async let found: [DialerContact]? = digits.count >= 3 ? try? await API.shared.act("searchDialerContacts", digits) : nil
            async let id: CallerId? = digits.count >= 7 ? try? await API.shared.act("identifyCaller", n, ["lookup": digits.count >= 9]) : nil
            let (f, i) = await (found, id)
            guard !Task.isCancelled, n == number else { return }
            withAnimation(.snappy) {
                matches = (f ?? []).filter { $0.phone.filter(\.isNumber) != digits }
                who = i
            }
        }
    }

    private func dial() async {
        busy = true
        defer { busy = false }
        do {
            try await Phone.shared.call(number, leadId: who?.lead?.id, name: who?.title)
            number = ""
            who = nil
            matches = []
        } catch {
            toasts.show(error.localizedDescription, tone: .warn)
        }
    }
}

/// A number for the keypad, from a tel: link or "Call back" elsewhere.
@MainActor final class PendingDial {
    static let shared = PendingDial()
    private var number: String?
    func set(_ n: String) { number = n }
    func take() -> String? { defer { number = nil }; return number }
}

struct KeyButton: View {
    let digit: String
    let letters: String
    let action: () -> Void
    var long: () -> Void = {}
    @State private var pressed = false
    var body: some View {
        VStack(spacing: -1) {
            Text(digit).font(.system(size: digit == "*" ? 40 : 34, weight: .regular, design: .rounded)).foregroundStyle(Theme.text)
                .offset(y: digit == "*" ? 7 : 0)
            Text(letters.isEmpty ? " " : letters).font(.system(size: 10, weight: .bold)).kerning(1.6).foregroundStyle(Theme.muted)
        }
        .frame(width: 80, height: 80)
        .background(Circle().fill(pressed ? Theme.accent.opacity(0.3) : Theme.raised.opacity(0.85)))
        .overlay(Circle().strokeBorder(.white.opacity(0.06)))
        .scaleEffect(pressed ? 0.93 : 1)
        .animation(.spring(response: 0.22, dampingFraction: 0.6), value: pressed)
        .contentShape(Circle())
        .onTapGesture { action() }
        .onLongPressGesture(minimumDuration: 0.45, perform: long) { p in pressed = p }
        .accessibilityLabel(digit)
        .accessibilityAddTraits(.isButton)
    }
}

/// Springs bigger, then settles (the call button).
struct ElasticStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.88 : 1)
            .animation(.spring(response: 0.28, dampingFraction: 0.45), value: configuration.isPressed)
    }
}

// MARK: - Recents

struct RecentsPane: View {
    @Environment(Toasts.self) private var toasts
    @State private var state: Load<[RecentCall]> = .loading

    var body: some View {
        Group {
            switch state {
            case .loading: ScrollView { SkeletonRows(count: 8) }
            case .failed(let m): LoadFailed(message: m) { await load() }
            case .ready(let calls):
                if calls.isEmpty {
                    EmptyHint(icon: "phone", title: "No calls yet", message: "Calls you make or get on your Igani number show up here.").frame(maxHeight: .infinity, alignment: .top).padding(.top, 50)
                } else {
                    List {
                        ForEach(calls) { c in
                            NavigationLink(value: CallRoute.detail(c.id)) { RecentRow(call: c) }
                                .listRowBackground(Theme.card)
                                .swipeActions(edge: .leading) {
                                    Button { Task { await callBack(c) } } label: { Label("Call", systemImage: "phone.fill") }.tint(Theme.green)
                                }
                                .contextMenu {
                                    Button { Task { await callBack(c) } } label: { Label("Call back", systemImage: "phone") }
                                    if let l = c.lead { NavigationLink(value: Route.lead(l.id)) { Label("Open contact", systemImage: "person.crop.circle") } }
                                    Button { UIPasteboard.general.string = c.other } label: { Label("Copy number", systemImage: "doc.on.doc") }
                                }
                        }
                    }
                    .listStyle(.insetGrouped)
                    .scrollContentBackground(.hidden)
                }
            }
        }
        .refreshable { await load() }
        .task { await load() }
        .onChange(of: Phone.shared.wrapUp == nil) { _, done in if done { Task { await load() } } }
    }

    private func load() async {
        do { state = .ready((try await API.shared.act("recentCalls") as [RecentCall]?) ?? []) } catch { if state.value == nil { state = .failed(error.localizedDescription) } }
    }

    private func callBack(_ c: RecentCall) async {
        do { try await Phone.shared.call(c.other, leadId: c.lead?.id, name: c.lead?.name) } catch { toasts.show(error.localizedDescription, tone: .warn) }
    }
}

struct RecentRow: View {
    let call: RecentCall
    var body: some View {
        let look = CallLook.of(direction: call.direction, status: call.status, durationSec: call.durationSec)
        HStack(spacing: 12) {
            IconChip(icon: look.icon, tint: look.tint, size: 38)
            VStack(alignment: .leading, spacing: 3) {
                Text(call.lead.map { $0.name == "Unnamed contact" ? call.otherDisplay : $0.name } ?? call.otherDisplay).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1)
                HStack(spacing: 6) {
                    Text(look.label).foregroundStyle(look.tint)
                    if let o = Outcome.label(call.outcome) { Text("· \(o)") }
                    if let d = call.durationSec, d > 0 { Text("· \(PhoneFmt.clock(d))").monospacedDigit() }
                }
                .font(.caption)
                .foregroundStyle(Theme.muted)
                .lineLimit(1)
            }
            Spacer()
            Text(Fmt.relative(call.startedAt)).font(.caption).foregroundStyle(Theme.muted)
        }
        .padding(.vertical, 3)
    }
}

/// Phone screens reached from lists.
enum CallRoute: Hashable {
    case detail(String)
    case thread(String, String?)
    case list(String, String)
}

extension View {
    func callRoutes() -> some View {
        navigationDestination(for: CallRoute.self) { r in
            switch r {
            case .detail(let id): CallDetailView(id: id)
            case .thread(let number, let name): ConversationView(number: number, title: name)
            case .list(let id, let name): ProspectsView(listId: id, name: name)
            }
        }
    }
}
