import SwiftUI

/// Igani Meet in the app: start a call now, join with a code, and your meetings. Calls open full screen.
struct MeetView: View {
    @Environment(Session.self) private var session
    @Environment(Toasts.self) private var toasts
    @State private var state: Load<MeetList> = .loading
    @State private var call: URL?
    @State private var starting = false
    @State private var code = ""
    @State private var path = NavigationPath()
    /// shown inside another navigation stack (the More tab)
    var embedded = false

    var body: some View {
        if embedded { content } else { NavigationStack(path: $path) { content.routes() } }
    }

    private var content: some View {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    hero
                    joinBox
                    switch state {
                    case .loading: SkeletonRows(count: 4)
                    case .failed(let m): LoadFailed(message: m) { await load() }
                    case .ready(let r): rooms(r)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 30)
            }
            .scrollDismissesKeyboard(.interactively)
            .screenBackground()
            .navigationTitle("Meet")
            .refreshable { await load() }
            .task { await load() }
            .fullScreenCover(item: $call, onDismiss: { Task { await load() } }) { u in MeetCallScreen(url: u) }
            #if DEBUG
            .onAppear { if let c = UserDefaults.standard.string(forKey: "openCall"), call == nil { call = URL(string: c) } }
            #endif
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 14) {
                RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Color(hex: 0x1B2D44))
                    .frame(width: 58, height: 58)
                    .overlay(IganiMark(talk: starting, slot: Color(hex: 0x1B2D44)).padding(11))
                VStack(alignment: .leading, spacing: 3) {
                    Text("Igani Meet").font(.title2.weight(.bold)).foregroundStyle(Theme.text)
                    Text("Video calls with your team and clients").font(.subheadline).foregroundStyle(Theme.muted)
                }
            }
            PrimaryButton(title: starting ? "Starting…" : "New meeting", icon: "video.badge.plus", busy: starting) { Task { await start() } }
        }
        .padding(18)
        .background(
            LinearGradient(colors: [Color(hex: 0x1D3A6B), Color(hex: 0x172234)], startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: 26, style: .continuous)
        )
        .overlay(RoundedRectangle(cornerRadius: 26, style: .continuous).strokeBorder(Theme.line))
        .padding(.top, 6)
    }

    private var joinBox: some View {
        HStack(spacing: 10) {
            Image(systemName: "keyboard").foregroundStyle(Theme.muted)
            TextField("Enter a code or link", text: $code).textInputAutocapitalization(.never).autocorrectionDisabled().submitLabel(.join).onSubmit(join)
            Button("Join", action: join).fontWeight(.semibold).disabled(code.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding(14)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Theme.line))
    }

    @ViewBuilder private func rooms(_ r: MeetList) -> some View {
        let open = r.rooms.filter { !$0.ended }
        let ended = r.rooms.filter(\.ended)
        if !r.ready {
            Label("Igani Meet isn’t set up yet. An admin can finish it in Igani Meet’s settings.", systemImage: "exclamationmark.triangle").font(.footnote).foregroundStyle(Theme.amber).card()
        }
        VStack(alignment: .leading, spacing: 12) {
            SectionTitle(title: "Open meetings")
            if open.isEmpty {
                EmptyHint(icon: "video.slash", title: "No open meetings", message: "Start one above. It closes on its own 30 minutes after everyone leaves.").card()
            } else {
                ForEach(open) { roomCard($0) }
            }
        }
        if !ended.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                SectionTitle(title: "Ended", trailing: "Recordings") { path.append(Route.web(path: session.me.map { $0.meetUrl } ?? "/meet", title: "Igani Meet")) }
                VStack(spacing: 0) {
                    ForEach(ended.prefix(10)) { m in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(m.title).font(.subheadline.weight(.medium)).foregroundStyle(Theme.muted)
                                Text("\(Fmt.relative(m.createdAt)) · host \(m.host)").font(.caption).foregroundStyle(Theme.muted.opacity(0.7))
                            }
                            Spacer()
                            if m.recordings > 0 { Label("\(m.recordings)", systemImage: "record.circle").font(.caption).foregroundStyle(Theme.red) }
                        }
                        .padding(12)
                    }
                }
                .card(padding: 2)
            }
        }
    }

    private func roomCard(_ m: MeetRoom) -> some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 5) {
                Text(m.title).font(.body.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1)
                Text(m.scheduledAt.map { "\(Fmt.day($0)) · \(m.durationMin) min" } ?? "Any time").font(.caption).foregroundStyle(Theme.muted)
                HStack(spacing: 10) {
                    Label("host \(m.host)", systemImage: "person").lineLimit(1)
                    if m.invites > 0 { Label("\(m.invites)", systemImage: "envelope") }
                }
                .font(.caption2).foregroundStyle(Theme.muted)
            }
            Spacer()
            Button { call = URL(string: m.joinUrl) } label: {
                Text("Join").font(.subheadline.weight(.bold)).foregroundStyle(Color(hex: 0x062E6F)).padding(.horizontal, 18).padding(.vertical, 10).background(Theme.accent, in: Capsule())
            }
            .buttonStyle(PressStyle())
        }
        .card()
        .contextMenu {
            ShareLink(item: m.joinUrl) { Label("Share link", systemImage: "square.and.arrow.up") }
            Button { UIPasteboard.general.string = m.joinUrl; toasts.show("Link copied") } label: { Label("Copy link", systemImage: "doc.on.doc") }
        }
    }

    private func join() {
        let c = code.trimmingCharacters(in: .whitespaces).lowercased()
        guard !c.isEmpty, let base = session.me.flatMap({ URL(string: $0.meetUrl) }) else { return }
        if let u = URL(string: c), u.scheme?.hasPrefix("http") == true { call = u; return }
        let slug = c.hasPrefix("igani-") ? c : "igani-\(c)"
        call = base.appending(path: slug)
        code = ""
    }

    private func start() async {
        starting = true
        defer { starting = false }
        do {
            let r: Ok<NewRoom> = try await API.shared.post("/api/mobile/v1/meet", [:])
            if let s = r.data?.joinUrl { call = URL(string: s) }
        } catch { toasts.show(error.localizedDescription, tone: .warn) }
    }

    private func load() async {
        do {
            let r: MeetList = try await API.shared.get("/api/mobile/v1/meet")
            withAnimation(.snappy) { state = .ready(r) }
        } catch {
            if state.value == nil { state = .failed(error.localizedDescription) }
        }
    }
}

