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
        try await send(path, method: "POST", query: [], body: try JSONSerialization.data(withJSONObject: body), authenticated: authenticated)
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
        if authenticated, let s = session?.stored { req.setValue("\(s.cookie)=\(s.token); igani-app=1", forHTTPHeaderField: "Cookie") }

        let data: Data
        let resp: URLResponse
        do {
            (data, resp) = try await http.data(for: req)
        } catch let e as URLError {
            throw APIError(message: e.code == .notConnectedToInternet ? "You’re offline. Check your connection and try again." : "Couldn’t reach Igani. Please try again.", status: 0)
        }
        guard let res = resp as? HTTPURLResponse else { throw APIError(message: "Unexpected answer from Igani.", status: 0) }

        // The server rolls the session cookie now and then: keep the newest one
        if let fields = res.allHeaderFields as? [String: String], let name = session?.stored?.cookie,
           let fresh = HTTPCookie.cookies(withResponseHeaderFields: fields, for: url).first(where: { $0.name == name }), !fresh.value.isEmpty {
            session?.updateToken(fresh.value)
        }
        if res.statusCode == 401, authenticated {
            session?.expire()
            throw APIError(message: "Please sign in again.", status: 401)
        }
        guard (200..<300).contains(res.statusCode) else {
            let msg = (try? JSONDecoder().decode(ServerError.self, from: data))?.error ?? "Something went wrong (\(res.statusCode))."
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
