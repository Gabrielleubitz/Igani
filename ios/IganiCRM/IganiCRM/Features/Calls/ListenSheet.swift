import AVFoundation
import SwiftUI

/// What the CRM returns when an admin starts listening: where the relay is and a short-lived ticket for it.
struct ListenSession: Decodable {
    struct Roles: Decodable { let inbound: String; let outbound: String }
    let relayUrl: String
    let token: String
    let roles: Roles
    let rep: String
    let contact: String
}

/// Admins listening to a live call. Not a phone call: the CRM asks Twilio to copy the call's audio (both sides, one way)
/// to the listen relay, and this plays what the relay passes on. Nobody on the call hears or sees it.
@MainActor @Observable final class CallListener {
    enum Phase: Equatable { case starting, waiting, live, ended, failed(String) }

    var phase: Phase = .starting
    /// signal level 0…1 of the rep and the client, for the meters
    var repLevel: Float = 0
    var clientLevel: Float = 0
    var session: ListenSession?

    private let callId: String
    private var socket: URLSessionWebSocketTask?
    private let engine = AVAudioEngine()
    /// one player per side: track 0 = the call's inbound side, track 1 = outbound (which is the rep comes from roles)
    private let players = [AVAudioPlayerNode(), AVAudioPlayerNode()]
    private let format = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: 8000, channels: 1, interleaved: false)!
    /// buffers scheduled but not played yet, per side (kept short so the delay doesn't grow)
    private var queued = [0, 0]
    private var started: Date?

    init(callId: String) { self.callId = callId }

    func start() async {
        do {
            guard let s: ListenSession = try await API.shared.act("listenStart", callId) else { throw APIError(message: "Couldn’t start listening.", status: 0) }
            session = s
            try startAudio(roles: s.roles)
            guard var url = URLComponents(string: s.relayUrl + "/listen") else { throw APIError(message: "The listen relay address is wrong.", status: 0) }
            url.queryItems = [URLQueryItem(name: "token", value: s.token)]
            guard let u = url.url else { throw APIError(message: "The listen relay address is wrong.", status: 0) }
            let task = URLSession.shared.webSocketTask(with: u)
            socket = task
            task.resume()
            phase = .waiting
            started = Date()
            receive()
        } catch {
            fail(error.localizedDescription)
        }
    }

    func stop() {
        guard socket != nil || phase != .ended else { return }
        socket?.cancel(with: .normalClosure, reason: nil)
        socket = nil
        tearDownAudio()
        if case .failed = phase {} else { phase = .ended }
        let seconds = started.map { Date().timeIntervalSince($0) } ?? 0
        let id = callId
        Task { try? await API.shared.run("listenStop", id, seconds) }
    }

    // MARK: - relay

    private func receive() {
        socket?.receive { [weak self] result in
            Task { @MainActor in
                guard let self, self.socket != nil else { return }
                switch result {
                case .success(.data(let d)): self.play(d)
                case .success(.string(let s)): self.message(s)
                case .success: break
                case .failure:
                    if self.phase != .ended { self.phase == .live ? self.finish() : self.fail("The relay closed the connection. Try again.") }
                    return
                }
                self.receive()
            }
        }
    }

    private func message(_ text: String) {
        guard let d = text.data(using: .utf8), let m = try? JSONSerialization.jsonObject(with: d) as? [String: Any], let type = m["type"] as? String else { return }
        switch type {
        case "hello": if (m["streaming"] as? Bool) == true { phase = .live }
        case "stream": phase = .live
        case "ended": finish()
        default: break
        }
    }

    private func finish() {
        socket?.cancel(with: .normalClosure, reason: nil)
        socket = nil
        tearDownAudio()
        phase = .ended
        let seconds = started.map { Date().timeIntervalSince($0) } ?? 0
        let id = callId
        Task { try? await API.shared.run("listenStop", id, seconds) }
    }

    private func fail(_ why: String) {
        socket?.cancel(with: .goingAway, reason: nil)
        socket = nil
        tearDownAudio()
        phase = .failed(why)
    }

    // MARK: - audio

    private func startAudio(roles: ListenSession.Roles) throws {
        let s = AVAudioSession.sharedInstance()
        try s.setCategory(.playback, mode: .spokenAudio)
        try s.setActive(true)
        for (i, p) in players.enumerated() {
            engine.attach(p)
            engine.connect(p, to: engine.mainMixerNode, format: format)
            // rep a little to the left, client a little to the right (both clear on the phone's speaker)
            let role = i == 0 ? roles.inbound : roles.outbound
            p.pan = role == "rep" ? -0.35 : 0.35
        }
        try engine.start()
        for p in players { p.play() }
    }

    private func tearDownAudio() {
        for p in players { p.stop() }
        if engine.isRunning { engine.stop() }
        queued = [0, 0]
        repLevel = 0
        clientLevel = 0
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    /// One relay frame: [track id][μ-law bytes], 20 ms of 8 kHz audio for one side.
    private func play(_ d: Data) {
        guard d.count > 1, engine.isRunning else { return }
        if phase == .waiting { phase = .live }
        let track = Int(d[d.startIndex])
        guard track == 0 || track == 1 else { return }
        // more than half a second waiting means we've fallen behind: drop this frame instead of growing the delay
        if queued[track] > 25 { return }
        let n = d.count - 1
        guard let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(n)), let out = buf.floatChannelData?[0] else { return }
        buf.frameLength = AVAudioFrameCount(n)
        var sum: Float = 0
        d.withUnsafeBytes { raw in
            let bytes = raw.bindMemory(to: UInt8.self)
            for i in 0..<n {
                let v = Self.mulaw[Int(bytes[i + 1])]
                out[i] = v
                sum += v * v
            }
        }
        let level = min(1, (sum / Float(n)).squareRoot() * 3)
        let isRep = (track == 0 ? session?.roles.inbound : session?.roles.outbound) == "rep"
        if isRep { repLevel = repLevel * 0.6 + level * 0.4 } else { clientLevel = clientLevel * 0.6 + level * 0.4 }
        queued[track] += 1
        players[track].scheduleBuffer(buf) { [weak self] in
            Task { @MainActor in self?.queued[track] = max(0, (self?.queued[track] ?? 1) - 1) }
        }
    }

    /// G.711 μ-law → linear, as Float in -1…1
    private static let mulaw: [Float] = (0..<256).map { i in
        let u = ~UInt8(i)
        let sign = u & 0x80, exp = Int((u >> 4) & 7), mant = Int(u & 0x0f)
        let s = (((mant << 3) + 0x84) << exp) - 0x84
        return Float(sign != 0 ? -s : s) / 32768
    }
}

