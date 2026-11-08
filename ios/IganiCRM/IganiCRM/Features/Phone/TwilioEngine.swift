import AVFoundation
import CallKit
import Foundation
import PushKit
import TwilioVoice
import UIKit

/// Real calls: Twilio's Voice SDK, shown and controlled through CallKit (the iPhone's own call screen, lock screen,
/// Bluetooth and CarPlay, the green call pill). Incoming calls arrive as VoIP pushes, so the phone rings even when the
/// app is closed; that needs a Twilio push credential for the app (the server says whether one is set up).
@MainActor final class TwilioEngine: NSObject, VoiceEngine {
    var onEvent: ((VoiceEvent) -> Void)?

    private var token: String
    private let provider: CXProvider
    private let controller = CXCallController()
    private let audio = DefaultAudioDevice()
    private let registry = PKPushRegistry(queue: .main)
    private var pushToken: Data?
    private var registeredToken: String?

    /// calls by CallKit uuid: a dialled or answered call, or an invite still ringing
    private var calls: [UUID: Call] = [:]
    private var invites: [UUID: CallInvite] = [:]
    private var pending: [UUID: (callId: String, to: String)] = [:]
    /// calls that are an admin listening in (joined muted with the listen parameter)
    private var listening: Set<UUID> = []
    /// conference calls: tell CallKit "connected" only once the client answers
    private var late: Set<UUID> = []
    private var answered: Set<UUID> = []
    private var speakerOn = false

    init(token: String) {
        self.token = token
        let config = CXProviderConfiguration()
        config.supportsVideo = false
        config.maximumCallGroups = 1
        config.maximumCallsPerCallGroup = 1
        config.supportedHandleTypes = [.phoneNumber, .generic]
        config.iconTemplateImageData = UIImage(named: "CallKitMark")?.pngData()
        config.ringtoneSound = "igani-ring.wav"
        config.includesCallsInRecents = true
        provider = CXProvider(configuration: config)
        super.init()
        TwilioVoiceSDK.audioDevice = audio
        provider.setDelegate(self, queue: nil)
        registry.delegate = self
        registry.desiredPushTypes = [.voIP]
    }

    func updateToken(_ t: String) {
        token = t
        registerForIncoming()
    }

    /// Signed out: this phone stops ringing for that line.
    func unregister() {
        guard let pushToken, let registeredToken else { return }
        TwilioVoiceSDK.unregister(accessToken: registeredToken, deviceToken: pushToken) { _ in }
        self.registeredToken = nil
    }

    private func registerForIncoming() {
        guard let pushToken else { return }
        let t = token
        TwilioVoiceSDK.register(accessToken: t, deviceToken: pushToken) { [weak self] error in
            MainActor.assumeIsolated {
                if let error { print("[phone] incoming calls not registered:", error.localizedDescription) } else { self?.registeredToken = t }
            }
        }
    }

    // MARK: VoiceEngine

    func start(uuid: UUID, callId: String, to: String, name: String) throws {
        pending[uuid] = (callId, to)
        let handle = CXHandle(type: .phoneNumber, value: to)
        let action = CXStartCallAction(call: uuid, handle: handle)
        action.contactIdentifier = name
        controller.request(CXTransaction(action: action)) { [weak self] error in
            guard let error else { return }
            MainActor.assumeIsolated {
                self?.pending[uuid] = nil
                self?.onEvent?(.ended(uuid, failure: "The call couldn’t start: \(error.localizedDescription)"))
            }
        }
    }

    func startListening(uuid: UUID, callId: String, name: String) throws {
        pending[uuid] = (callId, "")
        listening.insert(uuid)
        let action = CXStartCallAction(call: uuid, handle: CXHandle(type: .generic, value: name))
        action.contactIdentifier = name
        controller.request(CXTransaction(action: action)) { [weak self] error in
            guard let error else { return }
            MainActor.assumeIsolated {
                self?.pending[uuid] = nil
                self?.listening.remove(uuid)
                self?.onEvent?(.ended(uuid, failure: "Couldn’t listen in: \(error.localizedDescription)"))
            }
        }
    }

    func expectLateAnswer(_ uuid: UUID) { late.insert(uuid) }

    func answeredLate(_ uuid: UUID) {
        guard late.remove(uuid) != nil else { return }
        provider.reportOutgoingCall(with: uuid, connectedAt: Date())
    }

    func answer(uuid: UUID) {
        controller.request(CXTransaction(action: CXAnswerCallAction(call: uuid))) { _ in }
    }

