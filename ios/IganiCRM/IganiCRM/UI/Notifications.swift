import SwiftUI
import UserNotifications

// MARK: - In-app banner

/// A notification while the app is open: a glass card that drops in from the top. Tap to open, swipe up to dismiss.
struct PushBannerOverlay: View {
    @State private var push = PushCenter.shared
    @State private var drag: CGFloat = 0

    var body: some View {
        VStack {
            if let b = push.banner {
                card(b)
                    .id(b.id)
                    .offset(y: min(0, drag))
                    .gesture(DragGesture().onChanged { drag = $0.translation.height }.onEnded { v in
                        if v.translation.height < -30 { dismiss() } else { withAnimation(.spring) { drag = 0 } }
                    })
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .task(id: b.id) {
                        try? await Task.sleep(for: .seconds(5))
                        if push.banner?.id == b.id { dismiss() }
                    }
            }
            Spacer()
        }
        .padding(.horizontal, 12)
        .padding(.top, 6)
        .animation(.spring(response: 0.45, dampingFraction: 0.82), value: push.banner?.id)
        .sensoryFeedback(.impact(weight: .light), trigger: push.banner?.id)
    }

    private func card(_ b: PushCenter.PushBanner) -> some View {
        Button {
            push.opened = b.link
            dismiss()
        } label: {
            HStack(alignment: .top, spacing: 12) {
                PushIcon(kind: b.kind, name: b.title, photo: b.photo, size: 42)
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(b.title).font(.subheadline.weight(.bold)).foregroundStyle(Theme.text).lineLimit(1)
                        if let s = b.subtitle { Text(s).font(.caption.weight(.semibold)).foregroundStyle(Theme.accent).lineLimit(1) }
                        Spacer(minLength: 0)
                        Text("now").font(.caption2).foregroundStyle(Theme.muted)
                    }
                    Text(b.body).font(.subheadline).foregroundStyle(Theme.text.opacity(0.85)).lineLimit(2).multilineTextAlignment(.leading)
                }
            }
            .padding(14)
            .frame(maxWidth: 520)
            .glass(in: RoundedRectangle(cornerRadius: 26, style: .continuous), interactive: true)
            .shadow(color: .black.opacity(0.35), radius: 22, y: 10)
        }
        .buttonStyle(PressStyle())
        .accessibilityHint("Opens it")
    }

    private func dismiss() {
        withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
            push.banner = nil
            drag = 0
        }
    }
}

/// The picture on a notification: the sender's photo for chat, an icon for everything else.
struct PushIcon: View {
    let kind: String
    let name: String
    let photo: String?
    var size: CGFloat = 40

    var body: some View {
        switch kind {
        case "chat":
            Avatar(name: name, url: photo, size: size)
        case "sms":
            glyph("message.fill", Theme.green)
        case "missed":
            glyph("phone.arrow.down.left.fill", Theme.red)
        case "lead":
            glyph("person.crop.circle.badge.plus", Theme.amber)
        default:
            glyph("bell.fill", Theme.accent)
        }
    }

    private func glyph(_ s: String, _ tint: Color) -> some View {
        Image(systemName: s).font(.system(size: size * 0.42, weight: .bold)).foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(tint.gradient, in: RoundedRectangle(cornerRadius: size * 0.3, style: .continuous))
    }
}

// MARK: - Asking for permission

