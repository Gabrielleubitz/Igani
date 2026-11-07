import SwiftUI
import WebKit

/// One CRM page inside the app, signed in with the app's session and without the website's own sidebar (the app is the
/// navigation). Phone, text and email links open the right app; other sites open in Safari.
struct WebScreen: View {
    let path: String
    let title: String
    @Environment(Session.self) private var session
    @State private var progress: Double = 0
    @State private var reloadTick = 0
    @State private var current: URL?

    var url: URL { WebScreen.resolve(path) }

    static func resolve(_ path: String) -> URL {
        if let u = URL(string: path), u.scheme != nil { return u }
        return Config.baseURL.appending(path: path.hasPrefix("/") ? String(path.dropFirst()) : path)
    }

    var body: some View {
        WebView(url: url, reloadTick: reloadTick, progress: $progress, current: $current, onSignedOut: { session.expire() })
            .ignoresSafeArea(edges: .bottom)
            .background(Theme.bg)
            .overlay(alignment: .top) {
                if progress > 0, progress < 1 {
                    ProgressView(value: progress).progressViewStyle(.linear).tint(Theme.accent).frame(height: 2)
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Reload", systemImage: "arrow.clockwise") { reloadTick += 1 }
                        if let u = current ?? Optional(url) {
                            ShareLink(item: u) { Label("Share link", systemImage: "square.and.arrow.up") }
                            Link(destination: u) { Label("Open in Safari", systemImage: "safari") }
                        }
                    } label: { Image(systemName: "ellipsis.circle") }
                }
            }
    }
}

/// The WKWebView itself. Also used full screen for Igani Meet calls.
struct WebView: UIViewRepresentable {
    let url: URL
    var reloadTick = 0
    @Binding var progress: Double
    @Binding var current: URL?
    var onSignedOut: () -> Void = {}
    /// messages from the page (Igani Meet tells the app which screen it's on)
    var onMessage: (([String: Any]) -> Void)? = nil
    /// a link the app wants to handle itself instead of navigating (return true to cancel)
    var intercept: ((URL) -> Bool)? = nil

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default()
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []
        cfg.applicationNameForUserAgent = "IganiCRM-iOS/1.0"
        cfg.userContentController.add(context.coordinator, name: "iganiApp")
        let web = WKWebView(frame: .zero, configuration: cfg)
        web.isOpaque = false
        web.backgroundColor = UIColor(Theme.bg)
        web.scrollView.backgroundColor = UIColor(Theme.bg)
        web.allowsBackForwardNavigationGestures = true
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        #if DEBUG
        web.isInspectable = true
        #endif
        let refresh = UIRefreshControl()
        refresh.tintColor = UIColor(Theme.accent)
        refresh.addTarget(context.coordinator, action: #selector(Coordinator.pulled(_:)), for: .valueChanged)
        web.scrollView.refreshControl = refresh
        context.coordinator.observe(web)
        web.load(URLRequest(url: url))
        context.coordinator.lastTick = reloadTick
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {
        context.coordinator.parent = self
        if context.coordinator.lastTick != reloadTick {
            context.coordinator.lastTick = reloadTick
            web.reload()
        }
    }

    static func dismantleUIView(_ web: WKWebView, coordinator: Coordinator) {
        web.configuration.userContentController.removeScriptMessageHandler(forName: "iganiApp")
        coordinator.observers.removeAll()
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        var parent: WebView
        var lastTick = 0
        var observers: [NSKeyValueObservation] = []
        init(_ p: WebView) { parent = p }

        func observe(_ web: WKWebView) {
            observers = [
                web.observe(\.estimatedProgress, options: .new) { [weak self] w, _ in
                    DispatchQueue.main.async { self?.parent.progress = w.estimatedProgress }
                },
                web.observe(\.url, options: .new) { [weak self] w, _ in
                    DispatchQueue.main.async { self?.parent.current = w.url }
                },
            ]
        }

        @objc func pulled(_ c: UIRefreshControl) {
            (c.superview?.superview as? WKWebView)?.reload()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { c.endRefreshing() }
        }

        private func isIgani(_ host: String?) -> Bool {
            guard let h = host?.lowercased() else { return false }
            let ours = [Config.baseURL.host?.lowercased(), "app.igani.co", "meet.igani.co", "meet.localhost"].compactMap { $0 }
            return ours.contains(h) || h.hasSuffix(".igani.co") || h == "localhost"
        }

        func webView(_ web: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else { return decisionHandler(.allow) }
            if let scheme = url.scheme?.lowercased(), ["tel", "sms", "mailto", "facetime", "maps"].contains(scheme) {
                // phone links on CRM pages open the app's own keypad (calls go out from the Igani number)
                if scheme == "tel", Phone.shared.isSeller {
                    TabRouter.shared.dial(url.absoluteString.replacingOccurrences(of: "tel:", with: "").removingPercentEncoding ?? "")
                    return decisionHandler(.cancel)
                }
                UIApplication.shared.open(url)
                return decisionHandler(.cancel)
            }
            if parent.intercept?(url) == true { return decisionHandler(.cancel) }
            // signed out on the server: back to the app's sign-in
            if isIgani(url.host), url.path == "/login" || url.path == "/meet/login" {
                parent.onSignedOut()
                return decisionHandler(.cancel)
            }
            let main = action.targetFrame?.isMainFrame ?? true
            if main, !isIgani(url.host), ["http", "https"].contains(url.scheme ?? "") {
                // Google sign-in for Calendar/Gmail and other sites belong in Safari
                UIApplication.shared.open(url)
                return decisionHandler(.cancel)
            }
            decisionHandler(.allow)
        }

        // target=_blank: open here (ours) or in Safari (anything else)
        func webView(_ web: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url {
                if isIgani(url.host) { web.load(URLRequest(url: url)) } else { UIApplication.shared.open(url) }
            }
            return nil
        }

        // Igani Meet and the dialer need the camera and microphone
        func webView(_ web: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(.grant)
        }

        func webView(_ web: WKWebView, didFinish navigation: WKNavigation!) {
            web.scrollView.refreshControl?.endRefreshing()
        }

        func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
            if let body = message.body as? [String: Any] { parent.onMessage?(body) }
        }
    }
}
