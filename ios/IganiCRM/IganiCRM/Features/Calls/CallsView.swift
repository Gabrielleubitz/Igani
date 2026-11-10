import AVFoundation
import SwiftUI

struct CallsPage: Decodable {
    struct Tab: Decodable, Hashable { let key: String; let count: Int }
    struct Stats: Decodable { let calls: Int; let talked: Int; let talkSec: Int; let avgScore: Int? }
    struct Person: Decodable, Hashable, Identifiable { let id: String; let name: String }
    struct Row: Decodable, Identifiable, Hashable {
        let id: String
        let leadId: String?
        let name: String
        let company: String?
        let number: String
        let direction: String
        let status: String
        let result: String
        let outcome: String?
        let outcomeLabel: String?
        let startedAt: Date
        let durationSec: Int?
        let recorded: Bool
        let score: Int?
        let analyzing: Bool
        let by: String?
    }
    let isAdmin: Bool
    let tabs: [Tab]
    let more: Bool
    let stats: Stats
    let people: [Person]
    let calls: [Row]
}

/// Every call, organised: tabs, a time window, search, and each call's score (the website's Calls page).
struct CallsView: View {
    @State private var view = "all"
    @State private var range = "30d"
    @State private var person = ""
    @State private var query = ""
    @State private var page: CallsPage?
    @State private var rows: [CallsPage.Row] = []
    @State private var failed: String?
    @State private var pageNo = 1
    @State private var loadingMore = false

    private let labels = ["all": "All", "talked": "Conversations", "missed": "No answer", "incoming": "Incoming", "callback": "Call back"]
    private let ranges = [("today", "Today"), ("7d", "7 days"), ("30d", "30 days"), ("all", "All time")]

