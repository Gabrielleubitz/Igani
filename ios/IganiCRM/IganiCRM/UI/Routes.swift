import SwiftUI

/// Where a tap can go: a native lead page, or any CRM page inside the app.
enum Route: Hashable {
    case lead(String)
    case web(path: String, title: String)
    /// a CRM section with its own screen in the app (the More tab)
    case page(NavPage)

    /// A website link (from Today's actions, agenda…) → the native screen when there is one.
    static func from(href: String, title: String) -> Route {
        let parts = href.split(separator: "?").first.map(String.init) ?? href
        let segs = parts.split(separator: "/")
        if segs.count == 3, segs[0] == "sales", segs[1] == "leads" { return .lead(String(segs[2])) }
        if let page = NativePage.page(for: parts, title: title) { return .page(page) }
        return .web(path: href, title: title)
    }
}

extension View {
    func routes() -> some View {
        navigationDestination(for: Route.self) { r in
            switch r {
            case .lead(let id): LeadDetailView(id: id)
            case .web(let path, let title): WebScreen(path: path, title: title)
            case .page(let page): NativePage(page: page)
            }
        }
        .callRoutes()
    }
}

/// Loading / error / content for a screen that fetches.
enum Load<T> {
    case loading
    case failed(String)
    case ready(T)
    var value: T? { if case .ready(let v) = self { return v }; return nil }
}

struct LoadFailed: View {
    let message: String
    let retry: () async -> Void
    var body: some View {
        VStack(spacing: 14) {
            EmptyHint(icon: "exclamationmark.triangle", title: "Couldn’t load this", message: message)
            Button("Try again") { Task { await retry() } }.buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, minHeight: 300)
    }
}
