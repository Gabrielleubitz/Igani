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
    @State private var backTick = 0
    @State private var canGoBack = false
    @State private var current: URL?
    /// times the page was sent to sign-in while the app's own session still worked (cookies re-given, page reloaded)
    @State private var recovered = 0

    var url: URL { WebScreen.resolve(path) }

    /// A website path ("/sales/leads?status=NEW") or a full URL → the URL to open. Query strings and fragments are kept
    /// (appending(path:) would escape the "?" into the path).
    static func resolve(_ path: String) -> URL {
        if let u = URL(string: path), u.scheme != nil { return u }
        let rel = path.hasPrefix("/") ? path : "/" + path
        if let u = URL(string: rel, relativeTo: Config.baseURL)?.absoluteURL { return u }
        return Config.baseURL.appending(path: String(rel.dropFirst()))
    }

    var body: some View {
        WebView(url: url, reloadTick: reloadTick, progress: $progress, current: $current, onSignedOut: { signedOut() }, backTick: backTick, canGoBack: $canGoBack)
            .ignoresSafeArea(edges: .bottom)
            .background(Theme.bg)
            .overlay(alignment: .top) {
                if progress > 0, progress < 1 {
                    ProgressView(value: progress).progressViewStyle(.linear).tint(Theme.accent).frame(height: 2)
                        .accessibilityLabel("Loading")
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if canGoBack {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { backTick += 1 } label: { Image(systemName: "chevron.backward.circle") }
                            .accessibilityLabel("Back a page")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Reload", systemImage: "arrow.clockwise") { reloadTick += 1 }
                        let u = current ?? url
                        ShareLink(item: u) { Label("Share link", systemImage: "square.and.arrow.up") }
                        Link(destination: u) { Label("Open in Safari", systemImage: "safari") }
                    } label: { Image(systemName: "ellipsis.circle") }
                    .accessibilityLabel("More")
                }
            }
    }

    /// The page landed on sign-in. That can be the web pages' copy of the session running out while the app's is still
    /// good: check with the server, give the pages the current session and reload; sign out only if it's really over.
    private func signedOut() {
        guard recovered < 2 else { session.expire(); return }
        recovered += 1
        Task {
            do {
                let _: Me = try await API.shared.get("/api/mobile/v1/me")
                await WebCookies.install(session.stored, me: session.me)
                reloadTick += 1
            } catch let e as APIError where e.status == 401 {
                // API already signed the app out
            } catch {
                ToastCenter.shared?.show(error.localizedDescription, tone: .warn)
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
    /// bump to go back a page
    var backTick = 0
    /// whether there's a page to go back to
    var canGoBack: Binding<Bool>? = nil

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
        context.coordinator.web = web
        context.coordinator.observe(web)
        web.load(URLRequest(url: url))
        context.coordinator.lastTick = reloadTick
        context.coordinator.lastBack = backTick
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {
        context.coordinator.parent = self
        if context.coordinator.lastTick != reloadTick {
            context.coordinator.lastTick = reloadTick
            // nothing loaded yet (the first load failed): load the page again rather than "reload" nothing
            if web.url == nil { web.load(URLRequest(url: url)) } else { web.reload() }
        }
        if context.coordinator.lastBack != backTick {
            context.coordinator.lastBack = backTick
            if web.canGoBack { web.goBack() }
        }
    }

    static func dismantleUIView(_ web: WKWebView, coordinator: Coordinator) {
        web.stopLoading()
        web.configuration.userContentController.removeScriptMessageHandler(forName: "iganiApp")
        coordinator.observers.removeAll()
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, WKDownloadDelegate {
        var parent: WebView
        var lastTick = 0
        var lastBack = 0
        var observers: [NSKeyValueObservation] = []
        weak var web: WKWebView?
        /// where each download is being saved
        private var downloads: [ObjectIdentifier: URL] = [:]
        init(_ p: WebView) { parent = p }

        func observe(_ web: WKWebView) {
            observers = [
                web.observe(\.estimatedProgress, options: .new) { [weak self] w, _ in
                    DispatchQueue.main.async { self?.parent.progress = w.estimatedProgress }
                },
                web.observe(\.url, options: .new) { [weak self] w, _ in
                    DispatchQueue.main.async { self?.parent.current = w.url }
                },
                web.observe(\.canGoBack, options: .new) { [weak self] w, _ in
                    DispatchQueue.main.async { self?.parent.canGoBack?.wrappedValue = w.canGoBack }
                },
            ]
        }

        @objc func pulled(_ c: UIRefreshControl) {
            web?.reload()
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
            // <a download> (and exports made in the page): save the file, then offer it
            if action.shouldPerformDownload { return decisionHandler(.download) }
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

        // a file the page can't show (a CSV export, a PDF sent as an attachment…) is downloaded instead
        func webView(_ web: WKWebView, decidePolicyFor response: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
            let disposition = (response.response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Content-Disposition")?.lowercased() ?? ""
            if disposition.hasPrefix("attachment") || (response.isForMainFrame && !response.canShowMIMEType) {
                return decisionHandler(.download)
            }
            decisionHandler(.allow)
        }

        func webView(_ web: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
        func webView(_ web: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { download.delegate = self }

        func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
            let dir = FileManager.default.temporaryDirectory.appending(path: "downloads/\(UUID().uuidString)", directoryHint: .isDirectory)
            do { try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true) } catch { return completionHandler(nil) }
            let name = suggestedFilename.replacingOccurrences(of: "/", with: "-")
            let dest = dir.appending(path: name.isEmpty ? "download" : name)
            downloads[ObjectIdentifier(download)] = dest
            completionHandler(dest)
        }

        func downloadDidFinish(_ download: WKDownload) {
            guard let file = downloads.removeValue(forKey: ObjectIdentifier(download)), let web, let top = topController(web) else { return }
            // Save to Files, AirDrop, Mail…
            let share = UIActivityViewController(activityItems: [file], applicationActivities: nil)
            share.popoverPresentationController?.sourceView = web
            share.popoverPresentationController?.sourceRect = CGRect(x: web.bounds.midX, y: web.bounds.minY + 60, width: 1, height: 1)
            top.present(share, animated: true)
        }

        func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
            downloads.removeValue(forKey: ObjectIdentifier(download))
            ToastCenter.shared?.show("Couldn’t download that file. Please try again.", tone: .warn)
        }

        // target=_blank: open here (ours) or in Safari (anything else)
        func webView(_ web: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url {
                if isIgani(url.host) { web.load(URLRequest(url: url)) } else if ["http", "https", "mailto", "tel", "sms"].contains(url.scheme?.lowercased() ?? "") { UIApplication.shared.open(url) }
            }
            return nil
        }

        // Igani Meet and the dialer need the camera and microphone: granted to Igani's own pages only
        func webView(_ web: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(isIgani(origin.host) ? .grant : .deny)
        }

        func webView(_ web: WKWebView, didFinish navigation: WKNavigation!) {
            web.scrollView.refreshControl?.endRefreshing()
        }

        // offline, or the server didn't answer: say so instead of leaving a blank page
        func webView(_ web: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { failed(web, error) }
        func webView(_ web: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { failed(web, error) }

        private func failed(_ web: WKWebView, _ error: Error) {
            web.scrollView.refreshControl?.endRefreshing()
            let e = error as NSError
            // a link that was cancelled or became a download isn't a failure
            if e.domain == NSURLErrorDomain, e.code == NSURLErrorCancelled { return }
            if e.domain == "WebKitErrorDomain", e.code == 102 || e.code == 204 { return }
            let offline = e.domain == NSURLErrorDomain && [NSURLErrorNotConnectedToInternet, NSURLErrorNetworkConnectionLost, NSURLErrorDataNotAllowed].contains(e.code)
            ToastCenter.shared?.show(offline ? "You’re offline. Pull down to try again." : "Couldn’t load this page. Pull down to try again.", tone: .warn)
        }

        // the page's own alert() and confirm() (e.g. "Delete this?") need native dialogs, or they silently do nothing
        func webView(_ web: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            guard let top = topController(web) else { return completionHandler() }
            let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            top.present(a, animated: true)
        }

        func webView(_ web: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            guard let top = topController(web) else { return completionHandler(false) }
            let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            a.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
            a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
            top.present(a, animated: true)
        }

        private func topController(_ web: WKWebView) -> UIViewController? {
            guard var top = web.window?.rootViewController else { return nil }
            while let p = top.presentedViewController { top = p }
            return top
        }

        func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
            if let body = message.body as? [String: Any] { parent.onMessage?(body) }
        }
    }
}
