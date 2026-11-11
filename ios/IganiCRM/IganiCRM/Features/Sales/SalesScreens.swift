import Charts
import SwiftUI

// MARK: - Board

struct BoardData: Decodable {
    struct Card: Decodable, Identifiable, Hashable {
        let id: String
        let name: String
        let company: String?
        let phone: String?
        let owner: String?
        let budget: String?
        let quoted: Int?
        let score: Int
        var status: String
        let canMove: Bool
        let updatedAt: Date
    }
    let isAdmin: Bool
    var cards: [Card]
}

/// The pipeline as cards per stage. Swipe between stages; hold a card (or drag it onto a stage chip) to move it.
struct BoardView: View {
    @Environment(Session.self) private var session
    @Environment(Toasts.self) private var toasts
    @State private var data: BoardData?
    @State private var failed: String?
    @State private var stage = "NEW"
    @State private var query = ""
    @State private var lostFor: BoardData.Card?
    @State private var dropTarget: String?

    private var stages: [Stage] { session.stages }

    var body: some View {
        VStack(spacing: 0) {
            if let data {
                stageRail(data)
                TabView(selection: $stage) {
                    ForEach(stages, id: \.key) { s in
                        column(s, data).tag(s.key)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            } else if let failed {
                LoadFailed(message: failed) { await load() }
            } else {
                ScrollView { SkeletonRows(count: 6) }
            }
        }
        .screenBackground()
        .navigationTitle("Board")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $query, prompt: "Find a card")
        .task(id: query) {
            if !query.isEmpty { try? await Task.sleep(for: .milliseconds(300)) }
            guard !Task.isCancelled else { return }
            await load()
        }
        .onChange(of: session.stages.map(\.key)) { _, keys in if !keys.contains(stage), let f = keys.first { stage = f } }
        .sheet(item: $lostFor) { c in
            StageSheet(current: c.status) { s, reason in await move(c, to: s, reason: reason) }
        }
    }

    private func stageRail(_ data: BoardData) -> some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(stages, id: \.key) { s in
                        let n = data.cards.filter { $0.status == s.key }.count
                        let on = s.key == stage
                        Button { withAnimation(.snappy) { stage = s.key } } label: {
                            HStack(spacing: 6) {
                                Circle().fill(Theme.stage(s.key)).frame(width: 7, height: 7)
                                Text(s.label)
                                Text("\(n)").monospacedDigit().foregroundStyle(Theme.muted)
                            }
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(on ? Theme.text : Theme.muted)
                            .padding(.horizontal, 12).padding(.vertical, 8)
                            .background(on || dropTarget == s.key ? Theme.stage(s.key).opacity(0.2) : Theme.card, in: Capsule())
                            .overlay(Capsule().strokeBorder(on || dropTarget == s.key ? Theme.stage(s.key).opacity(0.6) : Theme.line))
                            .scaleEffect(dropTarget == s.key ? 1.08 : 1)
                        }
                        .buttonStyle(.plain)
                        .id(s.key)
                        .dropDestination(for: String.self) { ids, _ in
                            guard let id = ids.first, let c = data.cards.first(where: { $0.id == id }) else { return false }
                            Task { await move(c, to: s.key) }
                            return true
                        } isTargeted: { on in withAnimation(.snappy) { dropTarget = on ? s.key : (dropTarget == s.key ? nil : dropTarget) } }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
            }
            .onChange(of: stage) { _, s in withAnimation { proxy.scrollTo(s, anchor: .center) } }
        }
        .sensoryFeedback(.selection, trigger: stage)
    }

    private func column(_ s: Stage, _ data: BoardData) -> some View {
        let cards = data.cards.filter { $0.status == s.key }
        return ScrollView {
            LazyVStack(spacing: 10) {
                if cards.isEmpty {
                    EmptyHint(icon: "tray", title: "Nothing in \(s.label)", message: "Cards land here as deals move.")
                }
                ForEach(cards) { c in
                    NavigationLink(value: Route.lead(c.id)) { card(c, data) }
                        .buttonStyle(PressStyle())
                        .draggable(c.id) { card(c, data).frame(width: 300).opacity(0.9) }
                        .contextMenu { moveMenu(c) }
                }
            }
            .padding(16)
        }
        .refreshable { await load(announceErrors: true) }
    }

    private func card(_ c: BoardData.Card, _ data: BoardData) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Avatar(name: c.name, size: 36)
                VStack(alignment: .leading, spacing: 2) {
                    Text(c.name).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1)
                    if let co = c.company { Text(co).font(.caption).foregroundStyle(Theme.muted).lineLimit(1) }
                }
                Spacer()
                if c.score > 0 {
                    Text("\(c.score)").font(.caption.weight(.bold)).monospacedDigit().foregroundStyle(c.score >= 60 ? Theme.green : c.score >= 35 ? Theme.amber : Theme.muted)
                        .padding(.horizontal, 8).padding(.vertical, 4).background(Theme.raised, in: Capsule())
                }
            }
            HStack(spacing: 8) {
                if let q = c.quoted { Tag(text: Money.ils(q), tint: Theme.green, icon: "banknote") } else if let b = c.budget, !b.isEmpty { Tag(text: b, tint: Theme.muted) }
                if let o = c.owner, data.isAdmin { Tag(text: o, tint: Theme.violet, icon: "person.fill") }
                Spacer()
                Text(Fmt.relative(c.updatedAt)).font(.caption2).foregroundStyle(Theme.muted)
            }
        }
        .padding(14)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(alignment: .leading) { RoundedRectangle(cornerRadius: 2).fill(Theme.stage(c.status)).frame(width: 3).padding(.vertical, 14) }
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Theme.line))
    }

    @ViewBuilder private func moveMenu(_ c: BoardData.Card) -> some View {
        if c.canMove {
            Section("Move to") {
                ForEach(stages.filter { $0.settable && $0.key != c.status }, id: \.key) { s in
                    Button { Task { if s.key == "LOST" { lostFor = c } else { await move(c, to: s.key) } } } label: { Label(s.label, systemImage: "arrow.right.circle") }
                }
            }
        }
        if let p = c.phone {
            Button {
                if Phone.shared.isSeller {
                    Task { do { try await Phone.shared.call(p, leadId: c.id, name: c.name) } catch { toasts.show(error.localizedDescription, tone: .warn) } }
                } else if let u = URL(string: "tel:\(p.filter { $0.isNumber || $0 == "+" })") {
                    UIApplication.shared.open(u)
                }
            } label: { Label("Call", systemImage: "phone") }
        }
    }

    private func load(announceErrors: Bool = false) async {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            let d: BoardData = try await API.shared.get("/api/mobile/v1/board", query: q.isEmpty ? [] : [URLQueryItem(name: "q", value: q)])
            guard !Task.isCancelled else { return }
            data = d
            failed = nil
        } catch {
            guard !Task.isCancelled else { return }
            if data == nil { failed = error.localizedDescription } else if announceErrors { toasts.show(error.localizedDescription, tone: .warn) }
        }
    }

    @discardableResult
    private func move(_ c: BoardData.Card, to s: String, reason: String? = nil) async -> String? {
        // the card as it is now (a drag carries the id; the copy captured by the view may be old)
        let c = data?.cards.first(where: { $0.id == c.id }) ?? c
        guard c.status != s else { return nil }
        guard c.canMove else { toasts.show("You can only move your own cards.", tone: .warn); return nil }
        guard stages.first(where: { $0.key == s })?.settable ?? false else { toasts.show("Only an admin can move a card to \(session.me?.stageLabel(s) ?? s).", tone: .warn); return nil }
        if s == "LOST", reason == nil { lostFor = c; return nil }
        let before = data
        if let i = data?.cards.firstIndex(where: { $0.id == c.id }) { withAnimation(.snappy) { data?.cards[i].status = s } }
        do {
            var body: [String: Any] = ["status": s]
            if let reason { body["lostReason"] = reason }
            let _: Ok<Anything> = try await API.shared.post("/api/mobile/v1/leads/\(c.id)/status", body)
            toasts.show("\(c.name) → \(session.me?.stageLabel(s) ?? s)")
            return nil
        } catch {
            // put back only this card (other moves may have landed meanwhile)
            if let i = data?.cards.firstIndex(where: { $0.id == c.id }), let old = before?.cards.first(where: { $0.id == c.id }) { withAnimation(.snappy) { data?.cards[i].status = old.status } }
            toasts.show(error.localizedDescription, tone: .warn)
            return error.localizedDescription
        }
    }
}

