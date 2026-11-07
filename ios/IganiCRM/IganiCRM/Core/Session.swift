import AuthenticationServices
import Foundation
import Observation
import SwiftUI
import WebKit

struct StoredSession: Codable, Equatable { var cookie: String; var token: String }

/// Signing in and out. The app holds the same session cookie the website uses (from the CRM's own Google sign-in),
/// so every permission is the website's. It's kept in the Keychain and refreshed whenever the server rolls it.
@MainActor @Observable final class Session {
    enum Phase: Equatable { case starting, signedOut, signedIn, failed(String) }

    var phase: Phase = .starting
    var me: Me?
    var signInError: String?
    private(set) var stored: StoredSession?

    init() {
        // The Keychain outlives the app: a fresh install starts signed out
        if !UserDefaults.standard.bool(forKey: "installed") {
            Keychain.delete(account: "session")
            UserDefaults.standard.set(true, forKey: "installed")
        }
        if let d = Keychain.load(account: "session"), let s = try? JSONDecoder().decode(StoredSession.self, from: d) { stored = s }
        API.shared.session = self
    }

    var stages: [Stage] { me?.stages ?? [] }

    func start() async {
        #if DEBUG
        if stored == nil, Config.isLocal, let email = UserDefaults.standard.string(forKey: "devEmail") { await devSignIn(email: email); return }
        #endif
        guard stored != nil else { phase = .signedOut; return }
        do {
            me = try await API.shared.get("/api/mobile/v1/me")
            phase = .signedIn
            await WebCookies.install(stored, me: me)
        } catch let e as APIError where e.status == 401 {
            expire()
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    /// Google sign-in on the CRM's own page, in Apple's sign-in sheet; the CRM hands the session back to igani-crm://.
    func signIn(with auth: WebAuthenticationSession) async {
        signInError = nil
        var url = Config.baseURL.appending(path: "login")
        url.append(queryItems: [URLQueryItem(name: "callbackUrl", value: "/api/mobile/auth/finish")])
        do {
            let back = try await auth.authenticate(using: url, callbackURLScheme: Config.callbackScheme, preferredBrowserSession: .shared)
            let items = URLComponents(url: back, resolvingAgainstBaseURL: false)?.queryItems ?? []
            guard let name = items.first(where: { $0.name == "cookie" })?.value, let token = items.first(where: { $0.name == "token" })?.value, !token.isEmpty else {
                signInError = "Sign-in didn’t finish. Please try again."
                return
            }
            save(StoredSession(cookie: name, token: token))
            phase = .starting
            await start()
        } catch let e as ASWebAuthenticationSessionError where e.code == .canceledLogin {
            return
        } catch {
            signInError = error.localizedDescription
        }
    }

    #if DEBUG
    /// Local development only (the server refuses this in production).
    func devSignIn(email: String) async {
        struct Dev: Decodable { let cookie: String; let token: String }
        do {
            let d: Dev = try await API.shared.post("/api/mobile/auth/dev", ["email": email], authenticated: false)
            save(StoredSession(cookie: d.cookie, token: d.token))
            await start()
        } catch {
            signInError = error.localizedDescription
            phase = .signedOut
        }
    }
    #endif

    func updateToken(_ token: String) {
        guard var s = stored, s.token != token else { return }
        s.token = token
        save(s)
    }

    func expire() {
        clear()
        signInError = "Your session ended. Please sign in again."
    }

    func signOut() {
        clear()
        signInError = nil
    }

    private func clear() {
        Keychain.delete(account: "session")
        stored = nil
        me = nil
        phase = .signedOut
        Task { await WebCookies.clear() }
    }

    private func save(_ s: StoredSession) {
        stored = s
        if let d = try? JSONEncoder().encode(s) { Keychain.save(d, account: "session") }
    }
}

/// The in-app web pages (every CRM page, and Igani Meet) share the session through WebKit's cookie store.
enum WebCookies {
    @MainActor static func install(_ s: StoredSession?, me: Me?) async {
        guard let s else { return }
        let store = WKWebsiteDataStore.default().httpCookieStore
        var hosts = Set([Config.baseURL.host ?? "app.igani.co"])
        if let m = me.flatMap({ URL(string: $0.meetUrl)?.host }) { hosts.insert(m) }
        for host in hosts {
            let secure = Config.baseURL.scheme == "https"
            for (name, value) in [(s.cookie, s.token), ("igani-app", "1")] {
                var props: [HTTPCookiePropertyKey: Any] = [.domain: host, .path: "/", .name: name, .value: value, .expires: Date().addingTimeInterval(60 * 60 * 24 * 30)]
                if secure { props[.secure] = "TRUE" }
                if let c = HTTPCookie(properties: props) { await store.setCookie(c) }
            }
        }
    }

    @MainActor static func clear() async {
        let types = WKWebsiteDataStore.allWebsiteDataTypes()
        await WKWebsiteDataStore.default().removeData(ofTypes: types, modifiedSince: .distantPast)
    }
}
