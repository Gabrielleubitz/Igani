import SwiftUI

/// Everything else in the CRM, grouped like the website's sidebar (only what your role may open). Each page opens
/// inside the app, signed in.
struct MoreView: View {
    @Binding var tab: AppTab
    @Environment(Session.self) private var session
    @Environment(\.openURL) private var openURL
    @State private var path = NavigationPath()
    @State private var showProfile = false
    /// the tabs already cover these
    private var inTabs: Set<String> {
        var s: Set<String> = ["today", "leads", "tasks"]
        if !["ADMIN", "SALES"].contains(session.me?.role ?? "") { s.insert("igani-meet") }
        return s
    }

    private var groups: [(String, [NavPage])] {
        let pages = (session.me?.pages ?? []).filter { !inTabs.contains($0.id) }
        var order: [String] = []
        var by: [String: [NavPage]] = [:]
        for p in pages {
            let g = p.group ?? "Workspace"
            if by[g] == nil { order.append(g) }
            by[g, default: []].append(p)
        }
        return order.map { ($0, by[$0]!) }
    }

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    Button { showProfile = true } label: {
                        HStack(spacing: 14) {
                            Avatar(name: session.me?.name ?? "?", url: session.me?.avatar, size: 56)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(session.me?.name ?? "").font(.headline).foregroundStyle(Theme.text)
                                Text("\(session.me?.roleLabel ?? "") · \(session.me?.email ?? "")").font(.caption).foregroundStyle(Theme.muted).lineLimit(1)
                            }
                            Spacer()
                            Image(systemName: "chevron.right").font(.caption).foregroundStyle(Theme.muted)
                        }
                        .card()
                    }
                    .buttonStyle(PressStyle())

                    ForEach(groups, id: \.0) { g in
                        VStack(alignment: .leading, spacing: 10) {
                            Text(g.0.uppercased()).font(.caption.weight(.bold)).kerning(0.8).foregroundStyle(Theme.muted).padding(.horizontal, 4)
                            LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                                ForEach(g.1) { p in tile(p) }
                            }
                        }
                    }

                    VStack(spacing: 10) {
                        Link(destination: Config.baseURL) { Label("Open Igani CRM in Safari", systemImage: "safari").frame(maxWidth: .infinity).padding(.vertical, 12).background(Theme.card, in: Capsule()) }
                        Text("Igani CRM \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "") · \(Config.baseURL.host ?? "")").font(.caption2).foregroundStyle(Theme.muted)
                    }
                    .font(.subheadline.weight(.semibold))
                }
                .padding(16)
            }
            .screenBackground()
            .navigationTitle("More")
            .routes()
            .sheet(isPresented: $showProfile) { ProfileSheet() }
            #if DEBUG
            .onAppear {
                if let p = UserDefaults.standard.string(forKey: "openPage"), path.isEmpty {
                    if let page = session.me?.pages.first(where: { $0.id == p || $0.href == p }) { path.append(Route.page(page)) } else { path.append(Route.web(path: p, title: "Page")) }
                }
            }
            #endif
        }
    }

    @ViewBuilder private func tile(_ p: NavPage) -> some View {
        let label = VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: Symbols.page(p.icon)).font(.system(size: 17, weight: .semibold)).foregroundStyle(.white)
                    .frame(width: 38, height: 38)
                    .background(Theme.gradient(for: p.id), in: RoundedRectangle(cornerRadius: 11, style: .continuous))
                Spacer()
                if NativePage.browserOnly.contains(p.id) { Image(systemName: "arrow.up.right").font(.caption.weight(.bold)).foregroundStyle(Theme.muted) }
            }
            Text(p.label).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(2).multilineTextAlignment(.leading)
        }
        .padding(14)
        .frame(maxWidth: .infinity, minHeight: 104, alignment: .topLeading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Theme.line))

        if NativePage.browserOnly.contains(p.id) {
            Button { openURL(Config.baseURL.appending(path: String(p.href.dropFirst()))) } label: { label }.buttonStyle(PressStyle())
        } else {
            NavigationLink(value: Route.page(p)) { label }.buttonStyle(PressStyle())
        }
    }
}

struct ProfileSheet: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    #if DEBUG
    @AppStorage("serverURL") private var server = ""
    #endif
    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(spacing: 10) {
                        Avatar(name: session.me?.name ?? "?", url: session.me?.avatar, size: 80)
                        Text(session.me?.name ?? "").font(.title3.weight(.bold))
                        Text(session.me?.email ?? "").font(.subheadline).foregroundStyle(Theme.muted)
                        Text(session.me?.roleLabel ?? "").font(.caption.weight(.semibold)).padding(.horizontal, 10).padding(.vertical, 4).background(Theme.accent.opacity(0.15), in: Capsule()).foregroundStyle(Theme.accent)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .listRowBackground(Color.clear)
                }
                Section("Account") {
                    LabeledContent("Time zone", value: session.me?.timeZone ?? "")
                    NavigationLink("Settings on the web") { WebScreen(path: "/admin/settings", title: "Settings") }
                }
                .listRowBackground(Theme.card)
                #if DEBUG
                Section("Developer") {
                    TextField("Server (blank = app.igani.co)", text: $server).textInputAutocapitalization(.never).autocorrectionDisabled().font(.footnote)
                    Text("Sign out and back in after changing the server.").font(.caption).foregroundStyle(Theme.muted)
                }
                .listRowBackground(Theme.card)
                #endif
                Section {
                    Button("Sign out", role: .destructive) { dismiss(); session.signOut() }
                }
                .listRowBackground(Theme.card)
            }
            .scrollContentBackground(.hidden)
            .background(Theme.bg)
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }
}
