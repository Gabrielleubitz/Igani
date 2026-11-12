import Foundation
import SwiftUI

// The website's dialer data, as the CRM's server actions return it.

struct CallContact: Decodable, Hashable { let id: String; let name: String; let firstName: String?; let lastName: String?; let company: String? }

struct StartedCall: Decodable {
    struct Prospect: Decodable, Hashable { let id: String; let name: String; let listId: String; let askFor: String? }
    let callId: String
    let to: String
    let display: String
    let lead: CallContact?
    let prospect: Prospect?
    let record: Bool
    let demo: Bool
    /// through a conference room (listen-in on): connecting doesn't mean the client answered
    let conference: Bool?
}

/// A call happening right now (admins: Calls → Live now).
struct LiveCall: Decodable, Identifiable, Hashable {
    struct Rep: Decodable, Hashable, Identifiable { let id: String; let name: String }
    var id: String { callId }
    let callId: String
    let rep: Rep
    let contact: String
    let company: String?
    let number: String
    let status: String
    let startedAt: Date
    let answeredAt: Date?
    let canListen: Bool
}

struct LiveCalls: Decodable { let calls: [LiveCall]; let listenIn: Bool }

/// A short note an admin sends the rep during a live call (shown on the rep's call screen; the client never sees it).
struct CallNoteItem: Decodable, Identifiable, Hashable {
    let id: String
    let body: String
    let author: String
    let createdAt: Date
}
struct CallNotesReply: Decodable { let notes: [CallNoteItem]; let live: Bool }
struct CallProgress: Decodable { let status: String; let answered: Bool }

struct RecentCall: Decodable, Identifiable, Hashable {
    struct Lead: Decodable, Hashable { let id: String; let name: String }
    let id: String
    let direction: String
    let other: String
    let otherDisplay: String
    let lead: Lead?
    let status: String
    let outcome: String?
    let durationSec: Int?
    let startedAt: Date
    let live: Bool
    /// an admin's personal call from the website (only its caller sees it)
    let `private`: Bool?
}

struct DialerContact: Decodable, Identifiable, Hashable { let id: String; let name: String; let company: String?; let phone: String; let display: String }

struct CallerId: Decodable, Hashable {
    struct Lead: Decodable, Hashable { let id: String?; let name: String?; let company: String?; let owner: String?; let mine: Bool; let blocked: Bool }
    struct Prospect: Decodable, Hashable { let id: String; let name: String; let listId: String; let list: String; let person: String? }
    let number: String
    let display: String
    let title: String?
    let subtitle: String?
    let lead: Lead?
    let prospect: Prospect?
}

struct IncomingCaller: Decodable { let callId: String; let number: String; let display: String; let lead: CallContact?; let id: CallerId? }

struct SmsThread: Decodable, Identifiable, Hashable {
    struct Last: Decodable, Hashable { let body: String; let direction: String; let at: Date; let status: String; let media: Int }
    let number: String
    let display: String
    let name: String?
    let subtitle: String?
    let leadId: String?
    let last: Last
    let unread: Int
    var id: String { number }
}

struct SmsBubble: Decodable, Identifiable, Hashable { let id: String; let direction: String; let body: String; let media: Int; let status: String; let error: String?; let at: Date }

struct SmsConversation: Decodable {
    let number: String
    let display: String
    let name: String?
    let subtitle: String?
    let leadId: String?
    let blocked: String?
    var messages: [SmsBubble]
}

struct DialerList: Decodable, Identifiable, Hashable { let id: String; let name: String; let total: Int; let toCall: Int; let owner: String? }

struct DialerProspect: Decodable, Identifiable, Hashable {
    struct Other: Decodable, Hashable { let e164: String; let display: String; let label: String? }
    let id: String
    let name: String
    let phone: String
    let display: String
    let category: String?
    let status: String
    let attempts: Int
    let lastOutcome: String?
    let askFor: String?
    let otherPhones: [Other]
}

struct ProspectPage: Decodable { let name: String; let prospects: [DialerProspect]; let done: Int }

struct VoiceToken: Decodable { let demo: Bool; let token: String?; let identity: String?; let line: String?; let push: Bool }

