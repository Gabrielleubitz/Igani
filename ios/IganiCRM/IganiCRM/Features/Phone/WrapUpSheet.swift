import SwiftUI

/// After every call: what happened, a note, and (for a number the CRM doesn't know) who it was. Saved on the call and
/// the contact's timeline; a first real conversation moves a New lead forward, like on the website.
struct WrapUpSheet: View {
    let wrap: Phone.WrapUp
    @Environment(Toasts.self) private var toasts
    @Environment(\.dismiss) private var dismiss
    @AppStorage("callNotes") private var draft = ""
    @State private var outcome: Outcome
    @State private var notes = ""
    @State private var first = ""
    @State private var last = ""
    @State private var company = ""
    @State private var followUp = false
    @State private var saving = false
    @State private var saved = false

    init(wrap: Phone.WrapUp) {
        self.wrap = wrap
        _outcome = State(initialValue: wrap.suggested)
    }

    private var choices: [Outcome] {
        var all = Outcome.allCases
        if !wrap.prospect { all.removeAll { $0 == .interested } }
        return all
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    VStack(spacing: 8) {
                        IconChip(icon: wrap.answered ? "phone.connection.fill" : "phone.down.fill", tint: wrap.answered ? Theme.green : Theme.amber, size: 56)
                        Text(wrap.name).font(.title3.weight(.bold)).foregroundStyle(Theme.text)
                        Text(wrap.answered ? "Talked \(PhoneFmt.clock(wrap.seconds))" : "No conversation").font(.subheadline).foregroundStyle(Theme.muted)
                    }
                    .padding(.top, 6)

                    VStack(alignment: .leading, spacing: 10) {
                        Text("How did it go?").font(.headline).foregroundStyle(Theme.text)
                        LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                            ForEach(choices) { o in
                                let on = o == outcome
                                Button { withAnimation(.snappy) { outcome = o; followUp = o == .callback } } label: {
                                    HStack(spacing: 8) {
                                        Image(systemName: o.icon).font(.footnote.weight(.bold)).foregroundStyle(on ? Theme.bg : o.tint)
                                            .frame(width: 26, height: 26).background(on ? o.tint : o.tint.opacity(0.15), in: Circle())
                                        Text(o.label).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1).minimumScaleFactor(0.8)
                                        Spacer(minLength: 0)
                                    }
                                    .padding(10)
                                    .background(on ? o.tint.opacity(0.18) : Theme.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                                    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(on ? o.tint.opacity(0.6) : Theme.line))
                                }
                                .buttonStyle(PressStyle())
                            }
                        }
                        if outcome == .interested { Text("The business becomes your lead.").font(.caption).foregroundStyle(Theme.green) }
                    }
                    .sensoryFeedback(.selection, trigger: outcome)

                    if !wrap.known, wrap.direction == "INBOUND" || wrap.leadId != nil {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Who was it?").font(.headline).foregroundStyle(Theme.text)
                            HStack(spacing: 10) {
                                field("First name", $first)
                                field("Last name", $last)
                            }
                            field("Business", $company)
                            Text("Saved on the contact for \(wrap.number).").font(.caption).foregroundStyle(Theme.muted)
                        }
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Notes").font(.headline).foregroundStyle(Theme.text)
                        TextField("What was said, what’s next…", text: $notes, axis: .vertical)
                            .lineLimit(3...8)
                            .padding(12)
                            .background(Theme.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Theme.line))
                    }

                    if wrap.leadId != nil, outcome == .callback || outcome == .no_answer || outcome == .voicemail {
                        ToggleRow(title: "Remind me to call back tomorrow", hint: "Adds a task on the contact for 10:00", on: $followUp)
                            .padding(14)
                            .background(Theme.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                }
                .padding(20)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.bg)
            .safeAreaInset(edge: .bottom) {
                PrimaryButton(title: saved ? "Saved" : "Save", icon: saved ? "checkmark" : nil, busy: saving) { Task { await save() } }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(.ultraThinMaterial)
            }
            .navigationTitle("Call wrap-up")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Skip") { dismiss() } } }
            .onAppear {
                notes = draft
                draft = ""
            }
        }
        .presentationDetents([.large])
        .interactiveDismissDisabled(saving)
    }

    private func field(_ label: String, _ text: Binding<String>) -> some View {
        TextField(label, text: text)
            .textContentType(label == "Business" ? .organizationName : label == "First name" ? .givenName : .familyName)
            .padding(12)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Theme.line))
    }

    private func save() async {
        saving = true
        defer { saving = false }
        var input: [String: Any] = ["callId": wrap.callId, "outcome": outcome.rawValue]
        let n = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        if !n.isEmpty { input["notes"] = n }
        if !first.isEmpty || !last.isEmpty || !company.isEmpty { input["contact"] = ["firstName": first, "lastName": last, "company": company] }
        struct Saved: Decodable { let leadId: String?; let madeLead: Bool }
        do {
            let r: Saved? = try await API.shared.act("saveCallWrapUp", input)
            if followUp, let leadId = r?.leadId ?? wrap.leadId {
                var due = Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date()
                due = Calendar.current.date(bySettingHour: 10, minute: 0, second: 0, of: due) ?? due
                let _: Ok<Anything> = try await API.shared.post("/api/mobile/v1/tasks", ["leadId": leadId, "title": "Call back \(wrap.name)", "dueAt": ISO8601DateFormatter().string(from: due), "priority": "HIGH"])
            }
            saved = true
            toasts.show(r?.madeLead == true ? "Saved, and \(wrap.name) is now a lead" : "Call saved on the contact")
            try? await Task.sleep(for: .milliseconds(450))
            dismiss()
        } catch {
            toasts.show(error.localizedDescription, tone: .warn)
        }
    }
}
