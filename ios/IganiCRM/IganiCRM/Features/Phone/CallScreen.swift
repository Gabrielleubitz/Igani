import AVKit
import SwiftUI

/// The live call, full screen. Swipe it down (or tap the chevron) to keep working in the CRM; a bar stays on top.
struct CallScreen: View {
    @State private var phone = Phone.shared
    @State private var showKeys = false
    @State private var showNotes = false
    @State private var openLead: String?
    @AppStorage("callNotes") private var notes = ""

    var body: some View {
        if let call = phone.active {
            ZStack {
                background(call)
                VStack(spacing: 0) {
                    HStack {
                        Button { withAnimation(.spring(response: 0.4)) { phone.expanded = false } } label: {
                            Image(systemName: "chevron.down").font(.headline).foregroundStyle(Theme.text).frame(width: 44, height: 44).glass(in: Circle(), interactive: true)
                        }
                        .accessibilityLabel("Minimise")
                        Spacer()
                        if call.record, call.status == .live { Tag(text: "REC", tint: Theme.red, icon: "circle.fill") }
                        Spacer()
                        RoutePicker().frame(width: 44, height: 44).glass(in: Circle(), interactive: true)
                            .accessibilityLabel("Audio output")
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)

                    Spacer(minLength: 10)
                    identity(call, compact: showKeys && call.status == .live)
                    Spacer(minLength: 10)

                    if showKeys, call.status == .live {
                        VStack(spacing: 6) {
                            InCallKeypad(typed: call.digits) { phone.press($0) }
                            Button("Hide keypad") { showKeys = false }
                                .font(.subheadline.weight(.semibold)).foregroundStyle(Theme.accent)
                                .frame(minHeight: 44)
                        }
                        .transition(.scale(scale: 0.9).combined(with: .opacity))
                    } else if call.status == .incoming {
                        incomingButtons
                    } else if call.listening {
                        listeningPanel(call)
                            .transition(.opacity)
                    } else {
                        if call.status == .live, !phone.callNotes.isEmpty { notesCard }
                        controls(call)
                            .transition(.opacity)
                    }

                    if call.status != .incoming {
                        Button { phone.hangUp() } label: {
                            Image(systemName: "phone.down.fill").font(.system(size: 30, weight: .semibold)).foregroundStyle(.white)
                                .frame(width: 78, height: 78)
                                .background(Theme.red.gradient, in: Circle())
                                .shadow(color: Theme.red.opacity(0.45), radius: 18, y: 8)
                        }
                        .buttonStyle(ElasticStyle())
                        .disabled(call.status == .ended)
                        .opacity(call.status == .ended ? 0.4 : 1)
                        .padding(.top, 26)
                        .padding(.bottom, call.listening ? 8 : 30)
                        .accessibilityLabel(call.listening ? "Stop listening" : "Hang up")
                        if call.listening {
                            Text("Stop listening").font(.footnote.weight(.semibold)).foregroundStyle(Theme.muted).padding(.bottom, 24)
                        }
                    }
                }
            }
            .gesture(DragGesture().onEnded { v in if v.translation.height > 120 { withAnimation(.spring(response: 0.4)) { phone.expanded = false } } })
            .sensoryFeedback(.impact(weight: .medium), trigger: call.status)
            .sheet(isPresented: $showNotes) { NotesSheet(text: $notes) }
            .accessibilityAction(.escape) { phone.expanded = false }
            .sheet(item: Binding(get: { openLead.map(LeadSheetID.init) }, set: { openLead = $0?.id })) { l in
                NavigationStack { LeadDetailView(id: l.id).routes().toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { openLead = nil } } } }
            }
            .animation(.spring(response: 0.4, dampingFraction: 0.85), value: showKeys)
            .animation(.spring(response: 0.4, dampingFraction: 0.85), value: call.status)
            // the keypad only works on a live call: close it when the call drops, holds or reconnects
            .onChange(of: call.status) { _, s in if s != .live { showKeys = false } }
            .onChange(of: call.id) { _, _ in showKeys = false; openLead = nil; showNotes = false }
        }
    }

    private func background(_ call: Phone.ActiveCall) -> some View {
        ZStack {
            Theme.bg
            MeshGradient(width: 3, height: 3, points: [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [0.5, 0.45], [1, 0.5], [0, 1], [0.5, 1], [1, 1]], colors: [
                Theme.bg, Color(hex: 0x1B3358), Theme.bg,
                Color(hex: 0x15284A), call.status == .live ? Color(hex: 0x1E4A3A) : Color(hex: 0x24427A), Color(hex: 0x15284A),
                Theme.bg, Color(hex: 0x101B30), Theme.bg,
            ])
            .opacity(0.9)
            .animation(.easeInOut(duration: 1.2), value: call.status)
        }
        .ignoresSafeArea()
    }

    /// compact while the keypad is open, so the keys and the hang-up button fit on smaller iPhones
    private func identity(_ call: Phone.ActiveCall, compact: Bool) -> some View {
        VStack(spacing: compact ? 8 : 14) {
            if !compact {
                ZStack {
                    PulseRings(tint: call.status == .live ? Theme.green : Theme.accent, active: [.connecting, .ringing, .incoming].contains(call.status))
                        .frame(width: 128, height: 128)
                    Avatar(name: call.name, size: 116)
                        .shadow(color: .black.opacity(0.4), radius: 20, y: 10)
                }
                .frame(height: 170)
            }
            Text(call.name).font(.system(size: 30, weight: .bold, design: .rounded)).foregroundStyle(Theme.text).multilineTextAlignment(.center).lineLimit(2).minimumScaleFactor(0.7)
            if let sub = call.sub { Text(sub).font(.subheadline).foregroundStyle(Theme.muted).multilineTextAlignment(.center) }
            status(call)
            if let leadId = call.leadId, call.status != .incoming, !call.listening, !compact {
                Button { openLead = leadId } label: { Label("Contact card", systemImage: "person.crop.circle").font(.footnote.weight(.semibold)).padding(.horizontal, 14).padding(.vertical, 8).glass(in: Capsule(), interactive: true) }
                    .foregroundStyle(Theme.accent)
            }
        }
        .padding(.horizontal, 28)
    }

    @ViewBuilder private func status(_ call: Phone.ActiveCall) -> some View {
        switch call.status {
        case .live:
            TimelineView(.periodic(from: .now, by: 1)) { ctx in
                Text(PhoneFmt.clock(max(0, Int(ctx.date.timeIntervalSince(call.connectedAt ?? ctx.date)))))
                    .font(.system(.title3, design: .rounded).weight(.semibold)).monospacedDigit().foregroundStyle(Theme.green)
                    .contentTransition(.numericText())
            }
            if call.held { Tag(text: "On hold", tint: Theme.amber, icon: "pause.fill") }
        case .ended:
            Text(call.failure ?? "Call ended").font(.headline).foregroundStyle(call.failure == nil ? Theme.muted : Theme.red).multilineTextAlignment(.center)
        default:
            Text(call.listening && call.status == .connecting ? "Joining…" : call.status == .connecting ? "Calling…" : call.status == .ringing ? "Ringing…" : call.status == .incoming ? "Incoming call" : "Reconnecting…")
                .font(.headline).foregroundStyle(Theme.accent)
                .phaseAnimator([0.45, 1]) { t, o in t.opacity(o) } animation: { _ in .easeInOut(duration: 0.9) }
        }
    }

    private func controls(_ call: Phone.ActiveCall) -> some View {
        let live = call.status == .live
        return LazyVGrid(columns: Array(repeating: GridItem(.fixed(92), spacing: 18), count: 3), spacing: 18) {
            CallControl(icon: call.muted ? "mic.slash.fill" : "mic.fill", label: call.muted ? "Unmute" : "Mute", on: call.muted) { phone.toggleMute() }
            CallControl(icon: "circle.grid.3x3.fill", label: "Keypad", on: false, enabled: live) { showKeys = true }
            CallControl(icon: "speaker.wave.3.fill", label: "Speaker", on: call.speaker) { phone.toggleSpeaker() }
            CallControl(icon: call.held ? "play.fill" : "pause.fill", label: call.held ? "Resume" : "Hold", on: call.held, enabled: live || call.held) { phone.toggleHold() }
            CallControl(icon: "note.text", label: "Notes", on: !notes.isEmpty) { showNotes = true }
            CallControl(icon: "person.crop.circle", label: "Contact", on: false, enabled: call.leadId != nil) { openLead = call.leadId }
        }
    }

    /// Listening in: no mute, keypad or hold (you're muted by the room); just the speaker and a clear reminder.
    /// Notes from an admin listening in: the latest three, newest at the bottom. Only the rep sees them.
    private var notesCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("From your manager", systemImage: "text.bubble.fill")
                .font(.caption.weight(.semibold)).foregroundStyle(Theme.accent)
            ForEach(phone.callNotes.suffix(3)) { n in
                Text(n.body).font(.subheadline).foregroundStyle(Theme.text).frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityLabel("Note from \(n.author): \(n.body)")
            }
        }
        .padding(12)
        .background(Theme.accent.opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.horizontal, 24)
        .transition(.move(edge: .top).combined(with: .opacity))
    }

    private func listeningPanel(_ call: Phone.ActiveCall) -> some View {
        VStack(spacing: 18) {
            HStack(spacing: 10) {
                Image(systemName: "ear.fill").font(.headline).foregroundStyle(Theme.green)
                    .symbolEffect(.variableColor.iterative, isActive: call.status == .live)
                VStack(alignment: .leading, spacing: 2) {
                    Text(call.status == .live ? "You’re listening in" : "Joining the call…").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text)
                    Text("You’re muted. Neither side can hear you or see that you joined.").font(.caption).foregroundStyle(Theme.muted)
                }
            }
            .padding(14)
            .frame(maxWidth: 340, alignment: .leading)
            .glass(in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            CallControl(icon: "speaker.wave.3.fill", label: "Speaker", on: call.speaker) { phone.toggleSpeaker() }
        }
    }

    private var incomingButtons: some View {
        HStack(spacing: 70) {
            VStack(spacing: 10) {
                Button { phone.hangUp() } label: {
                    Image(systemName: "phone.down.fill").font(.system(size: 30, weight: .semibold)).foregroundStyle(.white).frame(width: 78, height: 78).background(Theme.red.gradient, in: Circle())
                }
                .buttonStyle(ElasticStyle())
                .accessibilityLabel("Decline")
                Text("Decline").font(.footnote.weight(.medium)).foregroundStyle(Theme.muted).accessibilityHidden(true)
            }
            VStack(spacing: 10) {
                Button { phone.answer() } label: {
                    Image(systemName: "phone.fill").font(.system(size: 30, weight: .semibold)).foregroundStyle(.white).frame(width: 78, height: 78).background(Theme.green.gradient, in: Circle())
                        .phaseAnimator([0, -8, 8, 0]) { v, a in v.rotationEffect(.degrees(a)) } animation: { _ in .easeInOut(duration: 0.12) }
                }
                .buttonStyle(ElasticStyle())
                .accessibilityLabel("Answer")
                Text("Answer").font(.footnote.weight(.medium)).foregroundStyle(Theme.muted).accessibilityHidden(true)
            }
        }
        .padding(.bottom, 60)
    }
}

