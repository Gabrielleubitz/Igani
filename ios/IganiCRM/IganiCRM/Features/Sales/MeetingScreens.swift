import AVKit
import QuickLook
import SwiftUI

struct MeetingsData: Decodable {
    struct Lead: Decodable, Identifiable, Hashable { let id: String; let name: String; let email: String; let company: String? }
    struct Person: Decodable, Identifiable, Hashable { let id: String; let name: String }
    struct Mate: Decodable, Identifiable, Hashable { let id: String; let name: String; let email: String }
    struct Upcoming: Decodable, Identifiable, Hashable { let id: String; let title: String; let guest: String; let email: String; let start: Date; let end: Date; let status: String; let meetUrl: String?; let leadId: String? }
    let google: Bool
    let duration: Int
    let adminsOnly: Bool
    let leads: [Lead]
    let hosts: [Person]
    let teammates: [Mate]
    let upcoming: [Upcoming]
}

/// Book a meeting with a client (they confirm by email; the Meet link is made when they do) or with the team.
struct BookMeetingView: View {
    enum Kind: Hashable { case client, team }
    let kind: Kind
    var leadId: String? = nil
    @Environment(Session.self) private var session
    @Environment(Toasts.self) private var toasts
    @Environment(\.openURL) private var openURL
    @State private var data: MeetingsData?
    @State private var failed: String?

    // the form
    @State private var lead: MeetingsData.Lead?
    @State private var guestName = ""
    @State private var guestEmail = ""
    @State private var title = ""
    @State private var notes = ""
    @State private var hostId = ""
    @State private var mates: Set<String> = []
    @State private var duration = 30
    @State private var day = Calendar.current.startOfDay(for: Date())
    @State private var time: Date?
    @State private var slots: [Date] = []
    @State private var loadingSlots = false
    @State private var note: String?
    @State private var sending = false
    @State private var picking = false
    @State private var done: String?