/// A call, full screen, in Igani Meet itself. The page tells the app when the call is live, so the close button only
/// shows in the lobby and after leaving; going back to Meet's home closes the call screen.
struct MeetCallScreen: View {
    let url: URL
    @Environment(\.dismiss) private var dismiss
    @Environment(Session.self) private var session
    @State private var phase = "prejoin"
    @State private var progress: Double = 0
    @State private var current: URL?

    var body: some View {
        WebView(url: url, progress: $progress, current: $current, onSignedOut: { dismiss(); session.expire() }, onMessage: { m in
            if m["type"] as? String == "meet-phase", let p = m["phase"] as? String { withAnimation { phase = p } }
        }, intercept: { u in
            // "Return to home screen" → back to the app
            let p = u.path
            if p == "/" || p == "/meet" || p == "" { dismiss(); return true }
            return false
        })
        .ignoresSafeArea()
        .background(Color(hex: 0x0E1626).ignoresSafeArea())
        .overlay(alignment: .bottom) {
            // bottom centre, clear of Meet's own header and buttons
            if phase != "live" && phase != "joining" && phase != "reconnecting" {
                Button { dismiss() } label: {
                    Label("Close", systemImage: "chevron.down")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Theme.text)
                        .padding(.horizontal, 14)
                        .frame(height: 34)
                        .glass(in: Capsule(), interactive: true)
                }
                .padding(.bottom, 10)
                .transition(.opacity)
            }
        }
        .statusBarHidden(phase == "live")
        .persistentSystemOverlays(phase == "live" ? .hidden : .automatic)
    }
}