// MARK: - Analytics

struct AnalyticsData: Decodable {
    struct Pair: Decodable { let now: Double?; let before: Double? }
    struct Row: Decodable, Hashable { let name: String; let total: Int; let won: Int }
    struct Funnel: Decodable, Hashable { let key: String; let label: String; let count: Int }
    struct Lost: Decodable, Hashable { let reason: String; let count: Int }
    struct Day: Decodable, Hashable { let day: String; let count: Int }
    struct Commission: Decodable { let total: Double; let paid: Double; let deals: Int }
    let isAdmin: Bool
    let mine: Bool
    let total: Int
    let last30: Int
    let won: Int
    let winRate: Int?
    let pipeline: Double?
    let revenue30: Pair?
    let added30: Pair?
    let winRate30: Pair
    let kept30: Pair
    let commission: Commission?
    let funnel: [Funnel]
    let lost: [Lost]
    let perDay: [Day]
    let bySource: [Row]
    let byOwner: [Row]
}

/// How many leads, where they come from, how many are won (the website's Analytics).
struct AnalyticsView: View {
    @State private var data: AnalyticsData?
    @State private var failed: String?
    @State private var scope = "team"
    @State private var picked: String?

    var body: some View {
        ScrollView {
            if let d = data {
                VStack(spacing: 16) {
                    if d.isAdmin {
                        GlassSegments(items: [("team", "Whole team", "person.3"), ("mine", "Just me", "person")], selection: $scope)
                    }
                    StatGrid {
                        LiveStat(label: "Total leads", value: "\(d.total)", icon: "person.2.fill")
                        LiveStat(label: "New, last 30 days", value: "\(d.last30)", icon: "sparkles", tint: Theme.violet)
                        LiveStat(label: "Won", value: "\(d.won)", icon: "trophy.fill", tint: Theme.amber)
                        LiveStat(label: "Win rate, all time", value: d.winRate.map { "\($0)%" } ?? "—", icon: "target", tint: Theme.green)
                        if let p = d.pipeline { LiveStat(label: "Pipeline value", value: Money.short(p), icon: "briefcase.fill", tint: Theme.green) }
                        if let r = d.revenue30 { LiveStat(label: "Won, 30 days", value: Money.short(r.now ?? 0), icon: "banknote.fill", tint: Theme.green, sub: delta(r), subTint: tint(r)) }
                        LiveStat(label: "Win rate, 30 days", value: d.winRate30.now.map { "\(Int($0))%" } ?? "—", icon: "chart.line.uptrend.xyaxis", sub: pts(d.winRate30), subTint: tint(d.winRate30))
                        LiveStat(label: "Meetings kept, 30 days", value: d.kept30.now.map { "\(Int($0))%" } ?? "—", icon: "calendar.badge.checkmark", tint: Theme.violet, sub: pts(d.kept30), subTint: tint(d.kept30))
                    }
                    if let c = d.commission {
                        Panel(title: "My commission", icon: "wallet.pass") {
                            HStack(spacing: 18) {
                                ScoreRing(score: c.total > 0 ? Int(c.paid / c.total * 100) : 0, size: 78, line: 8, label: "PAID")
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(Money.ils(c.total)).font(.title2.weight(.bold)).foregroundStyle(Theme.text)
                                    Text("\(Money.ils(c.paid)) paid · \(Money.ils(c.total - c.paid)) to come").font(.footnote).foregroundStyle(Theme.muted)
                                    Text("\(c.deals) won deal\(c.deals == 1 ? "" : "s")").font(.caption).foregroundStyle(Theme.muted)
                                }
                            }
                        }
                    }
                    Panel(title: "Leads per day", icon: "chart.bar.fill", trailing: picked.map { day in "\(day.suffix(5)): \(d.perDay.first { $0.day == day }?.count ?? 0)" } ?? "Last 30 days") {
                        Chart(d.perDay, id: \.day) { p in
                            BarMark(x: .value("Day", p.day), y: .value("Leads", p.count))
                                .foregroundStyle(picked == nil || picked == p.day ? Theme.brandGradient : LinearGradient(colors: [Theme.raised], startPoint: .top, endPoint: .bottom))
                                .cornerRadius(3)
                        }
                        .chartXAxis(.hidden)
                        .chartYAxis { AxisMarks(position: .leading) { _ in AxisGridLine().foregroundStyle(Theme.line); AxisValueLabel().foregroundStyle(Theme.muted) } }
                        .chartXSelection(value: $picked)
                        .frame(height: 150)
                        .sensoryFeedback(.selection, trigger: picked)
                    }
                    Panel(title: "Funnel", icon: "line.3.horizontal.decrease") {
                        let top = max(d.funnel.map(\.count).max() ?? 1, 1)
                        if d.funnel.allSatisfy({ $0.count == 0 }) { Text("No leads yet.").font(.subheadline).foregroundStyle(Theme.muted) }
                        ForEach(d.funnel.filter { $0.count > 0 }, id: \.key) { f in
                            BarRow(label: f.label, value: f.count, max: top, tint: Theme.stage(f.key))
                        }
                    }
                    if !d.lost.isEmpty {
                        Panel(title: "Why deals are lost", icon: "xmark.circle") {
                            let top = d.lost.map(\.count).max() ?? 1
                            ForEach(d.lost, id: \.reason) { BarRow(label: $0.reason, value: $0.count, max: top, tint: Theme.red) }
                        }
                    }
                    table("By source", d.bySource)
                    if !d.byOwner.isEmpty { table("By owner", d.byOwner) }
                }
                .padding(16)
            } else if let failed {
                LoadFailed(message: failed) { await load() }
            } else {
                SkeletonRows(count: 6)
            }
        }
        .screenBackground()
        .navigationTitle("Analytics")
        .refreshable { await load() }
        .task(id: scope) { await load() }
    }

    @ViewBuilder private func table(_ title: String, _ rows: [AnalyticsData.Row]) -> some View {
        if !rows.isEmpty { tableBody(title, rows) }
    }

    private func tableBody(_ title: String, _ rows: [AnalyticsData.Row]) -> some View {
        Panel(title: title, icon: "tablecells") {
            Chart(rows.prefix(8), id: \.name) { r in
                // won is part of the total: overlay, don't stack
                BarMark(x: .value("Leads", r.total), y: .value("Name", r.name), stacking: .unstacked).foregroundStyle(Theme.blue.opacity(0.55)).cornerRadius(4)
                BarMark(x: .value("Leads", r.won), y: .value("Name", r.name), stacking: .unstacked).foregroundStyle(Theme.green).cornerRadius(4)
            }
            .chartXAxis(.hidden)
            .chartYAxis { AxisMarks { _ in AxisValueLabel().foregroundStyle(Theme.text) } }
            .frame(height: CGFloat(min(rows.count, 8)) * 34 + 10)
            HStack(spacing: 14) {
                Label("Leads", systemImage: "square.fill").foregroundStyle(Theme.blue)
                Label("Won", systemImage: "square.fill").foregroundStyle(Theme.green)
            }
            .font(.caption)
        }
    }

    private func delta(_ p: AnalyticsData.Pair) -> String {
        guard let a = p.now, let b = p.before else { return "no data for the 30 days before" }
        if b == 0 { return a == 0 ? "same as the 30 days before" : "new vs the 30 days before" }
        return "\(a >= b ? "▲" : "▼") \(Int(abs((a - b) / b * 100)))% vs the 30 days before"
    }
    private func pts(_ p: AnalyticsData.Pair) -> String {
        guard let a = p.now, let b = p.before else { return "no data for the 30 days before" }
        return "\(a >= b ? "▲" : "▼") \(Int(abs(a - b))) pts vs the 30 days before"
    }
    private func tint(_ p: AnalyticsData.Pair) -> Color {
        guard let a = p.now, let b = p.before else { return Theme.muted }
        return a >= b ? Theme.green : Theme.red
    }

    private func load() async {
        do {
            let d: AnalyticsData = try await API.shared.get("/api/mobile/v1/analytics", query: scope == "mine" ? [URLQueryItem(name: "scope", value: "mine")] : [])
            guard !Task.isCancelled else { return }
            withAnimation(.snappy) { data = d; failed = nil }
        } catch { if data == nil, !Task.isCancelled { failed = error.localizedDescription } }
    }
}

