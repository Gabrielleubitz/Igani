import Contacts
import ContactsUI
import Observation
import SwiftUI

/// The iPhone's own contacts, for quick dialing through Igani. They're read on this phone only: nothing is uploaded,
/// and they don't become leads or call-list entries. Favourites (starred numbers) are kept on this phone too.
@MainActor @Observable final class PhoneContacts {
    static let shared = PhoneContacts()

    struct Person: Identifiable, Hashable {
        struct Number: Hashable { let label: String; let value: String }
        let id: String
        let name: String
        let company: String?
        let numbers: [Number]
        let photo: Data?
        var initial: String { name.first.map { String($0).uppercased() } ?? "#" }
    }

    enum Access { case unknown, denied, limited, full }

    var access: Access = .unknown
    var people: [Person] = []
    var loading = false
    /// starred numbers (the raw number as saved), in the order they were starred
    var favourites: [String] = UserDefaults.standard.stringArray(forKey: "quickDial") ?? [] {
        didSet { UserDefaults.standard.set(favourites, forKey: "quickDial") }
    }
    private var byDigits: [String: (Person, Person.Number)] = [:]

    init() { refreshAccess() }

    func refreshAccess() {
        switch CNContactStore.authorizationStatus(for: .contacts) {
        case .authorized: access = .full
        case .limited: access = .limited
        case .denied, .restricted: access = .denied
        default: access = .unknown
        }
    }

    /// Asks once (iOS shows its own choice: all contacts, or just some), then loads.
    func requestAndLoad() async {
        if access == .unknown { _ = try? await CNContactStore().requestAccess(for: .contacts) }
        refreshAccess()
        await load()
    }

    func load() async {
        guard access == .full || access == .limited else { return }
        loading = true
        defer { loading = false }
        let list: [Person] = await Task.detached(priority: .userInitiated) {
            let keys: [CNKeyDescriptor] = [
                CNContactFormatter.descriptorForRequiredKeys(for: .fullName),
                CNContactPhoneNumbersKey as CNKeyDescriptor,
                CNContactOrganizationNameKey as CNKeyDescriptor,
                CNContactThumbnailImageDataKey as CNKeyDescriptor,
            ]
            let req = CNContactFetchRequest(keysToFetch: keys)
            req.sortOrder = .userDefault
            var out: [Person] = []
            try? CNContactStore().enumerateContacts(with: req) { c, _ in
                let numbers = c.phoneNumbers.map { n in
                    Person.Number(label: n.label.map { CNLabeledValue<NSString>.localizedString(forLabel: $0) } ?? "phone", value: n.value.stringValue)
                }
                guard !numbers.isEmpty else { return }
                let name = CNContactFormatter.string(from: c, style: .fullName) ?? (c.organizationName.isEmpty ? numbers[0].value : c.organizationName)
                out.append(Person(id: c.identifier, name: name, company: c.organizationName.isEmpty ? nil : c.organizationName, numbers: numbers, photo: c.thumbnailImageData))
            }
            return out
        }.value
        people = list
        var index: [String: (Person, Person.Number)] = [:]
        for p in list { for n in p.numbers { index[Self.key(n.value)] = (p, n) } }
        byDigits = index
    }

    /// The last 9 digits: enough to match +972 50… with 050…, and +1 (555)… with 555….
    nonisolated static func key(_ number: String) -> String { String(number.filter(\.isNumber).suffix(9)) }

    /// Who this number is in your phone's contacts, if anyone.
    func name(for number: String) -> String? {
        let k = Self.key(number)
        guard k.count >= 7 else { return nil }
        return byDigits[k]?.0.name
    }

    func person(for number: String) -> Person? { byDigits[Self.key(number)]?.0 }

    func matches(_ typed: String, limit: Int = 4) -> [(Person, Person.Number)] {
        let digits = typed.filter(\.isNumber)
        guard digits.count >= 3 else { return [] }
        var out: [(Person, Person.Number)] = []
        for p in people {
            for n in p.numbers where n.value.filter(\.isNumber).contains(digits) {
                out.append((p, n))
                if out.count >= limit { return out }
            }
        }
        return out
    }

