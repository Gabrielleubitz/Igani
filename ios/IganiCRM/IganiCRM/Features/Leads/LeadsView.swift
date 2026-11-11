import SwiftUI

struct LeadsView: View {
    @Environment(Session.self) private var session
    @Environment(Toasts.self) private var toasts
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
    @State private var loadingMore = false
    /// bumps on every fresh load, so an older answer (a previous search or stage) never overwrites a newer one
    @State private var generation = 0
    /// the search + stage the list on screen was loaded for
    @State private var loadedKey: String?

    private var trimmedQuery: String { query.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var filterKey: String { "\(trimmedQuery)|\(stage ?? "")" }

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
                        EmptyHint(icon: "person.crop.circle.badge.questionmark", title: trimmedQuery.isEmpty ? (stage == nil ? "No leads here" : "No leads in this stage") : "No matches", message: trimmedQuery.isEmpty ? (stage == nil ? "Leads assigned to you show up here." : "Pick another stage, or All.") : "Try a name, company, email or phone.")
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
            // runs on first show, on every search edit (debounced) and when coming back from a lead (so edits show)
            .task(id: query) {
                if let loadedKey, loadedKey != filterKey {
                    try? await Task.sleep(for: .milliseconds(300))
                    guard !Task.isCancelled else { return }
                }
                if loadedKey == filterKey, !leads.isEmpty { await refreshInPlace() } else { await reload() }
            }
            .refreshable { await reload(announceErrors: true) }
            #if DEBUG
            .onAppear {
                if let id = UserDefaults.standard.string(forKey: "openLead"), path.isEmpty { path.append(Route.lead(id)) }
            }
            #endif
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { adding = true } label: { Image(systemName: "plus").frame(minWidth: 44, minHeight: 44) }.accessibilityLabel("New lead")
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
            guard stage != key else { return }
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
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .accessibilityAddTraits(on ? .isSelected : [])
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
        if !trimmedQuery.isEmpty { q.append(URLQueryItem(name: "q", value: trimmedQuery)) }
        if let stage { q.append(URLQueryItem(name: "status", value: stage)) }
        return q
    }

    private func reload(announceErrors: Bool = false) async {
        generation += 1
        let gen = generation
        let key = filterKey
        loading = true
        defer { if gen == generation { loading = false } }
        do {
            let p: LeadPage = try await API.shared.get("/api/mobile/v1/leads", query: query(page: 1))
            guard gen == generation else { return }
            withAnimation(.snappy) { leads = p.leads; total = p.total; more = p.more; page = 1; error = nil }
            loadedKey = key
        } catch {
            guard gen == generation, !Task.isCancelled else { return }
            if leads.isEmpty || loadedKey != key {
                // what's on screen is for another search/stage: don't leave it looking like the answer
                leads = []; total = 0; more = false
                self.error = error.localizedDescription
                loadedKey = key
            } else if announceErrors {
                toasts.show(error.localizedDescription, tone: .warn)
            }
        }
    }

    /// Back from a lead: bring the rows up to date without losing the pages already scrolled through.
    private func refreshInPlace() async {
        guard page > 1 else { await reload(); return }
        let gen = generation
        guard let p: LeadPage = try? await API.shared.get("/api/mobile/v1/leads", query: query(page: 1)), gen == generation else { return }
        let fresh = Set(p.leads.map(\.id))
        withAnimation(.snappy) {
            leads = p.leads + leads.filter { !fresh.contains($0.id) }
            total = p.total
        }
    }

    private func loadMore() async {
        guard more, !loadingMore else { return }
        loadingMore = true
        defer { loadingMore = false }
        let gen = generation
        do {
            let p: LeadPage = try await API.shared.get("/api/mobile/v1/leads", query: query(page: page + 1))
            guard gen == generation else { return }
            leads += p.leads.filter { n in !leads.contains { $0.id == n.id } }
            more = p.more
            page = p.page
        } catch {
            guard gen == generation, !Task.isCancelled else { return }
            more = false
            toasts.show("Couldn’t load more leads. Pull down to refresh.", tone: .warn)
        }
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

    private func clean(_ s: String) -> String { s.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var canSave: Bool { !busy && !(clean(email).isEmpty && clean(phone).isEmpty) }

    var body: some View {
        NavigationStack {
            Form {
                Section("Person") {
                    TextField("First name", text: $first).textContentType(.givenName)
                    TextField("Last name", text: $last).textContentType(.familyName)
                    TextField("Company", text: $company).textContentType(.organizationName)
                }
                .listRowBackground(Theme.card)
                Section {
                    TextField("Email", text: $email).keyboardType(.emailAddress).textContentType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                    TextField("Phone", text: $phone).keyboardType(.phonePad).textContentType(.telephoneNumber)
                } header: { Text("Contact") } footer: { Text("Add an email or a phone number.") }
                .listRowBackground(Theme.card)
                if let error { Text(error).foregroundStyle(Theme.red).font(.footnote).listRowBackground(Color.clear) }
            }
            .scrollContentBackground(.hidden)
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.bg)
            .navigationTitle("New lead")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    if busy { ProgressView() } else { Button("Add") { Task { await save() } }.disabled(!canSave).fontWeight(.semibold) }
                }
            }
        }
        .presentationDetents([.large])
        .interactiveDismissDisabled(busy)
    }

    private func save() async {
        guard canSave else { return }
        busy = true
        error = nil
        do {
            let r: Ok<NewLead> = try await API.shared.post("/api/mobile/v1/leads", ["firstName": clean(first), "lastName": clean(last), "company": clean(company), "email": clean(email), "phone": clean(phone)])
            toasts.show("Lead added")
            dismiss()
            if let id = r.data?.id { created(id) }
        } catch { self.error = error.localizedDescription }
        busy = false
    }
}
