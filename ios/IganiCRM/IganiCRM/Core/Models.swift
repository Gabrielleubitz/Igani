import Foundation

struct Me: Decodable, Equatable {
    let id: String
    let name: String
    let email: String
    let role: String
    let avatar: String?
    let timeZone: String
    let appUrl: String
    let meetUrl: String
    let pages: [NavPage]
    let stages: [Stage]

    var firstName: String { name.split(separator: " ").first.map(String.init) ?? name }
    var roleLabel: String { ["ADMIN": "Admin", "SALES": "Sales", "MARKETING": "Marketing"][role] ?? role.capitalized }
    func stageLabel(_ key: String) -> String { stages.first { $0.key == key }?.label ?? key.capitalized }
}

struct NavPage: Decodable, Equatable, Identifiable, Hashable {
    let id: String
    let label: String
    let icon: String?
    let href: String
    let group: String?
}

struct Stage: Decodable, Equatable, Hashable { let key: String; let label: String; let settable: Bool }

struct TaskRef: Decodable, Hashable { let leadId: String; let taskId: String }

struct TodayData: Decodable {
    struct Agenda: Decodable, Identifiable { let id: String; let kind: String; let start: Date; let minutes: Int?; let title: String; let sub: String?; let href: String?; let meetUrl: String?; let live: Bool; let task: TaskRef? }
    struct Action: Decodable, Identifiable { let id: String; let tone: String; let title: String; let sub: String; let href: String; let cta: String; let task: TaskRef?; let at: Date }
    struct Kpis: Decodable { let openDeals: Int; let newThisWeek: Int; let needFollowUp: Int; let hot: Int; let pipelineValue: Double?; let proposals: Int; let wonThisMonth: Int; let tasksToday: Int; let tasksOverdue: Int; let waiting: Int?; let doneSpark: [Int]? }
    struct Deal: Decodable, Identifiable { let id: String; let name: String; let company: String?; let status: String; let progress: Int; let quietDays: Int; let health: String; let score: Int }
    struct Day: Decodable, Identifiable { let label: String; let key: String; let calls: Int; let connected: Int; var id: String { key } }
    struct Calls: Decodable { let perDay: [Day]; let week: Int; let connected: Int; let talkMin: Int; let avgScore: Int?; let toCall: Int }
    struct Recent: Decodable, Identifiable { let id: String; let action: String; let leadId: String; let leadName: String; let at: Date; let text: String }

    let firstName: String?
    let isAdmin: Bool
    let seller: Bool
    let agenda: [Agenda]
    let meetingsToday: Int
    let actions: [Action]
    let actionsTotal: Int
    let kpis: Kpis
    let deals: [Deal]
    let calls: Calls
    let recent: [Recent]
}

struct LeadRow: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let company: String?
    let email: String?
    let phone: String?
    let status: String
    let source: String
    let owner: String?
    let updatedAt: Date
}

struct LeadPage: Decodable { let total: Int; let page: Int; let more: Bool; let leads: [LeadRow] }

struct LeadDetail: Decodable, Identifiable {
    struct Note: Decodable, Identifiable { let id: String; let body: String; let at: Date; let author: String? }
    struct Call: Decodable, Identifiable { let id: String; let direction: String; let status: String; let startedAt: Date; let durationSec: Int? }
    struct Task: Decodable, Identifiable { let id: String; let title: String; let dueAt: Date?; var done: Bool; let priority: String; let assignee: String? }
    struct Owner: Decodable { let id: String; let name: String? }
    struct Counts: Decodable { let emails: Int; let offers: Int; let calls: Int }

    let id: String
    let name: String
    let email: String?
    let phone: String?
    let company: String?
    let website: String?
    let message: String?
    let source: String
    let sourceDetail: String?
    var status: String
    let tags: [String]
    let owner: Owner?
    let createdAt: Date
    let counts: Counts
    var notes: [Note]
    let calls: [Call]
    var tasks: [Task]
}

struct TaskItem: Decodable, Identifiable, Hashable {
    let id: String
    let leadId: String
    let lead: String
    let company: String?
    let title: String
    let dueAt: Date?
    var done: Bool
    let priority: String
    let completedAt: Date?
}

struct TaskList: Decodable { let tasks: [TaskItem] }

struct MeetRoom: Decodable, Identifiable, Hashable {
    let id: String
    let code: String
    let title: String
    let scheduledAt: Date?
    let durationMin: Int
    let ended: Bool
    let closesAt: Date?
    let host: String
    let manage: Bool
    let invites: Int
    let recordings: Int
    let joinUrl: String
    let createdAt: Date
}

struct MeetList: Decodable { let ready: Bool; let rooms: [MeetRoom] }

struct Ok<T: Decodable>: Decodable { let ok: Bool; let data: T? }
struct Empty: Decodable {}
struct NewRoom: Decodable { let code: String; let joinUrl: String }
struct NewLead: Decodable { let id: String }
