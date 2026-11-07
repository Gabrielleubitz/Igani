import AVFoundation
import Foundation
import Observation
import SwiftUI

/// What the phone engine tells the app.
enum VoiceEvent {
    case ringing(UUID)
    case connected(UUID)
    case reconnecting(UUID, Bool)
    /// the call is over: answered says whether anyone picked up
    case ended(UUID, failure: String?)
    /// someone is calling this line (callId from the CRM's incoming webhook)
    case incoming(UUID, callId: String, from: String)
    /// the caller hung up (or another device answered) before we did
    case incomingGone(UUID)
    /// we answered from the system call screen (lock screen, CallKit)
    case answered(UUID)
}

/// The engine that carries the audio: Twilio's Voice SDK with CallKit in real use, or a demo engine that walks a call
/// through the same states while developing without Twilio (the website's dialer does the same).
@MainActor protocol VoiceEngine: AnyObject {
    var onEvent: ((VoiceEvent) -> Void)? { get set }
    func start(uuid: UUID, callId: String, to: String, name: String) throws
    func answer(uuid: UUID)
    func end(uuid: UUID)
    func setMuted(_ on: Bool, uuid: UUID)
    func setHeld(_ on: Bool, uuid: UUID)
    func setSpeaker(_ on: Bool)
    func digits(_ d: String, uuid: UUID)
    /// update the system call screen with the caller's name once the CRM knows it
    func named(_ name: String, uuid: UUID)
}

/// The app's phone: one call at a time, from the user's own Igani number. Every call is a row in the CRM (startCall),
/// rings through Twilio, and ends with a wrap-up that lands on the contact's timeline, exactly like the website's dialer.
@MainActor @Observable final class Phone {
    static let shared = Phone()

    enum Setup: Equatable { case unknown, checking, ready(line: String?, push: Bool), demo, unavailable(String) }
    enum Status: Equatable { case connecting, ringing, incoming, live, reconnecting, ended }

    struct ActiveCall: Identifiable, Equatable {
        let id: UUID
        var callId: String
        var direction: String
        var name: String
        var sub: String?
        var number: String
        var leadId: String?
        var prospect: StartedCall.Prospect?
        var status: Status
        var connectedAt: Date?
        var muted = false
        var held = false
        var speaker = false
        var record = false
        var failure: String?
        var digits = ""
    }

    /// After a call: what happened (saved on the call and the contact).
    struct WrapUp: Identifiable, Equatable {
        var id: String { callId }
        let callId: String
        let name: String
        let number: String
        let direction: String
        let answered: Bool
        let seconds: Int
        let leadId: String?
        let prospect: Bool
        let known: Bool
        let suggested: Outcome
    }

    var setup: Setup = .unknown
    var active: ActiveCall?
    var wrapUp: WrapUp?
    /// the full-screen call view is showing (it can be minimised to a bar while browsing the CRM)
    var expanded = false
    private(set) var engine: VoiceEngine?
    private var token: String?
    private var tokenAt: Date?
    private var answeredFlag = false

    var isSeller: Bool { ["ADMIN", "SALES"].contains(API.shared.session?.me?.role ?? "") }
    var onCall: Bool { active != nil }

    // MARK: - Setup

    /// Gets a Twilio token for this user's line and starts listening for incoming calls. Safe to call often.
    func prepare(force: Bool = false) async {
        guard isSeller else { setup = .unavailable("Calling is for the sales team."); return }
        if !force, let at = tokenAt, Date().timeIntervalSince(at) < 40 * 60, engine != nil { return }
        if setup == .unknown { setup = .checking }
        do {
            #if DEBUG
            let sandbox = "1"
            #else
            let sandbox = "0"
            #endif
            let t: VoiceToken = try await API.shared.get("/api/mobile/v1/voice/token", query: [URLQueryItem(name: "sandbox", value: sandbox)])
            if t.demo {
                if !(engine is DemoEngine) { install(DemoEngine()) }
                setup = .demo
            } else if let tok = t.token {
                token = tok
                tokenAt = Date()
                if let tw = engine as? TwilioEngine { tw.updateToken(tok) } else { install(TwilioEngine(token: tok)) }
                setup = .ready(line: t.line, push: t.push)
            }
        } catch {
            setup = .unavailable(error.localizedDescription)
        }
    }

    func signedOut() {
        (engine as? TwilioEngine)?.unregister()
        engine = nil
        token = nil
        tokenAt = nil
        setup = .unknown
        active = nil
        wrapUp = nil
    }

    private func install(_ e: VoiceEngine) {
        engine = e
        e.onEvent = { [weak self] ev in self?.handle(ev) }
    }

    // MARK: - Calling

