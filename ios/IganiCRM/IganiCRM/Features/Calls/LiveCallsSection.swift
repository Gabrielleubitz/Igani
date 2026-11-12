import SwiftUI

/// Admins: calls happening right now. Note slips a short text onto the rep's call screen (the client never sees it);
/// the bubble messages the rep in team chat. Listening in is on the web CRM (Calls → Live now).
/// Shows nothing when nobody is on the phone.
struct LiveCallsPanel: View {
    @Environment(Toasts.self) private var toasts
    @State private var live: LiveCalls?
    @State private var phone = Phone.shared
    @State private var messageRep: LiveCall.Rep?
    @State private var noteFor: LiveCall?
    @State private var noteText = ""
    @State private var sending = false

    var body: some View {
        VStack(spacing: 0) {
            if let live, !live.calls.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 8) {
                        Circle().fill(Theme.green).frame(width: 8, height: 8)
                            .overlay(Circle().stroke(Theme.green.opacity(0.4), lineWidth: 4).scaleEffect(1.7))
                        Text("Live now").font(.headline).foregroundStyle(Theme.text)
                        Text("\(live.calls.count)").font(.caption.weight(.bold)).foregroundStyle(Theme.muted)
                        Spacer()
                        Text(live.listenIn ? "Listen from the web" : "Listening in is off").font(.caption).foregroundStyle(Theme.muted)
                    }
                    ForEach(live.calls) { c in row(c, listenIn: live.listenIn) }
                }
                .padding(14)
                .background(Theme.green.opacity(0.06), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Theme.green.opacity(0.25)))
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .frame(maxWidth: .infinity)
        .sheet(item: $messageRep) { rep in
            NavigationStack {
                ChatDMLoader(userId: rep.id, name: rep.name)
                    .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { messageRep = nil } } }
            }
        }
        .alert("Note to \(noteFor?.rep.name ?? "the rep")", isPresented: Binding(get: { noteFor != nil }, set: { if !$0 { noteFor = nil } })) {
            TextField("Ask about their budget", text: $noteText)
            Button("Send") { send() }
            Button("Cancel", role: .cancel) { noteText = "" }
        } message: {
            Text("Pops up on their call screen. The client never sees it.")
        }
        .animation(.snappy, value: live?.calls.map(\.callId))
        .task {
            while !Task.isCancelled {
                if let l: LiveCalls = try? await API.shared.act("liveCalls") { live = l }
                try? await Task.sleep(for: .seconds(4))
            }
        }
    }

    private func send() {
        guard let c = noteFor else { return }
        let text = noteText.trimmingCharacters(in: .whitespacesAndNewlines)
        noteFor = nil
        noteText = ""
        guard !text.isEmpty else { return }
        sending = true
        Task {
            do {
                let _: Anything? = try await API.shared.act("sendCallNote", c.callId, text)
                toasts.show("Sent to \(c.rep.name)")
            } catch {
                toasts.show(error.localizedDescription, tone: .warn)
            }
            sending = false
        }
    }

    private func row(_ c: LiveCall, listenIn: Bool) -> some View {
        let listeningHere = phone.active?.listening == true && phone.active?.callId == c.callId
        return HStack(spacing: 10) {
            Image(systemName: listeningHere ? "ear.fill" : "phone.fill")
                .font(.footnote.weight(.bold))
                .foregroundStyle(c.status == "IN_PROGRESS" ? Theme.green : Theme.amber)
                .frame(width: 34, height: 34)
                .background((c.status == "IN_PROGRESS" ? Theme.green : Theme.amber).opacity(0.15), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text(c.rep.name).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1)
                HStack(spacing: 4) {
                    if c.status == "IN_PROGRESS", let at = c.answeredAt {
                        TimelineView(.periodic(from: .now, by: 1)) { ctx in
                            Text(PhoneFmt.clock(max(0, Int(ctx.date.timeIntervalSince(at))))).monospacedDigit().foregroundStyle(Theme.green)
                        }
                    } else {
                        Text("Ringing").foregroundStyle(Theme.amber)
                    }
                    Text("· \(c.contact)").foregroundStyle(Theme.muted).lineLimit(1)
                }
                .font(.caption)
            }
            Spacer(minLength: 4)
            if !c.rep.id.isEmpty {
                Button { messageRep = c.rep } label: {
                    Image(systemName: "bubble.left.fill").font(.footnote).foregroundStyle(Theme.muted).frame(width: 36, height: 36).glass(in: Circle(), interactive: true)
                        .frame(width: 44, height: 44).contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Message \(c.rep.name)")
            }
            if c.status == "IN_PROGRESS" {
                Button { noteText = ""; noteFor = c } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "text.bubble")
                        Text("Note").lineLimit(1)
                    }
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(Theme.green)
                    .padding(.horizontal, 12).padding(.vertical, 8)
                    .background(Theme.green.opacity(0.14), in: Capsule())
                    .fixedSize()
                    .frame(minHeight: 44).contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .disabled(sending)
                .accessibilityLabel("Send \(c.rep.name) a note during the call")
            }
        }
        .padding(10)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}
