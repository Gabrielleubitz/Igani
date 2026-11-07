import Charts
import SwiftUI

/// Loads one admin section (GET /api/mobile/v1/admin/<section>) with pull to refresh.
@MainActor @Observable final class AdminLoader<T: Decodable> {
    var value: T?
    var failed: String?
    let section: String
    init(_ section: String) { self.section = section }
    func load(_ query: [URLQueryItem] = []) async {
        do {
            let v: T = try await API.shared.get("/api/mobile/v1/admin/\(section)", query: query)
            withAnimation(.snappy) { value = v }
            failed = nil
        } catch { if value == nil { failed = error.localizedDescription } }
    }
}

/// A scrolling admin screen with loading and error states.
struct AdminPage<T: Decodable, Content: View>: View {
    let title: String
    let loader: AdminLoader<T>
    var query: [URLQueryItem] = []
    @ViewBuilder let content: (T) -> Content
    var body: some View {
        ScrollView {
            if let v = loader.value {
                VStack(spacing: 16) { content(v) }.padding(16)
            } else if let f = loader.failed {
                LoadFailed(message: f) { await loader.load(query) }
            } else {
                SkeletonRows(count: 6)
            }
        }
        .screenBackground()
        .navigationTitle(title)
        .refreshable { await loader.load(query) }
        .task(id: query.map { "\($0.name)=\($0.value ?? "")" }.joined(separator: "&")) { await loader.load(query) }
    }
}

private func ymd(_ d: Date) -> String {
    let f = DateFormatter()
    f.calendar = Calendar(identifier: .gregorian)
    f.dateFormat = "yyyy-MM-dd"
    return f.string(from: d)
}

@MainActor private func act(_ name: String, _ args: Any..., ok: String? = nil) async -> Bool {
    do {
        let _: Ok<Anything> = try await API.shared.post("/api/mobile/v1/do/\(name)", ["args": args])
        if let ok { ToastCenter.shared?.show(ok) }
        return true
    } catch {
        ToastCenter.shared?.show(error.localizedDescription, tone: .warn)
        return false
    }
}

// MARK: - Overview

struct OverviewData: Decodable {
    struct Owed: Decodable { let total: Double; let paid: Double; let payable: Double; let pending: Double }
    struct Payable: Decodable, Hashable { let leadId: String; let paymentId: String?; let label: String; let lead: String; let salesperson: String; let amount: Double; let receivedAt: Date? }
    struct Tasks: Decodable, Hashable { let id: String; let name: String; let lead: Int; let overdue: Int; let meeting: Int; let total: Int }
    struct Board: Decodable, Hashable { let name: String; let open: Int; let won: Int; let value: Double }
    struct Recent: Decodable, Hashable, Identifiable { let id: String; let name: String; let company: String?; let owner: String?; let at: Date; let status: String }
    let staleDays: Int
    let open: Int
    let pipeline: Double
    let leads: Int
    let newWeek: Int
    let unassigned: Int
    let quiet: Int
    let won: Int
    let revenue: Double
    let winRate: Int?
    let meetings24h: Int
    let approvals: Int
    let owed: Owed
    let payable: [Payable]
    let tasks: [Tasks]
    let board: [Board]
    let recent: [Recent]
    let cronOff: Bool
}