    /// Places a call: checks the line and number on the server (which creates the call row), then dials through Twilio.
    func call(_ number: String, leadId: String? = nil, prospectId: String? = nil, name: String? = nil) async throws {
        guard active == nil else { throw APIError(message: "You’re already on a call. Hang up first.", status: 0) }
        await prepare()
        guard let engine else { throw APIError(message: setupMessage ?? "Calling isn’t available right now.", status: 0) }
        try await Phone.askForMicrophone()
        var input: [String: Any] = ["to": number]
        if let leadId { input["leadId"] = leadId }
        if let prospectId { input["prospectId"] = prospectId }
        guard let s: StartedCall = try await API.shared.act("startCall", input) else { throw APIError(message: "The call couldn’t start.", status: 0) }
        let shown = s.prospect?.name ?? (s.lead.map { $0.name.hasPrefix("+") ? nil : $0.name } ?? nil) ?? name ?? s.display
        let uuid = UUID()
        answeredFlag = false
        active = ActiveCall(id: uuid, callId: s.callId, direction: "OUTBOUND", name: shown, sub: s.prospect?.askFor.map { "Ask for \($0)" } ?? s.lead?.company ?? (shown == s.display ? nil : s.display), number: s.display, leadId: s.lead?.id, prospect: s.prospect, status: .connecting, record: s.record)
        expanded = true
        do {
            try engine.start(uuid: uuid, callId: s.callId, to: s.to, name: shown)
        } catch {
            try? await API.shared.run("abandonCall", s.callId, "failed")
            active = nil
            throw error
        }
    }

    func hangUp() {
        guard let a = active else { return }
        engine?.end(uuid: a.id)
    }

    func answer() {
        guard let a = active, a.status == .incoming else { return }
        engine?.answer(uuid: a.id)
    }

    func toggleMute() {
        guard var a = active else { return }
        a.muted.toggle()
        active = a
        engine?.setMuted(a.muted, uuid: a.id)
    }

    func toggleHold() {
        guard var a = active, a.status == .live || a.held else { return }
        a.held.toggle()
        active = a
        engine?.setHeld(a.held, uuid: a.id)
    }

    func toggleSpeaker() {
        guard var a = active else { return }
        a.speaker.toggle()
        active = a
        engine?.setSpeaker(a.speaker)
    }

    func press(_ d: String) {
        guard var a = active, a.status == .live else { return }
        a.digits += d
        active = a
        engine?.digits(d, uuid: a.id)
    }

    #if DEBUG
    /// Demo mode only: a contact "calls" you, so the ringing flow can be tried without Twilio.
    func simulateIncoming() async {
        guard let demo = engine as? DemoEngine else { return }
        struct Sim: Decodable { let callId: String; let from: String }
        if let s: Sim = try? await API.shared.act("simulateIncomingCall") { demo.ring(callId: s.callId, from: s.from) }
    }
    #endif

    var setupMessage: String? {
        switch setup {
        case .unavailable(let m): return m
        case .checking, .unknown: return "Connecting to the phone service…"
        default: return nil
        }
    }

    // MARK: - Events

    private func handle(_ ev: VoiceEvent) {
        switch ev {
        case .ringing(let id):
            guard var a = active, a.id == id else { return }
            a.status = .ringing
            active = a
            if a.callId.isEmpty == false, engine is DemoEngine { Task { try? await API.shared.run("simulateCallProgress", ["callId": a.callId, "status": "RINGING"]) } }
        case .connected(let id), .answered(let id):
            guard var a = active, a.id == id else { return }
            if a.status != .live {
                a.status = .live
                a.connectedAt = a.connectedAt ?? Date()
                answeredFlag = true
                active = a
                if case .answered = ev { expanded = true }
                if engine is DemoEngine { Task { try? await API.shared.run("simulateCallProgress", ["callId": a.callId, "status": "IN_PROGRESS"]) } }
            }
        case .reconnecting(let id, let on):
            guard var a = active, a.id == id else { return }
            a.status = on ? .reconnecting : .live
            active = a
        case .incoming(let id, let callId, let from):
            guard active == nil else { engine?.end(uuid: id); return }
            answeredFlag = false
            active = ActiveCall(id: id, callId: callId, direction: "INBOUND", name: from, sub: "Calling your Igani line", number: from, status: .incoming)
            expanded = true
            Task { await identify(callId: callId, uuid: id) }
        case .incomingGone(let id):
            guard let a = active, a.id == id else { return }
            if engine is DemoEngine { Task { try? await API.shared.run("simulateCallProgress", ["callId": a.callId, "status": "NO_ANSWER"]) } }
            active = nil
            expanded = false
            ToastCenter.shared?.show("Missed call from \(a.name)", tone: .warn)
        case .ended(let id, let failure):
            guard let a = active, a.id == id else { return }
            let seconds = a.connectedAt.map { Int(Date().timeIntervalSince($0)) } ?? 0
            let demo = engine is DemoEngine
            if !answeredFlag, a.direction == "OUTBOUND", a.status == .connecting {
                Task { try? await API.shared.run("abandonCall", a.callId, failure == nil ? "canceled" : "failed") }
            }
            if demo { Task { try? await API.shared.run("simulateCallProgress", ["callId": a.callId, "status": answeredFlag ? "COMPLETED" : (a.direction == "INBOUND" ? "NO_ANSWER" : "CANCELED")]) } }
            var ended = a
            ended.status = .ended
            ended.failure = failure
            active = ended
            Task {
                try? await Task.sleep(for: .seconds(failure == nil ? 0.9 : 2.4))
                guard self.active?.id == id else { return }
                self.active = nil
                self.expanded = false
                // an incoming call nobody answered goes to voicemail: no wrap-up
                if a.direction == "INBOUND" && !self.answeredFlag { return }
                let busy = failure?.localizedCaseInsensitiveContains("busy") == true
                self.wrapUp = WrapUp(callId: a.callId, name: a.name, number: a.number, direction: a.direction, answered: self.answeredFlag, seconds: seconds, leadId: a.leadId, prospect: a.prospect != nil, known: a.name != a.number, suggested: self.answeredFlag ? .connected : (busy ? .busy : .no_answer))
            }
        }
    }