    var body: some View {
        ScrollView {
            if let d = data {
                VStack(spacing: 16) {
                    if !d.google {
                        HStack(alignment: .top, spacing: 12) {
                            IconChip(icon: "calendar.badge.exclamationmark", tint: Theme.amber)
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Connect Google Calendar").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text)
                                Text(kind == .client ? "Invites need a Google Meet link and your calendar, so times skip what’s busy. Connect it once on the website." : "So the call gets a Meet link and clashes are checked. Connect it once on the website.").font(.footnote).foregroundStyle(Theme.muted)
                                Button("Connect on the website") { openURL(Config.baseURL.appending(path: kind == .client ? "sales/invite" : "sales/team-meeting")) }.font(.footnote.weight(.semibold))
                            }
                        }
                        .card()
                    }
                    who(d)
                    when(d)
                    details
                    if let note { Label(note, systemImage: "exclamationmark.triangle.fill").font(.footnote).foregroundStyle(Theme.amber).frame(maxWidth: .infinity, alignment: .leading) }
                    PrimaryButton(title: kind == .client ? "Send invite" : (d.adminsOnly ? "Ask for the call" : "Book the call"), icon: "paperplane.fill", busy: sending) { Task { await send(d) } }
                        .disabled(!ready)
                        .opacity(ready ? 1 : 0.5)
                    if !d.upcoming.isEmpty { upcoming(d) }
                }
                .padding(16)
            } else if let failed {
                LoadFailed(message: failed) { await load() }
            } else {
                SkeletonRows(count: 5)
            }
        }
        .scrollDismissesKeyboard(.interactively)
        .screenBackground()
        .navigationTitle(kind == .client ? "Meeting with a client" : "Meeting with the team")
        .navigationBarTitleDisplayMode(.inline)
        .task { if data == nil { await load() } }
        .task(id: "\(day)|\(duration)|\(hostId)|\(data != nil)") { await loadSlots() }
        .task(id: "\(time?.timeIntervalSince1970 ?? 0)|\(duration)|\(hostId)|\(mates.sorted().joined(separator: ","))") { await check() }
        // a time picked for another day no longer fits the strip: pick again
        .onChange(of: day) { _, d in if let t = time, !Calendar.current.isDate(t, inSameDayAs: d) { time = nil } }
        .sheet(isPresented: $picking) { LeadPicker(leads: data?.leads ?? []) { l in pick(l) } }
        .alert(done ?? "", isPresented: Binding(get: { done != nil }, set: { if !$0 { done = nil } })) { Button("OK") {} }
    }

    private var ready: Bool {
        guard time != nil, !sending else { return false }
        let name = guestName.trimmingCharacters(in: .whitespacesAndNewlines)
        let email = guestEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        return kind == .client ? (!name.isEmpty && email.contains("@") && email.contains(".")) : !mates.isEmpty
    }

    @ViewBuilder private func who(_ d: MeetingsData) -> some View {
        if kind == .client {
            Panel(title: "Who", icon: "person.crop.circle") {
                Button { picking = true } label: {
                    HStack {
                        if let lead { Avatar(name: lead.name, size: 34); VStack(alignment: .leading) { Text(lead.name).foregroundStyle(Theme.text); Text(lead.email).font(.caption).foregroundStyle(Theme.muted) } } else { Label("Pick a contact", systemImage: "magnifyingglass").foregroundStyle(Theme.accent) }
                        Spacer()
                        Image(systemName: "chevron.right").font(.caption).foregroundStyle(Theme.muted)
                    }
                    .padding(12).background(Theme.raised.opacity(0.6), in: RoundedRectangle(cornerRadius: 12))
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(lead.map { "Contact: \($0.name). Change" } ?? "Pick a contact")
                Text("or someone new").font(.caption).foregroundStyle(Theme.muted)
                FieldBox("Name", text: Binding(get: { guestName }, set: { guestName = $0; if let l = lead, $0 != l.name { lead = nil } }), content: .name)
                FieldBox("Email", text: Binding(get: { guestEmail }, set: { guestEmail = $0; if let l = lead, $0 != l.email { lead = nil } }), content: .emailAddress, keyboard: .emailAddress)
                if !d.hosts.isEmpty {
                    Picker("Host", selection: $hostId) { ForEach(d.hosts) { Text($0.name).tag($0.id) } }.tint(Theme.accent)
                }
                if !d.teammates.isEmpty { mateChips(d, label: d.adminsOnly ? "Add an admin" : "Add teammates") }
            }
        } else {
            Panel(title: d.adminsOnly ? "Which admins" : "Who", icon: "person.3") {
                if d.adminsOnly { Text("The time is held and they approve it before the Meet is created.").font(.caption).foregroundStyle(Theme.muted) }
                mateChips(d, label: nil)
            }
        }
    }

    private func mateChips(_ d: MeetingsData, label: String?) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if let label { Text(label).font(.caption.weight(.semibold)).foregroundStyle(Theme.muted) }
            FlowLayout(spacing: 8) {
                ForEach(d.teammates) { m in
                    let on = mates.contains(m.id)
                    Button { withAnimation(.snappy) { if on { mates.remove(m.id) } else { mates.insert(m.id) } } } label: {
                        HStack(spacing: 6) {
                            Avatar(name: m.name, size: 22)
                            Text(m.name).font(.footnote.weight(.semibold))
                            if on { Image(systemName: "checkmark").font(.caption2.weight(.bold)) }
                        }
                        .foregroundStyle(on ? Theme.text : Theme.muted)
                        .padding(.leading, 4).padding(.trailing, 10).padding(.vertical, 4)
                        .background(on ? Theme.accent.opacity(0.2) : Theme.raised.opacity(0.6), in: Capsule())
                        .overlay(Capsule().strokeBorder(on ? Theme.accent.opacity(0.5) : .clear))
                        .frame(minHeight: 44)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(on ? .isSelected : [])
                }
            }
            .sensoryFeedback(.selection, trigger: mates)
        }
    }

    private func when(_ d: MeetingsData) -> some View {
        Panel(title: "When", icon: "calendar") {
            DateStrip(selection: $day)
            Picker("Length", selection: $duration) { ForEach([15, 30, 45, 60, 90], id: \.self) { Text("\($0) min").tag($0) } }
                .pickerStyle(.segmented)
            if loadingSlots {
                ProgressView().frame(maxWidth: .infinity)
            } else if slots.isEmpty {
                Text("No open times that day from your hours. Pick any time below.").font(.caption).foregroundStyle(Theme.muted)
            } else {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 84), spacing: 8)], spacing: 8) {
                    ForEach(slots, id: \.self) { s in
                        let on = time == s
                        Button { withAnimation(.snappy) { time = s } } label: {
                            Text(s.formatted(date: .omitted, time: .shortened)).font(.footnote.weight(.semibold)).monospacedDigit()
                                .frame(maxWidth: .infinity).padding(.vertical, 9)
                                .foregroundStyle(on ? Theme.bg : Theme.text)
                                .background(on ? Theme.accent : Theme.raised.opacity(0.7), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                        .buttonStyle(PressStyle())
                    }
                }
                .sensoryFeedback(.selection, trigger: time)
            }
            DatePicker("Any time", selection: Binding(get: { time ?? defaultTime }, set: { time = $0 }), in: Date()..., displayedComponents: [.date, .hourAndMinute])
                .tint(Theme.accent)
        }
    }

    private var defaultTime: Date {
        let base = Calendar.current.isDateInToday(day) ? Date().addingTimeInterval(3600) : day
        return Calendar.current.date(bySettingHour: max(10, Calendar.current.component(.hour, from: base)), minute: 0, second: 0, of: base) ?? base
    }

    private var details: some View {
        Panel(title: "Details", icon: "text.alignleft") {
            FieldBox(kind == .client ? "Title (Igani intro call)" : "Title (Team call)", text: $title)
            TextField("Notes for the invite (optional)", text: $notes, axis: .vertical).lineLimit(2...5)
                .padding(12).background(Theme.raised.opacity(0.6), in: RoundedRectangle(cornerRadius: 12))
        }
    }

    private func upcoming(_ d: MeetingsData) -> some View {
        Panel(title: "Your upcoming meetings", icon: "calendar.badge.clock") {
            ForEach(d.upcoming) { b in
                HStack(spacing: 12) {
                    VStack(spacing: 0) {
                        Text(b.start.formatted(.dateTime.day())).font(.headline).foregroundStyle(Theme.text)
                        Text(b.start.formatted(.dateTime.month(.abbreviated))).font(.caption2.weight(.bold)).foregroundStyle(Theme.accent)
                    }
                    .frame(width: 44, height: 44).background(Theme.raised, in: RoundedRectangle(cornerRadius: 10))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(b.title).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1)
                        Text("\(b.start.formatted(date: .omitted, time: .shortened)) · \(b.guest)").font(.caption).foregroundStyle(Theme.muted).lineLimit(1)
                    }
                    Spacer()
                    if b.status == "PENDING" { Tag(text: "Waiting", tint: Theme.amber) }
                    if let m = b.meetUrl, let u = URL(string: m) {
                        Link(destination: u) { Image(systemName: "video.fill").foregroundStyle(Theme.accent).frame(width: 44, height: 44) }
                            .accessibilityLabel("Join \(b.title)")
                    }
                }
            }
        }
    }

    private func pick(_ l: MeetingsData.Lead) {
        lead = l
        guestName = l.name
        guestEmail = l.email
    }

    private func load() async {
        let first = data == nil
        do {
            let d: MeetingsData = try await API.shared.get("/api/mobile/v1/meetings")
            data = d
            failed = nil
            // only the first time: a reload after sending must not undo what the person picked
            if first {
                duration = [15, 30, 45, 60, 90].contains(d.duration) ? d.duration : 30
                if let leadId, let l = d.leads.first(where: { $0.id == leadId }) { pick(l) }
            }
            if hostId.isEmpty { hostId = session.me?.id ?? "" }
        } catch { if data == nil, !Task.isCancelled { failed = error.localizedDescription } }
    }

    private func loadSlots() async {
        guard data != nil else { return }
        loadingSlots = true
        defer { if !Task.isCancelled { loadingSlots = false } }
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.dateFormat = "yyyy-MM-dd"
        var input: [String: Any] = ["date": f.string(from: day), "durationMinutes": duration]
        if !hostId.isEmpty, hostId != session.me?.id { input["hostId"] = hostId }
        let raw: [String] = (try? await API.shared.act("getHostSlots", input)) ?? []
        // a newer day/length/host took over: its own load sets the slots
        guard !Task.isCancelled else { return }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let plain = ISO8601DateFormatter()
        slots = raw.compactMap { iso.date(from: $0) ?? plain.date(from: $0) }.filter { $0 > Date() }
    }

    private func check() async {
        guard let time, data != nil else { note = nil; return }
        try? await Task.sleep(for: .milliseconds(250))
        guard !Task.isCancelled else { return }
        struct Note: Decodable { let note: String? }
        var input: [String: Any] = ["startTime": ISO8601DateFormatter().string(from: time), "durationMinutes": duration, "teammateIds": Array(mates)]
        if kind == .client, !hostId.isEmpty, hostId != session.me?.id { input["hostId"] = hostId }
        let r: Note? = try? await API.shared.act("checkInviteTime", input)
        guard !Task.isCancelled else { return }
        withAnimation(.snappy) { note = r?.note }
    }

    private func send(_ d: MeetingsData) async {
        guard let time, !sending else { return }
        guard time > Date() else { toasts.show("That time has passed. Pick another one.", tone: .warn); self.time = nil; return }
        sending = true
        defer { sending = false }
        let start = ISO8601DateFormatter().string(from: time)
        let title = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let notes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        let name = guestName.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            if kind == .client {
                var input: [String: Any] = ["guestName": name, "guestEmail": guestEmail.trimmingCharacters(in: .whitespacesAndNewlines), "startTime": start, "durationMinutes": duration, "title": title.isEmpty ? "Igani intro call" : title, "teammateIds": Array(mates)]
                if let lead { input["leadId"] = lead.id }
                if !notes.isEmpty { input["notes"] = notes }
                if !hostId.isEmpty, hostId != session.me?.id { input["hostId"] = hostId }
                try await API.shared.run("createSalesInvite", input)
                done = "Invite sent to \(name). The Meet link is created when they confirm."
            } else {
                struct R: Decodable { let meetUrl: String?; let requested: Bool }
                var input: [String: Any] = ["startTime": start, "durationMinutes": duration, "title": title.isEmpty ? "Team call" : title, "teammateIds": Array(mates)]
                if !notes.isEmpty { input["notes"] = notes }
                let r: R? = try await API.shared.act("createTeamMeeting", input)
                done = r?.requested == true ? "Asked. The admins approve it, then everyone gets the Meet link." : "Booked. Everyone has the Meet link by email."
            }
            // clear the form so a second tap can't send the same invite again
            self.time = nil
            self.title = ""
            self.notes = ""
            mates = []
            if leadId == nil { lead = nil; guestName = ""; guestEmail = "" }
            await load()
        } catch { toasts.show(error.localizedDescription, tone: .warn) }
    }
}