/// Shown once after sign-in: what notifications you'll get (a preview stack), then iOS's own prompt.
struct NotificationsPrompt: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(Session.self) private var session
    @State private var appear = false
    private var seller: Bool { ["ADMIN", "SALES"].contains(session.me?.role ?? "") }

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 20)
            ZStack {
                ForEach(Array(samples.enumerated()), id: \.offset) { i, s in
                    sample(s)
                        .scaleEffect(1 - CGFloat(i) * 0.05)
                        .offset(y: appear ? CGFloat(i) * 86 : CGFloat(i) * 20)
                        .opacity(appear ? 1 - Double(i) * 0.12 : 0)
                        .zIndex(Double(-i))
                }
            }
            .frame(height: 290, alignment: .top)
            .padding(.horizontal, 22)

            VStack(spacing: 10) {
                Text("Never miss a beat").font(.system(size: 30, weight: .bold, design: .rounded)).foregroundStyle(Theme.text)
                Text(seller ? "Get a heads-up when a teammate messages you, a client texts or calls, or a new lead is yours. Reply right from the notification." : "Get a heads-up when a teammate messages you or mentions you. Reply right from the notification.")
                    .font(.body).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
            }
            .padding(.horizontal, 30)
            .padding(.top, 10)

            Spacer()
            VStack(spacing: 12) {
                Button {
                    Task {
                        await PushCenter.shared.requestPermission()
                        dismiss()
                    }
                } label: {
                    Text("Turn on notifications").font(.headline).frame(maxWidth: .infinity).padding(.vertical, 16)
                        .background(Theme.accent.gradient, in: Capsule()).foregroundStyle(Theme.bg)
                }
                .buttonStyle(ElasticStyle())
                Button("Not now") { dismiss() }.font(.subheadline.weight(.semibold)).foregroundStyle(Theme.muted)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 20)
        }
        .screenBackground()
        .onAppear { withAnimation(.spring(response: 0.7, dampingFraction: 0.75).delay(0.15)) { appear = true } }
        .interactiveDismissDisabled(false)
    }

    private struct Sample { let kind: String; let title: String; let sub: String?; let body: String }
    private var samples: [Sample] {
        seller ? [
            Sample(kind: "chat", title: "Dana Cohen", sub: "#sales-floor", body: "Halo Dental signed! 🎉 Great follow-up @you"),
            Sample(kind: "sms", title: "Maya Rosen", sub: "Halo Dental", body: "Can we move the demo to 4pm?"),
            Sample(kind: "lead", title: "New lead for you", sub: nil, body: "Avi Levi · Wine & Grind · from the website"),
        ] : [
            Sample(kind: "chat", title: "Dana Cohen", sub: "#marketing", body: "The new landing page is live 🚀"),
            Sample(kind: "chat", title: "Gabriel", sub: nil, body: "Can you send me the campaign numbers?"),
        ]
    }

    private func sample(_ s: Sample) -> some View {
        HStack(alignment: .top, spacing: 12) {
            PushIcon(kind: s.kind, name: s.title, photo: nil, size: 40)
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(s.title).font(.subheadline.weight(.bold)).foregroundStyle(Theme.text).lineLimit(1)
                    if let sub = s.sub { Text(sub).font(.caption.weight(.semibold)).foregroundStyle(Theme.accent).lineLimit(1) }
                    Spacer(minLength: 0)
                    Text("now").font(.caption2).foregroundStyle(Theme.muted)
                }
                Text(s.body).font(.subheadline).foregroundStyle(Theme.text.opacity(0.85)).lineLimit(2)
            }
        }
        .padding(14)
        .glass(in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: .black.opacity(0.3), radius: 18, y: 8)
    }
}

// MARK: - Settings

/// Profile → Notifications: on/off for the whole app (iOS), and which kinds this phone gets.
struct NotificationSettingsView: View {
    struct Kind: Decodable, Identifiable { let key: String; let label: String; let hint: String; var on: Bool; var id: String { key } }
    struct Reply: Decodable { let ready: Bool; let kinds: [Kind] }
    @State private var push = PushCenter.shared
    @State private var kinds: [Kind] = []
    @State private var ready = true
    @State private var loadFailed: String?
    /// a toggle being put back after a failed save (its change isn't sent again)
    @State private var reverting: String?
    @State private var testResult: String?
    @Environment(\.openURL) private var openURL

