import Charts
import SwiftUI

struct TodayView: View {
    @Binding var tab: AppTab
    @Environment(Session.self) private var session
    @Environment(Toasts.self) private var toasts
    @Environment(\.scenePhase) private var scenePhase
    @State private var state: Load<TodayData> = .loading
    @State private var path = NavigationPath()
    @State private var doneIds: Set<String> = []
    @State private var showProfile = false
    /// tasks being ticked from "Do next" (a second tap waits)
    @State private var completing: Set<String> = []

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                VStack(alignment: .leading, spacing: 26) {
                    header
                    switch state {
                    case .loading: SkeletonRows(count: 5)
                    case .failed(let m): LoadFailed(message: m) { await load() }
                    case .ready(let d): content(d)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 30)
            }
            .scrollIndicators(.hidden)
            .refreshable { await load(announceErrors: true) }
            .screenBackground()
            .toolbar(.hidden, for: .navigationBar)
            .routes()
            .sheet(isPresented: $showProfile) { ProfileSheet() }
        }
        // also when switching back to this tab, so tasks ticked and leads moved elsewhere show here
        .task { await load() }
        .onChange(of: scenePhase) { _, phase in if phase == .active, state.value != nil { Task { await load() } } }
    }

    private var header: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 4) {
                Text(Date.now.formatted(.dateTime.weekday(.wide).month(.wide).day()).uppercased())
                    .font(.caption.weight(.semibold)).tracking(1.2).foregroundStyle(Theme.muted)
                Text("\(greeting), \(session.me?.firstName ?? "there")")
                    .font(.system(size: 30, weight: .bold, design: .rounded)).foregroundStyle(Theme.text)
            }
            Spacer()
            Button { showProfile = true } label: { Avatar(name: session.me?.name ?? "?", url: session.me?.avatar, size: 42).frame(width: 44, height: 44) }
                .buttonStyle(PressStyle())
                .accessibilityLabel("Your profile")
        }
        .padding(.top, 8)
    }

    private var greeting: String {
        let h = Calendar.current.component(.hour, from: .now)
        return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
    }

    @ViewBuilder private func content(_ d: TodayData) -> some View {
        ScrollView(.horizontal) {
            HStack(spacing: 12) {
                Button { tab = .tasks } label: { StatTile(title: "Tasks today", value: d.kpis.tasksToday, icon: "checklist", tint: Theme.violet, badge: d.kpis.tasksOverdue > 0 ? "\(d.kpis.tasksOverdue) late" : nil) }
                Button { tab = .meet } label: { StatTile(title: "Meetings today", value: d.meetingsToday, icon: "video", tint: Theme.accent) }
                Button { tab = .leads } label: { StatTile(title: "Open deals", value: d.kpis.openDeals, icon: "briefcase", tint: Theme.green) }
                StatTile(title: "Hot leads", value: d.kpis.hot, icon: "flame", tint: Theme.amber)
                StatTile(title: "New this week", value: d.kpis.newThisWeek, icon: "sparkles", tint: Theme.light)
                StatTile(title: "Won this month", value: d.kpis.wonThisMonth, icon: "trophy", tint: Theme.green)
            }
            .buttonStyle(PressStyle())
            .padding(.horizontal, 18)
        }
        .scrollIndicators(.hidden)
        .padding(.horizontal, -18)

        if !d.agenda.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                SectionTitle(title: "Agenda")
                VStack(spacing: 0) {
                    ForEach(d.agenda) { a in agendaRow(a); if a.id != d.agenda.last?.id { Divider().overlay(Theme.line).padding(.leading, 64) } }
                }
                .card(padding: 6)
            }
        }

        VStack(alignment: .leading, spacing: 12) {
            let actions = d.actions.filter { !doneIds.contains($0.id) }
            SectionTitle(title: "Do next", trailing: d.actionsTotal > d.actions.count ? "All tasks" : nil) { tab = .tasks }
            if actions.isEmpty {
                EmptyHint(icon: "checkmark.seal", title: "You’re all caught up", message: "Nothing needs you right now. New leads and follow-ups show up here.").card()
            } else {
                VStack(spacing: 10) { ForEach(actions) { actionRow($0) } }
            }
        }

        if !d.deals.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                SectionTitle(title: "Deals to move", trailing: "Board") { path.append(Route.web(path: "/sales/board", title: "Board")) }
                ScrollView(.horizontal) {
                    HStack(spacing: 12) { ForEach(d.deals) { deal in NavigationLink(value: Route.lead(deal.id)) { dealCard(deal) }.buttonStyle(PressStyle()) } }
                        .padding(.horizontal, 18)
                }
                .scrollIndicators(.hidden)
                .padding(.horizontal, -18)
            }
        }

        if d.seller {
            VStack(alignment: .leading, spacing: 12) {
                SectionTitle(title: "Calls this week", trailing: "Calls") { path.append(Route.web(path: "/sales/calls", title: "Calls")) }
                VStack(alignment: .leading, spacing: 14) {
                    HStack(spacing: 22) {
                        metric("\(d.calls.week)", "calls")
                        metric("\(d.calls.connected)", "connected")
                        metric("\(d.calls.talkMin)m", "talk time")
                        if let s = d.calls.avgScore { metric("\(s)", "avg score") }
                    }
                    // connected is part of calls: draw it over the calls bar, not stacked on top of it
                    Chart(d.calls.perDay) { day in
                        BarMark(x: .value("Day", day.label + day.key), y: .value("Calls", day.calls), stacking: .unstacked)
                            .foregroundStyle(Theme.brandGradient)
                            .clipShape(RoundedRectangle(cornerRadius: 5))
                        BarMark(x: .value("Day", day.label + day.key), y: .value("Calls", day.connected), stacking: .unstacked)
                            .foregroundStyle(Theme.green.opacity(0.8))
                            .clipShape(RoundedRectangle(cornerRadius: 5))
                    }
                    .chartXAxis { AxisMarks { v in AxisValueLabel { if let s = v.as(String.self) { Text(String(s.prefix(1))) } } } }
                    .chartYAxis(.hidden)
                    .frame(height: 110)
                    .accessibilityLabel("Calls per day this week: \(d.calls.perDay.map { "\($0.calls) calls, \($0.connected) connected" }.joined(separator: "; "))")
                    HStack(spacing: 14) {
                        Label("Calls", systemImage: "square.fill").foregroundStyle(Theme.blue)
                        Label("Connected", systemImage: "square.fill").foregroundStyle(Theme.green)
                    }
                    .font(.caption)
                    .accessibilityHidden(true)
                }
                .card()
            }
        }

        if !d.recent.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                SectionTitle(title: "Recent activity")
                VStack(spacing: 0) {
                    ForEach(d.recent.prefix(8)) { r in
                        NavigationLink(value: Route.lead(r.leadId)) {
                            HStack(spacing: 12) {
                                Avatar(name: r.leadName, size: 34)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(r.leadName).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text)
                                    Text(r.text).font(.caption).foregroundStyle(Theme.muted).lineLimit(1)
                                }
                                Spacer()
                                Text(Fmt.relative(r.at)).font(.caption2).foregroundStyle(Theme.muted)
                            }
                            .padding(.vertical, 10).padding(.horizontal, 10)
                        }
                    }
                }
                .card(padding: 4)
            }
        }
    }

    private func metric(_ v: String, _ l: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(v).font(.title3.weight(.bold)).foregroundStyle(Theme.text).contentTransition(.numericText())
            Text(l).font(.caption).foregroundStyle(Theme.muted)
        }
    }

    private func agendaRow(_ a: TodayData.Agenda) -> some View {
        HStack(spacing: 12) {
            VStack(spacing: 2) {
                Text(Fmt.time(a.start)).font(.caption.weight(.bold)).foregroundStyle(a.live ? Theme.green : Theme.text)
                if let m = a.minutes { Text("\(m)m").font(.caption2).foregroundStyle(Theme.muted) }
            }
            .frame(width: 52)
            RoundedRectangle(cornerRadius: 2).fill(a.kind == "task" || a.kind == "team-task" ? Theme.violet : Theme.accent).frame(width: 3, height: 34)
            VStack(alignment: .leading, spacing: 2) {
                Text(a.title).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1)
                if let s = a.sub { Text(s).font(.caption).foregroundStyle(Theme.muted).lineLimit(1) }
            }
            Spacer()
            if let m = a.meetUrl, let u = URL(string: m) {
                Link(destination: u) {
                    Text(a.live ? "Join now" : "Join").font(.caption.weight(.bold)).padding(.horizontal, 12).padding(.vertical, 7)
                        .background(a.live ? Theme.green : Theme.accent, in: Capsule()).foregroundStyle(Color(hex: 0x062E6F))
                }
            } else if a.href != nil {
                Image(systemName: "chevron.right").font(.footnote).foregroundStyle(Theme.muted)
            }
        }
        .padding(10)
        .contentShape(Rectangle())
        // the whole row opens it (a lone chevron was too small to hit)
        .onTapGesture { if let href = a.href { path.append(Route.from(href: href, title: a.title)) } }
    }

    private func actionRow(_ a: TodayData.Action) -> some View {
        let (icon, tint) = Self.tone(a.tone)
        return HStack(spacing: 12) {
            Image(systemName: icon).font(.subheadline.weight(.semibold)).foregroundStyle(tint)
                .frame(width: 38, height: 38).background(tint.opacity(0.14), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            VStack(alignment: .leading, spacing: 3) {
                Text(a.title).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(2)
                Text(a.sub).font(.caption).foregroundStyle(Theme.muted).lineLimit(1)
            }
            Spacer(minLength: 6)
            if let t = a.task {
                Button {
                    Task { await complete(a, t) }
                } label: {
                    Image(systemName: "checkmark").font(.footnote.weight(.bold)).foregroundStyle(Color(hex: 0x062E6F))
                        .frame(width: 34, height: 34).background(Theme.accent, in: Circle())
                        .frame(width: 44, height: 44).contentShape(Rectangle())
                }
                .buttonStyle(PressStyle())
                .padding(-5)
                .disabled(completing.contains(a.id))
                .accessibilityLabel("Mark “\(a.title)” done")
            } else {
                Image(systemName: "chevron.right").font(.footnote).foregroundStyle(Theme.muted)
            }
        }
        .card(padding: 12)
        .contentShape(Rectangle())
        .onTapGesture { path.append(Route.from(href: a.href, title: a.title)) }
        .transition(.asymmetric(insertion: .opacity, removal: .move(edge: .trailing).combined(with: .opacity)))
    }

    private func dealCard(_ d: TodayData.Deal) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Avatar(name: d.name, size: 34)
                Spacer()
                Circle().fill(d.health == "good" ? Theme.green : d.health == "watch" ? Theme.amber : Theme.red).frame(width: 8, height: 8)
            }
            Text(d.name).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1)
            Text(d.company ?? " ").font(.caption).foregroundStyle(Theme.muted).lineLimit(1)
            StagePill(status: d.status, label: session.me?.stageLabel(d.status) ?? d.status)
            ProgressView(value: Double(d.progress), total: 100).tint(Theme.stage(d.status))
            Text(d.quietDays == 0 ? "Touched today" : "Quiet \(d.quietDays)d").font(.caption2).foregroundStyle(Theme.muted)
        }
        .padding(14)
        .frame(width: 180, alignment: .leading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Theme.line))
    }

    static func tone(_ t: String) -> (String, Color) {
        switch t {
        case "email": return ("envelope", Theme.accent)
        case "reply": return ("arrowshape.turn.up.left", Theme.green)
        case "offer": return ("gift", Theme.amber)
        case "task": return ("checklist", Theme.violet)
        case "lead": return ("person.badge.plus", Theme.light)
        case "list": return ("phone.arrow.up.right", Theme.green)
        default: return ("sparkles", Theme.accent)
        }
    }

    private func complete(_ a: TodayData.Action, _ t: TaskRef) async {
        guard !completing.contains(a.id) else { return }
        completing.insert(a.id)
        defer { completing.remove(a.id) }
        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) { _ = doneIds.insert(a.id) }
        do {
            let _: Ok<Empty> = try await API.shared.post("/api/mobile/v1/tasks/\(t.taskId)", ["leadId": t.leadId, "done": true])
            toasts.show("Task done")
        } catch {
            withAnimation { _ = doneIds.remove(a.id) }
            toasts.show(error.localizedDescription, tone: .warn)
        }
    }

    private func load(announceErrors: Bool = false) async {
        do {
            let d: TodayData = try await API.shared.get("/api/mobile/v1/today")
            // keep hiding a tick still on its way to the server
            withAnimation(.snappy) { state = .ready(d); doneIds = doneIds.intersection(completing) }
        } catch {
            guard !Task.isCancelled else { return }
            if state.value == nil { state = .failed(error.localizedDescription) } else if announceErrors { toasts.show(error.localizedDescription, tone: .warn) }
        }
    }
}