struct AdminOverviewView: View {
    @State private var loader = AdminLoader<OverviewData>("overview")
    var body: some View {
        AdminPage(title: "Overview", loader: loader) { d in
            if d.cronOff {
                Label("Reminders and email sync are off: the hourly job needs CRON_SECRET in Vercel.", systemImage: "exclamationmark.triangle.fill").font(.footnote).foregroundStyle(Theme.amber).card()
            }
            StatGrid {
                LiveStat(label: "Open deals", value: "\(d.open)", icon: "briefcase.fill")
                LiveStat(label: "Pipeline value", value: Money.short(d.pipeline), icon: "wallet.pass.fill", tint: Theme.green)
                LiveStat(label: "Leads", value: "\(d.leads)", icon: "person.2.fill", tint: Color(hex: 0x67D3E0), sub: d.newWeek > 0 ? "+\(d.newWeek) this week" : nil, subTint: Theme.green)
                LiveStat(label: "Waiting for an owner", value: "\(d.unassigned)", icon: "person.badge.plus", tint: d.unassigned > 0 ? Theme.amber : Theme.muted)
                LiveStat(label: "Quiet > \(d.staleDays) days", value: "\(d.quiet)", icon: "hourglass", tint: d.quiet > 0 ? Color(hex: 0xF6A15B) : Theme.muted)
                LiveStat(label: "Won", value: "\(d.won)", icon: "trophy.fill", tint: Theme.amber)
                LiveStat(label: "Revenue (won)", value: Money.short(d.revenue), icon: "banknote.fill", tint: Color(hex: 0x3FD2C7))
                LiveStat(label: "Win rate", value: d.winRate.map { "\($0)%" } ?? "—", icon: "target", tint: Color(hex: 0xF28BB3))
                LiveStat(label: "Meetings next 24h", value: "\(d.meetings24h)", icon: "calendar", tint: Theme.violet)
                NavigationLink(value: Route.page(NavPage(id: "bookings", label: "Bookings", icon: "bookings", href: "/admin/bookings", group: nil))) {
                    LiveStat(label: "Awaiting approval", value: "\(d.approvals)", icon: "calendar.badge.exclamationmark", tint: d.approvals > 0 ? Theme.red : Theme.muted, sub: d.approvals > 0 ? "needs you" : nil, subTint: Theme.red)
                }
                .buttonStyle(PressStyle())
            }
            Panel(title: "Commission owed", icon: "hand.coins") {
                Chart {
                    SectorMark(angle: .value("Paid", d.owed.paid), innerRadius: .ratio(0.62), angularInset: 2).foregroundStyle(Theme.green)
                    SectorMark(angle: .value("Payable", d.owed.payable), innerRadius: .ratio(0.62), angularInset: 2).foregroundStyle(Theme.amber)
                    SectorMark(angle: .value("Pending", d.owed.pending), innerRadius: .ratio(0.62), angularInset: 2).foregroundStyle(Theme.violet)
                }
                .frame(height: 150)
                .chartBackground { _ in VStack { Text(Money.short(d.owed.total)).font(.title3.weight(.bold)); Text("total").font(.caption).foregroundStyle(Theme.muted) } }
                HStack {
                    legend("Paid", d.owed.paid, Theme.green)
                    legend("Payable now", d.owed.payable, Theme.amber)
                    legend("Pending", d.owed.pending, Theme.violet)
                }
                if !d.payable.isEmpty {
                    NavigationLink(value: Route.page(NavPage(id: "payouts", label: "Payouts", icon: "payouts", href: "/admin/payouts", group: nil))) {
                        Label("\(d.payable.count) payable now → Payouts", systemImage: "arrow.right.circle.fill").font(.subheadline.weight(.semibold))
                    }
                }
            }
            Panel(title: "Open tasks by person", icon: "checklist") {
                if d.tasks.isEmpty { Text("Nobody has open tasks.").font(.subheadline).foregroundStyle(Theme.muted) }
                let top = d.tasks.map(\.total).max() ?? 1
                ForEach(d.tasks, id: \.id) { t in
                    VStack(alignment: .leading, spacing: 3) {
                        BarRow(label: t.name, value: t.total, max: top, tint: t.overdue > 0 ? Theme.amber : Theme.blue)
                        Text("\(t.lead) on contacts · \(t.meeting) from meetings\(t.overdue > 0 ? " · \(t.overdue) overdue" : "")").font(.caption2).foregroundStyle(t.overdue > 0 ? Theme.amber : Theme.muted)
                    }
                }
            }
            Panel(title: "Team leaderboard", icon: "trophy") {
                ForEach(Array(d.board.enumerated()), id: \.offset) { i, r in
                    HStack(spacing: 12) {
                        Text(i == 0 && r.value > 0 ? "🏆" : "\(i + 1)").font(.subheadline.weight(.bold)).frame(width: 26)
                        Avatar(name: r.name, size: 32)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(r.name).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text)
                            Text("\(r.open) open · \(r.won) won").font(.caption).foregroundStyle(Theme.muted)
                        }
                        Spacer()
                        Text(Money.short(r.value)).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.green)
                    }
                }
            }
            Panel(title: "Newest leads", icon: "sparkles") {
                ForEach(d.recent) { l in
                    NavigationLink(value: Route.lead(l.id)) {
                        HStack(spacing: 12) {
                            Avatar(name: l.name, size: 32)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(l.name).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1)
                                Text("\(l.owner ?? "unassigned") · \(Fmt.relative(l.at))").font(.caption).foregroundStyle(Theme.muted)
                            }
                            Spacer()
                            Image(systemName: "chevron.right").font(.caption).foregroundStyle(Theme.muted)
                        }
                    }
                }
            }
        }
    }

    private func legend(_ t: String, _ v: Double, _ c: Color) -> some View {
        VStack(spacing: 2) {
            Text(Money.short(v)).font(.subheadline.weight(.bold)).foregroundStyle(c)
            Text(t).font(.caption2).foregroundStyle(Theme.muted)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Payouts

struct PayoutsData: Decodable {
    struct Row: Decodable, Hashable { let leadId: String; let paymentId: String?; let label: String; let lead: String; let salesperson: String; let amount: Double; let receivedAt: Date?; let refundedAt: Date?; let withinWindow: Bool? }
    struct Month: Decodable, Hashable { let month: String; let total: Double; let dueDate: Date?; let rows: [Row] }
    let months: [Month]
    let clawbacks: [Row]
}

struct PayoutsView: View {
    @State private var loader = AdminLoader<PayoutsData>("payouts")
    var body: some View {
        AdminPage(title: "Payouts", loader: loader) { d in
            if d.months.isEmpty && d.clawbacks.isEmpty { EmptyHint(icon: "checkmark.seal", title: "Nothing to pay", message: "Commissions show up here once clients pay.") }
            ForEach(d.months, id: \.month) { m in
                Panel(title: "Earned in \(monthName(m.month))", icon: "calendar", trailing: Money.ils(m.total)) {
                    if let due = m.dueDate {
                        Label("Due \(due.formatted(date: .abbreviated, time: .omitted))\(due < Date() ? " (overdue)" : "")", systemImage: "clock").font(.caption.weight(.semibold)).foregroundStyle(due < Date() ? Theme.red : Theme.muted)
                    } else {
                        Text("No signed agreement on file: due date unknown").font(.caption).foregroundStyle(Theme.muted)
                    }
                    ForEach(m.rows, id: \.self) { r in row(r) }
                }
            }
            if !d.clawbacks.isEmpty {
                Panel(title: "Refunds to claw back", icon: "arrow.uturn.backward.circle") {
                    ForEach(d.clawbacks, id: \.self) { r in
                        VStack(alignment: .leading, spacing: 3) {
                            NavigationLink(value: Route.lead(r.leadId)) { Text(r.lead).font(.subheadline.weight(.semibold)) }
                            Text("\(r.salesperson) · \(r.label.lowercased()) paid \(Money.ils(r.amount))").font(.caption).foregroundStyle(Theme.muted)
                            if r.withinWindow == true { Tag(text: "Within the clawback window", tint: Theme.red) }
                        }
                    }
                }
            }
        }
    }

    private func row(_ r: PayoutsData.Row) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                NavigationLink(value: Route.lead(r.leadId)) { Text(r.lead).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text) }
                Text("\(r.salesperson) · \(r.label)\(r.receivedAt.map { " · client paid \($0.formatted(date: .abbreviated, time: .omitted))" } ?? "")").font(.caption).foregroundStyle(Theme.muted)
            }
            Spacer()
            Text(Money.ils(r.amount)).font(.subheadline.weight(.bold)).foregroundStyle(Theme.green)
            Button {
                Task {
                    let ok = r.paymentId != nil ? await act("setPaymentCommissionPaid", r.paymentId!, ymd(Date()), ok: "Marked paid") : await act("setBonusPaid", r.leadId, ymd(Date()), ok: "Bonus marked paid")
                    if ok { await loader.load() }
                }
            } label: { Text("Paid").font(.caption.weight(.bold)).padding(.horizontal, 10).padding(.vertical, 6).background(Theme.green.opacity(0.18), in: Capsule()).foregroundStyle(Theme.green) }
            .buttonStyle(PressStyle())
        }
    }

    private func monthName(_ key: String) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM"
        guard let d = f.date(from: key) else { return key }
        return d.formatted(.dateTime.month(.wide).year())
    }
}

// MARK: - Bookings

struct BookingRow: Decodable, Hashable, Identifiable { let id: String; let title: String; let guest: String; let email: String; let start: Date; let end: Date; let status: String; let source: String; let host: String?; let meetUrl: String?; let leadId: String?; let done: Bool }
struct BookingsData: Decodable { let filter: String; let pending: [BookingRow]; let bookings: [BookingRow] }

