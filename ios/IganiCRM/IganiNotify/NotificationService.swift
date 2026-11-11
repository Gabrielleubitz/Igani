import Intents
import UIKit
import UserNotifications

/// Makes chat and text notifications look like Messages: the sender's photo (or their initials on a colour) in place
/// of the app icon, with the app's icon as a small badge. Everything else passes through unchanged.
final class NotificationService: UNNotificationServiceExtension {
    private var handler: ((UNNotificationContent) -> Void)?
    private var original: UNNotificationContent?
    private let lock = NSLock()

    /// iOS must get exactly one answer: whichever comes first, the finished notification or the time-out.
    private func finish(_ content: UNNotificationContent) {
        lock.lock()
        let h = handler
        handler = nil
        lock.unlock()
        h?(content)
    }

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        handler = contentHandler
        original = request.content
        let info = request.content.userInfo
        let type = info["type"] as? String
        guard type == "chat" || type == "sms" else { return finish(request.content) }

        let name = (type == "chat" ? info["senderName"] as? String : info["name"] as? String) ?? request.content.title
        let key = (type == "chat" ? info["senderId"] as? String : info["number"] as? String) ?? name
        let photoURL = (info["senderPhoto"] as? String).flatMap(URL.init(string:))

        Task {
            var imageData: Data?
            // a slow photo mustn't hold the notification back: give up after a few seconds and use initials
            if let photoURL, photoURL.scheme == "https" {
                var req = URLRequest(url: photoURL)
                req.timeoutInterval = 6
                if let (d, r) = try? await URLSession.shared.data(for: req), (r as? HTTPURLResponse)?.statusCode == 200, UIImage(data: d) != nil { imageData = d }
            }
            let image = INImage(imageData: imageData ?? Self.initials(name, seed: key))
            let sender = INPerson(personHandle: INPersonHandle(value: key, type: type == "sms" ? .phoneNumber : .unknown), nameComponents: nil, displayName: name, image: image, contactIdentifier: nil, customIdentifier: key)
            let channel = info["channel"] as? String
            let intent = INSendMessageIntent(
                recipients: channel != nil ? [INPerson(personHandle: INPersonHandle(value: "me", type: .unknown), nameComponents: nil, displayName: "You", image: nil, contactIdentifier: nil, customIdentifier: "me", isMe: true)] : nil,
                outgoingMessageType: .outgoingMessageText,
                content: request.content.body,
                speakableGroupName: channel.map { INSpeakableString(spokenPhrase: "#\($0)") },
                conversationIdentifier: (info["channelId"] as? String) ?? (info["number"] as? String) ?? key,
                serviceName: "Igani",
                sender: sender,
                attachments: nil
            )
            if channel != nil { intent.setImage(image, forParameterNamed: \.speakableGroupName) }
            let interaction = INInteraction(intent: intent, response: nil)
            interaction.direction = .incoming
            try? await interaction.donate()
            if let updated = try? request.content.updating(from: intent) {
                finish(updated)
            } else {
                finish(request.content)
            }
        }
    }

    override func serviceExtensionTimeWillExpire() {
        if let original { finish(original) }
    }

    /// Initials on the same colours the app uses for avatars.
    static func initials(_ name: String, seed: String) -> Data {
        let palette: [(UIColor, UIColor)] = [
            (UIColor(red: 0.36, green: 0.58, blue: 0.94, alpha: 1), UIColor(red: 0.23, green: 0.40, blue: 0.84, alpha: 1)),
            (UIColor(red: 0.55, green: 0.42, blue: 0.94, alpha: 1), UIColor(red: 0.39, green: 0.27, blue: 0.82, alpha: 1)),
            (UIColor(red: 0.20, green: 0.74, blue: 0.62, alpha: 1), UIColor(red: 0.10, green: 0.55, blue: 0.47, alpha: 1)),
            (UIColor(red: 0.96, green: 0.56, blue: 0.36, alpha: 1), UIColor(red: 0.86, green: 0.36, blue: 0.27, alpha: 1)),
            (UIColor(red: 0.93, green: 0.40, blue: 0.62, alpha: 1), UIColor(red: 0.78, green: 0.24, blue: 0.47, alpha: 1)),
        ]
        // magnitude, not abs(): the wrapping hash can land on Int.min, where abs() traps
        let (a, b) = palette[Int(seed.unicodeScalars.reduce(0) { $0 &* 31 &+ Int($1.value) }.magnitude % UInt(palette.count))]
        let letters = name.split(whereSeparator: { $0 == " " || $0 == "@" || $0 == "." }).prefix(2).compactMap { $0.first.map { String($0).uppercased() } }.joined()
        let size = CGSize(width: 180, height: 180)
        let img = UIGraphicsImageRenderer(size: size).image { ctx in
            let cg = ctx.cgContext
            let colors = [a.cgColor, b.cgColor] as CFArray
            if let g = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors, locations: [0, 1]) {
                cg.drawLinearGradient(g, start: .zero, end: CGPoint(x: size.width, y: size.height), options: [])
            }
            let text = (letters.isEmpty ? "#" : letters) as NSString
            let attrs: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: 72, weight: .semibold).rounded, .foregroundColor: UIColor.white]
            let t = text.size(withAttributes: attrs)
            text.draw(at: CGPoint(x: (size.width - t.width) / 2, y: (size.height - t.height) / 2), withAttributes: attrs)
        }
        return img.pngData() ?? Data()
    }
}

private extension UIFont {
    var rounded: UIFont { fontDescriptor.withDesign(.rounded).map { UIFont(descriptor: $0, size: pointSize) } ?? self }
}
