import Foundation
import Observation
import SwiftUI

// The website's team chat (app/actions/chat.ts), as the app reads it.

struct ChatPerson: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let role: String
    let photo: String?
    /// in the CRM in the last minute or so (the team list only)
    var online: Bool? = nil
    var photoURL: String? { photo.map { Config.baseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + $0 } }
    var roleLabel: String { role == "ADMIN" ? "Admin" : role == "SALES" ? "Sales" : "Marketing" }
}

struct ChatChannelRow: Decodable, Identifiable, Hashable {
    struct Dm: Decodable, Hashable { let id: String; let photo: String?; let role: String; var online: Bool? = nil }
    let id: String
    let kind: String
    let name: String
    let topic: String?
    let isPrivate: Bool
    let member: Bool
    var muted: Bool = false
    var unread: Int
    var mentions: Int
    let lastMessageAt: Date
    let dm: Dm?
    var isDM: Bool { kind == "DM" }
    var title: String { isDM ? name : "#\(name)" }
    var photoURL: String? { dm?.photo.map { Config.baseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + $0 } }

    enum CodingKeys: String, CodingKey { case id, kind, name, topic, isPrivate = "private", member, muted, unread, mentions, lastMessageAt, dm }
}

struct ChatOverview: Decodable {
    let me: ChatPerson
    let isAdmin: Bool
    var channels: [ChatChannelRow]
    let people: [ChatPerson]
    /// files can be shared (Cloudinary is set up)
    var files: Bool? = nil
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
    /// a reply in a thread: the message it answers
    var parentId: String? = nil
    var replyCount = 0
    var lastReplyAt: Date? = nil
    var repliers: [ChatReplier] = []
    var files: [ChatFile] = []
    var leads: [ChatLead] = []
    /// app-side: still sending / couldn't send
    var pending = false
    var failed = false
    var photoURL: String? { photo.map { Config.baseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + $0 } }

    enum CodingKeys: String, CodingKey { case id, userId, name, photo, body, at, edited, deleted, reactions, parentId, replyCount, lastReplyAt, repliers, files, leads }

    init(id: String, userId: String?, name: String, photo: String?, body: String, at: Date, edited: Bool, deleted: Bool, reactions: [ChatReaction], parentId: String? = nil) {
        self.id = id; self.userId = userId; self.name = name; self.photo = photo; self.body = body; self.at = at
        self.edited = edited; self.deleted = deleted; self.reactions = reactions; self.parentId = parentId
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        userId = try c.decodeIfPresent(String.self, forKey: .userId)
        name = try c.decode(String.self, forKey: .name)
        photo = try c.decodeIfPresent(String.self, forKey: .photo)
        body = try c.decode(String.self, forKey: .body)
        at = try c.decode(Date.self, forKey: .at)
        edited = try c.decode(Bool.self, forKey: .edited)
        deleted = try c.decode(Bool.self, forKey: .deleted)
        reactions = try c.decode([ChatReaction].self, forKey: .reactions)
        parentId = try c.decodeIfPresent(String.self, forKey: .parentId)
        replyCount = try c.decodeIfPresent(Int.self, forKey: .replyCount) ?? 0
        lastReplyAt = try c.decodeIfPresent(Date.self, forKey: .lastReplyAt)
        repliers = try c.decodeIfPresent([ChatReplier].self, forKey: .repliers) ?? []
        files = try c.decodeIfPresent([ChatFile].self, forKey: .files) ?? []
        leads = try c.decodeIfPresent([ChatLead].self, forKey: .leads) ?? []
    }
}

struct ChatReplier: Decodable, Hashable {
    let name: String
    let photo: String?
    var photoURL: String? { photo.map { Config.baseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + $0 } }
}

struct ChatFile: Decodable, Hashable {
    let kind: String
    let name: String
    let bytes: Int
    let mime: String
    let width: Int?
    let height: Int?
    /// what the viewer can show: "image", "video", "pdf", or nil (open / share only)
    var view: String? = nil
    var forwarded: Bool? = nil
    var isImage: Bool { kind == "image" }
    var size: String { ByteCountFormatter.string(fromByteCount: Int64(bytes), countStyle: .file) }
}

struct ChatLead: Decodable, Hashable {
    let id: String
    let name: String
    let company: String?
    let status: String
    let owner: String?
}

/// A file picked in the app, uploaded straight to Cloudinary with a ticket from the CRM (what chatSend takes).
struct ChatUpload: Identifiable {
    let id = UUID()
    let name: String
    var preview: UIImage?
    var progress: Double = 0
    var done: [String: Any]?
    var error: String?
}

struct ChatChannelInfo: Decodable, Hashable {
    let id: String
    let kind: String
    let name: String
    let topic: String?
    let isPrivate: Bool
    let member: Bool
    var muted: Bool = false
    let canManage: Bool
    let members: [ChatPerson]
    var isDM: Bool { kind == "DM" }

    enum CodingKeys: String, CodingKey { case id, kind, name, topic, isPrivate = "private", member, muted, canManage, members }
}

struct ChatPageData: Decodable {
    struct Read: Decodable { let userId: String; let at: Date }
    /// first page only: polls keep what they have
    let channel: ChatChannelInfo?
    let messages: [ChatMessage]
    let more: Bool
    let cursor: String
    let readBy: [Read]
    /// your read position when the page opened: where "New" starts
    var myLastReadAt: Date? = nil
    var typing: [String]? = nil
    /// thread view: the message the thread is about
    var parent: ChatMessage? = nil
}

struct ChatSearchHit: Decodable, Identifiable, Hashable {
    let id: String
    let channelId: String
    let threadId: String?
    let `where`: String
    let name: String
    let body: String
    let at: Date
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
        var rest = body.replacingOccurrences(of: "```", with: "`")[...]
        while let m = rest.firstMatch(of: pattern) {
            out += styled(String(rest[rest.startIndex..<m.range.lowerBound]))
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
        out += styled(String(rest))
        return out
    }

    /// *bold*, _italic_, ~strike~ and `code`, like the website.
    static func styled(_ text: String) -> AttributedString {
        var out = AttributedString()
        let pattern = #/`([^`\n]+)`|\*([^*\n]+)\*|_([^_\n]+)_|~([^~\n]+)~/#
        var rest = text[...]
        while let m = rest.firstMatch(of: pattern) {
            out += AttributedString(String(rest[rest.startIndex..<m.range.lowerBound]))
            if let code = m.output.1 {
                var s = AttributedString(String(code))
                s.font = .system(.callout, design: .monospaced)
                s.backgroundColor = Theme.raised
                out += s
            } else if let bold = m.output.2 {
                var s = AttributedString(String(bold)); s.font = .body.weight(.bold); out += s
            } else if let it = m.output.3 {
                var s = AttributedString(String(it)); s.font = .body.italic(); out += s
            } else if let st = m.output.4 {
                var s = AttributedString(String(st)); s.strikethroughStyle = .single; out += s
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