struct AdminBookingsView: View {
    @State private var filter = "upcoming"
    @State private var loader = AdminLoader<BookingsData>("bookings")
    @State private var cancelling: BookingRow?
    var body: some View {
        AdminPage(title: "Bookings", loader: loader, query: [URLQueryItem(name: "filter", value: filter)]) { d in
            FilterRail(items: [("upcoming", "Upcoming", nil), ("all", "All", nil), ("PENDING", "Pending", nil), ("CONFIRMED", "Confirmed", nil), ("CANCELLED", "Cancelled", nil)], selection: $filter)
                .padding(.horizontal, -16)
            if !d.pending.isEmpty {
                Panel(title: "Awaiting your approval", icon: "exclamationmark.circle", trailing: "\(d.pending.count)") {
                    ForEach(d.pending) { b in
                        BookingCard(b: b)
                        HStack {
                            Button { Task { if await act("approveBooking", b.id, ok: "Approved. The guest gets the Meet link.") { await reload() } } } label: { Label("Approve", systemImage: "checkmark").frame(maxWidth: .infinity) }.buttonStyle(.borderedProminent).tint(Theme.green)
                            Button { cancelling = b } label: { Label("Decline", systemImage: "xmark").frame(maxWidth: .infinity) }.buttonStyle(.bordered).tint(Theme.red)
                        }
                        .font(.footnote.weight(.semibold))
                    }
                }
            }
            if d.bookings.isEmpty { EmptyHint(icon: "calendar", title: "No bookings here", message: "Try another filter.") }
            ForEach(d.bookings) { b in
                BookingCard(b: b)
                    .card(padding: 14)
                    .contextMenu {
                        if b.status != "CANCELLED" {
                            Button { Task { if await act("markBookingDone", b.id, !b.done, ok: b.done ? "Marked not done" : "Marked done") { await reload() } } } label: { Label(b.done ? "Not done" : "Mark done", systemImage: "checkmark.circle") }
                            Button(role: .destructive) { cancelling = b } label: { Label("Cancel meeting", systemImage: "xmark.circle") }
                        }
                        if let l = b.leadId { NavigationLink(value: Route.lead(l)) { Label("Open contact", systemImage: "person.crop.circle") } }
                    }
            }
        }
        .confirmationDialog("Cancel \(cancelling?.title ?? "")?", isPresented: Binding(get: { cancelling != nil }, set: { if !$0 { cancelling = nil } }), titleVisibility: .visible, presenting: cancelling) { b in
            Button("Cancel and email \(b.guest)", role: .destructive) { Task { if await act("cancelBooking", b.id, "cancelled-by-staff", true, ok: "Cancelled") { await reload() } } }
            Button("Cancel without emailing") { Task { if await act("cancelBooking", b.id, "cancelled-by-staff", false, ok: "Cancelled") { await reload() } } }
        }
    }
    private func reload() async { await loader.load([URLQueryItem(name: "filter", value: filter)]) }
}

struct BookingCard: View {
    let b: BookingRow
    var body: some View {
        HStack(spacing: 12) {
            VStack(spacing: 0) {
                Text(b.start.formatted(.dateTime.day())).font(.headline).foregroundStyle(Theme.text)
                Text(b.start.formatted(.dateTime.month(.abbreviated))).font(.caption2.weight(.bold)).foregroundStyle(Theme.accent)
            }
            .frame(width: 46, height: 46).background(Theme.raised, in: RoundedRectangle(cornerRadius: 12))
            VStack(alignment: .leading, spacing: 3) {
                Text(b.title).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1)
                Text("\(b.start.formatted(date: .omitted, time: .shortened)) · \(b.guest)\(b.host.map { " · host \($0)" } ?? "")").font(.caption).foregroundStyle(Theme.muted).lineLimit(1)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Tag(text: b.done ? "Done" : b.status.capitalized, tint: b.status == "CONFIRMED" ? Theme.green : b.status == "PENDING" ? Theme.amber : Theme.muted)
                if let m = b.meetUrl, let u = URL(string: m), b.status == "CONFIRMED" { Link(destination: u) { Image(systemName: "video.fill").font(.footnote) } }
            }
        }
    }
}

// MARK: - Booking pages

struct BookingPagesData: Decodable {
    struct Page: Decodable, Hashable, Identifiable { let id: String; let slug: String; let title: String; let description: String?; let durationMinutes: Int; let requiresApproval: Bool; let active: Bool; let hostId: String; let host: String?; let bookings: Int; let url: String }
    let hosts: [MeetingsData.Person]
    let pages: [Page]
}

struct BookingPagesView: View {
    @State private var loader = AdminLoader<BookingPagesData>("booking-pages")
    @State private var editing: BookingPagesData.Page?
    @State private var creating = false
    var body: some View {
        AdminPage(title: "Booking pages", loader: loader) { d in
            if d.pages.isEmpty { EmptyHint(icon: "link", title: "No booking pages yet", message: "Create one and share its link anywhere people should book a call.") }
            ForEach(d.pages) { p in
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text(p.title).font(.headline).foregroundStyle(Theme.text)
                        Spacer()
                        Tag(text: p.active ? "Live" : "Off", tint: p.active ? Theme.green : Theme.muted)
                        if p.requiresApproval { Tag(text: "Approval", tint: Theme.amber) }
                    }
                    Text("\(p.durationMinutes) min · host \(p.host ?? "") · \(p.bookings) booking\(p.bookings == 1 ? "" : "s")").font(.caption).foregroundStyle(Theme.muted)
                    Text(p.url).font(.caption.monospaced()).foregroundStyle(Theme.accent).lineLimit(1).truncationMode(.middle)
                    HStack {
                        ShareLink(item: URL(string: p.url)!) { Label("Share", systemImage: "square.and.arrow.up") }
                        Button { UIPasteboard.general.string = p.url; ToastCenter.shared?.show("Link copied") } label: { Label("Copy", systemImage: "doc.on.doc") }
                        Spacer()
                        Button("Edit") { editing = p }
                    }
                    .font(.footnote.weight(.semibold))
                }
                .card()
            }
        }
        .toolbar { ToolbarItem(placement: .primaryAction) { Button { creating = true } label: { Image(systemName: "plus") } } }
        .sheet(item: $editing) { p in BookingPageForm(page: p, hosts: loader.value?.hosts ?? []) { await loader.load() } }
        .sheet(isPresented: $creating) { BookingPageForm(page: nil, hosts: loader.value?.hosts ?? []) { await loader.load() } }
    }
}