    var body: some View {
        List {
            Section {
                HStack(spacing: 14) {
                    Image(systemName: allowed ? "bell.badge.fill" : "bell.slash.fill").font(.title2).foregroundStyle(allowed ? Theme.accent : Theme.muted)
                        .frame(width: 44, height: 44).background((allowed ? Theme.accent : Theme.muted).opacity(0.15), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(allowed ? "Notifications are on" : "Notifications are off").font(.headline)
                        Text(allowed ? "Choose what this iPhone tells you about." : "Turn them on to hear about messages, texts, missed calls and leads.").font(.caption).foregroundStyle(Theme.muted)
                    }
                }
                if push.status == .notDetermined {
                    Button("Turn on notifications") { Task { await push.requestPermission(); await load() } }
                } else if !allowed {
                    Button("Open iPhone Settings") { if let u = URL(string: UIApplication.openNotificationSettingsURLString) { openURL(u) } }
                }
            }
            .listRowBackground(Theme.card)
            if allowed {
                Section {
                    if kinds.isEmpty {
                        if let loadFailed {
                            Button { Task { await load() } } label: { Label("\(loadFailed) Tap to try again.", systemImage: "arrow.clockwise") }.font(.footnote)
                        } else {
                            HStack { Spacer(); ProgressView(); Spacer() }
                        }
                    }
                    ForEach($kinds) { $k in
                        Toggle(isOn: $k.on) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(k.label)
                                Text(k.hint).font(.caption).foregroundStyle(Theme.muted)
                            }
                        }
                        .onChange(of: k.on) { _, v in
                            let key = k.key
                            if reverting == key { reverting = nil; return }
                            Task {
                                if !(await push.registerWithServer(prefs: [key: v])) {
                                    // not saved (offline, or this iPhone hasn't got its push token yet): put it back
                                    if let i = kinds.firstIndex(where: { $0.key == key }), kinds[i].on == v { reverting = key; kinds[i].on = !v }
                                    ToastCenter.shared?.show("Couldn’t save that. Try again in a moment.", tone: .warn)
                                }
                            }
                        }
                    }
                    Button {
                        Task {
                            do {
                                let _: Anything = try await API.shared.post("/api/mobile/v1/push/test", [:])
                                testResult = "Sent: it should arrive in a moment."
                            } catch { testResult = error.localizedDescription }
                        }
                    } label: { Label("Send a test notification", systemImage: "paperplane") }
                    if let testResult { Text(testResult).font(.caption).foregroundStyle(Theme.muted) }
                } header: { Text("Tell me about") } footer: {
                    if !ready { Text("Igani’s server isn’t sending notifications yet (an admin needs to add the Apple push key). Your choices are saved for when it does.") }
                }
                .listRowBackground(Theme.card)
            }
        }
        .scrollContentBackground(.hidden)
        .screenBackground()
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private var allowed: Bool { push.status == .authorized || push.status == .provisional || push.status == .ephemeral }

    private func load() async {
        await push.refreshStatus()
        var q: [URLQueryItem] = []
        if let t = push.token { q.append(URLQueryItem(name: "token", value: t)) }
        do {
            let r: Reply = try await API.shared.get("/api/mobile/v1/push", query: q)
            kinds = r.kinds
            ready = r.ready
            loadFailed = nil
        } catch is CancellationError {
        } catch { loadFailed = error.localizedDescription }
    }
}

// MARK: - Opening a tapped notification

/// What a tapped notification opens, over whatever is on screen.
struct PushLinkSheet: View {
    let link: PushCenter.PushLink
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            Group {
                switch link {
                case .chat(let id): ChatConversationView(channelId: id, title: "")
                case .sms(let n, let name): ConversationView(number: n, title: name)
                case .lead(let id): LeadDetailView(id: id)
                case .calls: RecentsPane().screenBackground().navigationTitle("Recent calls")
                }
            }
            .routes()
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } } }
        }
    }
}
