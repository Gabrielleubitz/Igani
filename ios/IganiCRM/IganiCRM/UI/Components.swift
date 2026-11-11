import SwiftUI

// MARK: - Surfaces

struct CardModifier: ViewModifier {
    var padding: CGFloat = 16
    func body(content: Content) -> some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).strokeBorder(Theme.line))
    }
}

extension View {
    func card(padding: CGFloat = 16) -> some View { modifier(CardModifier(padding: padding)) }

    /// Liquid Glass on iOS 26, a soft material before that.
    @ViewBuilder func glass(in shape: some Shape = Capsule(), interactive: Bool = false) -> some View {
        if #available(iOS 26.0, *) {
            self.glassEffect(interactive ? .regular.interactive() : .regular, in: shape)
        } else {
            self.background(.ultraThinMaterial, in: shape)
        }
    }

    func screenBackground() -> some View {
        background {
            ZStack {
                Theme.bg
                RadialGradient(colors: [Theme.blue.opacity(0.22), .clear], center: .topTrailing, startRadius: 10, endRadius: 420)
                RadialGradient(colors: [Theme.violet.opacity(0.10), .clear], center: .bottomLeading, startRadius: 10, endRadius: 380)
            }
            .ignoresSafeArea()
        }
    }
}

/// Buttons that sink a little when pressed.
struct PressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .opacity(configuration.isPressed ? 0.85 : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

/// The main call to action: Igani blue capsule.
struct PrimaryButton: View {
    let title: String
    var icon: String? = nil
    var busy = false
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if busy { ProgressView().tint(Color(hex: 0x062E6F)) } else if let icon { Image(systemName: icon) }
                Text(title).fontWeight(.semibold)
            }
            .font(.callout)
            .foregroundStyle(Color(hex: 0x062E6F))
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Theme.accent, in: Capsule())
            .shadow(color: Theme.accent.opacity(0.25), radius: 14, y: 6)
        }
        .buttonStyle(PressStyle())
        .disabled(busy)
    }
}

// MARK: - Bits

struct StagePill: View {
    let status: String
    let label: String
    var body: some View {
        HStack(spacing: 5) {
            Circle().fill(Theme.stage(status)).frame(width: 6, height: 6)
            Text(label).lineLimit(1)
        }
        .font(.caption.weight(.semibold))
        .foregroundStyle(Theme.stage(status))
        .padding(.horizontal, 9)
        .padding(.vertical, 4)
        .background(Theme.stage(status).opacity(0.14), in: Capsule())
    }
}

struct Avatar: View {
    let name: String
    var url: String? = nil
    var size: CGFloat = 40
    var initials: String {
        let parts = name.split(whereSeparator: { $0 == " " || $0 == "@" || $0 == "." }).prefix(2)
        return parts.compactMap { $0.first.map { String($0).uppercased() } }.joined()
    }
    var body: some View {
        ZStack {
            Circle().fill(Theme.gradient(for: name))
            if name.first.map({ $0 == "+" || $0.isNumber }) == true || initials.isEmpty {
                Image(systemName: "person.fill").font(.system(size: size * 0.42, weight: .semibold)).foregroundStyle(.white.opacity(0.92))
            } else {
                Text(initials).font(.system(size: size * 0.36, weight: .semibold, design: .rounded)).foregroundStyle(.white)
            }
            if let url, let u = URL(string: url) {
                AsyncImage(url: u) { img in img.resizable().scaledToFill() } placeholder: { Color.clear }
                    .clipShape(Circle())
            }
        }
        .frame(width: size, height: size)
        .overlay(Circle().strokeBorder(.white.opacity(0.08)))
    }
}

/// A number that rolls when it changes.
struct StatTile: View {
    let title: String
    let value: Int
    let icon: String
    var tint: Color = Theme.accent
    var badge: String? = nil
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: icon)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(tint)
                    .frame(width: 30, height: 30)
                    .background(tint.opacity(0.15), in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                Spacer()
                if let badge {
                    Text(badge).font(.caption2.weight(.bold)).foregroundStyle(Theme.red).padding(.horizontal, 7).padding(.vertical, 3).background(Theme.red.opacity(0.15), in: Capsule())
                }
            }
            Text("\(value)")
                .font(.system(size: 30, weight: .bold, design: .rounded))
                .foregroundStyle(Theme.text)
                .contentTransition(.numericText(value: Double(value)))
                .animation(.snappy, value: value)
            Text(title).font(.footnote).foregroundStyle(Theme.muted).lineLimit(1)
        }
        .padding(14)
        .frame(width: 150, alignment: .leading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Theme.line))
    }
}

