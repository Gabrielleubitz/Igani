import Intents
import SwiftUI

@main
struct IganiCRMApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
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
                    Button("Sign out", role: .destructive) { Task { await PushCenter.shared.unregister(); session.signOut() } }
                        .font(.footnote)
                        .frame(minHeight: 44)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .screenBackground()
            case .signedIn:
                MainTabs().transition(.opacity)
            }
            if session.phase == .signedIn {
                KeypadFab()
                PhoneLayer()
                PushBannerOverlay()
            }
            ToastOverlay()
        }
        // a tapped notification opens once signed in (a cold launch from a tap lands here before the session is ready)
        .sheet(item: Binding(get: { session.phase == .signedIn ? push.opened : nil }, set: { push.opened = $0 })) { PushLinkSheet(link: $0).toastHost() }
        .sheet(isPresented: $askPush) { NotificationsPrompt().toastHost() }
        // tapping an Igani call in the iPhone's Recents (or "call with Igani" from Contacts) dials through the app
        .onContinueUserActivity("INStartCallIntent") { activity in
            guard let intent = activity.interaction?.intent as? INStartCallIntent, let handle = intent.contacts?.first?.personHandle?.value else { return }
            let name = intent.contacts?.first?.displayName
            // only real numbers: a listen-in shows in Recents as "Listening: <rep>", which can't be dialled
            let digits = handle.filter { !" -().".contains($0) }
            guard digits.count >= 3, digits.allSatisfy({ $0.isNumber || $0 == "+" }) else { return }
            Task {
                // opened from Recents with the app closed: wait for the session to come back first
                for _ in 0..<40 where session.phase == .starting { try? await Task.sleep(for: .milliseconds(250)) }
                guard session.phase == .signedIn else { toasts.show("Sign in to call through Igani.", tone: .warn); return }
                do { try await Phone.shared.call(handle, name: name) } catch { toasts.show(error.localizedDescription, tone: .warn) }
            }
        }
        .onChange(of: scenePhase) { _, p in
            guard p == .active else { return }
            if session.phase == .signedIn {
                Task {
                    await ChatBadge.shared.refresh()
                    await PushCenter.shared.refreshBadge()
                    // notifications turned on or off in iPhone Settings while away
                    await PushCenter.shared.refreshStatus()
                }
            } else if case .failed = session.phase {
                // couldn't reach Igani before: try again on coming back (the connection is often back by then)
                Task { await session.start() }
            }
        }
        .animation(.easeInOut(duration: 0.35), value: session.phase)
        .task { await session.start() }
        .onAppear { ToastCenter.shared = toasts }
        .onChange(of: session.phase) { _, p in
            if p == .signedIn {
                Task { await Phone.shared.prepare() }
                ChatBadge.shared.start()
                Task { await PhoneContacts.shared.load() }
                Task {
                    await PushCenter.shared.refreshStatus()
                    await PushCenter.shared.registerWithServer()
                    // once, after the first sign-in: explain notifications, then iOS asks
                    if PushCenter.shared.status == .notDetermined, !UserDefaults.standard.bool(forKey: "askedPush") {
                        UserDefaults.standard.set(true, forKey: "askedPush")
                        try? await Task.sleep(for: .seconds(1.2))
                        askPush = true
                    }
                }
            } else if p == .signedOut { Phone.shared.signedOut(); ChatBadge.shared.stop() }
        }
    }
    @Environment(Toasts.self) private var toasts
    @Environment(\.scenePhase) private var scenePhase
    @State private var push = PushCenter.shared
    @State private var askPush = false
}

/// The call on top of everything: full screen while it matters, a bar while you browse, and the wrap-up after.
struct PhoneLayer: View {
    @State private var phone = Phone.shared
    var body: some View {
        ZStack(alignment: .top) {
            if phone.active != nil, phone.expanded {
                CallScreen().transition(.move(edge: .bottom))
                    .zIndex(2)
            }
            VStack { CallBar(); Spacer() }
                .zIndex(1)
        }
        .animation(.spring(response: 0.45, dampingFraction: 0.86), value: phone.expanded)
        .animation(.spring(response: 0.45, dampingFraction: 0.86), value: phone.active?.id)
        .sheet(item: $phone.wrapUp) { w in WrapUpSheet(wrap: w).toastHost() }
    }
}

enum AppTab: Hashable { case today, leads, phone, tasks, meet, more }

/// The app's five places. On iOS 26 the tab bar is Liquid Glass.
struct MainTabs: View {
    @Environment(Session.self) private var session
    @State private var tab: AppTab = MainTabs.initialTab
    @State private var router = TabRouter.shared
    private var seller: Bool { ["ADMIN", "SALES"].contains(session.me?.role ?? "") }
    var body: some View {
        TabView(selection: $tab) {
            Tab("Today", systemImage: "sun.max", value: AppTab.today) { TodayView(tab: $tab) }
            Tab("Leads", systemImage: "person.2", value: AppTab.leads) { LeadsView() }
            if seller {
                Tab("Phone", systemImage: "phone", value: AppTab.phone) { PhoneView() }
            }
            Tab("Tasks", systemImage: "checklist", value: AppTab.tasks) { TasksView() }
            if !seller {
                Tab("Meet", systemImage: "video", value: AppTab.meet) { MeetView() }
            }
            Tab("More", systemImage: "square.grid.2x2", value: AppTab.more) { MoreView(tab: $tab) }
                .badge(ChatBadge.shared.unread)
        }
        .sensoryFeedback(.selection, trigger: tab)
        .onChange(of: tab, initial: true) { _, t in router.current = t }
        .onChange(of: router.request) { _, r in
            guard let r else { return }
            tab = r
            router.request = nil
        }
    }

    /// Debug builds: `-tab leads` opens on a tab (for screenshots and testing).
    static var initialTab: AppTab {
        #if DEBUG
        switch UserDefaults.standard.string(forKey: "tab") {
        case "leads": return .leads
        case "tasks": return .tasks
        case "phone": return .phone
        case "meet": return .meet
        case "more": return .more
        default: return .today
        }
        #else
        return .today
        #endif
    }
}

/// Lets any screen switch tabs (a phone link opens the keypad).
@MainActor @Observable final class TabRouter {
    static let shared = TabRouter()
    var request: AppTab?
    /// The tab on screen (the floating keypad hides on the Phone tab).
    var current: AppTab = .today
    /// a chat conversation is open (its composer sits where the floating keypad would)
    var chatOpen = false
    /// Opens the keypad with this number ready (it doesn't dial by itself).
    func dial(_ number: String) {
        PendingDial.shared.set(PhoneFmt.clean(number))
        request = .phone
    }
}
