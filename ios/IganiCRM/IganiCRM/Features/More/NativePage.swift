import SwiftUI

/// Each CRM section's own screen in the app. Pages that only make sense in a browser (offers, contract editing) open
/// in Safari instead; everything else is native.
struct NativePage: View {
    let page: NavPage

    /// The website's path → a section with a native screen.
    static func page(for path: String, title: String) -> NavPage? {
        let known = ["/sales/board": "board", "/sales/reports": "analytics", "/sales/calls": "calls", "/sales/call-lists": "call-lists"]
        guard let id = known[path] else { return nil }
        return NavPage(id: id, label: title, icon: nil, href: path, group: nil)
    }

    var body: some View {
        switch page.id {
        case "calls": CallsView()
        case "call-lists": CallListsScreen()
        default: WebScreen(path: page.href, title: page.label)
        }
    }
}

struct CallListsScreen: View {
    var body: some View {
        CallListsPane().screenBackground().navigationTitle("Call lists")
    }
}
