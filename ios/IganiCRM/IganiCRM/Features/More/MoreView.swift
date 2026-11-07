import SwiftUI

/// Everything else in the CRM, grouped like the website's sidebar (only what your role may open). Each page opens
/// inside the app, signed in.
struct MoreView: View {
    @Binding var tab: AppTab
    @Environment(Session.self) private var session
    @State private var path = NavigationPath()
    @State private var showProfile = false
    /// the tabs already cover these
    private let native: Set<String> = ["today", "leads", "tasks", "igani-meet"]

    private var groups: [(String, [NavPage])] {
        let pages = (session.me?.pages ?? []).filter { !native.contains($0.id) }
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
            List {
                Section {
                    Button { showProfile = true } label: {
                        HStack(spacing: 14) {
                            Avatar(name: session.me?.name ?? "?", url: session.me?.avatar, size: 54)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(session.me?.name ?? "").font(.headline).foregroundStyle(Theme.text)
                                Text("\(session.me?.roleLabel ?? "") · \(session.me?.email ?? "")").font(.caption).foregroundStyle(Theme.muted).lineLimit(1)
                            }
                            Spacer()
                            Image(systemName: "chevron.right").font(.caption).foregroundStyle(Theme.muted)
                        }
                        .padding(.vertical, 6)
                    }
                    .listRowBackground(Theme.card)
                }
                ForEach(groups, id: \.0) { g in
                    Section(g.0) {
                        ForEach(g.1) { p in
                            NavigationLink(value: Route.page(p)) {
                                Label {
                                    Text(p.label).foregroundStyle(Theme.text)
                                } icon: {
                                    Image(systemName: Symbols.page(p.icon)).font(.footnote.weight(.semibold)).foregroundStyle(.white)
                                        .frame(width: 30, height: 30)
                                        .background(Theme.gradient(for: p.id), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                                }
                            }
                            .listRowBackground(Theme.card)
                        }
                    }
                }
                Section {
                    Link(destination: Config.baseURL) { Label("Open Igani CRM in Safari", systemImage: "safari") }.listRowBackground(Theme.card)
                    Button(role: .destructive) { session.signOut() } label: { Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right") }.listRowBackground(Theme.card)
                } footer: {
                    Text("Igani CRM \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "") · \(Config.baseURL.host ?? "")")
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .screenBackground()
            .navigationTitle("More")
            .routes()
            .sheet(isPresented: $showProfile) { ProfileSheet() }
            #if DEBUG
            .onAppear {
                if let p = UserDefaults.standard.string(forKey: "openPage"), path.isEmpty { path.append(Route.web(path: p, title: "Page")) }
            }
            #endif
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