/// What a call ended as, in the wrap-up (the website's CALL_OUTCOMES).
enum Outcome: String, CaseIterable, Identifiable {
    case interested, connected, voicemail, no_answer, busy, callback, not_interested, wrong_number
    var id: String { rawValue }
    var label: String {
        switch self {
        case .interested: return "Interested"
        case .connected: return "Connected"
        case .voicemail: return "Left voicemail"
        case .no_answer: return "No answer"
        case .busy: return "Busy"
        case .callback: return "Call back later"
        case .not_interested: return "Not interested"
        case .wrong_number: return "Wrong number"
        }
    }
    var icon: String {
        switch self {
        case .interested: return "star.fill"
        case .connected: return "phone.connection.fill"
        case .voicemail: return "recordingtape"
        case .no_answer: return "phone.down.fill"
        case .busy: return "line.3.horizontal.decrease"
        case .callback: return "arrow.uturn.backward.circle.fill"
        case .not_interested: return "hand.raised.fill"
        case .wrong_number: return "xmark.octagon.fill"
        }
    }
    var tint: Color {
        switch self {
        case .interested: return Theme.green
        case .connected: return Theme.accent
        case .voicemail: return Color(hex: 0x67D3E0)
        case .no_answer, .busy: return Theme.amber
        case .callback: return Color(hex: 0xF6A15B)
        case .not_interested: return Theme.muted
        case .wrong_number: return Theme.red
        }
    }
    static func label(_ key: String?) -> String? { key.flatMap { Outcome(rawValue: $0)?.label } }
}

enum CallLook {
    /// Icon, colour and words for a call in a list (the website's look()).
    static func of(direction: String, status: String, durationSec: Int?) -> (icon: String, tint: Color, label: String) {
        let talked = status == "COMPLETED" && (durationSec ?? 0) > 0
        let live = ["INITIATED", "RINGING", "IN_PROGRESS"].contains(status)
        if live { return ("phone.arrow.up.right.fill", Theme.accent, status == "RINGING" ? "Ringing" : "On the call") }
        if !talked { return direction == "INBOUND" ? ("phone.down.fill", Theme.red, "Missed") : ("phone.arrow.up.right", Theme.amber, ["BUSY": "Busy", "FAILED": "Failed", "CANCELED": "Hung up"][status] ?? "No answer") }
        return direction == "INBOUND" ? ("phone.arrow.down.left.fill", Theme.green, "Incoming") : ("phone.arrow.up.right.fill", Theme.green, "Outgoing")
    }
}

enum PhoneFmt {
    /// 4:05 for a call timer.
    static func clock(_ sec: Int) -> String { String(format: "%d:%02d", sec / 60, sec % 60) }

    /// Digits and a leading + only (what the keypad keeps).
    static func clean(_ s: String) -> String {
        var out = ""
        for (i, ch) in s.enumerated() where ch.isNumber || (ch == "+" && i == 0) || ch == "*" || ch == "#" { out.append(ch) }
        return out
    }

    /// Light grouping while typing: +972 50 123 4567, 050-123-4567, (212) 555-0100.
    static func pretty(_ raw: String) -> String {
        let d = raw.filter { $0.isNumber }
        if raw.hasPrefix("+972"), d.count > 3 {
            let r = Array(d.dropFirst(3)).map(String.init)
            return "+972 " + group(r, [2, 3, 4])
        }
        if raw.hasPrefix("+1"), d.count > 1 {
            let r = Array(d.dropFirst(1)).map(String.init)
            return "+1 " + group(r, [3, 3, 4])
        }
        if raw.hasPrefix("0"), d.count > 3 { return group(d.map(String.init), [3, 3, 4], sep: "-") }
        return raw
    }

    private static func group(_ chars: [String], _ sizes: [Int], sep: String = " ") -> String {
        var parts: [String] = []
        var i = 0
        for (k, n) in sizes.enumerated() {
            guard i < chars.count else { break }
            let end = k == sizes.count - 1 ? chars.count : min(chars.count, i + n)
            parts.append(chars[i..<end].joined())
            i = end
        }
        return parts.joined(separator: sep)
    }
}