private struct LeadSheetID: Identifiable { let id: String }

struct CallControl: View {
    let icon: String
    let label: String
    let on: Bool
    var enabled = true
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon).font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(on ? Theme.bg : Theme.text)
                    .frame(width: 72, height: 72)
                    .background {
                        if on { Circle().fill(Theme.text) } else { Circle().fill(.white.opacity(0.1)) }
                    }
                    .overlay(Circle().strokeBorder(.white.opacity(on ? 0 : 0.08)))
                Text(label).font(.caption.weight(.medium)).foregroundStyle(Theme.text.opacity(0.85))
                    .lineLimit(1).minimumScaleFactor(0.7)
            }
        }
        .buttonStyle(PressStyle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label)
        .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
        .disabled(!enabled)
        .opacity(enabled ? 1 : 0.35)
        .sensoryFeedback(.selection, trigger: on)
    }
}

/// Touch tones during a call (menus, extensions).
struct InCallKeypad: View {
    let typed: String
    let press: (String) -> Void
    @State private var tap = 0
    private let keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"]
    var body: some View {
        VStack(spacing: 12) {
            Text(typed.isEmpty ? " " : typed).font(.system(.title2, design: .rounded).weight(.medium)).foregroundStyle(Theme.text).lineLimit(1).truncationMode(.head)
            LazyVGrid(columns: Array(repeating: GridItem(.fixed(78), spacing: 20), count: 3), spacing: 12) {
                ForEach(keys, id: \.self) { k in
                    KeyButton(digit: k, letters: "") { press(k); tap += 1 }
                        .scaleEffect(0.9)
                }
            }
        }
        .sensoryFeedback(.impact(weight: .light), trigger: tap)
    }
}