/// The next two weeks as a scrolling strip of days.
struct DateStrip: View {
    @Binding var selection: Date
    private var days: [Date] { (0..<21).compactMap { Calendar.current.date(byAdding: .day, value: $0, to: Calendar.current.startOfDay(for: Date())) } }
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(days, id: \.self) { d in
                    let on = Calendar.current.isDate(d, inSameDayAs: selection)
                    let weekend = Calendar.current.isDateInWeekend(d)
                    Button { withAnimation(.snappy) { selection = d } } label: {
                        VStack(spacing: 3) {
                            Text(d.formatted(.dateTime.weekday(.abbreviated))).font(.caption2.weight(.bold)).foregroundStyle(on ? Theme.bg.opacity(0.8) : Theme.muted)
                            Text(d.formatted(.dateTime.day())).font(.headline).foregroundStyle(on ? Theme.bg : weekend ? Theme.muted : Theme.text)
                        }
                        .frame(width: 50, height: 60)
                        .background(on ? Theme.accent : Theme.raised.opacity(0.6), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .buttonStyle(PressStyle())
                }
            }
        }
        .sensoryFeedback(.selection, trigger: selection)
    }
}

struct LeadPicker: View {
    let leads: [MeetingsData.Lead]
    let pick: (MeetingsData.Lead) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var q = ""
    var body: some View {
        NavigationStack {
            List(leads.filter { q.isEmpty || $0.name.localizedCaseInsensitiveContains(q) || $0.email.localizedCaseInsensitiveContains(q) || ($0.company ?? "").localizedCaseInsensitiveContains(q) }) { l in
                Button { pick(l); dismiss() } label: {
                    HStack(spacing: 12) {
                        Avatar(name: l.name, size: 34)
                        VStack(alignment: .leading) {
                            Text(l.name).foregroundStyle(Theme.text)
                            Text([l.company, l.email].compactMap { $0 }.joined(separator: " · ")).font(.caption).foregroundStyle(Theme.muted)
                        }
                    }
                }
                .listRowBackground(Theme.card)
            }
            .scrollContentBackground(.hidden)
            .background(Theme.bg)
            .searchable(text: $q, placement: .navigationBarDrawer(displayMode: .always))
            .navigationTitle("Contacts with an email")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
        }
    }
}