    /// Who is calling: the contact the CRM matched, else what the CRM (or Google) knows about the number.
    private func identify(callId: String, uuid: UUID) async {
        guard let who: IncomingCaller = try? await API.shared.act("lookupIncoming", callId) else { return }
        guard var a = active, a.id == uuid else { return }
        let name = who.lead.flatMap { $0.name.hasPrefix("+") || $0.name == "Unnamed contact" ? nil : $0.name } ?? who.id?.title ?? who.display
        a.name = name
        a.number = who.display
        a.leadId = who.lead?.id
        a.sub = who.lead?.company ?? who.id?.subtitle ?? (name == who.display ? "Calling your Igani line" : who.display)
        active = a
        engine?.named(name, uuid: uuid)
    }

    static func askForMicrophone() async throws {
        let ok = await AVAudioApplication.requestRecordPermission()
        if !ok { throw APIError(message: "Igani CRM needs the microphone for calls. Turn it on in Settings → Igani CRM.", status: 0) }
    }
}

/// Lets non-view code show a toast.
@MainActor enum ToastCenter {
    static weak var shared: Toasts?
}

// MARK: - Demo engine

/// Development without Twilio: rings for a moment, then "answers". Numbers ending in 0000 never answer, numbers ending in
/// 1111 are busy (the website's demo rules), so the wrap-up suggestions can be tried too.
@MainActor final class DemoEngine: VoiceEngine {
    var onEvent: ((VoiceEvent) -> Void)?
    private var tasks: [UUID: Task<Void, Never>] = [:]
    private var live: Set<UUID> = []
    private var ringer: AVAudioPlayer?

    func start(uuid: UUID, callId: String, to: String, name: String) throws {
        tasks[uuid] = Task { [weak self] in
            try? await Task.sleep(for: .seconds(0.7))
            guard !Task.isCancelled else { return }
            self?.onEvent?(.ringing(uuid))
            try? await Task.sleep(for: .seconds(2.6))
            guard !Task.isCancelled else { return }
            if to.hasSuffix("1111") { self?.onEvent?(.ended(uuid, failure: "The line is busy.")); return }
            if to.hasSuffix("0000") {
                try? await Task.sleep(for: .seconds(9))
                guard !Task.isCancelled else { return }
                self?.onEvent?(.ended(uuid, failure: nil))
                return
            }
            self?.live.insert(uuid)
            self?.onEvent?(.connected(uuid))
        }
    }

    func ring(callId: String, from: String) {
        let uuid = UUID()
        onEvent?(.incoming(uuid, callId: callId, from: from))
        if let url = Bundle.main.url(forResource: "igani-ring", withExtension: "wav") {
            ringer = try? AVAudioPlayer(contentsOf: url)
            ringer?.numberOfLoops = -1
            ringer?.play()
        }
        tasks[uuid] = Task { [weak self] in
            try? await Task.sleep(for: .seconds(20))
            guard !Task.isCancelled else { return }
            self?.ringer?.stop()
            self?.onEvent?(.incomingGone(uuid))
        }
    }

    func answer(uuid: UUID) {
        ringer?.stop()
        tasks[uuid]?.cancel()
        live.insert(uuid)
        onEvent?(.answered(uuid))
    }

    func end(uuid: UUID) {
        ringer?.stop()
        tasks[uuid]?.cancel()
        tasks[uuid] = nil
        live.remove(uuid)
        onEvent?(.ended(uuid, failure: nil))
    }

    func setMuted(_ on: Bool, uuid: UUID) {}
    func setHeld(_ on: Bool, uuid: UUID) {}
    func setSpeaker(_ on: Bool) {}
    func digits(_ d: String, uuid: UUID) {}
    func named(_ name: String, uuid: UUID) {}
}