    func end(uuid: UUID) {
        controller.request(CXTransaction(action: CXEndCallAction(call: uuid))) { [weak self] error in
            guard error != nil else { return }
            // CallKit no longer knows the call: end it directly
            MainActor.assumeIsolated {
                self?.calls[uuid]?.disconnect()
                self?.invites[uuid]?.reject()
                self?.finish(uuid, failure: nil)
            }
        }
    }

    func setMuted(_ on: Bool, uuid: UUID) {
        controller.request(CXTransaction(action: CXSetMutedCallAction(call: uuid, muted: on))) { _ in }
    }

    func setHeld(_ on: Bool, uuid: UUID) {
        controller.request(CXTransaction(action: CXSetHeldCallAction(call: uuid, onHold: on))) { _ in }
    }

    func setSpeaker(_ on: Bool) {
        speakerOn = on
        applyRoute()
    }

    func digits(_ d: String, uuid: UUID) {
        calls[uuid]?.sendDigits(d)
    }

    func named(_ name: String, uuid: UUID) {
        let update = CXCallUpdate()
        update.localizedCallerName = name
        provider.reportCall(with: uuid, updated: update)
    }

    private func applyRoute() {
        let speaker = speakerOn
        audio.block = {
            DefaultAudioDevice.DefaultAVAudioSessionConfigurationBlock()
            try? AVAudioSession.sharedInstance().overrideOutputAudioPort(speaker ? .speaker : .none)
        }
        audio.block()
    }

    private func finish(_ uuid: UUID, failure: String?) {
        let known = calls[uuid] != nil || invites[uuid] != nil || pending[uuid] != nil
        calls[uuid] = nil
        invites[uuid] = nil
        pending[uuid] = nil
        listening.remove(uuid)
        late.remove(uuid)
        answered.remove(uuid)
        speakerOn = false
        if known { onEvent?(.ended(uuid, failure: failure)) }
    }

    static func words(_ error: Error) -> String {
        let code = (error as NSError).code
        switch code {
        case 31208, 31401, 31402: return "The microphone is off for Igani CRM. Turn it on in Settings → Igani CRM."
        case 31005, 31009, 53000, 53405: return "The connection to the phone service dropped. Check your internet and try again."
        case 20101, 20104, 31204, 31205: return "Your phone session expired. Try the call again."
        case 31486: return "The line is busy."
        default: return "The call failed: \(error.localizedDescription)"
        }
    }
}

// MARK: - CallKit

extension TwilioEngine: CXProviderDelegate {
    nonisolated func providerDidReset(_ provider: CXProvider) {
        MainActor.assumeIsolated {
            audio.isEnabled = false
            for (uuid, call) in calls {
                call.disconnect()
                finish(uuid, failure: nil)
            }
        }
    }

    nonisolated func provider(_ provider: CXProvider, perform action: CXStartCallAction) {
        MainActor.assumeIsolated {
            guard let p = pending[action.callUUID] else { action.fail(); return }
            provider.reportOutgoingCall(with: action.callUUID, startedConnectingAt: Date())
            audio.isEnabled = false
            let listen = listening.contains(action.callUUID)
            let options = ConnectOptions(accessToken: token) { b in
                b.params = listen ? ["listen": p.callId] : ["callId": p.callId, "To": p.to]
                b.uuid = action.callUUID
            }
            calls[action.callUUID] = TwilioVoiceSDK.connect(options: options, delegate: self)
            pending[action.callUUID] = nil
            action.fulfill()
        }
    }

    nonisolated func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
        MainActor.assumeIsolated {
            guard let invite = invites[action.callUUID] else { action.fail(); return }
            audio.isEnabled = false
            let options = AcceptOptions(callInvite: invite) { b in b.uuid = invite.uuid }
            calls[action.callUUID] = invite.accept(options: options, delegate: self)
            invites[action.callUUID] = nil
            answered.insert(action.callUUID)
            onEvent?(.answered(action.callUUID))
            action.fulfill()
        }
    }

    nonisolated func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
        MainActor.assumeIsolated {
            if let invite = invites[action.callUUID] {
                invite.reject() // the caller goes to voicemail
                invites[action.callUUID] = nil
                onEvent?(.incomingGone(action.callUUID))
            } else if let call = calls[action.callUUID] {
                call.disconnect()
            } else {
                finish(action.callUUID, failure: nil)
            }
            action.fulfill()
        }
    }

    nonisolated func provider(_ provider: CXProvider, perform action: CXSetHeldCallAction) {
        MainActor.assumeIsolated {
            calls[action.callUUID]?.isOnHold = action.isOnHold
            action.fulfill()
        }
    }

    nonisolated func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) {
        MainActor.assumeIsolated {
            calls[action.callUUID]?.isMuted = action.isMuted
            action.fulfill()
        }
    }

    nonisolated func provider(_ provider: CXProvider, perform action: CXPlayDTMFCallAction) {
        MainActor.assumeIsolated {
            calls[action.callUUID]?.sendDigits(action.digits)
            action.fulfill()
        }
    }

    nonisolated func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
        MainActor.assumeIsolated { audio.isEnabled = true }
    }

    nonisolated func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
        MainActor.assumeIsolated { audio.isEnabled = false }
    }
}

