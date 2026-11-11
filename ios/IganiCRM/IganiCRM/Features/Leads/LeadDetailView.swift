import SwiftUI

struct LeadDetailView: View {
    let id: String
    @Environment(Session.self) private var session
    @Environment(Toasts.self) private var toasts
    @State private var state: Load<LeadDetail> = .loading
    @State private var note = ""
    @State private var savingNote = false
    @State private var stageSheet = false
    @State private var taskSheet = false
    @State private var editSheet = false
    @State private var meetBusy = false
    @State private var meetURL: URL?
    @State private var confirmMeet = false
    /// tasks with a tick on its way to the server (a second tap waits)
    @State private var toggling: Set<String> = []
    @FocusState private var noteFocused: Bool

    var body: some View {
        ScrollView {
            switch state {
            case .loading: SkeletonRows(count: 6).padding(.top, 20)
            case .failed(let m): LoadFailed(message: m) { await load() }
            case .ready(let l): content(l)
            }
        }
        .scrollDismissesKeyboard(.interactively)
        .screenBackground()
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load(announceErrors: true) }
        .toolbar {
            if let l = state.value {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Edit") { editSheet = true }
                        .accessibilityLabel("Edit the contact’s details")
                }
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(value: Route.web(path: "/sales/leads/\(l.id)", title: l.name)) { Image(systemName: "safari").frame(minWidth: 44, minHeight: 44) }
                        .accessibilityLabel("Open the full lead page")
                }
            }
        }
        .task { await load() }
        .fullScreenCover(item: $meetURL) { u in MeetCallScreen(url: u) }
    }

    @ViewBuilder private func content(_ l: LeadDetail) -> some View {
        VStack(spacing: 18) {
            // hero
            VStack(spacing: 10) {
                Avatar(name: l.name, size: 84).shadow(color: .black.opacity(0.4), radius: 14, y: 8)
                Text(l.name).font(.system(.title, design: .rounded, weight: .bold)).foregroundStyle(Theme.text).multilineTextAlignment(.center)
                if let c = l.company { Text(c).font(.subheadline).foregroundStyle(Theme.muted) }
                Button { stageSheet = true } label: {
                    HStack(spacing: 6) {
                        StagePill(status: l.status, label: session.me?.stageLabel(l.status) ?? l.status)
                        Image(systemName: "chevron.down").font(.caption2.weight(.bold)).foregroundStyle(Theme.muted)
                    }
                    .frame(minHeight: 44)
                    .contentShape(Rectangle())
                }
                .buttonStyle(PressStyle())
                .accessibilityLabel("Stage: \(session.me?.stageLabel(l.status) ?? l.status)")
                .accessibilityHint("Move to another stage")
            }
            .padding(.top, 6)

            // quick actions
            HStack(spacing: 10) {
                if Phone.shared.isSeller {
                    Button { Task { await dial(l) } } label: { quickLabel("Call", "phone.fill", Theme.green) }
                        .buttonStyle(PressStyle()).disabled(l.phone == nil).opacity(l.phone == nil ? 0.35 : 1)
                    NavigationLink(value: CallRoute.thread(l.phone ?? "", l.name)) { quickLabel("Text", "message.fill", Theme.blue) }
                        .buttonStyle(PressStyle()).disabled(l.phone == nil).opacity(l.phone == nil ? 0.35 : 1)
                } else {
                    quick("Call", "phone.fill", Theme.green, l.phone.flatMap { URL(string: "tel:\($0.filter { $0.isNumber || $0 == "+" })") })
                    quick("Text", "message.fill", Theme.blue, l.phone.flatMap { URL(string: "sms:\($0.filter { $0.isNumber || $0 == "+" })") })
                }
                quick("Email", "envelope.fill", Theme.violet, l.email.flatMap { URL(string: "mailto:\($0)") })
                Button { confirmMeet = true } label: { quickLabel("Meet", meetBusy ? "hourglass" : "video.fill", Theme.accent) }
                    .buttonStyle(PressStyle())
                    .disabled(meetBusy)
                    .accessibilityLabel("Start a video call")
            }
            // nothing goes to a client without asking: the Meet invite email is an explicit choice
            .confirmationDialog("Video call with \(l.name)", isPresented: $confirmMeet, titleVisibility: .visible) {
                if let e = l.email {
                    Button("Start and email the invite to \(e)") { Task { await meet(l, invite: true) } }
                }
                Button(l.email == nil ? "Start the call" : "Start without emailing them") { Task { await meet(l, invite: false) } }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text(l.email == nil ? "There’s no email on this contact, so share the link with them yourself." : "Opens an Igani Meet call now.")
            }

            // details
            VStack(spacing: 0) {
                info("envelope", "Email", l.email)
                info("phone", "Phone", l.phone)
                info("globe", "Website", l.website)
                info("arrow.down.left.circle", "Source", [l.source, l.sourceDetail].compactMap { $0 }.joined(separator: " · "))
                info("person.crop.circle", "Owner", l.owner.map { $0.name ?? "Teammate" } ?? "Unassigned")
                info("calendar", "Added", l.createdAt.formatted(date: .abbreviated, time: .omitted))
            }
            .card(padding: 4)

            if let m = l.message, !m.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Label("Their message", systemImage: "quote.opening").font(.footnote.weight(.semibold)).foregroundStyle(Theme.muted)
                    Text(m).font(.subheadline).foregroundStyle(Theme.text)
                }
                .card()
            }

            if let p = l.profile { LeadProfilePanel(leadId: l.id, profile: p) { await load() } }

            // tasks
            VStack(alignment: .leading, spacing: 10) {
                SectionTitle(title: "Tasks", trailing: "Add") { taskSheet = true }
                if l.tasks.isEmpty {
                    Text("No tasks yet.").font(.subheadline).foregroundStyle(Theme.muted).card()
                } else {
                    VStack(spacing: 0) { ForEach(l.tasks) { t in taskRow(l, t) } }.card(padding: 4)
                }
            }

            // notes
            VStack(alignment: .leading, spacing: 10) {
                SectionTitle(title: "Notes")
                HStack(alignment: .bottom, spacing: 10) {
                    TextField("Add a note…", text: $note, axis: .vertical)
                        .lineLimit(1...6)
                        .focused($noteFocused)
                        .padding(12)
                        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    Button { Task { await addNote(l) } } label: {
                        Image(systemName: savingNote ? "hourglass" : "arrow.up").font(.body.weight(.bold)).foregroundStyle(Color(hex: 0x062E6F))
                            .frame(width: 44, height: 44).background(Theme.accent, in: Circle())
                    }
                    .accessibilityLabel("Save note")
                    .disabled(note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || savingNote)
                    .opacity(note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.4 : 1)
                }
                ForEach(l.notes) { n in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(n.body).font(.subheadline).foregroundStyle(Theme.text).textSelection(.enabled)
                        Text("\(n.author ?? "Someone") · \(Fmt.relative(n.at))").font(.caption).foregroundStyle(Theme.muted)
                    }
                    .card(padding: 14)
                    .transition(.move(edge: .top).combined(with: .opacity))
                }
            }

            // calls
            if !l.calls.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    SectionTitle(title: "Calls")
                    VStack(spacing: 0) {
                        ForEach(l.calls) { c in
                            NavigationLink(value: CallRoute.detail(c.id)) {
                                HStack(spacing: 12) {
                                    let missed = Self.unanswered.contains(c.status)
                                    let tint = missed ? Theme.red : Theme.green
                                    Image(systemName: missed ? "phone.down" : c.direction == "INBOUND" ? "phone.arrow.down.left" : "phone.arrow.up.right").foregroundStyle(tint)
                                        .frame(width: 34, height: 34).background(tint.opacity(0.13), in: Circle())
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(Self.callTitle(c)).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text)
                                        Text("\(Fmt.day(c.startedAt)) · \(Fmt.duration(c.durationSec))").font(.caption).foregroundStyle(Theme.muted)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right").font(.caption).foregroundStyle(Theme.muted)
                                }
                                .padding(10)
                            }
                        }
                    }
                    .card(padding: 4)
                }
            }

            // everything else lives on the full lead page
            NavigationLink(value: Route.web(path: "/sales/leads/\(l.id)", title: l.name)) {
                HStack {
                    Image(systemName: "rectangle.stack")
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Emails, offers, documents & more").font(.subheadline.weight(.semibold))
                        Text("\(l.counts.emails) emails · \(l.counts.offers) offers · \(l.counts.calls) calls").font(.caption).foregroundStyle(Theme.muted)
                    }
                    Spacer()
                    Image(systemName: "chevron.right").font(.caption)
                }
                .foregroundStyle(Theme.text)
                .card()
            }
            .buttonStyle(PressStyle())
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 40)
        .sheet(isPresented: $stageSheet) { StageSheet(current: l.status) { s, reason in await setStage(s, reason) } }
        .sheet(isPresented: $taskSheet) { NewTaskSheet(leadId: l.id, leadName: l.name) { Task { await load() } } }
        .sheet(isPresented: $editSheet) { EditLeadSheet(lead: l) { Task { await load() } } }
    }

    static let unanswered: Set<String> = ["NO_ANSWER", "BUSY", "FAILED", "CANCELED"]

    static func callTitle(_ c: LeadDetail.Call) -> String {
        let inbound = c.direction == "INBOUND"
        switch c.status {
        case "NO_ANSWER", "CANCELED": return inbound ? "Missed call" : "No answer"
        case "BUSY": return inbound ? "Missed call" : "Busy"
        case "FAILED": return "Call failed"
        default: return inbound ? "Incoming call" : "Outgoing call"
        }
    }

    /// Calls the contact from the user's Igani number (logged on the contact, with a wrap-up after).
    private func dial(_ l: LeadDetail) async {
        guard let p = l.phone else { return }
        do { try await Phone.shared.call(p, leadId: l.id, name: l.name) } catch { ToastCenter.shared?.show(error.localizedDescription, tone: .warn) }
    }

    private func quick(_ title: String, _ icon: String, _ tint: Color, _ url: URL?) -> some View {
        Button { if let url { UIApplication.shared.open(url) } } label: { quickLabel(title, icon, tint) }
            .buttonStyle(PressStyle())
            .disabled(url == nil)
            .opacity(url == nil ? 0.35 : 1)
    }

    private func quickLabel(_ title: String, _ icon: String, _ tint: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon).font(.title3).foregroundStyle(tint)
            Text(title).font(.caption.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1).minimumScaleFactor(0.8)
        }
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, minHeight: 70)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Theme.line))
    }

    @ViewBuilder private func info(_ icon: String, _ label: String, _ value: String?) -> some View {
        if let value, !value.isEmpty {
            HStack(spacing: 12) {
                Image(systemName: icon).foregroundStyle(Theme.muted).frame(width: 22)
                Text(label).font(.subheadline).foregroundStyle(Theme.muted)
                Spacer()
                Text(value).font(.subheadline).foregroundStyle(Theme.text).lineLimit(1).truncationMode(.middle).textSelection(.enabled)
            }
            .padding(.horizontal, 12).padding(.vertical, 11)
        }
    }

    private func taskRow(_ l: LeadDetail, _ t: LeadDetail.Task) -> some View {
        HStack(spacing: 12) {
            CheckCircle(done: t.done) { Task { await toggle(l, t) } }.disabled(toggling.contains(t.id))
            VStack(alignment: .leading, spacing: 2) {
                Text(t.title).font(.subheadline.weight(.medium)).foregroundStyle(t.done ? Theme.muted : Theme.text).strikethrough(t.done)
                HStack(spacing: 6) {
                    if let d = t.dueAt { Text(Fmt.day(d)).foregroundStyle(!t.done && d < .now ? Theme.red : Theme.muted) }
                    if let a = t.assignee { Text("· \(a)") }
                }
                .font(.caption).foregroundStyle(Theme.muted)
            }
            Spacer()
            if t.priority == "HIGH" { Image(systemName: "flag.fill").font(.caption).foregroundStyle(Theme.red) }
        }
        .padding(10)
    }

    // MARK: actions

    private func load(announceErrors: Bool = false) async {
        do {
            let l: LeadDetail = try await API.shared.get("/api/mobile/v1/leads/\(id)")
            withAnimation(.snappy) { state = .ready(l) }
        } catch {
            guard !Task.isCancelled else { return }
            if state.value == nil { state = .failed(error.localizedDescription) } else if announceErrors { toasts.show(error.localizedDescription, tone: .warn) }
        }
    }

    private func setStage(_ s: String, _ reason: String?) async -> String? {
        do {
            var body: [String: Any] = ["status": s]
            if let reason { body["lostReason"] = reason }
            let _: Ok<Empty> = try await API.shared.post("/api/mobile/v1/leads/\(id)/status", body)
            if case .ready(var l) = state { l.status = s; withAnimation(.snappy) { state = .ready(l) } }
            toasts.show("Moved to \(session.me?.stageLabel(s) ?? s)")
            return nil
        } catch { return error.localizedDescription }
    }

    private func addNote(_ l: LeadDetail) async {
        let text = note.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        savingNote = true
        do {
            let _: Ok<Empty> = try await API.shared.post("/api/mobile/v1/leads/\(l.id)/notes", ["body": text])
            note = ""
            noteFocused = false
            await load()
            toasts.show("Note saved")
        } catch { toasts.show(error.localizedDescription, tone: .warn) }
        savingNote = false
    }

    private func toggle(_ l: LeadDetail, _ t: LeadDetail.Task) async {
        guard !toggling.contains(t.id), case .ready(var cur) = state, let i = cur.tasks.firstIndex(where: { $0.id == t.id }) else { return }
        let done = !cur.tasks[i].done
        cur.tasks[i].done = done
        toggling.insert(t.id)
        defer { toggling.remove(t.id) }
        withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) { state = .ready(cur) }
        do {
            let _: Ok<Empty> = try await API.shared.post("/api/mobile/v1/tasks/\(t.id)", ["leadId": l.id, "done": done])
        } catch {
            toasts.show(error.localizedDescription, tone: .warn)
            await load()
        }
    }

    /// A video call with this lead, and (only when asked) the invite emailed to them.
    private func meet(_ l: LeadDetail, invite: Bool) async {
        guard !meetBusy else { return }
        meetBusy = true
        defer { meetBusy = false }
        let email = invite ? (l.email ?? "") : ""
        do {
            let r: Ok<NewRoom> = try await API.shared.post("/api/mobile/v1/meet", ["title": "Call with \(l.name)", "emails": email])
            if let s = r.data?.joinUrl, let u = URL(string: s) {
                if !email.isEmpty { toasts.show("Invite sent to \(l.name)") }
                meetURL = u
            } else {
                toasts.show("The call didn’t start. Please try again.", tone: .warn)
            }
        } catch { toasts.show(error.localizedDescription, tone: .warn) }
    }
}

