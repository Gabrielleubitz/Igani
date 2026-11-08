import SwiftUI

/// Admins: calls happening right now. Listen joins one muted (Phone.listen); the bubble messages the rep in team chat.
/// Shows nothing when nobody is on the phone.
struct LiveCallsPanel: View {
    @Environment(Toasts.self) private var toasts
    @State private var live: LiveCalls?
    @State private var phone = Phone.shared
    @State private var messageRep: LiveCall.Rep?

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
                        if !live.listenIn { Text("Listening in is off").font(.caption).foregroundStyle(Theme.muted) }
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
        .animation(.snappy, value: live?.calls.map(\.callId))
        .task {
            while !Task.isCancelled {
                if let l: LiveCalls = try? await API.shared.act("liveCalls") { live = l }
                try? await Task.sleep(for: .seconds(4))
            }
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
                    Image(systemName: "bubble.left.fill").font(.footnote).foregroundStyle(Theme.muted).frame(width: 34, height: 34).glass(in: Circle(), interactive: true)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Message \(c.rep.name)")
            }
            if c.canListen {
                Button {
                    if listeningHere { phone.hangUp(); return }
                    Task { do { try await phone.listen(to: c) } catch { toasts.show(error.localizedDescription, tone: .warn) } }
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "ear")
                        Text(listeningHere ? "Stop" : "Listen").lineLimit(1)
                    }
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(listeningHere ? Theme.bg : Theme.green)
                        .padding(.horizontal, 12).padding(.vertical, 8)
                        .background(listeningHere ? AnyShapeStyle(Theme.green) : AnyShapeStyle(Theme.green.opacity(0.14)), in: Capsule())
                        .fixedSize()
                }
                .buttonStyle(.plain)
            }
        }
        .padding(10)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}