/// A text field in the app's style.
struct FieldBox: View {
    let label: String
    @Binding var text: String
    var content: UITextContentType? = nil
    var keyboard: UIKeyboardType = .default
    init(_ label: String, text: Binding<String>, content: UITextContentType? = nil, keyboard: UIKeyboardType = .default) {
        self.label = label
        _text = text
        self.content = content
        self.keyboard = keyboard
    }
    var body: some View {
        TextField(label, text: $text)
            .textContentType(content)
            .keyboardType(keyboard)
            .textInputAutocapitalization(keyboard == .emailAddress ? .never : .sentences)
            .autocorrectionDisabled(keyboard == .emailAddress)
            .padding(12)
            .background(Theme.raised.opacity(0.6), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

/// Lays chips out in rows that wrap.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let w = proposal.width ?? 320
        var x: CGFloat = 0, y: CGFloat = 0, row: CGFloat = 0
        for s in subviews {
            let size = s.sizeThatFits(.unspecified)
            if x + size.width > w, x > 0 { x = 0; y += row + spacing; row = 0 }
            x += size.width + spacing
            row = max(row, size.height)
        }
        return CGSize(width: w, height: y + row)
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, row: CGFloat = 0
        for s in subviews {
            let size = s.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX { x = bounds.minX; y += row + spacing; row = 0 }
            s.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            row = max(row, size.height)
        }
    }
}

// MARK: - Control of the call (training videos)

struct VideosData: Decodable {
    struct Video: Decodable, Identifiable, Hashable { let id: String; let title: String; let stream: String; let locked: Bool; let done: Bool; let needsAck: Bool }
    struct Ack: Decodable { let title: String; let body: String; let button: String }
    let course: Bool
    let ack: Ack
    let videos: [Video]
}

/// The training course: one video at a time for salespeople (each unlocks the next), every video for admins.
struct VideosView: View {
    @Environment(Toasts.self) private var toasts
    @State private var data: VideosData?
    @State private var failed: String?
    @State private var playing: VideosData.Video?
    @State private var asking: VideosData.Video?

