import Observation
import SwiftUI
import UIKit
import UserNotifications

/// Push notifications: registration with Apple and the CRM, the actions on each kind (Reply, Call back…), opening the
/// right screen when one is tapped, and an in-app banner while the app is open.
@MainActor @Observable final class PushCenter: NSObject {
    static let shared = PushCenter()

    var status: UNAuthorizationStatus = .notDetermined
    private(set) var token: String?
    /// a notification was tapped: what to open (RootView shows it)
    var opened: PushLink?
    /// shown at the top while the app is open
    var banner: PushBanner?

    /// Where a tapped notification goes.
    enum PushLink: Identifiable, Hashable {
        case chat(String)
        case sms(String, String?)
        case lead(String)
        case calls
        var id: String {
            switch self {
            case .chat(let c): return "chat-\(c)"
            case .sms(let n, _): return "sms-\(n)"
            case .lead(let l): return "lead-\(l)"
            case .calls: return "calls"
            }
        }
    }

    struct PushBanner: Identifiable, Equatable {
        let id = UUID()
        let title: String
        let subtitle: String?
        let body: String
        let kind: String
        let photo: String?
        let link: PushLink?
    }

    #if DEBUG
    private let env = "sandbox"
    #else
    private let env = "production"
    #endif

    // MARK: setup

    func configure() {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        let reply = UNTextInputNotificationAction(identifier: "REPLY", title: "Reply", options: [], textInputButtonTitle: "Send", textInputPlaceholder: "Message")
        let textBack = UNTextInputNotificationAction(identifier: "TEXT", title: "Text back", options: [], textInputButtonTitle: "Send", textInputPlaceholder: "Text message")
        let call = UNNotificationAction(identifier: "CALL", title: "Call back", options: [.foreground], icon: UNNotificationActionIcon(systemImageName: "phone.fill"))
        let callLead = UNNotificationAction(identifier: "CALL", title: "Call now", options: [.foreground], icon: UNNotificationActionIcon(systemImageName: "phone.fill"))
        center.setNotificationCategories([
            UNNotificationCategory(identifier: "CHAT", actions: [reply], intentIdentifiers: [], options: []),
            UNNotificationCategory(identifier: "SMS", actions: [textBack, call], intentIdentifiers: [], options: []),
            UNNotificationCategory(identifier: "MISSED_CALL", actions: [call, textBack], intentIdentifiers: [], options: []),
            UNNotificationCategory(identifier: "LEAD", actions: [callLead], intentIdentifiers: [], options: []),
        ])
        Task { await refreshStatus() }
    }

    func refreshStatus() async {
        status = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
        if status == .authorized || status == .provisional || status == .ephemeral { UIApplication.shared.registerForRemoteNotifications() }
    }

    /// The nice ask (after our own explanation): iOS's permission prompt, then registration.
    @discardableResult func requestPermission() async -> Bool {
        let ok = (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        await refreshStatus()
        return ok
    }

    func gotToken(_ data: Data) {
        token = data.map { String(format: "%02x", $0) }.joined()
        Task { await registerWithServer() }
    }

    func registerWithServer(prefs: [String: Bool]? = nil) async {
        guard let token, API.shared.session?.stored != nil else { return }
        var body: [String: Any] = ["token": token, "env": env]
        if let prefs { body["prefs"] = prefs }
        let _: Anything? = try? await API.shared.post("/api/mobile/v1/push", body)
    }

    /// Signing out: this phone stops getting this person's notifications.
    func unregister() async {
        guard let token else { return }
        let _: Anything? = try? await API.shared.delete("/api/mobile/v1/push", query: [URLQueryItem(name: "token", value: token)])
        try? await UNUserNotificationCenter.current().setBadgeCount(0)
    }

    /// The icon's number: unread chat plus unread texts.
    func refreshBadge() async {
        var n = ChatBadge.shared.unread
        if ["ADMIN", "SALES"].contains(API.shared.session?.me?.role ?? ""), let sms: Int = try? await API.shared.act("smsUnread") { n += sms }
        try? await UNUserNotificationCenter.current().setBadgeCount(n)
    }

    // MARK: what a notification means

    static func link(from info: [AnyHashable: Any]) -> PushLink? {
        switch info["type"] as? String {
        case "chat": return (info["channelId"] as? String).map { .chat($0) }
        case "sms": return (info["number"] as? String).map { .sms($0, info["name"] as? String) }
        case "lead": return (info["leadId"] as? String).map { .lead($0) }
        case "missed":
            if let l = info["leadId"] as? String { return .lead(l) }
            return .calls
        default: return nil
        }
    }

    fileprivate func handle(action: String, info: [String: String], text: String?) async {
        let type = info["type"] as? String
        switch action {
        case "REPLY":
            guard let channel = info["channelId"] as? String, let text, !text.trimmingCharacters(in: .whitespaces).isEmpty else { return }
            try? await API.shared.run("chatSend", ["channelId": channel, "body": text])
        case "TEXT":
            guard let number = info["number"] as? String, let text, !text.trimmingCharacters(in: .whitespaces).isEmpty else { return }
            try? await API.shared.run("sendText", ["to": number, "body": text])
        case "CALL":
            let number = (info["number"] as? String) ?? (info["phone"] as? String)
            guard let number else { opened = PushCenter.link(from: info); return }
            do { try await Phone.shared.call(number, leadId: info["leadId"] as? String, name: info["name"] as? String) } catch { ToastCenter.shared?.show(error.localizedDescription, tone: .warn) }
        default:
            if type != nil { opened = PushCenter.link(from: info) }
        }
        await refreshBadge()
    }

    fileprivate func present(_ n: UNNotification) -> UNNotificationPresentationOptions {
        let info = n.request.content.userInfo
        let link = PushCenter.link(from: info)
        // already looking at that conversation: no banner, the message is right there
        if case .chat(let c)? = link, ChatScreenTracker.open == c { return [] }
        let c = n.request.content
        banner = PushBanner(title: c.title, subtitle: c.subtitle.isEmpty ? nil : c.subtitle, body: c.body, kind: (info["type"] as? String) ?? "", photo: info["senderPhoto"] as? String, link: link)
        Task { await ChatBadge.shared.refresh() }
        return [.list, .badge, .sound]
    }
}

extension PushCenter: UNUserNotificationCenterDelegate {
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        await MainActor.run { PushCenter.shared.present(notification) }
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        let info = response.notification.request.content.userInfo
        let text = (response as? UNTextInputNotificationResponse)?.userText
        let action = response.actionIdentifier == UNNotificationDefaultActionIdentifier ? "OPEN" : response.actionIdentifier
        // the info dictionary isn't Sendable: pass the few strings we use
        var plain: [String: String] = [:]
        for k in ["type", "channelId", "number", "name", "leadId", "phone", "senderPhoto"] { if let v = info[k] as? String { plain[k] = v } }
        await PushCenter.shared.handle(action: action, info: plain, text: text)
    }
}

/// Which chat conversation is on screen (no banner for messages you're already reading).
@MainActor enum ChatScreenTracker { static var open: String? }

/// UIKit's side: the APNs device token arrives here.
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        MainActor.assumeIsolated { PushCenter.shared.configure() }
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        MainActor.assumeIsolated { PushCenter.shared.gotToken(deviceToken) }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[push] not registered:", error.localizedDescription)
    }
}