/// The listening screen: who's on the call, a level meter per side, Stop, and short notes to the rep.
struct ListenSheet: View {
    let call: LiveCall
    @Environment(\.dismiss) private var dismiss
    @Environment(Toasts.self) private var toasts
    @State private var listener: CallListener
    @State private var note = ""
    @State private var sent: [String] = []
    @State private var sending = false

    init(call: LiveCall) {
        self.call = call
        _listener = State(initialValue: CallListener(callId: call.callId))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 22) {
                VStack(spacing: 6) {
                    Image(systemName: "ear.fill").font(.system(size: 30)).foregroundStyle(Theme.green)
                    Text(call.rep.name).font(.title3.weight(.semibold)).foregroundStyle(Theme.text)
                    Text("with \(call.contact)").font(.subheadline).foregroundStyle(Theme.muted)
                    Text(status).font(.footnote.weight(.semibold)).foregroundStyle(statusColor).padding(.top, 2)
                }
                .padding(.top, 8)

                VStack(spacing: 12) {
                    meter(label: call.rep.name, level: listener.repLevel)
                    meter(label: call.contact, level: listener.clientLevel)
                }
                .padding(.horizontal, 4)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Note to \(call.rep.name)").font(.caption.weight(.semibold)).foregroundStyle(Theme.muted)
                    HStack(spacing: 8) {
                        TextField("Ask about their budget", text: $note, axis: .vertical)
                            .lineLimit(1...3)
                            .padding(10)
                            .background(Theme.card, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        Button { send() } label: {
                            Image(systemName: "paperplane.fill").font(.body.weight(.semibold)).foregroundStyle(.white)
                                .frame(width: 44, height: 44).background(Theme.accent, in: Circle())
                        }
                        .disabled(sending || note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || listener.phase == .ended)
                        .accessibilityLabel("Send the note")
                    }
                    Text("Pops up on their call screen. The client never sees it.").font(.caption2).foregroundStyle(Theme.muted)
                    ForEach(Array(sent.enumerated()), id: \.offset) { _, s in
                        Label(s, systemImage: "checkmark").font(.footnote).foregroundStyle(Theme.muted)
                    }
                }

                Spacer()

                Button {
                    listener.stop()
                    dismiss()
                } label: {
                    Text(listener.phase == .ended ? "Close" : "Stop listening")
                        .font(.headline).foregroundStyle(.white)
                        .frame(maxWidth: .infinity, minHeight: 52)
                        .background(Theme.red, in: Capsule())
                }
            }
            .padding(20)
            .screenBackground()
            .navigationTitle("Listening")
            .navigationBarTitleDisplayMode(.inline)
            .toastHost()
        }
        .interactiveDismissDisabled(listener.phase == .live || listener.phase == .waiting)
        .task { await listener.start() }
        .onDisappear { listener.stop() }
    }

    private var status: String {
        switch listener.phase {
        case .starting: return "Connecting…"
        case .waiting: return "Waiting for the audio…"
        case .live: return "Live · only you can hear this"
        case .ended: return "The call ended"
        case .failed(let why): return why
        }
    }

    private var statusColor: Color {
        switch listener.phase {
        case .live: return Theme.green
        case .failed: return Theme.red
        default: return Theme.muted
        }
    }

    private func meter(label: String, level: Float) -> some View {
        HStack(spacing: 10) {
            Text(label).font(.footnote).foregroundStyle(Theme.text).frame(width: 110, alignment: .leading).lineLimit(1)
            GeometryReader { g in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.card)
                    Capsule().fill(Theme.green).frame(width: max(4, g.size.width * CGFloat(level)))
                }
            }
            .frame(height: 8)
            .animation(.linear(duration: 0.1), value: level)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(label) audio level")
    }

    private func send() {
        let text = note.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        sending = true
        Task {
            do {
                let _: Anything? = try await API.shared.act("sendCallNote", call.callId, text)
                sent.append(text)
                note = ""
            } catch {
                toasts.show(error.localizedDescription, tone: .warn)
            }
            sending = false
        }
    }
}