    var body: some View {
        ScrollView {
            if let d = data {
                VStack(spacing: 14) {
                    if d.course {
                        let done = d.videos.filter(\.done).count
                        HStack(spacing: 16) {
                            ScoreRing(score: d.videos.isEmpty ? 0 : done * 100 / d.videos.count, size: 76, line: 8, label: "DONE")
                            VStack(alignment: .leading, spacing: 4) {
                                Text("\(done) of \(d.videos.count) completed").font(.headline).foregroundStyle(Theme.text)
                                Text("Finish a video to unlock the next one.").font(.footnote).foregroundStyle(Theme.muted)
                            }
                            Spacer()
                        }
                        .card()
                    }
                    if d.videos.isEmpty { EmptyHint(icon: "play.rectangle", title: "No videos yet", message: "Training videos show up here.") }
                    ForEach(Array(d.videos.enumerated()), id: \.element.id) { i, v in
                        Button { open(v) } label: {
                            HStack(spacing: 14) {
                                ZStack {
                                    RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Theme.gradient(for: v.title)).frame(width: 74, height: 50)
                                    Image(systemName: v.locked ? "lock.fill" : v.done ? "checkmark" : "play.fill").font(.headline).foregroundStyle(.white)
                                }
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(v.title).font(.subheadline.weight(.semibold)).foregroundStyle(v.locked ? Theme.muted : Theme.text).multilineTextAlignment(.leading).lineLimit(2)
                                    Text(v.locked ? "Unlocks when you finish the one before" : v.done ? "Completed" : d.course ? "Up next" : "Lesson \(i + 1)").font(.caption).foregroundStyle(v.done ? Theme.green : Theme.muted)
                                }
                                Spacer()
                            }
                            .card(padding: 12)
                        }
                        .buttonStyle(PressStyle())
                        .disabled(v.locked)
                    }
                }
                .padding(16)
            } else if let failed {
                LoadFailed(message: failed) { await load() }
            } else {
                SkeletonRows(count: 5)
            }
        }
        .screenBackground()
        .navigationTitle("Control of the call")
        .refreshable { await load() }
        .task { await load() }
        .fullScreenCover(item: $playing, onDismiss: { Task { await load() } }) { v in LessonPlayerView(video: v, course: data?.course ?? false) }
        .alert(data?.ack.title ?? "Confidential", isPresented: Binding(get: { asking != nil }, set: { if !$0 { asking = nil } }), presenting: asking) { v in
            Button(data?.ack.button ?? "I confirm") { Task { await confirm(v) } }
            Button("Cancel", role: .cancel) {}
        } message: { _ in Text(data?.ack.body ?? "") }
    }

    private func open(_ v: VideosData.Video) {
        if v.needsAck { asking = v } else { playing = v }
    }

    private func confirm(_ v: VideosData.Video) async {
        do {
            let _: Ok<Anything> = try await API.shared.post("/api/videos/\(v.id)/ack", [:])
            playing = v
        } catch { toasts.show(error.localizedDescription, tone: .warn) }
    }

    private func load() async {
        do { data = try await API.shared.get("/api/mobile/v1/videos"); failed = nil } catch { if data == nil, !Task.isCancelled { failed = error.localizedDescription } }
    }
}

