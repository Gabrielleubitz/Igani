import SwiftUI

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        self.init(.sRGB, red: Double((hex >> 16) & 0xff) / 255, green: Double((hex >> 8) & 0xff) / 255, blue: Double(hex & 0xff) / 255, opacity: alpha)
    }
}

/// Igani's colours (the same navy and blues as Igani Meet and the logo).
enum Theme {
    static let bg = Color(hex: 0x0E1626)
    static let card = Color(hex: 0x172234)
    static let raised = Color(hex: 0x1F2B40)
    static let line = Color.white.opacity(0.07)
    static let accent = Color(hex: 0xA8C7FA)
    static let blue = Color(hex: 0x6592E0)
    static let light = Color(hex: 0x8DB6F7)
    static let text = Color(hex: 0xE3E8F0)
    static let muted = Color(hex: 0x9AA4B2)
    static let green = Color(hex: 0x81C995)
    static let red = Color(hex: 0xF28B82)
    static let amber = Color(hex: 0xF6C26B)
    static let violet = Color(hex: 0xA594FF)

    static let brandGradient = LinearGradient(colors: [light, blue], startPoint: .topLeading, endPoint: .bottomTrailing)

    /// Pipeline stage colours, matching the website.
    static func stage(_ s: String) -> Color {
        switch s {
        case "NEW": return Color(hex: 0x60A5FA)
        case "NO_ANSWER", "VOICEMAIL", "BUSY": return Color(hex: 0x94A3B8)
        case "CALL_BACK": return Color(hex: 0xFB923C)
        case "INTERESTED": return Color(hex: 0x22D3EE)
        case "NOT_INTERESTED", "WRONG_NUMBER": return Color(hex: 0x71717A)
        case "CONTACTED": return Color(hex: 0x818CF8)
        case "DEMO_SCHEDULED": return Color(hex: 0xA78BFA)
        case "DEMO_SENT": return Color(hex: 0xE879F9)
        case "PROPOSAL_SENT": return Color(hex: 0xFBBF24)
        case "SIGNED": return Color(hex: 0x2DD4BF)
        case "WON": return Color(hex: 0x34D399)
        case "LOST": return Color(hex: 0xFB7185)
        default: return muted
        }
    }

    static func gradient(for name: String) -> LinearGradient {
        let palettes: [[UInt32]] = [[0x8DB6F7, 0x4F7FD6], [0x3FD2C7, 0x1F8A9C], [0xA594FF, 0x5B4BD1], [0xF6B17A, 0xD0694A], [0xF28BB3, 0xB0457A], [0x81C995, 0x2F8F5B]]
        let i = abs(name.unicodeScalars.reduce(0) { $0 &+ Int($1.value) }) % palettes.count
        return LinearGradient(colors: palettes[i].map { Color(hex: $0) }, startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

/// The CRM's SF Symbols for its sections (by the website's icon names).
enum Symbols {
    static func page(_ icon: String?) -> String {
        switch icon ?? "" {
        case "today": return "sun.max"
        case "contacts": return "person.2"
        case "board": return "rectangle.split.3x1"
        case "tasks": return "checklist"
        case "reports": return "chart.bar.xaxis"
        case "calls": return "phone"
        case "callLists": return "list.bullet.rectangle"
        case "meet": return "video"
        case "teamMeetings": return "person.3"
        case "invite": return "calendar.badge.plus"
        case "videos": return "play.rectangle"
        case "documents": return "doc.text"
        case "marketing": return "megaphone"
        case "overview": return "square.grid.2x2"
        case "offers": return "gift"
        case "bookings": return "calendar"
        case "pages": return "link"
        case "website": return "globe"
        case "phone": return "phone.connection"
        case "performance": return "chart.line.uptrend.xyaxis"
        case "team": return "person.badge.key"
        case "audit": return "list.clipboard"
        case "settings": return "gearshape"
        default: return "square.grid.2x2"
        }
    }
}
