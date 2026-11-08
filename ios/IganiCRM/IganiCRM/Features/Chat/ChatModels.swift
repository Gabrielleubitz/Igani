import Foundation
import Observation
import SwiftUI

// The website's team chat (app/actions/chat.ts), as the app reads it.

struct ChatPerson: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let role: String
    let photo: String?
    var photoURL: String? { photo.map { Config.baseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + $0 } }
    var roleLabel: String { role == "ADMIN" ? "Admin" : role == "SALES" ? "Sales" : "Marketing" }
}

struct ChatChannelRow: Decodable, Identifiable, Hashable {
    struct Dm: Decodable, Hashable { let id: String; let photo: String?; let role: String }
    let id: String
    let kind: String
    let name: String
    let topic: String?
    let isPrivate: Bool
    let member: Bool
    var unread: Int
    var mentions: Int
    let lastMessageAt: Date
    let dm: Dm?
    var isDM: Bool { kind == "DM" }
    var title: String { isDM ? name : "#\(name)" }
    var photoURL: String? { dm?.photo.map { Config.baseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + $0 } }

    enum CodingKeys: String, CodingKey { case id, kind, name, topic, isPrivate = "private", member, unread, mentions, lastMessageAt, dm }
}

struct ChatOverview: Decodable {
    let me: ChatPerson
    let isAdmin: Bool
    var channels: [ChatChannelRow]
    let people: [ChatPerson]
}

struct ChatReaction: Decodable, Hashable {
    let emoji: String
    var count: Int
    var mine: Bool
    var names: [String]
}

struct ChatMessage: Decodable, Identifiable, Hashable {
    var id: String
    let userId: String?
    let name: String
    let photo: String?
    var body: String
    var at: Date
    var edited: Bool
    var deleted: Bool
    var reactions: [ChatReaction]
    /// app-side: still sending / couldn't send
    var pending = false
    var failed = false
    var photoURL: String? { photo.map { Config.baseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + $0 } }

    enum CodingKeys: String, CodingKey { case id, userId, name, photo, body, at, edited, deleted, reactions }
}

struct ChatChannelInfo: Decodable, Hashable {
    let id: String
    let kind: String
    let name: String
    let topic: String?
    let isPrivate: Bool
    let member: Bool
    let canManage: Bool
    let members: [ChatPerson]
    var isDM: Bool { kind == "DM" }

    enum CodingKeys: String, CodingKey { case id, kind, name, topic, isPrivate = "private", member, canManage, members }
}

struct ChatPageData: Decodable {
    struct Read: Decodable { let userId: String; let at: Date }
    let channel: ChatChannelInfo
    let messages: [ChatMessage]
    let more: Bool
    let cursor: String
    let readBy: [Read]
}

struct ChatUnread: Decodable { let unread: Int; let mentions: Int }

enum ChatRoute: Hashable {
    case channel(String, String)
    /// a direct conversation with a teammate (made the first time)
    case dm(String, String)
}

enum ChatText {
    static let emoji = ["👍", "❤️", "😂", "🎉", "🔥", "👀", "✅", "🙏"]

    /// Stored body → what you see: mentions as highlighted @Names, links tappable.
    static func attributed(_ body: String, people: [String: ChatPerson], me: String) -> AttributedString {
        var out = AttributedString()
        let pattern = #/<@([A-Za-z0-9]{20,40})>|https?:\/\/[^\s<]+/#
        var rest = body[...]
        while let m = rest.firstMatch(of: pattern) {
            out += AttributedString(String(rest[rest.startIndex..<m.range.lowerBound]))
            if let id = m.output.1 {
                var s = AttributedString("@\(people[String(id)]?.name ?? "someone")")
                s.foregroundColor = String(id) == me ? Theme.amber : Theme.accent
                s.backgroundColor = (String(id) == me ? Theme.amber : Theme.accent).opacity(0.16)
                s.font = .body.weight(.semibold)
                out += s
            } else {
                let link = String(m.output.0)
                var s = AttributedString(link)
                s.link = URL(string: link)
                s.foregroundColor = Theme.accent
                s.underlineStyle = .single
                out += s
            }
            rest = rest[m.range.upperBound...]
        }
        out += AttributedString(String(rest))
        return out
    }

    /// What you typed → stored: "@Rita Rep" becomes <@id> for teammates' names (longest names first).
    static func stored(_ text: String, people: [ChatPerson]) -> String {
        var out = text
        for p in people.sorted(by: { $0.name.count > $1.name.count }) {
            out = out.replacingOccurrences(of: "@\(p.name)", with: "<@\(p.id)>", options: [.caseInsensitive])
        }
        return out
    }

    static func display(_ body: String, people: [String: ChatPerson]) -> String {
        body.replacing(#/<@([A-Za-z0-9]{20,40})>/#) { m in "@\(people[String(m.output.1)]?.name ?? "someone")" }
    }
}

/// Unread chat messages, for the More tab's badge and its Team chat tile. Polls while signed in.
@MainActor @Observable final class ChatBadge {
    static let shared = ChatBadge()
    var unread = 0
    var mentions = 0
    private var task: Task<Void, Never>?

    func start() {
        task?.cancel()
        task = Task {
            while !Task.isCancelled {
                await refresh()
                try? await Task.sleep(for: .seconds(20))
            }
        }
    }

    func stop() {
        task?.cancel()
        task = nil
        unread = 0
        mentions = 0
    }

    func refresh() async {
        if let u: ChatUnread = try? await API.shared.act("chatUnread") {
            unread = u.unread
            mentions = u.mentions
        }
    }
}