/// Plays one lesson (streamed only while signed in) and reports it finished, which unlocks the next.
struct LessonPlayerView: View {
    let video: VideosData.Video
    let course: Bool
    @Environment(\.dismiss) private var dismiss
    @Environment(Toasts.self) private var toasts
    @State private var player: AVPlayer?
    @State private var reported = false
    @State private var endObserver: NSObjectProtocol?

    var body: some View {
        ZStack(alignment: .topLeading) {
            Color.black.ignoresSafeArea()
            if let player { VideoPlayer(player: player).ignoresSafeArea() }
            Button { dismiss() } label: { Image(systemName: "xmark").font(.headline).foregroundStyle(.white).frame(width: 44, height: 44).glass(in: Circle(), interactive: true) }
                .padding(16)
                .accessibilityLabel("Close")
        }
        .onAppear {
            guard player == nil, let u = URL(string: video.stream) else { return }
            var headers: [String: String] = [:]
            if let c = API.shared.cookieHeader { headers["Cookie"] = c }
            let item = AVPlayerItem(asset: AVURLAsset(url: u, options: ["AVURLAssetHTTPHeaderFieldsKey": headers]))
            let p = AVPlayer(playerItem: item)
            try? AVAudioSession.sharedInstance().setCategory(.playback)
            player = p
            p.play()
            endObserver = NotificationCenter.default.addObserver(forName: AVPlayerItem.didPlayToEndTimeNotification, object: item, queue: .main) { _ in
                let seconds = item.duration.seconds
                Task { @MainActor in await finished(seconds) }
            }
        }
        .onDisappear {
            player?.pause()
            if let endObserver { NotificationCenter.default.removeObserver(endObserver) }
            endObserver = nil
        }
    }

