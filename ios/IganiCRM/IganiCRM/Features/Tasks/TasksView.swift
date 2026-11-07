import SwiftUI

struct TasksView: View {
    @Environment(Toasts.self) private var toasts
    @State private var tasks: [TaskItem] = []
    @State private var loading = true
    @State private var error: String?
    @State private var showDone = false
    @State private var adding = false
    @State private var path = NavigationPath()

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
                    if done.isEmpty { EmptyHint(icon: "tray", title: "Nothing done yet", message: "Tasks you tick off show up here.").listRowBackground(Color.clear) }
                    Section { ForEach(done) { row($0) } }
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
            .refreshable { await load() }
            .task { await load() }
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button { adding = true } label: { Image(systemName: "plus") }.accessibilityLabel("New task") } }
            .sheet(isPresented: $adding) { NewTaskSheet(leadId: nil, leadName: nil) { Task { await load() } } }
            .routes()
        }
    }

    private func row(_ t: TaskItem) -> some View {
        HStack(spacing: 12) {
            CheckCircle(done: t.done) { Task { await toggle(t) } }
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
        .listRowBackground(Theme.card)
        .swipeActions(edge: .leading, allowsFullSwipe: true) {
            Button { Task { await toggle(t) } } label: { Label(t.done ? "Undo" : "Done", systemImage: t.done ? "arrow.uturn.backward" : "checkmark") }.tint(t.done ? Theme.muted : Theme.green)
        }
    }

    private func load() async {
        do {
            let r: TaskList = try await API.shared.get("/api/mobile/v1/tasks")
            withAnimation(.snappy) { tasks = r.tasks; error = nil }
        } catch { self.error = error.localizedDescription }
        loading = false
    }

    private func toggle(_ t: TaskItem) async {
        guard let i = tasks.firstIndex(of: t) else { return }
        withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) { tasks[i].done.toggle() }
        do {
            let _: Ok<Empty> = try await API.shared.post("/api/mobile/v1/tasks/\(t.id)", ["leadId": t.leadId, "done": !t.done])
            if !t.done { toasts.show("Nice. Task done.") }
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
    @State private var due = Calendar.current.date(bySettingHour: 17, minute: 0, second: 0, of: .now) ?? .now
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
                Section {
                    Toggle("Due date", isOn: $hasDue.animation())
                    if hasDue { DatePicker("Due", selection: $due).datePickerStyle(.compact) }
                }
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
                        TextField("Search leads", text: $search).textInputAutocapitalization(.never)
                        ForEach(matches) { m in
                            Button { lead = m } label: {
                                HStack { Avatar(name: m.name, size: 28); Text(m.name).foregroundStyle(Theme.text); Spacer(); Text(m.company ?? "").font(.caption).foregroundStyle(Theme.muted) }
                            }
                        }
                    }
                }
                if let error { Text(error).foregroundStyle(Theme.red).font(.footnote) }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.bg)
            .navigationTitle("New task")
            .navigationBarTitleDisplayMode(.inline)
            .task(id: search) {
                guard leadId == nil, lead == nil else { return }
                try? await Task.sleep(for: .milliseconds(250))
                let p: LeadPage? = try? await API.shared.get("/api/mobile/v1/leads", query: search.isEmpty ? [] : [URLQueryItem(name: "q", value: search)])
                matches = Array((p?.leads ?? []).prefix(6))
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .fontWeight(.semibold)
                        .disabled(busy || title.trimmingCharacters(in: .whitespaces).isEmpty || (leadId == nil && lead == nil))
                }
            }
        }
    }

    private func save() async {
        busy = true
        let body: [String: Any] = ["leadId": leadId ?? lead?.id ?? "", "title": title, "dueAt": hasDue ? ISO8601DateFormatter().string(from: due) : NSNull(), "priority": priority]
        do {
            let _: Ok<Empty> = try await API.shared.post("/api/mobile/v1/tasks", body)
            toasts.show("Task added")
            saved()
            dismiss()
        } catch { self.error = error.localizedDescription }
        busy = false
    }
}