extension URL: @retroactive Identifiable { public var id: String { absoluteString } }

/// A round check that fills with a little bounce.
struct CheckCircle: View {
    let done: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            ZStack {
                Circle().strokeBorder(done ? Theme.green : Theme.muted.opacity(0.6), lineWidth: 2)
                if done {
                    Circle().fill(Theme.green).padding(2)
                    Image(systemName: "checkmark").font(.caption.weight(.heavy)).foregroundStyle(Theme.bg).transition(.scale.combined(with: .opacity))
                }
            }
            .frame(width: 26, height: 26)
            .animation(.spring(response: 0.3, dampingFraction: 0.55), value: done)
            .frame(width: 44, height: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .padding(-9)
        .sensoryFeedback(.success, trigger: done) { _, new in new }
        .accessibilityLabel(done ? "Mark as not done" : "Mark as done")
    }
}

/// Pick a pipeline stage (only the ones this person may set); Lost asks why.
struct StageSheet: View {
    let current: String
    let save: (String, String?) async -> String?
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var lostReason = ""
    @State private var askLost = false
    @State private var error: String?
    @State private var busy: String?

    var body: some View {
        NavigationStack {
            List {
                ForEach(session.stages, id: \.key) { s in
                    Button {
                        if s.key == "LOST" { lostReason = ""; askLost = true } else { Task { await pick(s.key, nil) } }
                    } label: {
                        HStack {
                            Circle().fill(Theme.stage(s.key)).frame(width: 10, height: 10)
                            Text(s.label).foregroundStyle(s.settable ? Theme.text : Theme.muted)
                            Spacer()
                            if busy == s.key { ProgressView() } else if s.key == current { Image(systemName: "checkmark").foregroundStyle(Theme.accent) }
                        }
                    }
                    .disabled(!s.settable || s.key == current || busy != nil)
                    .listRowBackground(Theme.card)
                }
                if let error { Text(error).font(.footnote).foregroundStyle(Theme.red).listRowBackground(Color.clear) }
                if !session.stages.allSatisfy(\.settable) {
                    Text("Greyed-out stages are set by an admin.").font(.footnote).foregroundStyle(Theme.muted).listRowBackground(Color.clear)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.bg)
            .navigationTitle("Move to stage")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
            .alert("Why was it lost?", isPresented: $askLost) {
                TextField("Reason", text: $lostReason)
                Button("Mark as lost", role: .destructive) { Task { await pick("LOST", lostReason.trimmingCharacters(in: .whitespacesAndNewlines)) } }
                    .disabled(lostReason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("A short reason helps the team see why deals are lost.")
            }
        }
        .presentationDetents([.medium, .large])
        .interactiveDismissDisabled(busy != nil)
    }

    private func pick(_ s: String, _ reason: String?) async {
        busy = s
        error = nil
        if let e = await save(s, reason) { error = e } else { dismiss() }
        busy = nil
    }
}


/// Edit a contact's details (the web's "Edit details"): name, phone, email (admins only), company, website, budget, tags.
struct EditLeadSheet: View {
    let lead: LeadDetail
    let onSaved: () -> Void
    @Environment(\.dismiss) private var dismiss
    @Environment(Toasts.self) private var toasts
    @State private var first = ""
    @State private var last = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var company = ""
    @State private var website = ""
    @State private var budget = ""
    @State private var tags = ""
    @State private var busy = false
    private var isAdmin: Bool { API.shared.session?.me?.role == "ADMIN" }

    var body: some View {
        NavigationStack {
            Form {
                Section("Name") {
                    TextField("First name", text: $first).textContentType(.givenName)
                    TextField("Last name", text: $last).textContentType(.familyName)
                }
                .listRowBackground(Theme.card)
                Section {
                    TextField("Phone", text: $phone).keyboardType(.phonePad).textContentType(.telephoneNumber)
                    TextField("Email", text: $email).keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled().disabled(!isAdmin).foregroundStyle(isAdmin ? Theme.text : Theme.muted)
                } header: {
                    Text("Contact")
                } footer: {
                    if !isAdmin { Text("Only an admin can change the email address (it decides which emails are filed under this contact).") }
                }
                .listRowBackground(Theme.card)
                Section("Business") {
                    TextField("Company", text: $company)
                    TextField("Website", text: $website).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                    TextField("Budget", text: $budget)
                }
                .listRowBackground(Theme.card)
                Section {
                    TextField("e.g. vip, referral", text: $tags).textInputAutocapitalization(.never)
                } header: {
                    Text("Tags")
                } footer: {
                    Text("Separate tags with commas.")
                }
                .listRowBackground(Theme.card)
            }
            .scrollContentBackground(.hidden)
            .screenBackground()
            .navigationTitle("Edit details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    if busy { ProgressView() } else { Button("Save") { Task { await save() } }.fontWeight(.semibold) }
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .interactiveDismissDisabled(busy)
            .onAppear {
                first = lead.firstName ?? ""
                last = lead.lastName ?? ""
                phone = lead.phone ?? ""
                email = lead.email ?? ""
                company = lead.company ?? ""
                website = lead.website ?? ""
                budget = lead.budget ?? ""
                tags = lead.tags.joined(separator: ", ")
            }
        }
    }

    private func save() async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        let t = { (s: String) in s.trimmingCharacters(in: .whitespacesAndNewlines) }
        var input: [String: Any] = [
            "firstName": t(first), "lastName": t(last), "phone": t(phone), "company": t(company), "website": t(website), "budget": t(budget),
            "tags": tags.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty },
        ]
        if isAdmin { input["email"] = t(email) }
        do {
            try await API.shared.run("updateLead", lead.id, input)
            toasts.show("Saved", tone: .ok)
            onSaved()
            dismiss()
        } catch {
            toasts.show(error.localizedDescription, tone: .warn)
        }
    }
}