struct SectionTitle: View {
    let title: String
    var trailing: String? = nil
    var action: (() -> Void)? = nil
    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title).font(.title3.weight(.bold)).foregroundStyle(Theme.text)
            Spacer()
            if let trailing, let action {
                Button(trailing, action: action).font(.subheadline.weight(.medium)).foregroundStyle(Theme.accent)
            }
        }
        .padding(.horizontal, 4)
    }
}

struct EmptyHint: View {
    let icon: String
    let title: String
    let message: String
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: icon).font(.system(size: 30, weight: .medium)).foregroundStyle(Theme.accent)
                .frame(width: 64, height: 64).background(Theme.accent.opacity(0.1), in: Circle())
            Text(title).font(.headline).foregroundStyle(Theme.text)
            Text(message).font(.subheadline).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
        }
        .padding(28)
        .frame(maxWidth: .infinity)
    }
}

/// Placeholder rows that shimmer while data loads.
struct SkeletonRows: View {
    var count = 6
    @State private var phase: CGFloat = -1
    var body: some View {
        VStack(spacing: 12) {
            ForEach(0..<count, id: \.self) { _ in
                HStack(spacing: 12) {
                    Circle().frame(width: 42, height: 42)
                    VStack(alignment: .leading, spacing: 8) {
                        RoundedRectangle(cornerRadius: 5).frame(width: 170, height: 12)
                        RoundedRectangle(cornerRadius: 5).frame(width: 110, height: 10)
                    }
                    Spacer()
                }
                .foregroundStyle(Theme.raised)
            }
        }
        .overlay {
            GeometryReader { g in
                LinearGradient(colors: [.clear, .white.opacity(0.07), .clear], startPoint: .leading, endPoint: .trailing)
                    .frame(width: g.size.width * 0.6)
                    .offset(x: phase * g.size.width)
            }
            .mask { VStack(spacing: 12) { ForEach(0..<count, id: \.self) { _ in RoundedRectangle(cornerRadius: 8).frame(height: 42) } } }
        }
        .padding()
        .onAppear { withAnimation(.linear(duration: 1.3).repeatForever(autoreverses: false)) { phase = 1.4 } }
    }
}

// MARK: - Toasts

@MainActor @Observable final class Toasts {
    struct Item: Identifiable, Equatable { let id = UUID(); let text: String; let tone: Tone }
    enum Tone { case ok, warn }
    var current: Item?
    func show(_ text: String, tone: Tone = .ok) {
        let item = Item(text: text, tone: tone)
        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) { current = item }
        Task {
            try? await Task.sleep(for: .seconds(2.6))
            if current == item { withAnimation(.easeOut) { current = nil } }
        }
    }
}

struct ToastOverlay: View {
    @Environment(Toasts.self) private var toasts
    var body: some View {
        VStack {
            if let t = toasts.current {
                HStack(spacing: 10) {
                    Image(systemName: t.tone == .ok ? "checkmark.circle.fill" : "exclamationmark.triangle.fill").foregroundStyle(t.tone == .ok ? Theme.green : Theme.amber)
                    Text(t.text).font(.subheadline.weight(.medium)).foregroundStyle(Theme.text).lineLimit(3)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .glass(in: Capsule())
                .shadow(color: .black.opacity(0.35), radius: 18, y: 8)
                .padding(.horizontal, 20)
                .transition(.move(edge: .top).combined(with: .opacity))
            }
            Spacer()
        }
        .padding(.top, 6)
        .allowsHitTesting(false)
        .sensoryFeedback(.success, trigger: toasts.current?.id) { _, new in new != nil && toasts.current?.tone == .ok }
    }
}

extension View {
    /// Shows the app's toasts over this view. The root has one, but a sheet or full-screen cover sits above it, so put
    /// this on a sheet's content for its toasts to be seen.
    func toastHost() -> some View { overlay { ToastOverlay() } }
}

// MARK: - Dates

enum Fmt {
    static func relative(_ d: Date) -> String {
        let f = RelativeDateTimeFormatter()
        f.unitsStyle = .short
        return f.localizedString(for: d, relativeTo: .now)
    }
    static func time(_ d: Date) -> String { d.formatted(date: .omitted, time: .shortened) }
    static func day(_ d: Date) -> String {
        let cal = Calendar.current
        if cal.isDateInToday(d) { return "Today, \(time(d))" }
        if cal.isDateInTomorrow(d) { return "Tomorrow, \(time(d))" }
        if cal.isDateInYesterday(d) { return "Yesterday, \(time(d))" }
        return d.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day().hour().minute())
    }
    static func duration(_ sec: Int?) -> String {
        guard let s = sec, s > 0 else { return "—" }
        return s < 60 ? "\(s)s" : "\(s / 60)m \(s % 60)s"
    }
}