// MARK: - Marketing

struct MarketingData: Decodable {
    struct Row: Decodable, Hashable { let label: String; let total: Int; let won: Int; let qualified: Int }
    struct Table: Decodable, Hashable { let title: String; let hint: String; let rows: [Row] }
    let days: Int
    let leads: Int
    let qualified: Int
    let won: Int
    let tables: [Table]
    let funnel: [AnalyticsData.Funnel]
}

/// Which channels and campaigns bring leads, and which turn into meetings and wins.
struct MarketingView: View {
    @State private var days = 30
    @State private var data: MarketingData?
    @State private var failed: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                GlassSegments(items: [(7, "7 days", nil), (30, "30 days", nil), (90, "90 days", nil), (365, "1 year", nil)], selection: $days)
                if let d = data {
                    StatGrid {
                        LiveStat(label: "New leads", value: "\(d.leads)", icon: "person.badge.plus")
                        LiveStat(label: "Reached a meeting+", value: "\(d.qualified)", icon: "calendar.badge.checkmark", tint: Theme.violet)
                        LiveStat(label: "Won", value: "\(d.won)", icon: "trophy.fill", tint: Theme.amber)
                        LiveStat(label: "Lead → meeting", value: d.leads > 0 ? "\(d.qualified * 100 / d.leads)%" : "—", icon: "arrow.right", tint: Theme.green)
                    }
                    ForEach(d.tables, id: \.title) { t in
                        Panel(title: t.title, icon: "megaphone") {
                            Text(t.hint).font(.caption).foregroundStyle(Theme.muted)
                            if t.rows.isEmpty { Text("No leads in this window.").font(.subheadline).foregroundStyle(Theme.muted) }
                            let top = max(t.rows.map(\.total).max() ?? 1, 1)
                            ForEach(t.rows, id: \.label) { r in
                                VStack(alignment: .leading, spacing: 3) {
                                    BarRow(label: r.label, value: r.total, max: top, tint: Theme.blue)
                                    Text("\(r.qualified) to a meeting · \(r.won) won").font(.caption2).foregroundStyle(Theme.muted)
                                }
                            }
                        }
                    }
                    Panel(title: "Where they are now", icon: "line.3.horizontal.decrease") {
                        let top = max(d.funnel.map(\.count).max() ?? 1, 1)
                        if d.funnel.allSatisfy({ $0.count == 0 }) { Text("No leads in this window.").font(.subheadline).foregroundStyle(Theme.muted) }
                        ForEach(d.funnel.filter { $0.count > 0 }, id: \.key) { BarRow(label: $0.label, value: $0.count, max: top, tint: Theme.stage($0.key)) }
                    }
                } else if let failed {
                    LoadFailed(message: failed) { await load() }
                } else {
                    SkeletonRows(count: 5)
                }
            }
            .padding(16)
        }
        .screenBackground()
        .navigationTitle("Marketing")
        .refreshable { await load() }
        .task(id: days) { await load() }
    }

    private func load() async {
        do {
            let d: MarketingData = try await API.shared.get("/api/mobile/v1/marketing", query: [URLQueryItem(name: "days", value: String(days))])
            guard !Task.isCancelled else { return }
            withAnimation(.snappy) { data = d; failed = nil }
        } catch {
            // switching the window quickly cancels the older load: that's not a failure
            if data == nil, !Task.isCancelled { failed = error.localizedDescription }
        }
    }
}