    private func finished(_ duration: Double) async {
        guard course, !reported, duration.isFinite, duration > 0 else { return }
        reported = true
        do {
            let _: Ok<Anything> = try await API.shared.post("/api/videos/\(video.id)/complete", ["duration": duration, "watched": duration])
            toasts.show("Lesson complete. The next one is unlocked.")
        } catch { toasts.show(error.localizedDescription, tone: .warn) }
    }
}

// MARK: - Documents

struct DocumentsData: Decodable {
    struct Doc: Decodable, Identifiable, Hashable { let id: String; let title: String; let sub: String; let at: Date; let url: String; let signed: Bool }
    let documents: [Doc]
}

/// Your agreements with Igani: open, read and share them.
struct DocumentsView: View {
    @State private var data: DocumentsData?
    @State private var failed: String?
    @State private var opening: String?
    @State private var file: URL?

    var body: some View {
        List {
            if let d = data {
                if d.documents.isEmpty {
                    EmptyHint(icon: "doc.text", title: "No documents yet", message: "Agreements with you appear here once they’re signed or uploaded.").listRowBackground(Color.clear)
                }
                ForEach(d.documents) { doc in
                    Button { Task { await open(doc) } } label: {
                        HStack(spacing: 12) {
                            IconChip(icon: doc.signed ? "signature" : "doc.richtext", tint: doc.signed ? Theme.green : Theme.accent, size: 40)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(doc.title).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text)
                                Text("\(doc.sub) · \(doc.at.formatted(date: .abbreviated, time: .omitted))").font(.caption).foregroundStyle(Theme.muted)
                            }
                            Spacer()
                            if opening == doc.id { ProgressView() } else { Image(systemName: "arrow.down.circle").foregroundStyle(Theme.accent) }
                        }
                    }
                    .listRowBackground(Theme.card)
                }
            } else if let failed {
                LoadFailed(message: failed) { await load() }.listRowBackground(Color.clear)
            } else {
                SkeletonRows(count: 3).listRowBackground(Color.clear)
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .screenBackground()
        .navigationTitle("Documents")
        .refreshable { await load() }
        .task { await load() }
        .quickLookPreview($file)
    }

    private func load() async {
        do { data = try await API.shared.get("/api/mobile/v1/documents"); failed = nil } catch { if data == nil, !Task.isCancelled { failed = error.localizedDescription } }
    }

    /// Downloads with the session and shows it in Quick Look (share, print, save to Files from there).
    private func open(_ d: DocumentsData.Doc) async {
        guard opening == nil, let u = URL(string: d.url) else { return }
        opening = d.id
        defer { opening = nil }
        var req = URLRequest(url: u)
        if let c = API.shared.cookieHeader { req.setValue(c, forHTTPHeaderField: "Cookie") }
        guard let (data, resp) = try? await URLSession.shared.data(for: req), (resp as? HTTPURLResponse)?.statusCode == 200 else { ToastCenter.shared?.show("Couldn’t open the document.", tone: .warn); return }
        let name = (resp as? HTTPURLResponse)?.suggestedFilename ?? "\(d.title).pdf"
        // its own folder per document, so two files with the same name never overwrite each other
        let dir = FileManager.default.temporaryDirectory.appending(path: "documents/\(d.id)", directoryHint: .isDirectory)
        let dest = dir.appending(path: name.replacingOccurrences(of: "/", with: "-"))
        do {
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            try data.write(to: dest, options: .atomic)
            file = dest
        } catch { ToastCenter.shared?.show("Couldn’t open the document.", tone: .warn) }
    }
}
