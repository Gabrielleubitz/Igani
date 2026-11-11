import Foundation

private struct ServerError: Decodable { let error: String }

/// Decodes from any JSON (for answers we ignore).
struct Anything: Decodable { init(from decoder: Decoder) throws {} }

struct APIError: LocalizedError {
    let message: String
    let status: Int
    var errorDescription: String? { message }
}

/// JSON calls to the CRM's /api/mobile/v1, carrying the session cookie (and "igani-app=1").
@MainActor final class API {
    static let shared = API()
    weak var session: Session?

    private let http: URLSession = {
        let c = URLSessionConfiguration.default
        c.httpCookieStorage = nil
        c.httpShouldSetCookies = false
        c.requestCachePolicy = .reloadIgnoringLocalCacheData
        c.timeoutIntervalForRequest = 25
        c.waitsForConnectivity = false
        return URLSession(configuration: c)
    }()

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        let frac = ISO8601DateFormatter()
        frac.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let plain = ISO8601DateFormatter()
        d.dateDecodingStrategy = .custom { dec in
            let s = try dec.singleValueContainer().decode(String.self)
            if let x = frac.date(from: s) ?? plain.date(from: s) { return x }
            throw DecodingError.dataCorrupted(.init(codingPath: dec.codingPath, debugDescription: "Bad date \(s)"))
        }
        return d
    }()

    func get<T: Decodable>(_ path: String, query: [URLQueryItem] = []) async throws -> T {
        try await send(path, method: "GET", query: query, body: nil, authenticated: true)
    }

    func post<T: Decodable>(_ path: String, _ body: [String: Any], authenticated: Bool = true) async throws -> T {
        // JSONSerialization raises an Objective-C exception (a crash, not a Swift error) for values JSON can't hold
        // (a Date, a nil inside Any…): refuse those here instead
        guard JSONSerialization.isValidJSONObject(body) else {
            #if DEBUG
            print("[api] not JSON \(path):", body)
            #endif
            throw APIError(message: "The app couldn’t prepare that request. Please try again.", status: 0)
        }
        return try await send(path, method: "POST", query: [], body: try JSONSerialization.data(withJSONObject: body), authenticated: authenticated)
    }

    func delete<T: Decodable>(_ path: String, query: [URLQueryItem] = []) async throws -> T {
        try await send(path, method: "DELETE", query: query, body: nil, authenticated: true)
    }

    /// Runs one of the website's own server actions by name (POST /api/mobile/v1/do/<name>): same checks as on the web.
    /// Pass NSNull() for a missing argument.
    func act<T: Decodable>(_ name: String, _ args: Any...) async throws -> T? {
        let r: Ok<T> = try await post("/api/mobile/v1/do/\(name)", ["args": args])
        return r.data
    }

    /// An action whose answer we don't need.
    func run(_ name: String, _ args: Any...) async throws {
        let _: Ok<Anything> = try await post("/api/mobile/v1/do/\(name)", ["args": args])
    }

    /// The Cookie header for requests made outside this class (the call recording player, file downloads).
    var cookieHeader: String? {
        guard let s = session?.stored else { return nil }
        return "\(s.cookie)=\(s.token); igani-app=1"
    }

    private func send<T: Decodable>(_ path: String, method: String, query: [URLQueryItem], body: Data?, authenticated: Bool) async throws -> T {
        var url = Config.baseURL.appending(path: path)
        if !query.isEmpty { url.append(queryItems: query) }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue("IganiCRM-iOS/1.0", forHTTPHeaderField: "X-Igani-App")
        if let body {
            req.httpBody = body
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        let sent = authenticated ? session?.stored : nil
        if let s = sent { req.setValue("\(s.cookie)=\(s.token); igani-app=1", forHTTPHeaderField: "Cookie") }

        let data: Data
        let resp: URLResponse
        do {
            (data, resp) = try await http.data(for: req)
        } catch let e as URLError {
            switch e.code {
            case .cancelled: throw CancellationError()
            case .notConnectedToInternet, .networkConnectionLost, .dataNotAllowed:
                throw APIError(message: "You’re offline. Check your connection and try again.", status: 0)
            case .timedOut: throw APIError(message: "Igani is taking too long to answer. Please try again.", status: 0)
            default: throw APIError(message: "Couldn’t reach Igani. Please try again.", status: 0)
            }
        }
        guard let res = resp as? HTTPURLResponse else { throw APIError(message: "Unexpected answer from Igani.", status: 0) }

        // The server rolls the session cookie now and then: keep the newest one
        if sent != nil, let fields = res.allHeaderFields as? [String: String], let name = session?.stored?.cookie,
           let fresh = HTTPCookie.cookies(withResponseHeaderFields: fields, for: url).first(where: { $0.name == name }), !fresh.value.isEmpty {
            session?.updateToken(fresh.value)
        }
        if res.statusCode == 401, authenticated {
            // Only end the session this request was made with: a late answer to a request sent after signing out (no
            // cookie) or before signing in again (an older session) mustn't sign the new one out
            if let sent, let now = session?.stored, now.cookie == sent.cookie, now.token == sent.token {
                session?.expire()
            }
            throw APIError(message: "Please sign in again.", status: 401)
        }
        guard (200..<300).contains(res.statusCode) else {
            // the server's own message when it sent one; never a raw HTML or proxy error page
            let server = (try? JSONDecoder().decode(ServerError.self, from: data))?.error.trimmingCharacters(in: .whitespacesAndNewlines)
            let msg: String
            if let server, !server.isEmpty, server.count < 400 { msg = server } else {
                switch res.statusCode {
                case 403: msg = "You don’t have access to that."
                case 404: msg = "That isn’t there any more."
                case 408, 504: msg = "Igani is taking too long to answer. Please try again."
                case 413: msg = "That’s too big to send."
                case 429: msg = "Too many tries. Wait a moment and try again."
                case 500...599: msg = "Igani’s server had a problem. Please try again in a moment."
                default: msg = "Something went wrong (\(res.statusCode))."
                }
            }
            throw APIError(message: msg, status: res.statusCode)
        }
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            #if DEBUG
            print("[api] decode \(path):", error)
            #endif
            throw APIError(message: "Igani sent something this version of the app doesn’t understand. Update the app or try again.", status: res.statusCode)
        }
    }
}
