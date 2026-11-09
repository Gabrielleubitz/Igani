import SwiftUI

/// The AI profile on a lead: a time booked on a call (Add to calendar), next steps (Make task / Done), and what we know.
struct LeadProfilePanel: View {
    let leadId: String
    let profile: LeadProfileData
    let reload: () async -> Void
    @Environment(Toasts.self) private var toasts
    @State private var busy: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Image(systemName: "sparkles").foregroundStyle(Theme.violet)
                Text("What we know").font(.headline).foregroundStyle(Theme.text)
                Spacer()
                Text("from \(profile.calls.count) \(profile.calls.count == 1 ? "call" : "calls")").font(.caption).foregroundStyle(Theme.muted)
            }

            ForEach(profile.meetings) { m in meeting(m) }

            let open = profile.actionItems.filter { $0.status == "open" }
            if !open.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Label("Next steps", systemImage: "checklist").font(.caption.weight(.bold)).foregroundStyle(Theme.muted)
                    ForEach(open) { item in step(item) }
                }
            }

            facts
        }
        .card()
    }

    private func meeting(_ m: LeadProfileData.Meeting) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "calendar.badge.checkmark").font(.title3).foregroundStyle(Theme.green)
                    .frame(width: 40, height: 40).background(Theme.green.opacity(0.15), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("BOOKED ON THE CALL").font(.caption2.weight(.bold)).foregroundStyle(Theme.green)
                    Text(Self.when(m)).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text)
                    Text([m.kind == "video" ? "Video call" : m.kind == "in_person" ? "In person" : m.kind == "phone" ? "Phone call" : "Meeting", "\(m.durationMin) min", m.topic].compactMap { $0 }.joined(separator: " · "))
                        .font(.caption).foregroundStyle(Theme.muted)
                    if let q = m.quote { Text("“\(q)”").font(.caption.italic()).foregroundStyle(Theme.muted) }
                }
            }
            if m.entryId != nil {
                Label("On your calendar", systemImage: "checkmark.circle.fill").font(.footnote.weight(.semibold)).foregroundStyle(Theme.green)
            } else {
                Button {
                    act("cal-\(m.id)") { try await API.shared.run("addProfileMeetingToCalendar", leadId, m.id) } done: { "Added to your calendar." }
                } label: {
                    HStack(spacing: 6) {
                        if busy == "cal-\(m.id)" { ProgressView().tint(Theme.bg) } else { Image(systemName: "calendar.badge.plus") }
                        Text("Add to calendar")
                    }
                    .font(.footnote.weight(.bold)).foregroundStyle(Theme.bg)
                    .padding(.horizontal, 14).padding(.vertical, 9)
                    .background(Theme.green, in: Capsule())
                }
                .buttonStyle(ElasticStyle())
            }
        }
        .padding(12)
        .background(Theme.green.opacity(0.07), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Theme.green.opacity(0.3)))
    }

    private func step(_ item: LeadProfileData.Item) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Button { act("done-\(item.id)") { try await API.shared.run("setProfileItem", leadId, item.id, "done") } } label: {
                Image(systemName: "circle").font(.body).foregroundStyle(Theme.muted)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Mark done")
            VStack(alignment: .leading, spacing: 2) {
                Text(item.text).font(.subheadline).foregroundStyle(Theme.text)
                HStack(spacing: 6) {
                    Text(item.owner == "client" ? "Client" : "Us").foregroundStyle(item.owner == "client" ? Theme.amber : Theme.accent)
                    if let d = item.due { Text("· due \(Self.day(d))").foregroundStyle(Theme.muted) }
                }
                .font(.caption2.weight(.semibold))
            }
            Spacer(minLength: 4)
            Button { act("task-\(item.id)") { try await API.shared.run("profileItemToTask", leadId, item.id) } done: { "Task added." } } label: {
                Text(busy == "task-\(item.id)" ? "…" : "Make task").font(.caption.weight(.bold)).padding(.horizontal, 10).padding(.vertical, 6).glass(in: Capsule(), interactive: true)
            }
            .buttonStyle(.plain)
            .foregroundStyle(Theme.accent)
        }
        .padding(10)
        .background(Theme.raised.opacity(0.5), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    @ViewBuilder private var facts: some View {
        let f = profile.fields
        VStack(alignment: .leading, spacing: 10) {
            if let n = f["name"]?.value { row("person.fill", "Name", [n, f["role"]?.value].compactMap { $0 }.joined(separator: " · ")) }
            if let c = f["company"]?.value { row("building.2.fill", "Company", [c, f["industry"]?.value].compactMap { $0 }.joined(separator: " · ")) }
            if let l = f["location"]?.value { row("mappin.and.ellipse", "Location", l) }
            if let site = profile.siteCheck?.url ?? f["website"]?.value {
                VStack(alignment: .leading, spacing: 4) {
                    row("globe", "Website", site.replacingOccurrences(of: "https://", with: "").replacingOccurrences(of: "http://", with: ""), link: URL(string: site))
                    HStack(spacing: 6) {
                        if let p = profile.siteCheck, p.platform != "Unreachable" { Tag(text: [p.platform, p.version].compactMap { $0 }.joined(separator: " "), tint: p.kind == "wordpress" ? Theme.accent : Theme.muted) }
                        else if let p = f["platform"]?.value { Tag(text: p, tint: Theme.muted) }
                        if let o = profile.siteCheck?.opener { Text(o).font(.caption).foregroundStyle(Theme.muted) }
                    }
                    .padding(.leading, 30)
                }
            }
            if let e = f["email"]?.value { row("envelope.fill", "Email (said on the call)", e, link: URL(string: "mailto:\(e)")) }
            let money = [f["budget"]?.value, f["timeline"]?.value].compactMap { $0 }
            if !money.isEmpty { row("banknote.fill", "Budget · timeline", money.joined(separator: " · ")) }
            if let d = f["decisionMaker"]?.value { row("target", "Who decides", d) }
            if !profile.lists.needs.isEmpty { chips("Wants", profile.lists.needs.map(\.value), Theme.violet) }
            if !profile.lists.pains.isEmpty { chips("Pains", profile.lists.pains.map(\.value), Theme.red) }
            if !profile.lists.competitors.isEmpty { row("person.2.fill", "Also talking to", profile.lists.competitors.map(\.value).joined(separator: ", ")) }
            ForEach(profile.facts.suffix(6), id: \.self) { x in
                Text("**\(x.label):** \(x.value)\(x.quote.map { " · “\($0)”" } ?? "")").font(.caption).foregroundStyle(Theme.muted)
            }
        }
    }

    private func row(_ icon: String, _ label: String, _ value: String, link: URL? = nil) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon).font(.footnote).foregroundStyle(Theme.muted).frame(width: 20)
            VStack(alignment: .leading, spacing: 1) {
                Text(label.uppercased()).font(.caption2.weight(.semibold)).foregroundStyle(Theme.muted)
                if let link { Link(value, destination: link).font(.subheadline.weight(.semibold)) } else { Text(value).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text) }
            }
        }
    }

    private func chips(_ title: String, _ values: [String], _ tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title.uppercased()).font(.caption2.weight(.semibold)).foregroundStyle(Theme.muted)
            FlowLayout(spacing: 6) { ForEach(values, id: \.self) { Tag(text: $0, tint: tint) } }
        }
    }

    private func act(_ key: String, _ work: @escaping () async throws -> Void, done: (() -> String)? = nil) {
        busy = key
        Task {
            do {
                try await work()
                if let done { toasts.show(done(), tone: .ok) }
                await reload()
            } catch { toasts.show(error.localizedDescription, tone: .warn) }
            busy = nil
        }
    }

    static func when(_ m: LeadProfileData.Meeting) -> String {
        let parts = m.when.split(separator: "T")
        guard parts.count == 2 else { return m.when }
        return "\(day(String(parts[0]), long: true)) at \(parts[1])"
    }

    static func day(_ d: String, long: Bool = false) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "UTC")
        guard let date = f.date(from: String(d.prefix(10))) else { return d }
        let out = DateFormatter()
        out.timeZone = TimeZone(identifier: "UTC")
        out.dateFormat = long ? "EEEE d MMMM" : "EEE d MMM"
        return out.string(from: date) + (d.count > 10 ? ", \(d.suffix(5))" : "")
    }
}
