import SwiftUI

@main
struct IganiCRMApp: App {
    @State private var session = Session()
    @State private var toasts = Toasts()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .environment(toasts)
                .preferredColorScheme(.dark)
                .tint(Theme.accent)
        }
    }
}

struct RootView: View {
    @Environment(Session.self) private var session

    var body: some View {
        ZStack {
            switch session.phase {
            case .starting:
                IganiLoader(text: "Opening Igani CRM")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .screenBackground()
                    .transition(.opacity)
            case .signedOut:
                SignInView().transition(.opacity)
            case .failed(let message):
                VStack(spacing: 18) {
                    EmptyHint(icon: "wifi.exclamationmark", title: "Can’t reach Igani", message: message)
                    PrimaryButton(title: "Try again", icon: "arrow.clockwise") { Task { await session.start() } }.frame(maxWidth: 240)
                    Button("Sign out", role: .destructive) { session.signOut() }.font(.footnote)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .screenBackground()
            case .signedIn:
                MainTabs().transition(.opacity)
            }
            ToastOverlay()
        }
        .animation(.easeInOut(duration: 0.35), value: session.phase)
        .task { await session.start() }
    }
}

enum AppTab: Hashable { case today, leads, tasks, meet, more }

/// The app's five places. On iOS 26 the tab bar is Liquid Glass.
struct MainTabs: View {
    @State private var tab: AppTab = MainTabs.initialTab
    var body: some View {
        TabView(selection: $tab) {
            Tab("Today", systemImage: "sun.max", value: AppTab.today) { TodayView(tab: $tab) }
            Tab("Leads", systemImage: "person.2", value: AppTab.leads) { LeadsView() }
            Tab("Tasks", systemImage: "checklist", value: AppTab.tasks) { TasksView() }
            Tab("Meet", systemImage: "video", value: AppTab.meet) { MeetView() }
            Tab("More", systemImage: "square.grid.2x2", value: AppTab.more) { MoreView() }
        }
        .sensoryFeedback(.selection, trigger: tab)
    }

    /// Debug builds: `-tab leads` opens on a tab (for screenshots and testing).
    static var initialTab: AppTab {
        #if DEBUG
        switch UserDefaults.standard.string(forKey: "tab") {
        case "leads": return .leads
        case "tasks": return .tasks
        case "meet": return .meet
        case "more": return .more
        default: return .today
        }
        #else
        return .today
        #endif
    }
}