    var body: some View {
        List {
            if let page {
                if page.isAdmin {
                    Section { LiveCallsPanel() }
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                }
                Section {
                    VStack(spacing: 12) {
                        StatGrid {
                            LiveStat(label: "Calls", value: "\(page.stats.calls)", icon: "phone.fill")
                            LiveStat(label: "Conversations", value: "\(page.stats.talked)", icon: "person.wave.2.fill", tint: Theme.green, sub: page.stats.calls > 0 ? "\(Int(Double(page.stats.talked) / Double(page.stats.calls) * 100))% connect rate" : nil)
                            LiveStat(label: "On the phone", value: talk(page.stats.talkSec), icon: "clock.fill", tint: Theme.violet)
                            LiveStat(label: "Average score", value: page.stats.avgScore.map(String.init) ?? "—", icon: "sparkles", tint: page.stats.avgScore.map(ScoreRing.tint) ?? Theme.muted)
                        }
                        FilterRail(items: page.tabs.map { ($0.key, labels[$0.key] ?? $0.key, $0.count) }, selection: $view)
                            .padding(.horizontal, -16)
                        HStack {
                            Menu {
                                Picker("When", selection: $range) { ForEach(ranges, id: \.0) { Text($0.1).tag($0.0) } }
                            } label: { Label(ranges.first { $0.0 == range }?.1 ?? "", systemImage: "calendar").font(.footnote.weight(.semibold)) }
                            Spacer()
                            if page.isAdmin {
                                Menu {
                                    Picker("Who", selection: $person) {
                                        Text("Everyone").tag("")
                                        ForEach(page.people) { Text($0.name).tag($0.id) }
                                    }
                                } label: { Label(page.people.first { $0.id == person }?.name ?? "Everyone", systemImage: "person.2").font(.footnote.weight(.semibold)) }
                            }
                        }
                        .padding(.horizontal, 4)
                    }
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                }
                if rows.isEmpty {
                    EmptyHint(icon: "phone", title: query.isEmpty ? "No calls here" : "No calls match", message: query.isEmpty ? "Try another tab or a longer time window." : "Nothing for “\(query)”. Try a name or a number.")
                        .listRowBackground(Color.clear)
                }
                ForEach(days, id: \.0) { day in
                    Section(day.0) {
                        ForEach(day.1) { c in
                            NavigationLink(value: CallRoute.detail(c.id)) { CallHistoryRow(call: c) }
                                .listRowBackground(Theme.card)
                        }
                    }
                }
                if page.more || (pageNo > 1 && loadingMore) {
                    Button { Task { await more() } } label: {
                        HStack { Spacer(); if loadingMore { ProgressView() } else { Text("Show more") }; Spacer() }
                    }
                    .listRowBackground(Theme.card)
                }
            } else if let failed {
                LoadFailed(message: failed) { await load() }.listRowBackground(Color.clear)
            } else {
                SkeletonRows(count: 8).listRowBackground(Color.clear)
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .screenBackground()
        .navigationTitle("Calls")
        .searchable(text: $query, prompt: "Name, business or number")
        .refreshable { await load() }
        .task(id: "\(view)|\(range)|\(person)|\(query)") {
            if !query.isEmpty { try? await Task.sleep(for: .milliseconds(300)) }
            await load()
        }
    }

    private var days: [(String, [CallsPage.Row])] {
        var out: [(String, [CallsPage.Row])] = []
        for r in rows {
            let key = dayLabel(r.startedAt)
            if out.last?.0 == key { out[out.count - 1].1.append(r) } else { out.append((key, [r])) }
        }
        return out
    }

    private func dayLabel(_ d: Date) -> String {
        let cal = Calendar.current
        if cal.isDateInToday(d) { return "Today" }
        if cal.isDateInYesterday(d) { return "Yesterday" }
        return d.formatted(.dateTime.weekday(.wide).month(.abbreviated).day())
    }

    private func talk(_ s: Int) -> String { s < 3600 ? PhoneFmt.clock(s) : "\(s / 3600)h \(String(format: "%02d", (s % 3600) / 60))m" }

    private func query(_ p: Int) -> [URLQueryItem] {
        [URLQueryItem(name: "view", value: view), URLQueryItem(name: "range", value: range), URLQueryItem(name: "q", value: query), URLQueryItem(name: "person", value: person), URLQueryItem(name: "page", value: String(p))]
    }

    private func load() async {
        do {
            let p: CallsPage = try await API.shared.get("/api/mobile/v1/calls", query: query(1))
            withAnimation(.snappy) {
                page = p
                rows = p.calls
                pageNo = 1
            }
        } catch { if page == nil { failed = error.localizedDescription } }
    }

    private func more() async {
        loadingMore = true
        defer { loadingMore = false }
        if let p: CallsPage = try? await API.shared.get("/api/mobile/v1/calls", query: query(pageNo + 1)) {
            pageNo += 1
            rows += p.calls
            page = p
        }
    }
}

struct CallHistoryRow: View {
    let call: CallsPage.Row
    var body: some View {
        let look = CallLook.of(direction: call.direction, status: call.status, durationSec: call.durationSec)
        HStack(spacing: 12) {
            IconChip(icon: look.icon, tint: look.tint, size: 38)
            VStack(alignment: .leading, spacing: 3) {
                Text(call.name).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1)
                HStack(spacing: 5) {
                    Text(call.startedAt.formatted(date: .omitted, time: .shortened))
                    if let d = call.durationSec, d > 0 { Text("· \(PhoneFmt.clock(d))").monospacedDigit() }
                    if let o = call.outcomeLabel { Text("· \(o)") }
                    if let by = call.by { Text("· \(by)") }
                }
                .font(.caption).foregroundStyle(Theme.muted).lineLimit(1)
            }
            Spacer()
            if let s = call.score {
                Text("\(s)").font(.footnote.weight(.bold)).monospacedDigit().foregroundStyle(ScoreRing.tint(s))
                    .frame(width: 36, height: 36).background(ScoreRing.tint(s).opacity(0.15), in: Circle())
            } else if call.analyzing {
                ProgressView().controlSize(.small)
            } else if call.recorded {
                Image(systemName: "waveform").foregroundStyle(Theme.muted)
            }
        }
        .padding(.vertical, 3)
    }
}

// MARK: - One call

struct CallDetail: Decodable {
    struct Part: Decodable, Hashable { let key: String; let label: String; let score: Int; let why: String }
    struct Score: Decodable { let total: Int; let capped: String?; let parts: [Part]; let lift: String? }
    struct Objection: Decodable, Hashable { let objection: String; let response: String; let handledWell: Bool; let better: String? }
    struct ActionItem: Decodable, Hashable { let owner: String; let text: String }
    struct Moment: Decodable, Hashable { let at: Double?; let step: String?; let clientSaid: String?; let repSaid: String; let better: String; let why: String }
    struct Skill: Decodable, Hashable { let key: String; let label: String; let score: Int; let why: String? }
    struct Focus: Decodable, Hashable { let skill: String; let why: String; let drill: String; let sayThis: String }
    struct Review: Decodable {
        let sales: Bool
        let type: String
        let summary: String
        let verdict: String?
        let sentiment: String
        let nextStep: String?
        let score: Score?
        let talkRatioRep: Int
        let questions: Int
        let strengths: [String]
        let improvements: [String]
        let needs: [String]
        let objections: [Objection]
        let actions: [ActionItem]
        let moments: [Moment]
        let skills: [Skill]
        let focus: [Focus]
    }
    struct Line: Decodable, Hashable { let at: Double; let speaker: String; let text: String }
    let id: String
    let leadId: String?
    let name: String
    let company: String?
    let number: String
    let dial: String
    let direction: String
    let status: String
    let statusLabel: String
    let outcomeLabel: String?
    let notes: String?
    let startedAt: Date
    let durationSec: Int?
    let by: String?
    let recording: String?
    let analysis: String?
    let canAnalyze: Bool
    let review: Review?
    let transcript: [Line]
}

/// Plays a call recording (signed in: the recording only streams to the caller and admins).
@MainActor @Observable final class RecordingPlayer {
    var playing = false
    var time: Double = 0
    var duration: Double = 0
    var rate: Float = 1
    var failed = false
    private var player: AVPlayer?
    private var observer: Any?

