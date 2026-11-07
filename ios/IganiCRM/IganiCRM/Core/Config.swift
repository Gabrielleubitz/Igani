import Foundation

/// Where the CRM lives. Release builds always use app.igani.co; debug builds can point at a local server with the
/// launch argument `-serverURL http://localhost:3100` (or the Developer section in More).
enum Config {
    static let production = URL(string: "https://app.igani.co")!

    static var baseURL: URL {
        #if DEBUG
        if let s = UserDefaults.standard.string(forKey: "serverURL"), let u = URL(string: s), u.scheme != nil { return u }
        #endif
        return production
    }

    static var isLocal: Bool {
        let h = baseURL.host ?? ""
        return h == "localhost" || h == "127.0.0.1" || h.hasSuffix(".localhost")
    }

    static let callbackScheme = "igani-crm"
}