// MARK: - Twilio call events

extension TwilioEngine: CallDelegate {
    nonisolated func callDidStartRinging(call: Call) {
        MainActor.assumeIsolated {
            guard let uuid = call.uuid else { return }
            onEvent?(.ringing(uuid))
        }
    }

    nonisolated func callDidConnect(call: Call) {
        MainActor.assumeIsolated {
            guard let uuid = call.uuid else { return }
            if listening.contains(uuid) { call.isMuted = true } // the room mutes us too
            if !late.contains(uuid) { provider.reportOutgoingCall(with: uuid, connectedAt: Date()) }
            applyRoute()
            onEvent?(.connected(uuid))
        }
    }

    nonisolated func call(call: Call, isReconnectingWithError error: Error) {
        MainActor.assumeIsolated {
            guard let uuid = call.uuid else { return }
            onEvent?(.reconnecting(uuid, true))
        }
    }

    nonisolated func callDidReconnect(call: Call) {
        MainActor.assumeIsolated {
            guard let uuid = call.uuid else { return }
            onEvent?(.reconnecting(uuid, false))
        }
    }

    nonisolated func callDidFailToConnect(call: Call, error: Error) {
        MainActor.assumeIsolated {
            guard let uuid = call.uuid else { return }
            provider.reportCall(with: uuid, endedAt: Date(), reason: .failed)
            finish(uuid, failure: TwilioEngine.words(error))
        }
    }

    nonisolated func callDidDisconnect(call: Call, error: Error?) {
        MainActor.assumeIsolated {
            guard let uuid = call.uuid else { return }
            provider.reportCall(with: uuid, endedAt: Date(), reason: error == nil ? .remoteEnded : .failed)
            finish(uuid, failure: error.map(TwilioEngine.words))
        }
    }
}

// MARK: - Incoming calls (VoIP push)

extension TwilioEngine: NotificationDelegate {
    nonisolated func callInviteReceived(callInvite: CallInvite) {
        MainActor.assumeIsolated {
            let uuid = callInvite.uuid
            invites[uuid] = callInvite
            let from = (callInvite.from ?? "").replacingOccurrences(of: "client:", with: "")
            let update = CXCallUpdate()
            update.remoteHandle = CXHandle(type: .phoneNumber, value: from)
            update.localizedCallerName = from
            update.supportsDTMF = true
            update.supportsHolding = true
            update.supportsGrouping = false
            update.supportsUngrouping = false
            update.hasVideo = false
            provider.reportNewIncomingCall(with: uuid, update: update) { [weak self] error in
                MainActor.assumeIsolated {
                    if error != nil { self?.invites[uuid] = nil; callInvite.reject(); return }
                    self?.onEvent?(.incoming(uuid, callId: callInvite.customParameters?["callId"] ?? "", from: from))
                }
            }
        }
    }

    nonisolated func cancelledCallInviteReceived(cancelledCallInvite: CancelledCallInvite, error: Error) {
        MainActor.assumeIsolated {
            guard let (uuid, _) = invites.first(where: { $0.value.callSid == cancelledCallInvite.callSid }) else { return }
            invites[uuid] = nil
            provider.reportCall(with: uuid, endedAt: Date(), reason: .remoteEnded)
            onEvent?(.incomingGone(uuid))
        }
    }
}

extension TwilioEngine: PKPushRegistryDelegate {
    nonisolated func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
        MainActor.assumeIsolated {
            pushToken = pushCredentials.token
            registerForIncoming()
        }
    }

    nonisolated func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
        MainActor.assumeIsolated {
            unregister()
            pushToken = nil
        }
    }

    nonisolated func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
        MainActor.assumeIsolated {
            // iOS requires every VoIP push to show a call: Twilio's handler reports it to CallKit right away
            TwilioVoiceSDK.handleNotification(payload.dictionaryPayload, delegate: self, delegateQueue: nil)
            completion()
        }
    }
}