    func load(_ url: String) {
        guard player == nil, let u = URL(string: url) else { return }
        var headers: [String: String] = [:]
        if let c = API.shared.cookieHeader { headers["Cookie"] = c }
        let asset = AVURLAsset(url: u, options: ["AVURLAssetHTTPHeaderFieldsKey": headers])
        let item = AVPlayerItem(asset: asset)
        let p = AVPlayer(playerItem: item)
        player = p
        observer = p.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.25, preferredTimescale: 600), queue: .main) { [weak self] t in
            MainActor.assumeIsolated {
                guard let self else { return }
                self.time = t.seconds
                if let d = p.currentItem?.duration.seconds, d.isFinite, d > 0 { self.duration = d }
                if p.currentItem?.status == .failed { self.failed = true }
                self.playing = p.rate > 0
            }
        }
    }

    func toggle() {
        guard let player else { return }
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio)
        if player.rate > 0 { player.pause() } else { player.rate = rate }
        playing = player.rate > 0
    }

    func seek(_ seconds: Double, play: Bool = true) {
        player?.seek(to: CMTime(seconds: max(0, seconds), preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero)
        time = seconds
        if play, !(player?.rate ?? 0 > 0) { toggle() }
    }

    func cycleRate() {
        rate = rate >= 2 ? 1 : rate + 0.5
        if let player, player.rate > 0 { player.rate = rate }
    }

    func stop() {
        player?.pause()
        if let observer { player?.removeTimeObserver(observer) }
        observer = nil
        player = nil
    }
}

struct CallDetailView: View {
    let id: String
    @Environment(Toasts.self) private var toasts
    @State private var state: Load<CallDetail> = .loading
    @State private var player = RecordingPlayer()
    @State private var analyzing = false
    @State private var showAllTranscript = false

    var body: some View {
        ScrollView {
            switch state {
            case .loading: SkeletonRows(count: 6)
            case .failed(let m): LoadFailed(message: m) { await load() }
            case .ready(let c): content(c)
            }
        }
        .screenBackground()
        .navigationTitle("Call")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .onDisappear { player.stop() }
    }