/// AirPods, car, speaker: the system's audio route picker.
struct RoutePicker: UIViewRepresentable {
    func makeUIView(context: Context) -> AVRoutePickerView {
        let v = AVRoutePickerView()
        v.tintColor = UIColor(Theme.text)
        v.activeTintColor = UIColor(Theme.accent)
        v.prioritizesVideoDevices = false
        return v
    }
    func updateUIView(_ uiView: AVRoutePickerView, context: Context) {}
}

struct NotesSheet: View {
    @Binding var text: String
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            TextEditor(text: $text)
                .scrollContentBackground(.hidden)
                .padding()
                .background(Theme.bg)
                .navigationTitle("Call notes")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
                .overlay(alignment: .topLeading) {
                    if text.isEmpty { Text("Jot things down while you talk. They go into the wrap-up.").foregroundStyle(Theme.muted).padding(22).allowsHitTesting(false) }
                }
        }
        .presentationDetents([.medium, .large])
    }
}

/// The call, minimised: a bar on top of the app while you look things up. Tap it to open the call again.
struct CallBar: View {
    @State private var phone = Phone.shared
    var body: some View {
        if let call = phone.active, !phone.expanded {
            HStack(spacing: 6) {
                // separate buttons side by side (a button inside a button's label can swallow the inner tap)
                Button { withAnimation(.spring(response: 0.45, dampingFraction: 0.85)) { phone.expanded = true } } label: {
                    HStack(spacing: 10) {
                        Image(systemName: call.listening ? "ear.fill" : "phone.fill").font(.footnote.weight(.bold)).foregroundStyle(.white)
                            .frame(width: 30, height: 30).background(call.status == .ended ? Theme.muted : Theme.green, in: Circle())
                        VStack(alignment: .leading, spacing: 1) {
                            Text(call.listening ? "Listening · \(call.name)" : call.name).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1)
                            if call.status == .live {
                                TimelineView(.periodic(from: .now, by: 1)) { ctx in
                                    Text((call.held ? "On hold · " : "") + PhoneFmt.clock(max(0, Int(ctx.date.timeIntervalSince(call.connectedAt ?? ctx.date))))).font(.caption).monospacedDigit().foregroundStyle(call.held ? Theme.amber : Theme.green)
                                }
                            } else {
                                Text(statusText(call)).font(.caption).foregroundStyle(call.status == .ended ? Theme.muted : Theme.accent).lineLimit(1)
                            }
                        }
                        Spacer(minLength: 0)
                    }
                    .frame(minHeight: 44)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityHint("Opens the call screen")
                if !call.listening, call.status != .incoming, call.status != .ended {
                    Button { phone.toggleMute() } label: {
                        Image(systemName: call.muted ? "mic.slash.fill" : "mic.fill").frame(width: 44, height: 44).contentShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(call.muted ? Theme.amber : Theme.text)
                    .accessibilityLabel(call.muted ? "Unmute" : "Mute")
                    .sensoryFeedback(.selection, trigger: call.muted)
                }
                if call.status == .incoming {
                    Button { phone.answer() } label: {
                        Image(systemName: "phone.fill").foregroundStyle(.white).frame(width: 38, height: 38).background(Theme.green, in: Circle()).frame(width: 44, height: 44)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Answer")
                }
                Button { phone.hangUp() } label: {
                    Image(systemName: "phone.down.fill").foregroundStyle(.white).frame(width: 38, height: 38).background(Theme.red, in: Circle()).frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
                .disabled(call.status == .ended)
                .opacity(call.status == .ended ? 0.4 : 1)
                .accessibilityLabel(call.status == .incoming ? "Decline" : call.listening ? "Stop listening" : "Hang up")
            }
            .padding(.leading, 8)
            .padding(.trailing, 4)
            .padding(.vertical, 4)
            .glass(in: Capsule(), interactive: true)
            .shadow(color: .black.opacity(0.35), radius: 16, y: 6)
            .padding(.horizontal, 14)
            .transition(.move(edge: .top).combined(with: .opacity))
        }
    }

    private func statusText(_ call: Phone.ActiveCall) -> String {
        switch call.status {
        case .incoming: return "Incoming call"
        case .ended: return call.failure ?? "Call ended"
        case .ringing: return "Ringing…"
        case .reconnecting: return "Reconnecting…"
        case .connecting: return call.listening ? "Joining…" : "Calling…"
        case .live: return ""
        }
    }
}