    func isFavourite(_ n: String) -> Bool { favourites.contains(n) }
    func toggleFavourite(_ n: String) {
        if let i = favourites.firstIndex(of: n) { favourites.remove(at: i) } else { favourites.append(n) }
    }
}

/// Phone tab → Contacts: your phone's contacts, starred ones first, one tap to call through your Igani line.
struct ContactsPane: View {
    @Environment(Toasts.self) private var toasts
    @State private var store = PhoneContacts.shared
    @State private var query = ""
    @State private var choose: PhoneContacts.Person?
    @State private var addMore = false

    var body: some View {
        Group {
            switch store.access {
            case .unknown, .denied: intro
            case .limited, .full: list
            }
        }
        .task { if store.people.isEmpty { await store.load() } }
        // back from Settings after allowing contacts: show them without a restart
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
            let before = store.access
            store.refreshAccess()
            if store.access != before { Task { await store.load() } }
        }
        .confirmationDialog(choose?.name ?? "", isPresented: Binding(get: { choose != nil }, set: { if !$0 { choose = nil } }), titleVisibility: .visible) {
            if let p = choose {
                ForEach(p.numbers, id: \.self) { n in
                    Button("\(n.label.capitalized)  \(n.value)") { call(p, n) }
                }
            }
        }
        .contactAccessPicker(isPresented: $addMore) { _ in Task { await store.load() } }
    }

    private var intro: some View {
        VStack(spacing: 18) {
            Spacer()
            ZStack {
                Circle().fill(Theme.accent.opacity(0.12)).frame(width: 120, height: 120)
                Image(systemName: "person.crop.circle.badge.plus").font(.system(size: 48, weight: .semibold)).foregroundStyle(Theme.accent)
                    .symbolRenderingMode(.hierarchical)
            }
            Text("Quick dial your contacts").font(.title3.weight(.bold)).foregroundStyle(Theme.text)
            Text("Call anyone saved on this iPhone through your Igani line. Your contacts stay on this phone: nothing is uploaded, and they don’t become leads.")
                .font(.subheadline).foregroundStyle(Theme.muted).multilineTextAlignment(.center).padding(.horizontal, 30)
            if store.access == .denied {
                Button { if let u = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(u) } } label: {
                    Label("Allow in Settings", systemImage: "gearshape").font(.headline).frame(maxWidth: 260).padding(.vertical, 12)
                }
                .buttonStyle(.borderedProminent)
            } else {
                Button { Task { await store.requestAndLoad() } } label: {
                    Label("Show my contacts", systemImage: "person.2.fill").font(.headline).frame(maxWidth: 260).padding(.vertical, 12)
                }
                .buttonStyle(.borderedProminent)
            }
            Spacer()
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    private var list: some View {
        let q = query.trimmingCharacters(in: .whitespaces)
        let filtered = q.isEmpty ? store.people : store.people.filter { $0.name.localizedCaseInsensitiveContains(q) || ($0.company?.localizedCaseInsensitiveContains(q) ?? false) || $0.numbers.contains { $0.value.filter(\.isNumber).contains(q.filter(\.isNumber)) && q.filter(\.isNumber).count >= 3 } }
        let favs: [(PhoneContacts.Person, PhoneContacts.Person.Number)] = q.isEmpty ? store.favourites.compactMap { f in store.people.lazy.compactMap { p in p.numbers.first { $0.value == f }.map { (p, $0) } }.first } : []
        let groups = Dictionary(grouping: filtered, by: \.initial).sorted { $0.key < $1.key }
        return VStack(spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass").foregroundStyle(Theme.muted)
                TextField("Search contacts", text: $query).textInputAutocapitalization(.never).autocorrectionDisabled()
                if !query.isEmpty { Button { query = "" } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(Theme.muted) }.accessibilityLabel("Clear search") }
            }
            .padding(.horizontal, 14).padding(.vertical, 10)
            .glass(in: Capsule())
            .padding(.horizontal, 16).padding(.bottom, 8)

            List {
                if !favs.isEmpty {
                    Section {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 14) {
                                ForEach(favs, id: \.1.value) { p, n in
                                    Button { call(p, n) } label: {
                                        VStack(spacing: 6) {
                                            ContactPhoto(person: p, size: 58)
                                            Text(p.name.split(separator: " ").first.map(String.init) ?? p.name).font(.caption.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1)
                                        }
                                        .frame(width: 66)
                                    }
                                    .buttonStyle(PressStyle())
                                    .contextMenu { Button("Remove from quick dial", systemImage: "star.slash") { withAnimation { store.toggleFavourite(n.value) } } }
                                }
                            }
                            .padding(.vertical, 4)
                        }
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                    } header: { Label("Quick dial", systemImage: "star.fill").font(.caption.weight(.bold)).foregroundStyle(Theme.amber) }
                }
                if store.access == .limited {
                    Section {
                        Button { addMore = true } label: { Label("Choose more contacts to show", systemImage: "person.badge.plus") }
                            .listRowBackground(Theme.card)
                    } footer: { Text("You let Igani see only some contacts. Add more any time.") }
                }
                ForEach(groups, id: \.key) { g in
                    Section(g.key) {
                        ForEach(g.value) { p in row(p) }
                    }
                }
                if store.loading, store.people.isEmpty {
                    HStack { Spacer(); ProgressView(); Spacer() }.listRowBackground(Color.clear)
                }
                if filtered.isEmpty, !store.loading {
                    Text(q.isEmpty ? "No contacts with a phone number." : "No one matches “\(q)”.").foregroundStyle(Theme.muted).listRowBackground(Color.clear)
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .scrollDismissesKeyboard(.immediately)
        }
    }

    private func row(_ p: PhoneContacts.Person) -> some View {
        Button { p.numbers.count == 1 ? call(p, p.numbers[0]) : (choose = p) } label: {
            HStack(spacing: 12) {
                ContactPhoto(person: p, size: 38)
                VStack(alignment: .leading, spacing: 2) {
                    Text(p.name).foregroundStyle(Theme.text).lineLimit(1)
                    Text(p.company ?? (p.numbers.count == 1 ? p.numbers[0].value : "\(p.numbers.count) numbers")).font(.caption).foregroundStyle(Theme.muted).lineLimit(1)
                }
                Spacer()
                if p.numbers.contains(where: { store.isFavourite($0.value) }) { Image(systemName: "star.fill").font(.caption).foregroundStyle(Theme.amber) }
                Image(systemName: "phone.fill").font(.footnote).foregroundStyle(Theme.green)
            }
        }
        .listRowBackground(Theme.card)
        .swipeActions(edge: .leading) {
            Button {
                withAnimation { store.toggleFavourite(p.numbers[0].value) }
            } label: { Label(store.isFavourite(p.numbers[0].value) ? "Unstar" : "Quick dial", systemImage: store.isFavourite(p.numbers[0].value) ? "star.slash" : "star.fill") }
            .tint(Theme.amber)
        }
        .swipeActions(edge: .trailing) {
            NavigationLink(value: CallRoute.thread(PhoneFmt.clean(p.numbers[0].value), p.name)) { Label("Text", systemImage: "message.fill") }
                .tint(Theme.accent)
        }
        .contextMenu {
            ForEach(p.numbers, id: \.self) { n in
                Button { call(p, n) } label: { Label("Call \(n.label) · \(n.value)", systemImage: "phone") }
                Button { withAnimation { store.toggleFavourite(n.value) } } label: { Label(store.isFavourite(n.value) ? "Remove \(n.label) from quick dial" : "Add \(n.label) to quick dial", systemImage: "star") }
            }
        }
    }

    private func call(_ p: PhoneContacts.Person, _ n: PhoneContacts.Person.Number) {
        choose = nil
        Task {
            do { try await Phone.shared.call(PhoneFmt.clean(n.value), name: p.name) } catch { toasts.show(error.localizedDescription, tone: .warn) }
        }
    }
}

struct ContactPhoto: View {
    let person: PhoneContacts.Person
    var size: CGFloat = 40
    var body: some View {
        if let d = person.photo, let img = UIImage(data: d) {
            Image(uiImage: img).resizable().scaledToFill().frame(width: size, height: size).clipShape(Circle())
                .overlay(Circle().strokeBorder(.white.opacity(0.08)))
        } else {
            Avatar(name: person.name, size: size)
        }
    }
}
