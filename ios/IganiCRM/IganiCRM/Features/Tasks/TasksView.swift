import SwiftUI

struct TasksView: View {
    @Environment(Toasts.self) private var toasts
    @State private var tasks: [TaskItem] = []
    @State private var loading = true
    @State private var error: String?
    @State private var showDone = false
    @State private var adding = false
    @State private var path = NavigationPath()
    /// ticks on their way to the server (a second tap on the same task waits)
    @State private var toggling: Set<String> = []

    private var open: [TaskItem] { tasks.filter { !$0.done } }
    private var groups: [(String, Color, [TaskItem])] {
        let cal = Calendar.current
        let now = Date.now
        let overdue = open.filter { ($0.dueAt.map { $0 < now && !cal.isDateInToday($0) }) ?? false }
        let today = open.filter { $0.dueAt.map { cal.isDateInToday($0) } ?? false }
        let later = open.filter { ($0.dueAt.map { $0 > now && !cal.isDateInToday($0) }) ?? false }
        let none = open.filter { $0.dueAt == nil }
        return [("Overdue", Theme.red, overdue), ("Today", Theme.accent, today), ("Coming up", Theme.violet, later), ("No date", Theme.muted, none)].filter { !$0.2.isEmpty }
    }

    var body: some View {
        NavigationStack(path: $path) {
            List {
                Picker("Show", selection: $showDone.animation(.snappy)) {
                    Text("To do (\(open.count))").tag(false)
                    Text("Done").tag(true)
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))

                if loading && tasks.isEmpty {
                    SkeletonRows(count: 6).listRowBackground(Color.clear)
                } else if let error, tasks.isEmpty {
                    LoadFailed(message: error) { await load() }.listRowBackground(Color.clear)
                } else if showDone {
                    let done = tasks.filter(\.done)
                    if done.isEmpty {
                        EmptyHint(icon: "tray", title: "Nothing done yet", message: "Tasks you tick off show up here.").listRowBackground(Color.clear)
                    } else {
                        Section { ForEach(done) { row($0) } } footer: { Text("Your last 30 done tasks.").font(.footnote).foregroundStyle(Theme.muted) }
                    }
                } else if open.isEmpty {
                    EmptyHint(icon: "checkmark.seal.fill", title: "All clear", message: "No open tasks. Enjoy it, or add one with +.").listRowBackground(Color.clear)
                } else {
                    ForEach(groups, id: \.0) { g in
                        Section {
                            ForEach(g.2) { row($0) }
                        } header: {
                            HStack(spacing: 6) {
                                Circle().fill(g.1).frame(width: 7, height: 7)
                                Text("\(g.0) · \(g.2.count)")
                            }
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(g.1)
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .screenBackground()
            .navigationTitle("Tasks")
            .refreshable { await load(announceErrors: true) }
            // also runs when coming back from a lead or another tab, so ticks made elsewhere show here
            .task { await load() }
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button { adding = true } label: { Image(systemName: "plus").frame(minWidth: 44, minHeight: 44) }.accessibilityLabel("New task") } }
            .sheet(isPresented: $adding) { NewTaskSheet(leadId: nil, leadName: nil) { Task { await load() } } }
            .routes()
        }
    }

    private func row(_ t: TaskItem) -> some View {
        HStack(spacing: 12) {
            CheckCircle(done: t.done) { Task { await toggle(t) } }.disabled(toggling.contains(t.id))
            VStack(alignment: .leading, spacing: 3) {
                Text(t.title).font(.subheadline.weight(.medium)).foregroundStyle(t.done ? Theme.muted : Theme.text).strikethrough(t.done).lineLimit(2)
                HStack(spacing: 5) {
                    Image(systemName: "person").font(.caption2)
                    Text(t.lead).lineLimit(1)
                    if let d = t.dueAt { Text("· \(Fmt.day(d))").foregroundStyle(!t.done && d < .now ? Theme.red : Theme.muted) }
                }
                .font(.caption).foregroundStyle(Theme.muted)
            }
            Spacer(minLength: 4)
            if t.priority == "HIGH" { Image(systemName: "flag.fill").font(.caption).foregroundStyle(Theme.red) }
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
        .onTapGesture { path.append(Route.lead(t.leadId)) }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
        .accessibilityAction { path.append(Route.lead(t.leadId)) }
        .accessibilityAction(named: t.done ? "Mark as not done" : "Mark as done") { Task { await toggle(t) } }
        .accessibilityAction(named: "Open \(t.lead)") { path.append(Route.lead(t.leadId)) }
        .listRowBackground(Theme.card)
        .swipeActions(edge: .leading, allowsFullSwipe: true) {
            Button { Task { await toggle(t) } } label: { Label(t.done ? "Undo" : "Done", systemImage: t.done ? "arrow.uturn.backward" : "checkmark") }.tint(t.done ? Theme.muted : Theme.green)
        }
    }

    private func load(announceErrors: Bool = false) async {
        do {
            let r: TaskList = try await API.shared.get("/api/mobile/v1/tasks")
            // a tick still in flight keeps what the person tapped
            let pending = Dictionary(tasks.filter { toggling.contains($0.id) }.map { ($0.id, $0.done) }, uniquingKeysWith: { a, _ in a })
            withAnimation(.snappy) {
                tasks = r.tasks.map { t in var t = t; if let d = pending[t.id] { t.done = d }; return t }
                error = nil
            }
        } catch {
            if !Task.isCancelled {
                if tasks.isEmpty { self.error = error.localizedDescription } else if announceErrors { toasts.show(error.localizedDescription, tone: .warn) }
            }
        }
        loading = false
    }

    private func toggle(_ t: TaskItem) async {
        guard !toggling.contains(t.id), let i = tasks.firstIndex(where: { $0.id == t.id }) else { return }
        let done = !tasks[i].done
        toggling.insert(t.id)
        defer { toggling.remove(t.id) }
        withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) { tasks[i].done = done }
        do {
            let _: Ok<Empty> = try await API.shared.post("/api/mobile/v1/tasks/\(t.id)", ["leadId": t.leadId, "done": done])
            if done { toasts.show("Nice. Task done.") }
        } catch {
            toasts.show(error.localizedDescription, tone: .warn)
            await load()
        }
    }
}

/// A task on a contact: pick the contact (unless we're on one), a title, an optional due time and a priority.
struct NewTaskSheet: View {
    let leadId: String?
    let leadName: String?
    var saved: () -> Void
    @Environment(\.dismiss) private var dismiss
    @Environment(Toasts.self) private var toasts
    @State private var title = ""
    @State private var hasDue = true
    @State private var due = NewTaskSheet.defaultDue()
    @State private var priority = "MEDIUM"
    @State private var lead: LeadRow?
    @State private var search = ""
    @State private var matches: [LeadRow] = []
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Task") {
                    TextField("What needs doing?", text: $title, axis: .vertical).lineLimit(1...3)
                    Picker("Priority", selection: $priority) {
                        Text("Low").tag("LOW"); Text("Medium").tag("MEDIUM"); Text("High").tag("HIGH")
                    }
                    .pickerStyle(.segmented)
                }
                .listRowBackground(Theme.card)
                Section {
                    Toggle("Due date", isOn: $hasDue.animation())
                    if hasDue { DatePicker("Due", selection: $due).datePickerStyle(.compact) }
                }
                .listRowBackground(Theme.card)
                Section("Contact") {
                    if let leadName {
                        Label(leadName, systemImage: "person.fill")
                    } else if let lead {
                        HStack {
                            Label(lead.name, systemImage: "person.fill")
                            Spacer()
                            Button("Change") { self.lead = nil }.font(.footnote)
                        }
                    } else {
                        TextField("Search leads", text: $search).textInputAutocapitalization(.never).autocorrectionDisabled()
                        if !search.isEmpty, matches.isEmpty { Text("No matching leads.").font(.footnote).foregroundStyle(Theme.muted) }
                        ForEach(matches) { m in
                            Button { lead = m } label: {
                                HStack { Avatar(name: m.name, size: 28); Text(m.name).foregroundStyle(Theme.text); Spacer(); Text(m.company ?? "").font(.caption).foregroundStyle(Theme.muted) }
                            }
                        }
                    }
                }
                .listRowBackground(Theme.card)
                if let error { Text(error).foregroundStyle(Theme.red).font(.footnote).listRowBackground(Color.clear) }
            }
            .scrollContentBackground(.hidden)
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.bg)
            .navigationTitle("New task")
            .navigationBarTitleDisplayMode(.inline)
            .task(id: search) {
                guard leadId == nil, lead == nil else { return }
                try? await Task.sleep(for: .milliseconds(250))
                guard !Task.isCancelled else { return }
                let q = search.trimmingCharacters(in: .whitespacesAndNewlines)
                let p: LeadPage? = try? await API.shared.get("/api/mobile/v1/leads", query: q.isEmpty ? [] : [URLQueryItem(name: "q", value: q)])
                // a newer search (or a pick) took over: keep its answer
                guard !Task.isCancelled, let p else { return }
                matches = Array(p.leads.prefix(6))
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    if busy {
                        ProgressView()
                    } else {
                        Button("Save") { Task { await save() } }
                            .fontWeight(.semibold)
                            .disabled(!canSave)
                    }
                }
            }
        }
        .interactiveDismissDisabled(busy)
    }

    private var cleanTitle: String { title.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var canSave: Bool { !busy && !cleanTitle.isEmpty && cleanTitle.count <= 200 && (leadId != nil || lead != nil) }

    /// Today at 17:00, or tomorrow at 9:00 once that has passed (so a new task isn't born overdue).
    static func defaultDue(now: Date = .now) -> Date {
        let cal = Calendar.current
        if let five = cal.date(bySettingHour: 17, minute: 0, second: 0, of: now), five > now { return five }
        let tomorrow = cal.date(byAdding: .day, value: 1, to: now) ?? now
        return cal.date(bySettingHour: 9, minute: 0, second: 0, of: tomorrow) ?? tomorrow
    }

    private func save() async {
        guard canSave else { return }
        busy = true
        error = nil
        let body: [String: Any] = ["leadId": leadId ?? lead?.id ?? "", "title": cleanTitle, "dueAt": hasDue ? ISO8601DateFormatter().string(from: due) : NSNull(), "priority": priority]
        do {
            let _: Ok<Empty> = try await API.shared.post("/api/mobile/v1/tasks", body)
            toasts.show("Task added")
            saved()
            dismiss()
        } catch { self.error = error.localizedDescription }
        busy = false
    }
}
