import SwiftUI

struct LeadsView: View {
    @Environment(Session.self) private var session
    @State private var leads: [LeadRow] = []
    @State private var total = 0
    @State private var page = 1
    @State private var more = false
    @State private var loading = true
    @State private var error: String?
    @State private var query = ""
    @State private var stage: String? = nil
    @State private var adding = false
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            List {
                Section {
                    ScrollView(.horizontal) {
                        HStack(spacing: 8) {
                            chip(nil, "All")
                            ForEach(session.stages, id: \.key) { s in chip(s.key, s.label) }
                        }
                        .padding(.horizontal, 16)
                    }
                    .scrollIndicators(.hidden)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }
                if loading && leads.isEmpty {
                    SkeletonRows(count: 8).listRowBackground(Color.clear).listRowSeparator(.hidden)
                } else if let error, leads.isEmpty {
                    LoadFailed(message: error) { await reload() }.listRowBackground(Color.clear)
                } else if leads.isEmpty {
                    EmptyHint(icon: "person.crop.circle.badge.questionmark", title: query.isEmpty ? "No leads here" : "No matches", message: query.isEmpty ? "Leads assigned to you show up here." : "Try a name, company, email or phone.")
                        .listRowBackground(Color.clear)
                } else {
                    Section {
                        ForEach(leads) { l in
                            NavigationLink(value: Route.lead(l.id)) { row(l) }
                                .listRowBackground(Theme.card)
                                .swipeActions(edge: .leading) {
                                    if let p = l.phone, Phone.shared.isSeller {
                                        Button { Task { do { try await Phone.shared.call(p, leadId: l.id, name: l.name) } catch { ToastCenter.shared?.show(error.localizedDescription, tone: .warn) } } } label: { Label("Call", systemImage: "phone.fill") }.tint(Theme.green)
                                    } else if let p = l.phone, let u = URL(string: "tel:\(p.filter { $0.isNumber || $0 == "+" })") {
                                        Button { UIApplication.shared.open(u) } label: { Label("Call", systemImage: "phone.fill") }.tint(Theme.green)
                                    }
                                }
                                .swipeActions(edge: .trailing) {
                                    if let p = l.phone, let u = URL(string: "sms:\(p.filter { $0.isNumber || $0 == "+" })") {
                                        Button { UIApplication.shared.open(u) } label: { Label("Text", systemImage: "message.fill") }.tint(Theme.blue)
                                    }
                                    if let e = l.email, let u = URL(string: "mailto:\(e)") {
                                        Button { UIApplication.shared.open(u) } label: { Label("Email", systemImage: "envelope.fill") }.tint(Theme.violet)
                                    }
                                }
                                .onAppear { if l.id == leads.last?.id, more { Task { await loadMore() } } }
                        }
                    } header: {
                        Text("\(total) \(total == 1 ? "lead" : "leads")").font(.footnote).foregroundStyle(Theme.muted)
                    }
                    if more { ProgressView().frame(maxWidth: .infinity).listRowBackground(Color.clear) }
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .screenBackground()
            .navigationTitle("Leads")
            .searchable(text: $query, prompt: "Name, company, email or phone")
            .task(id: query) {
                try? await Task.sleep(for: .milliseconds(300))
                if !Task.isCancelled { await reload() }
            }
            .refreshable { await reload() }
            #if DEBUG
            .onAppear {
                if let id = UserDefaults.standard.string(forKey: "openLead"), path.isEmpty { path.append(Route.lead(id)) }
            }
            #endif
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { adding = true } label: { Image(systemName: "plus") }.accessibilityLabel("New lead")
                }
            }
            .sheet(isPresented: $adding) {
                NewLeadSheet { id in
                    Task { await reload() }
                    path.append(Route.lead(id))
                }
            }
            .routes()
        }
    }

    private func chip(_ key: String?, _ label: String) -> some View {
        let on = stage == key
        return Button {
            withAnimation(.snappy) { stage = key }
            Task { await reload() }
        } label: {
            HStack(spacing: 6) {
                if let key { Circle().fill(Theme.stage(key)).frame(width: 7, height: 7) }
                Text(label)
            }
            .font(.subheadline.weight(.medium))
            .padding(.horizontal, 14).padding(.vertical, 8)
            .foregroundStyle(on ? Color(hex: 0x062E6F) : Theme.text)
            .background(on ? Theme.accent : Theme.card, in: Capsule())
            .overlay(Capsule().strokeBorder(on ? .clear : Theme.line))
        }
        .buttonStyle(PressStyle())
        .sensoryFeedback(.selection, trigger: on)
    }

    private func row(_ l: LeadRow) -> some View {
        HStack(spacing: 12) {
            Avatar(name: l.name, size: 42)
            VStack(alignment: .leading, spacing: 4) {
                Text(l.name).font(.body.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1)
                Text([l.company, l.phone ?? l.email].compactMap { $0 }.joined(separator: " · ")).font(.caption).foregroundStyle(Theme.muted).lineLimit(1)
            }
            Spacer(minLength: 6)
            VStack(alignment: .trailing, spacing: 5) {
                StagePill(status: l.status, label: session.me?.stageLabel(l.status) ?? l.status)
                Text(Fmt.relative(l.updatedAt)).font(.caption2).foregroundStyle(Theme.muted)
            }
        }
        .padding(.vertical, 4)
    }

    private func query(page: Int) -> [URLQueryItem] {
        var q = [URLQueryItem(name: "page", value: "\(page)")]
        if !query.isEmpty { q.append(URLQueryItem(name: "q", value: query)) }
        if let stage { q.append(URLQueryItem(name: "status", value: stage)) }
        return q
    }

    private func reload() async {
        loading = true
        do {
            let p: LeadPage = try await API.shared.get("/api/mobile/v1/leads", query: query(page: 1))
            withAnimation(.snappy) { leads = p.leads; total = p.total; more = p.more; page = 1; error = nil }
        } catch { self.error = error.localizedDescription }
        loading = false
    }

    private func loadMore() async {
        guard more else { return }
        do {
            let p: LeadPage = try await API.shared.get("/api/mobile/v1/leads", query: query(page: page + 1))
            leads += p.leads.filter { n in !leads.contains { $0.id == n.id } }
            more = p.more
            page = p.page
        } catch { more = false }
    }
}

/// Add a lead by hand (same rules as the website: an email or a phone, no duplicates).
struct NewLeadSheet: View {
    var created: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @Environment(Toasts.self) private var toasts
    @State private var first = ""
    @State private var last = ""
    @State private var company = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Person") {
                    TextField("First name", text: $first).textContentType(.givenName)
                    TextField("Last name", text: $last).textContentType(.familyName)
                    TextField("Company", text: $company).textContentType(.organizationName)
                }
                Section {
                    TextField("Email", text: $email).keyboardType(.emailAddress).textContentType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                    TextField("Phone", text: $phone).keyboardType(.phonePad).textContentType(.telephoneNumber)
                } header: { Text("Contact") } footer: { Text("Add an email or a phone number.") }
                if let error { Text(error).foregroundStyle(Theme.red).font(.footnote) }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.bg)
            .navigationTitle("New lead")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") { Task { await save() } }.disabled(busy || (email.isEmpty && phone.isEmpty)).fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.large])
    }

    private func save() async {
        busy = true
        do {
            let r: Ok<NewLead> = try await API.shared.post("/api/mobile/v1/leads", ["firstName": first, "lastName": last, "company": company, "email": email, "phone": phone])
            toasts.show("Lead added")
            dismiss()
            if let id = r.data?.id { created(id) }
        } catch { self.error = error.localizedDescription }
        busy = false
    }
}