struct BookingPageForm: View {
    let page: BookingPagesData.Page?
    let hosts: [MeetingsData.Person]
    let saved: () async -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var slug = ""
    @State private var title = ""
    @State private var about = ""
    @State private var duration = 30
    @State private var approval = false
    @State private var active = true
    @State private var hostId = ""
    @State private var busy = false
    var body: some View {
        NavigationStack {
            Form {
                Section("Page") {
                    TextField("Title", text: $title)
                    HStack(spacing: 0) { Text("/book/").foregroundStyle(Theme.muted); TextField("link", text: $slug).textInputAutocapitalization(.never).autocorrectionDisabled() }
                        .disabled(page != nil)
                    TextField("Description (optional)", text: $about, axis: .vertical).lineLimit(2...5)
                }
                Section("Meeting") {
                    Stepper("\(duration) minutes", value: $duration, in: 15...240, step: 15)
                    Picker("Host", selection: $hostId) { ForEach(hosts) { Text($0.name).tag($0.id) } }
                    ToggleRow(title: "Needs approval", hint: "An admin approves each booking before the Meet is made", on: $approval)
                    ToggleRow(title: "Live", on: $active)
                }
                if let page {
                    Section {
                        HoldToConfirm(title: "Hold to delete this page") { Task { if await act("deleteBookingPage", page.id, ok: "Deleted") { await saved(); dismiss() } } }
                            .listRowBackground(Color.clear).listRowInsets(EdgeInsets())
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.bg)
            .navigationTitle(page == nil ? "New booking page" : "Edit page")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Save") { Task { await save() } }.disabled(busy || title.isEmpty || slug.isEmpty || hostId.isEmpty) }
            }
            .onAppear {
                if let p = page { slug = p.slug; title = p.title; about = p.description ?? ""; duration = p.durationMinutes; approval = p.requiresApproval; active = p.active; hostId = p.hostId } else { hostId = hosts.first?.id ?? "" }
            }
        }
    }
    private func save() async {
        busy = true
        defer { busy = false }
        var input: [String: Any] = ["slug": slug.lowercased(), "title": title, "durationMinutes": duration, "requiresApproval": approval, "active": active, "hostId": hostId]
        if !about.isEmpty { input["description"] = about }
        if await act("upsertBookingPage", input, ["isNew": page == nil], ok: "Saved") { await saved(); dismiss() }
    }
}

// MARK: - Team meetings

struct TeamMeetingsData: Decodable { let meetings: [BookingRow] }

struct TeamMeetingsView: View {
    @State private var loader = AdminLoader<TeamMeetingsData>("team-meetings")
    var body: some View {
        AdminPage(title: "Team meetings", loader: loader) { d in
            NavigationLink(value: Route.page(NavPage(id: "team-meeting", label: "Book meeting with team", icon: "teamMeetings", href: "/sales/team-meeting", group: nil))) {
                Label("Book a team call", systemImage: "plus.circle.fill").font(.headline).frame(maxWidth: .infinity).padding(.vertical, 14).background(Theme.accent.opacity(0.15), in: RoundedRectangle(cornerRadius: 16))
            }
            if d.meetings.isEmpty { EmptyHint(icon: "person.3", title: "No team meetings", message: "Internal calls from the last two weeks and coming up show here.") }
            ForEach(d.meetings) { b in BookingCard(b: b).card(padding: 14) }
        }
    }
}

// MARK: - Video library

struct VideoLibraryData: Decodable {
    struct Video: Decodable, Hashable, Identifiable { let id: String; let title: String; let visibility: String; let offerId: String?; let createdAt: Date; let stream: String }
    struct Progress: Decodable, Hashable, Identifiable { let id: String; let name: String; let done: Int; let total: Int }
    let videos: [Video]
    let progress: [Progress]
}

struct VideoLibraryView: View {
    @State private var loader = AdminLoader<VideoLibraryData>("videos")
    @State private var playing: VideosData.Video?
    @State private var renaming: VideoLibraryData.Video?
    @State private var newTitle = ""
    @Environment(\.openURL) private var openURL
    var body: some View {
        AdminPage(title: "Video library", loader: loader) { d in
            Panel(title: "Course progress", icon: "graduationcap") {
                if d.progress.isEmpty { Text("No salespeople yet.").font(.subheadline).foregroundStyle(Theme.muted) }
                ForEach(d.progress) { p in
                    BarRow(label: p.name, value: p.done, max: max(1, p.total), tint: p.done == p.total ? Theme.green : Theme.blue, trailing: "\(p.done)/\(p.total)")
                        .contextMenu {
                            Button { Task { if await act("setSalesProgress", p.id, "all", ok: "Unlocked every video for \(p.name)") { await loader.load() } } } label: { Label("Unlock everything", systemImage: "lock.open") }
                            Button(role: .destructive) { Task { if await act("setSalesProgress", p.id, "reset", ok: "Progress reset") { await loader.load() } } } label: { Label("Start the course again", systemImage: "arrow.counterclockwise") }
                        }
                }
                Text("Hold a name to unlock or reset.").font(.caption2).foregroundStyle(Theme.muted)
            }
            Panel(title: "Videos", icon: "play.rectangle", trailing: "\(d.videos.count)") {
                ForEach(d.videos) { v in
                    HStack(spacing: 12) {
                        Button { playing = VideosData.Video(id: v.id, title: v.title, stream: v.stream, locked: false, done: true, needsAck: false) } label: {
                            Image(systemName: "play.fill").foregroundStyle(.white).frame(width: 52, height: 36).background(Theme.gradient(for: v.title), in: RoundedRectangle(cornerRadius: 8))
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text(v.title).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(2)
                            Text(v.visibility == "team" ? "Team training" : "On an offer").font(.caption).foregroundStyle(Theme.muted)
                        }
                        Spacer()
                        Menu {
                            Button { newTitle = v.title; renaming = v } label: { Label("Rename", systemImage: "pencil") }
                            Button(role: .destructive) { Task { if await act("removeVideo", v.id, ok: "Removed") { await loader.load() } } } label: { Label("Delete", systemImage: "trash") }
                        } label: { Image(systemName: "ellipsis.circle").foregroundStyle(Theme.muted) }
                    }
                }
            }
            Button { openURL(Config.baseURL.appending(path: "admin/videos")) } label: { Label("Upload videos on the website", systemImage: "arrow.up.forward.app") }.font(.footnote.weight(.semibold))
        }
        .fullScreenCover(item: $playing) { v in LessonPlayerView(video: v, course: false) }
        .alert("Rename video", isPresented: Binding(get: { renaming != nil }, set: { if !$0 { renaming = nil } }), presenting: renaming) { v in
            TextField("Title", text: $newTitle)
            Button("Save") { Task { if await act("setVideoAccess", v.id, v.visibility, v.offerId as Any? ?? NSNull(), newTitle, ok: "Renamed") { await loader.load() } } }
            Button("Cancel", role: .cancel) {}
        }
    }
}

// MARK: - Website

struct WebsiteData: Decodable {
    struct PageRef: Decodable, Hashable { let key: String; let label: String; let url: String }
    struct Reach: Decodable, Hashable { let at: Int; let pct: Int }
    struct Section: Decodable, Hashable { let id: String; let seenPct: Int; let avgSeconds: Int }
    struct Click: Decodable, Hashable { let label: String; let count: Int }
    struct Device: Decodable, Hashable { let name: String; let count: Int }
    struct Stats: Decodable { let visits: Int; let visitors: Int; let returning: Int; let avgSeconds: Double; let avgScroll: Double; let reach: [Reach]; let sections: [Section]; let topClicks: [Click]; let devices: [Device]; let lastVisit: Date? }
    struct Visit: Decodable, Hashable { let id: String; let startedAt: Date; let device: String; let seconds: Double; let scroll: Double; let clicks: Int; let country: String?; let referrer: String?; let returning: Bool }
    let page: String
    let days: Int
    let pages: [PageRef]
    let tracking: Bool
    let stats: Stats
    let recent: [Visit]
}

struct WebsiteInsightsView: View {
    @State private var page = "home"
    @State private var days = 30
    @State private var loader = AdminLoader<WebsiteData>("website")
    var body: some View {
        AdminPage(title: "Website", loader: loader, query: [URLQueryItem(name: "page", value: page), URLQueryItem(name: "days", value: String(days))]) { d in
            GlassSegments(items: d.pages.map { ($0.key, $0.label, nil) }, selection: $page)
            Picker("Days", selection: $days) { ForEach([7, 30, 90], id: \.self) { Text("\($0) days").tag($0) } }.pickerStyle(.segmented)
            if !d.tracking { Label("Tracking is off for this page.", systemImage: "eye.slash").font(.footnote).foregroundStyle(Theme.amber) }
            StatGrid {
                LiveStat(label: "Visits", value: "\(d.stats.visits)", icon: "eye.fill")
                LiveStat(label: "Visitors", value: "\(d.stats.visitors)", icon: "person.fill", tint: Theme.violet, sub: "\(d.stats.returning) came back")
                LiveStat(label: "Average time", value: "\(Int(d.stats.avgSeconds))s", icon: "clock.fill", tint: Theme.green)
                LiveStat(label: "Average scroll", value: "\(Int(d.stats.avgScroll))%", icon: "arrow.down.to.line", tint: Theme.amber)
            }
            Panel(title: "How far they read", icon: "arrow.down") {
                ForEach(d.stats.reach, id: \.at) { r in BarRow(label: "Reached \(r.at)%", value: r.pct, max: 100, tint: Theme.blue, trailing: "\(r.pct)%") }
            }
            if !d.stats.sections.isEmpty {
                Panel(title: "Sections that hold attention", icon: "rectangle.stack") {
                    ForEach(d.stats.sections, id: \.id) { s in
                        VStack(alignment: .leading, spacing: 2) {
                            BarRow(label: s.id, value: s.seenPct, max: 100, tint: Theme.violet, trailing: "\(s.seenPct)%")
                            Text("\(s.avgSeconds)s on average").font(.caption2).foregroundStyle(Theme.muted)
                        }
                    }
                }
            }
            if !d.stats.topClicks.isEmpty {
                Panel(title: "What they click", icon: "cursorarrow.click") {
                    let top = d.stats.topClicks.map(\.count).max() ?? 1
                    ForEach(d.stats.topClicks, id: \.label) { BarRow(label: $0.label, value: $0.count, max: top, tint: Theme.green) }
                }
            }
            Panel(title: "Latest visits", icon: "list.bullet") {
                ForEach(d.recent.prefix(15), id: \.id) { v in
                    HStack {
                        Image(systemName: v.device == "mobile" ? "iphone" : v.device == "tablet" ? "ipad" : "desktopcomputer").foregroundStyle(Theme.muted).frame(width: 22)
                        VStack(alignment: .leading, spacing: 1) {
                            Text("\(Int(v.seconds))s · \(Int(v.scroll))% · \(v.clicks) clicks").font(.subheadline).foregroundStyle(Theme.text)
                            Text([v.country, v.referrer, v.returning ? "returning" : nil].compactMap { $0 }.joined(separator: " · ")).font(.caption).foregroundStyle(Theme.muted).lineLimit(1)
                        }
                        Spacer()
                        Text(Fmt.relative(v.startedAt)).font(.caption).foregroundStyle(Theme.muted)
                    }
                }
            }
            Text("The heatmap is on the website (Admin → Website).").font(.caption).foregroundStyle(Theme.muted)
        }
    }
}

// MARK: - Phone (admin)

struct PhoneAdminData: Decodable {
    struct Number: Decodable, Hashable { let sid: String; let number: String; let display: String; let name: String }
    struct Line: Decodable, Hashable { let number: String; let display: String; let active: Bool }
    struct Mate: Decodable, Hashable, Identifiable { let id: String; let name: String; let role: String?; let line: Line? }
    struct Call: Decodable, Hashable, Identifiable { let id: String; let by: String?; let lead: String?; let leadId: String?; let number: String; let direction: String; let status: String; let startedAt: Date; let durationSec: Int? }
    let ready: Bool
    let demo: Bool
    let numbersError: String?
    let numbers: [Number]
    var record: Bool
    var hints: Bool
    let countries: [String]
    let team: [Mate]
    let calls: [Call]
}

struct PhoneAdminView: View {
    @State private var loader = AdminLoader<PhoneAdminData>("phone")
    var body: some View {
        AdminPage(title: "Phone", loader: loader) { d in
            HStack(spacing: 12) {
                IconChip(icon: d.ready ? "checkmark.seal.fill" : "exclamationmark.triangle.fill", tint: d.ready ? Theme.green : Theme.amber)
                Text(d.ready ? "Calls go through your Twilio account." : d.demo ? "Not connected: demo mode while developing." : "Twilio isn’t connected yet. Its settings go in Vercel.").font(.subheadline).foregroundStyle(Theme.text)
            }
            .card()
            Panel(title: "Lines", icon: "phone.connection") {
                if let e = d.numbersError { Text(e).font(.caption).foregroundStyle(Theme.red) }
                ForEach(d.team) { m in
                    HStack(spacing: 12) {
                        Avatar(name: m.name, size: 34)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(m.name).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text)
                            Text(m.line?.display ?? "No line").font(.caption).foregroundStyle(m.line == nil ? Theme.muted : Theme.accent)
                        }
                        Spacer()
                        Menu {
                            let taken = Set(d.team.compactMap { $0.line?.number })
                            ForEach(d.numbers.filter { !taken.contains($0.number) || $0.number == m.line?.number }, id: \.sid) { n in
                                Button("\(n.display) \(n.name.isEmpty ? "" : "· \(n.name)")") { Task { if await act("assignPhoneLine", ["userId": m.id, "number": n.number, "twilioSid": n.sid], ok: "\(n.display) is \(m.name)’s line") { await loader.load() } } }
                            }
                            if m.line != nil { Button("Remove line", role: .destructive) { Task { if await act("removePhoneLine", m.id, ok: "Line removed") { await loader.load() } } } }
                        } label: { Text(m.line == nil ? "Assign" : "Change").font(.caption.weight(.bold)).padding(.horizontal, 10).padding(.vertical, 6).background(Theme.raised, in: Capsule()) }
                    }
                }
            }
            Panel(title: "Calls", icon: "slider.horizontal.3") {
                ToggleRow(title: "Record calls", hint: "Both sides, for coaching and the transcript", on: Binding(get: { d.record }, set: { v in Task { if await act("saveSettings", ["voice.record": v], ok: "Saved") { await loader.load() } } }))
                ToggleRow(title: "Live Straight Line hints", hint: "Tips on the rep’s screen during a call (website)", on: Binding(get: { d.hints }, set: { v in Task { if await act("saveSettings", ["voice.hints": v], ok: "Saved") { await loader.load() } } }))
                Text("Countries that can be called: \(d.countries.joined(separator: ", "))").font(.caption).foregroundStyle(Theme.muted)
            }
            Panel(title: "Latest calls", icon: "clock") {
                ForEach(d.calls) { c in
                    NavigationLink(value: CallRoute.detail(c.id)) {
                        HStack {
                            Image(systemName: c.direction == "INBOUND" ? "phone.arrow.down.left" : "phone.arrow.up.right").foregroundStyle(Theme.muted)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(c.lead ?? c.number).font(.subheadline).foregroundStyle(Theme.text).lineLimit(1)
                                Text("\(c.by ?? "") · \(c.status)\(c.durationSec.map { " · \(PhoneFmt.clock($0))" } ?? "")").font(.caption).foregroundStyle(Theme.muted).lineLimit(1)
                            }
                            Spacer()
                            Text(Fmt.relative(c.startedAt)).font(.caption).foregroundStyle(Theme.muted)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Sales team

struct SalesTeamData: Decodable {
    struct Rep: Decodable, Hashable, Identifiable { let id: String; let name: String; let email: String; let active: Bool; let openLeads: Int; let won: Int; let lost: Int; let wonValue: Double; let won30: Int; let wonValue30: Double; let conversion: Double?; let openTasks: Int; let overdueTasks: Int; let upcomingMeetings: Int; let lastActive: Date?; let page: String }
    let reps: [Rep]
}

struct SalesTeamView: View {
    @State private var loader = AdminLoader<SalesTeamData>("team")
    var body: some View {
        AdminPage(title: "Sales team", loader: loader) { d in
            if let best = d.reps.first, best.wonValue > 0 {
                HStack(spacing: 14) {
                    ZStack { PulseRings(tint: Theme.amber).frame(width: 56, height: 56); Avatar(name: best.name, size: 56) }
                    VStack(alignment: .leading, spacing: 3) {
                        Text("TOP PERFORMER").font(.caption2.weight(.bold)).foregroundStyle(Theme.amber)
                        Text(best.name).font(.title3.weight(.bold)).foregroundStyle(Theme.text)
                        Text("\(Money.ils(best.wonValue)) won").font(.subheadline).foregroundStyle(Theme.green)
                    }
                    Spacer()
                }
                .card()
            }
            if d.reps.isEmpty { EmptyHint(icon: "person.3", title: "No salespeople yet", message: "Add them under Team access.") }
            ForEach(Array(d.reps.enumerated()), id: \.element.id) { i, r in
                NavigationLink(value: Route.web(path: "/admin/team/\(r.id)", title: r.name)) {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(spacing: 12) {
                            Text("\(i + 1)").font(.subheadline.weight(.bold)).foregroundStyle(Theme.muted).frame(width: 18)
                            Avatar(name: r.name, size: 40)
                            VStack(alignment: .leading, spacing: 2) {
                                HStack { Text(r.name).font(.headline).foregroundStyle(Theme.text); if !r.active { Tag(text: "Off", tint: Theme.muted) } }
                                Text(r.lastActive.map { "Active \(Fmt.relative($0))" } ?? "Not active yet").font(.caption).foregroundStyle(Theme.muted)
                            }
                            Spacer()
                            Text(Money.short(r.wonValue)).font(.headline).foregroundStyle(Theme.green)
                        }
                        HStack(spacing: 0) {
                            mini("\(r.openLeads)", "open")
                            mini("\(r.won)", "won")
                            mini(r.conversion.map { "\(Int($0))%" } ?? "—", "win rate")
                            mini("\(r.openTasks)", r.overdueTasks > 0 ? "\(r.overdueTasks) late" : "tasks", warn: r.overdueTasks > 0)
                            mini("\(r.upcomingMeetings)", "meetings")
                        }
                    }
                    .card()
                }
                .buttonStyle(PressStyle())
            }
        }
    }
    private func mini(_ v: String, _ l: String, warn: Bool = false) -> some View {
        VStack(spacing: 1) {
            Text(v).font(.subheadline.weight(.bold)).foregroundStyle(Theme.text)
            Text(l).font(.caption2).foregroundStyle(warn ? Theme.amber : Theme.muted)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Team access

struct TeamAccessData: Decodable {
    struct Person: Decodable, Hashable, Identifiable { let email: String; let role: String; let active: Bool; let timeZone: String?; let userId: String?; let name: String?; let avatar: String?; let signedUp: Bool; let calendar: Bool; let openLeads: Int; let lastSeen: Date?; var id: String { email } }
    let people: [Person]
}

struct TeamAccessView: View {
    @State private var loader = AdminLoader<TeamAccessData>("users")
    @State private var adding = false
    @State private var removing: TeamAccessData.Person?
    var body: some View {
        AdminPage(title: "Team access", loader: loader) { d in
            Text("Only people listed here can sign in (\(d.people.filter(\.active).count) active).").font(.footnote).foregroundStyle(Theme.muted).frame(maxWidth: .infinity, alignment: .leading)
            ForEach(d.people) { p in
                HStack(spacing: 12) {
                    Avatar(name: p.name ?? p.email, url: p.avatar, size: 42).opacity(p.active ? 1 : 0.4)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(p.name ?? p.email).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1)
                        Text(p.email).font(.caption).foregroundStyle(Theme.muted).lineLimit(1)
                        HStack(spacing: 6) {
                            Tag(text: p.role.capitalized, tint: p.role == "ADMIN" ? Theme.violet : p.role == "SALES" ? Theme.accent : Theme.amber)
                            if !p.signedUp { Tag(text: "Invited", tint: Theme.muted) }
                            if p.calendar { Image(systemName: "calendar").font(.caption2).foregroundStyle(Theme.green) }
                            if p.openLeads > 0 { Text("\(p.openLeads) open leads").font(.caption2).foregroundStyle(Theme.muted) }
                        }
                    }
                    Spacer()
                    Menu {
                        Section("Role") {
                            ForEach(["ADMIN", "SALES", "MARKETING"], id: \.self) { r in
                                Button { Task { if await act("upsertAllowedUser", ["email": p.email, "role": r, "active": p.active], ok: "Role changed") { await loader.load() } } } label: { Label(r.capitalized, systemImage: p.role == r ? "checkmark" : "") }
                            }
                        }
                        Button { Task { if await act("upsertAllowedUser", ["email": p.email, "role": p.role, "active": !p.active], ok: p.active ? "Access turned off" : "Access turned on") { await loader.load() } } } label: { Label(p.active ? "Turn off access" : "Turn on access", systemImage: p.active ? "pause.circle" : "play.circle") }
                        if !p.signedUp { Button { Task { _ = await act("resendInvite", p.email, ok: "Invite sent again") } } label: { Label("Resend invite", systemImage: "envelope") } }
                        Button(role: .destructive) { removing = p } label: { Label("Remove", systemImage: "trash") }
                    } label: { Image(systemName: "ellipsis.circle").font(.title3).foregroundStyle(Theme.muted) }
                }
                .card(padding: 14)
            }
        }
        .toolbar { ToolbarItem(placement: .primaryAction) { Button { adding = true } label: { Image(systemName: "person.badge.plus") } } }
        .sheet(isPresented: $adding) { AddTeammateSheet { await loader.load() } }
        .confirmationDialog("Remove \(removing?.email ?? "")?", isPresented: Binding(get: { removing != nil }, set: { if !$0 { removing = nil } }), titleVisibility: .visible, presenting: removing) { p in
            Button("Remove access", role: .destructive) { Task { if await act("removeAllowedUser", p.email, ok: "Removed. Their open leads are unassigned.") { await loader.load() } } }
        } message: { _ in Text("They can’t sign in any more, and their open leads go back to the pool.") }
    }
}

struct AddTeammateSheet: View {
    let saved: () async -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var role = "SALES"
    @State private var busy = false
    var body: some View {
        NavigationStack {
            Form {
                TextField("Email", text: $email).keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                Picker("Role", selection: $role) { Text("Sales").tag("SALES"); Text("Marketing").tag("MARKETING"); Text("Admin").tag("ADMIN") }.pickerStyle(.segmented)
                Text("They get a branded invite email and sign in with Google.").font(.footnote).foregroundStyle(Theme.muted)
            }
            .scrollContentBackground(.hidden)
            .background(Theme.bg)
            .navigationTitle("Add teammate")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Invite") { Task { busy = true; if await act("upsertAllowedUser", ["email": email.trimmingCharacters(in: .whitespaces).lowercased(), "role": role, "active": true], ok: "Invite sent to \(email)") { await saved(); dismiss() }; busy = false } }
                        .disabled(busy || !email.contains("@"))
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Audit log

struct AuditData: Decodable {
    struct Log: Decodable, Hashable, Identifiable { let id: String; let at: Date; let type: String; let action: String; let actor: String?; let entityId: String; let lead: String?; let details: String }
    let page: Int
    let more: Bool
    let total: Int
    let logs: [Log]
}

struct AuditView: View {
    @State private var type = ""
    @State private var q = ""
    @State private var logs: [AuditData.Log] = []
    @State private var page = 1
    @State private var more = false
    @State private var failed: String?
    private let types = [("", "All"), ("LEAD", "Leads"), ("BOOKING", "Bookings"), ("USER", "Sign-ins"), ("ALLOWED_USER", "Team"), ("SETTING", "Settings"), ("OFFER", "Offers")]

    var body: some View {
        List {
            Section {
                FilterRail(items: types.map { ($0.0, $0.1, nil) }, selection: $type).listRowInsets(EdgeInsets()).listRowBackground(Color.clear)
            }
            if let failed { LoadFailed(message: failed) { await load(reset: true) }.listRowBackground(Color.clear) }
            ForEach(logs) { l in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(l.action).font(.subheadline.weight(.semibold).monospaced()).foregroundStyle(Theme.text)
                        Spacer()
                        Text(Fmt.relative(l.at)).font(.caption).foregroundStyle(Theme.muted)
                    }
                    Text("\(l.actor ?? "System")\(l.lead.map { " · \($0)" } ?? "")").font(.caption).foregroundStyle(Theme.accent)
                    if !l.details.isEmpty { Text(l.details).font(.caption).foregroundStyle(Theme.muted).lineLimit(3) }
                }
                .listRowBackground(Theme.card)
                .onAppear { if l.id == logs.last?.id, more { Task { await load(reset: false) } } }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .screenBackground()
        .navigationTitle("Audit log")
        .searchable(text: $q, prompt: "Action, e.g. lead.created")
        .refreshable { await load(reset: true) }
        .task(id: "\(type)|\(q)") {
            if !q.isEmpty { try? await Task.sleep(for: .milliseconds(300)) }
            await load(reset: true)
        }
    }

    private func load(reset: Bool) async {
        let p = reset ? 1 : page + 1
        do {
            let d: AuditData = try await API.shared.get("/api/mobile/v1/admin/audit", query: [URLQueryItem(name: "type", value: type), URLQueryItem(name: "q", value: q), URLQueryItem(name: "page", value: String(p))])
            logs = reset ? d.logs : logs + d.logs
            page = p
            more = d.more
            failed = nil
        } catch { failed = error.localizedDescription }
    }
}

// MARK: - Settings

struct SettingsData: Decodable {
    struct Values: Decodable {
        var roundRobin: Bool
        var defaultOwner: String
        var notifyEmails: [String]
        var duration: Int
        var buffer: Int
        var brand: String
        var support: String
        var staleDays: Int
        var newLead: Bool
        var reminders: Bool
        var weekly: Bool
        var record: Bool
        var hints: Bool
        enum CodingKeys: String, CodingKey {
            case roundRobin = "roundRobin.enabled", defaultOwner = "leads.defaultOwnerEmail", notifyEmails = "notifications.emails", duration = "booking.defaultDurationMinutes", buffer = "booking.bufferMinutes", brand = "brand.name", support = "brand.supportEmail", staleDays = "leads.staleDays", newLead = "notifications.newLead", reminders = "reminders.meetingEmails", weekly = "notifications.weeklySummary", record = "voice.record", hints = "voice.hints"
        }
    }
    struct Signer: Decodable { let name: String; let title: String; let email: String; let phone: String }
    var values: Values
    let signer: Signer
}

struct AdminSettingsView: View {
    @State private var loader = AdminLoader<SettingsData>("settings")
    @State private var v: SettingsData.Values?
    @State private var emails = ""
    @State private var saving = false
    @Environment(\.openURL) private var openURL

    var body: some View {
        Form {
            if let _ = v {
                Section("Leads") {
                    ToggleRow(title: "Round-robin new leads", hint: "Share website leads between salespeople", on: bind(\.roundRobin))
                    TextField("Every new lead to (email, optional)", text: bind(\.defaultOwner)).keyboardType(.emailAddress).textInputAutocapitalization(.never)
                    Stepper("Quiet after \(v!.staleDays) days", value: bind(\.staleDays), in: 1...365)
                }
                Section("Meetings") {
                    Stepper("Default length \(v!.duration) min", value: bind(\.duration), in: 15...240, step: 15)
                    Stepper("Buffer \(v!.buffer) min", value: bind(\.buffer), in: 0...120, step: 5)
                    ToggleRow(title: "Remind guests a day before", on: bind(\.reminders))
                }
                Section("Emails") {
                    ToggleRow(title: "Email on every new lead", on: bind(\.newLead))
                    ToggleRow(title: "Weekly summary to admins", on: bind(\.weekly))
                    TextField("Who gets them (comma separated)", text: $emails, axis: .vertical).keyboardType(.emailAddress).textInputAutocapitalization(.never)
                }
                Section("Brand") {
                    TextField("Name", text: bind(\.brand))
                    TextField("Support email", text: bind(\.support)).keyboardType(.emailAddress).textInputAutocapitalization(.never)
                }
                Section("Calls") {
                    ToggleRow(title: "Record calls", on: bind(\.record))
                    ToggleRow(title: "Live Straight Line hints", on: bind(\.hints))
                }
                Section {
                    Button { openURL(Config.baseURL.appending(path: "admin/settings")) } label: { Label("Contract signer and signature (website)", systemImage: "signature") }
                } footer: { Text("Signing contracts needs a drawn signature, so it stays on the website.") }
            } else if let f = loader.failed {
                LoadFailed(message: f) { await loader.load() }
            } else {
                ProgressView()
            }
        }
        .scrollContentBackground(.hidden)
        .screenBackground()
        .navigationTitle("Settings")
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Save") { Task { await save() } }.disabled(saving || v == nil) } }
        .task {
            await loader.load()
            v = loader.value?.values
            emails = v?.notifyEmails.joined(separator: ", ") ?? ""
        }
    }

    private func bind<T>(_ k: WritableKeyPath<SettingsData.Values, T>) -> Binding<T> {
        Binding(get: { v![keyPath: k] }, set: { v![keyPath: k] = $0 })
    }

    private func save() async {
        guard let v else { return }
        saving = true
        defer { saving = false }
        let list = emails.split(whereSeparator: { $0 == "," || $0 == " " || $0 == "\n" }).map(String.init).filter { $0.contains("@") }
        let values: [String: Any] = [
            "roundRobin.enabled": v.roundRobin, "leads.defaultOwnerEmail": v.defaultOwner.trimmingCharacters(in: .whitespaces).lowercased(), "notifications.emails": list,
            "booking.defaultDurationMinutes": v.duration, "booking.bufferMinutes": v.buffer, "brand.name": v.brand, "brand.supportEmail": v.support,
            "leads.staleDays": v.staleDays, "notifications.newLead": v.newLead, "reminders.meetingEmails": v.reminders, "notifications.weeklySummary": v.weekly,
            "voice.record": v.record, "voice.hints": v.hints,
        ]
        _ = await act("saveSettings", values, ok: "Settings saved")
    }
}

// MARK: - Sales contracts

struct ContractsData: Decodable {
    struct Signed: Decodable, Hashable { let version: String; let at: Date; let current: Bool }
    struct Pending: Decodable, Hashable { let url: String; let expiresAt: Date }
    struct Person: Decodable, Hashable, Identifiable { let id: String; let name: String; let email: String?; let signed: Signed?; let pending: Pending?; let page: String }
    let version: String
    let people: [Person]
}

/// Where each salesperson's agreement stands. Writing and sending contracts happens on the website (signatures, PDFs).
struct SalesContractsView: View {
    @State private var loader = AdminLoader<ContractsData>("sales-contracts")
    @Environment(\.openURL) private var openURL
    var body: some View {
        AdminPage(title: "Sales contracts", loader: loader) { d in
            Text("Current agreement: version \(d.version)").font(.footnote).foregroundStyle(Theme.muted).frame(maxWidth: .infinity, alignment: .leading)
            ForEach(d.people) { p in
                HStack(spacing: 12) {
                    Avatar(name: p.name, size: 40)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(p.name).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text)
                        if let s = p.signed {
                            Tag(text: s.current ? "Signed \(s.at.formatted(date: .abbreviated, time: .omitted))" : "Signed v\(s.version), needs v\(d.version)", tint: s.current ? Theme.green : Theme.amber, icon: "signature")
                        } else if let pending = p.pending {
                            Tag(text: "Sent, link valid until \(pending.expiresAt.formatted(date: .abbreviated, time: .omitted))", tint: Theme.accent, icon: "paperplane")
                        } else {
                            Tag(text: "Not sent yet", tint: Theme.muted)
                        }
                    }
                    Spacer()
                    Menu {
                        if let pending = p.pending, let u = URL(string: pending.url) {
                            ShareLink(item: u) { Label("Share the signing link", systemImage: "square.and.arrow.up") }
                            Button { UIPasteboard.general.string = pending.url; ToastCenter.shared?.show("Link copied") } label: { Label("Copy link", systemImage: "doc.on.doc") }
                        }
                        Button { if let u = URL(string: p.page) { openURL(u) } } label: { Label("Write or send on the website", systemImage: "safari") }
                    } label: { Image(systemName: "ellipsis.circle").font(.title3).foregroundStyle(Theme.muted) }
                }
                .card(padding: 14)
            }
            Button { openURL(Config.baseURL.appending(path: "admin/sales-contracts")) } label: { Label("Company details and signatures (website)", systemImage: "safari") }.font(.footnote.weight(.semibold))
        }
    }
}
