import SwiftUI

/// Each CRM section's own screen in the app. Pages that only work in a browser (offers, which are web pages for
/// clients and their editor) open in Safari instead; everything else is native.
struct NativePage: View {
    let page: NavPage

    /// Sections that open in Safari rather than inside the app.
    static let browserOnly: Set<String> = ["offers"]

    /// The website's path → a section with a native screen.
    static func page(for path: String, title: String) -> NavPage? {
        guard let id = ids[path] else { return nil }
        return NavPage(id: id, label: title, icon: nil, href: path, group: nil)
    }

    private static let ids: [String: String] = [
        "/sales/chat": "chat", "/sales/board": "board", "/sales/reports": "analytics", "/sales/calls": "calls", "/sales/call-lists": "call-lists",
        "/meet": "igani-meet", "/sales/team-meeting": "team-meeting", "/sales/invite": "invite", "/sales/videos": "straight-line",
        "/sales/documents": "documents", "/marketing": "marketing", "/admin/dashboard": "overview", "/admin/payouts": "payouts",
        "/admin/sales-contracts": "sales-contracts", "/admin/bookings": "bookings", "/admin/booking-pages": "booking-pages",
        "/admin/team-meetings": "team-meetings", "/admin/videos": "video-library", "/admin/website": "website", "/admin/phone": "phone",
        "/admin/team": "sales-team", "/admin/users": "team-access", "/admin/audit": "audit", "/admin/settings": "settings",
    ]

    var body: some View {
        switch page.id {
        case "chat": ChatHomeView()
        case "board": BoardView()
        case "analytics": AnalyticsView()
        case "calls": CallsView()
        case "call-lists": CallListsScreen()
        case "igani-meet": MeetView(embedded: true)
        case "team-meeting": BookMeetingView(kind: .team)
        case "invite": BookMeetingView(kind: .client)
        case "straight-line": VideosView()
        case "documents": DocumentsView()
        case "marketing": MarketingView()
        case "overview": AdminOverviewView()
        case "payouts": PayoutsView()
        case "sales-contracts": SalesContractsView()
        case "bookings": AdminBookingsView()
        case "booking-pages": BookingPagesView()
        case "team-meetings": TeamMeetingsView()
        case "video-library": VideoLibraryView()
        case "website": WebsiteInsightsView()
        case "phone": PhoneAdminView()
        case "sales-team": SalesTeamView()
        case "team-access": TeamAccessView()
        case "audit": AuditView()
        case "settings": AdminSettingsView()
        default: WebScreen(path: page.href, title: page.label)
        }
    }
}

struct CallListsScreen: View {
    var body: some View {
        CallListsPane().frame(maxWidth: .infinity, maxHeight: .infinity).screenBackground().navigationTitle("Call lists")
    }
}