    private func content(_ c: CallDetail) -> some View {
        VStack(spacing: 16) {
            header(c)
            if let rec = c.recording { playerCard(rec, c) }
            if let r = c.review {
                if let s = r.score { scoreCard(s, r) }
                Panel(title: "Summary", icon: "text.alignleft") {
                    ExpandableText(text: r.summary, lines: 6)
                    if let v = r.verdict {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("THE COACH SAYS").font(.caption2.weight(.bold)).foregroundStyle(Theme.accent)
                            Text(v).font(.subheadline).foregroundStyle(Theme.text)
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Theme.accent.opacity(0.1), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    if let n = r.nextStep { Label(n, systemImage: "arrow.right.circle.fill").font(.subheadline).foregroundStyle(Theme.green) }
                }
                if !r.skills.isEmpty {
                    Panel(title: "Control-of-the-call skills", icon: "chart.bar.fill") {
                        ForEach(r.skills, id: \.key) { s in
                            VStack(alignment: .leading, spacing: 4) {
                                BarRow(label: s.label, value: s.score, max: 5, tint: s.score >= 4 ? Theme.green : s.score >= 3 ? Theme.amber : Theme.red, trailing: "\(s.score)/5")
                                if let w = s.why { Text(w).font(.caption).foregroundStyle(Theme.muted) }
                            }
                        }
                    }
                }
                if !r.focus.isEmpty {
                    Panel(title: "Work on this next", icon: "target") {
                        ForEach(r.focus, id: \.skill) { f in
                            VStack(alignment: .leading, spacing: 6) {
                                Text(f.skill).font(.subheadline.weight(.bold)).foregroundStyle(Theme.text)
                                Text(f.why).font(.subheadline).foregroundStyle(Theme.muted)
                                Label(f.drill, systemImage: "figure.run").font(.footnote).foregroundStyle(Theme.text)
                                Text("“\(f.sayThis)”").font(.footnote.italic()).foregroundStyle(Theme.accent)
                            }
                        }
                    }
                }
                twoLists(r)
                if !r.moments.isEmpty {
                    Panel(title: "Moments to replay", icon: "play.circle") {
                        ForEach(r.moments, id: \.self) { m in
                            Button { if let at = m.at { player.seek(at) } } label: {
                                VStack(alignment: .leading, spacing: 6) {
                                    HStack {
                                        if let at = m.at { Tag(text: PhoneFmt.clock(Int(at)), tint: Theme.accent, icon: "play.fill") }
                                        if let s = m.step { Tag(text: s, tint: Theme.violet) }
                                    }
                                    if let cs = m.clientSaid { Text("Client: “\(cs)”").font(.footnote).foregroundStyle(Theme.muted) }
                                    Text("You: “\(m.repSaid)”").font(.footnote).foregroundStyle(Theme.text)
                                    Text("Better: “\(m.better)”").font(.footnote.weight(.semibold)).foregroundStyle(Theme.green)
                                    Text(m.why).font(.caption).foregroundStyle(Theme.muted)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(12)
                                .background(Theme.raised.opacity(0.6), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                            }
                            .buttonStyle(PressStyle())
                            .disabled(m.at == nil || c.recording == nil)
                        }
                    }
                }
                if !r.objections.isEmpty {
                    Panel(title: "Objections", icon: "exclamationmark.bubble") {
                        ForEach(r.objections, id: \.self) { o in
                            VStack(alignment: .leading, spacing: 4) {
                                HStack(alignment: .top) {
                                    Image(systemName: o.handledWell ? "checkmark.circle.fill" : "xmark.circle.fill").foregroundStyle(o.handledWell ? Theme.green : Theme.red)
                                    Text(o.objection).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text)
                                }
                                Text(o.response).font(.footnote).foregroundStyle(Theme.muted)
                                if let b = o.better { Text("Try: \(b)").font(.footnote).foregroundStyle(Theme.accent) }
                            }
                        }
                    }
                }
            } else if c.canAnalyze {
                Panel(title: "Coaching", icon: "sparkles") {
                    Text(c.analysis == "processing" || c.analysis == "pending" ? "The recording is being analysed. This takes a minute or two." : "No analysis for this call yet.").font(.subheadline).foregroundStyle(Theme.muted)
                    if c.analysis != "processing" && c.analysis != "pending" {
                        PrimaryButton(title: "Analyse this call", icon: "sparkles", busy: analyzing) { Task { await analyze() } }
                    }
                }
            }
            if !c.transcript.isEmpty { transcript(c) }
            if let n = c.notes, !n.isEmpty { Panel(title: "Wrap-up notes", icon: "note.text") { Text(n).font(.subheadline).foregroundStyle(Theme.text) } }
        }
        .padding(16)
    }

    private func header(_ c: CallDetail) -> some View {
        let look = CallLook.of(direction: c.direction, status: c.status, durationSec: c.durationSec)
        return VStack(spacing: 12) {
            HStack(spacing: 14) {
                Avatar(name: c.name, size: 56)
                VStack(alignment: .leading, spacing: 4) {
                    Text(c.name).font(.title3.weight(.bold)).foregroundStyle(Theme.text)
                    Text([c.company, c.number].compactMap { $0 }.joined(separator: " · ")).font(.subheadline).foregroundStyle(Theme.muted).lineLimit(1)
                    HStack(spacing: 6) {
                        Tag(text: look.label, tint: look.tint, icon: look.icon)
                        if let o = c.outcomeLabel { Tag(text: o, tint: Theme.violet) }
                    }
                }
                Spacer()
            }
            Text([Fmt.day(c.startedAt), c.durationSec.map { "\(PhoneFmt.clock($0)) talk" }, c.by.map { "by \($0)" }].compactMap { $0 }.joined(separator: " · "))
                .font(.caption).foregroundStyle(Theme.muted).frame(maxWidth: .infinity, alignment: .leading)
            HStack(spacing: 10) {
                Button { Task { do { try await Phone.shared.call(c.dial, leadId: c.leadId, name: c.name) } catch { toasts.show(error.localizedDescription, tone: .warn) } } } label: {
                    Label("Call back", systemImage: "phone.fill").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent).tint(Theme.green)
                if let l = c.leadId {
                    NavigationLink(value: Route.lead(l)) { Label("Contact", systemImage: "person.crop.circle").frame(maxWidth: .infinity) }
                        .buttonStyle(.bordered)
                }
            }
            .font(.subheadline.weight(.semibold))
        }
        .card()
    }

    private func playerCard(_ url: String, _ c: CallDetail) -> some View {
        VStack(spacing: 10) {
            HStack(spacing: 14) {
                Button { player.toggle() } label: {
                    Image(systemName: player.playing ? "pause.fill" : "play.fill").font(.title2).foregroundStyle(Theme.bg)
                        .frame(width: 54, height: 54).background(Theme.accent, in: Circle())
                        .contentTransition(.symbolEffect(.replace))
                }
                .buttonStyle(ElasticStyle())
                WaveformScrub(progress: player.duration > 0 ? player.time / player.duration : 0, seed: c.id) { p in player.seek(p * player.duration, play: player.playing) }
            }
            HStack {
                Text(PhoneFmt.clock(Int(player.time))).monospacedDigit()
                Spacer()
                Button { player.cycleRate() } label: { Text("\(player.rate.formatted())×").font(.caption.weight(.bold)).padding(.horizontal, 8).padding(.vertical, 3).background(Theme.raised, in: Capsule()) }
                Spacer()
                Text(PhoneFmt.clock(Int(player.duration > 0 ? player.duration : Double(c.durationSec ?? 0)))).monospacedDigit()
            }
            .font(.caption).foregroundStyle(Theme.muted)
            if player.failed { Text("The recording isn’t available right now.").font(.caption).foregroundStyle(Theme.red) }
        }
        .card()
        .onAppear { player.load(url) }
    }

    private func scoreCard(_ s: CallDetail.Score, _ r: CallDetail.Review) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 16) {
                ScoreRing(score: s.total, size: 92, line: 9, label: "SCORE")
                VStack(alignment: .leading, spacing: 6) {
                    Text(r.type.capitalized).font(.headline).foregroundStyle(Theme.text)
                    HStack(spacing: 12) {
                        Label("\(r.talkRatioRep)% you", systemImage: "waveform").font(.caption)
                        Label("\(r.questions) questions", systemImage: "questionmark.bubble").font(.caption)
                    }
                    .foregroundStyle(Theme.muted)
                    if let lift = s.lift { Text("Biggest lift: \(lift)").font(.caption.weight(.semibold)).foregroundStyle(Theme.amber) }
                }
            }
            ForEach(s.parts, id: \.key) { p in
                VStack(alignment: .leading, spacing: 4) {
                    BarRow(label: p.label, value: p.score, max: 100, tint: ScoreRing.tint(p.score))
                    Text(p.why).font(.caption).foregroundStyle(Theme.muted)
                }
            }
            if let capped = s.capped { Label(capped, systemImage: "exclamationmark.triangle.fill").font(.caption).foregroundStyle(Theme.amber) }
        }
        .card()
    }

    @ViewBuilder private func twoLists(_ r: CallDetail.Review) -> some View {
        if !r.strengths.isEmpty || !r.improvements.isEmpty {
            Panel(title: "What went well, and what to change", icon: "checklist") {
                ForEach(r.strengths, id: \.self) { Label($0, systemImage: "checkmark.circle.fill").font(.subheadline).foregroundStyle(Theme.text).symbolRenderingMode(.multicolor) }
                ForEach(r.improvements, id: \.self) { Label($0, systemImage: "arrow.up.circle.fill").font(.subheadline).foregroundStyle(Theme.text).tint(Theme.amber) }
            }
        }
        if !r.actions.isEmpty {
            Panel(title: "Action items", icon: "checkmark.square") {
                ForEach(r.actions, id: \.self) { a in
                    HStack(alignment: .top) {
                        Tag(text: a.owner == "rep" ? "You" : "Client", tint: a.owner == "rep" ? Theme.accent : Theme.violet)
                        Text(a.text).font(.subheadline).foregroundStyle(Theme.text)
                    }
                }
            }
        }
    }

    private func transcript(_ c: CallDetail) -> some View {
        let lines = showAllTranscript ? c.transcript : Array(c.transcript.prefix(14))
        let current = c.transcript.lastIndex { $0.at <= player.time }
        return Panel(title: "Transcript", icon: "text.bubble", trailing: "Tap a line to hear it") {
            ForEach(Array(lines.enumerated()), id: \.offset) { i, l in
                Button { player.seek(l.at) } label: {
                    HStack(alignment: .top, spacing: 10) {
                        Text(PhoneFmt.clock(Int(l.at))).font(.caption2.monospacedDigit()).foregroundStyle(Theme.muted).frame(width: 38, alignment: .leading)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(l.speaker == "rep" ? (c.by?.split(separator: " ").first.map(String.init) ?? "Rep") : "Client").font(.caption.weight(.bold)).foregroundStyle(l.speaker == "rep" ? Theme.accent : Theme.violet)
                            Text(l.text).font(.subheadline).foregroundStyle(Theme.text).multilineTextAlignment(.leading)
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(8)
                    .background(i == current && player.playing ? Theme.accent.opacity(0.12) : .clear, in: RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
                .disabled(c.recording == nil)
            }
            if c.transcript.count > 14 {
                Button(showAllTranscript ? "Show less" : "Show all \(c.transcript.count) lines") { withAnimation(.snappy) { showAllTranscript.toggle() } }
                    .font(.footnote.weight(.semibold)).foregroundStyle(Theme.accent)
            }
        }
    }

    private func load() async {
        do { state = .ready(try await API.shared.get("/api/mobile/v1/calls/\(id)")) } catch { state = .failed(error.localizedDescription) }
    }

    private func analyze() async {
        analyzing = true
        defer { analyzing = false }
        do {
            try await API.shared.run("reanalyzeCall", id)
            await load()
            toasts.show("Analysis started")
        } catch { toasts.show(error.localizedDescription, tone: .warn) }
    }
}
