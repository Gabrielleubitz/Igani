import SwiftUI

// Small interaction pieces used across the app (in the spirit of swiftpieces.com, written for Igani).

// MARK: - Glass segments

/// A segmented control whose selection is a sliding glass pill.
struct GlassSegments<T: Hashable>: View {
    let items: [(T, String, String?)]
    @Binding var selection: T
    var badge: (T) -> Int = { _ in 0 }
    @Namespace private var ns

    var body: some View {
        HStack(spacing: 2) {
            ForEach(items, id: \.0) { item in
                let on = item.0 == selection
                Button {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.82)) { selection = item.0 }
                } label: {
                    HStack(spacing: 6) {
                        if let icon = item.2 { Image(systemName: icon).font(.footnote.weight(.semibold)) }
                        Text(item.1).font(.subheadline.weight(on ? .semibold : .medium)).lineLimit(1)
                        if badge(item.0) > 0 {
                            Text("\(badge(item.0))").font(.caption2.weight(.bold)).foregroundStyle(.white)
                                .padding(.horizontal, 5).frame(minWidth: 17, minHeight: 17).background(Theme.red, in: Capsule())
                        }
                    }
                    .foregroundStyle(on ? Theme.text : Theme.muted)
                    .padding(.vertical, 9)
                    .frame(maxWidth: .infinity)
                    .background {
                        if on {
                            Capsule().fill(Theme.raised).overlay(Capsule().strokeBorder(.white.opacity(0.1)))
                                .shadow(color: .black.opacity(0.25), radius: 6, y: 2)
                                .matchedGeometryEffect(id: "pill", in: ns)
                        }
                    }
                    .contentShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .glass(in: Capsule())
        .sensoryFeedback(.selection, trigger: selection)
    }
}

// MARK: - Filter rail

/// A scrolling row of filter chips with counts.
struct FilterRail<T: Hashable>: View {
    let items: [(T, String, Int?)]
    @Binding var selection: T
    var tint: (T) -> Color = { _ in Theme.accent }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(items, id: \.0) { item in
                    let on = item.0 == selection
                    Button {
                        withAnimation(.snappy) { selection = item.0 }
                    } label: {
                        HStack(spacing: 6) {
                            Text(item.1)
                            if let n = item.2 {
                                Text("\(n)").monospacedDigit().foregroundStyle(on ? tint(item.0) : Theme.muted.opacity(0.8))
                                    .contentTransition(.numericText(value: Double(n)))
                            }
                        }
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(on ? Theme.text : Theme.muted)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(on ? tint(item.0).opacity(0.18) : Theme.card, in: Capsule())
                        .overlay(Capsule().strokeBorder(on ? tint(item.0).opacity(0.5) : Theme.line))
                    }
                    .buttonStyle(PressStyle())
                }
            }
            .padding(.horizontal, 16)
        }
        .sensoryFeedback(.selection, trigger: selection)
    }
}

// MARK: - Rings and numbers

/// A score out of 100 as a ring that fills when it appears.
struct ScoreRing: View {
    let score: Int
    var size: CGFloat = 64
    var line: CGFloat = 7
    var label: String? = nil
    @State private var shown: Double = 0

    static func tint(_ s: Int) -> Color { s >= 75 ? Theme.green : s >= 50 ? Theme.amber : Theme.red }

    var body: some View {
        ZStack {
            Circle().stroke(Theme.raised, lineWidth: line)
            Circle().trim(from: 0, to: shown / 100)
                .stroke(AngularGradient(colors: [ScoreRing.tint(score).opacity(0.6), ScoreRing.tint(score)], center: .center), style: StrokeStyle(lineWidth: line, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 0) {
                Text("\(Int(shown))").font(.system(size: size * 0.32, weight: .bold, design: .rounded)).foregroundStyle(Theme.text)
                    .contentTransition(.numericText(value: shown))
                if let label { Text(label).font(.system(size: size * 0.13, weight: .semibold)).foregroundStyle(Theme.muted) }
            }
        }
        .frame(width: size, height: size)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label ?? "Score")
        .accessibilityValue("\(score) out of 100")
        .onAppear { withAnimation(.spring(response: 1.1, dampingFraction: 0.85).delay(0.1)) { shown = Double(score) } }
        .onChange(of: score) { _, v in withAnimation(.snappy) { shown = Double(v) } }
    }
}

/// A big number with a label, that rolls when it changes.
struct LiveStat: View {
    let label: String
    let value: String
    var icon: String? = nil
    var tint: Color = Theme.accent
    var sub: String? = nil
    var subTint: Color = Theme.muted

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                if let icon { Image(systemName: icon).font(.caption.weight(.bold)).foregroundStyle(tint) }
                Text(label).font(.caption.weight(.medium)).foregroundStyle(Theme.muted).lineLimit(1)
            }
            Text(value).font(.system(size: 26, weight: .bold, design: .rounded)).foregroundStyle(Theme.text)
                .contentTransition(.numericText()).lineLimit(1).minimumScaleFactor(0.6)
            if let sub { Text(sub).font(.caption2.weight(.medium)).foregroundStyle(subTint).lineLimit(2) }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Theme.line))
    }
}

/// Two columns of LiveStat tiles.
struct StatGrid<Content: View>: View {
    @ViewBuilder let content: Content
    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) { content }
    }
}

/// A horizontal bar (funnels, breakdowns).
struct BarRow: View {
    let label: String
    let value: Int
    let max: Int
    var tint: Color = Theme.accent
    var trailing: String? = nil
    @State private var grow = false

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack {
                Text(label).font(.subheadline).foregroundStyle(Theme.text).lineLimit(1)
                Spacer()
                Text(trailing ?? "\(value)").font(.subheadline.weight(.semibold)).monospacedDigit().foregroundStyle(Theme.text)
            }
            GeometryReader { g in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.raised)
                    Capsule().fill(LinearGradient(colors: [tint.opacity(0.7), tint], startPoint: .leading, endPoint: .trailing))
                        .frame(width: grow && max > 0 ? Swift.max(6, g.size.width * CGFloat(value) / CGFloat(max)) : 6)
                }
            }
            .frame(height: 8)
        }
        .onAppear { withAnimation(.spring(response: 0.8, dampingFraction: 0.85).delay(0.05)) { grow = true } }
    }
}

// MARK: - Hold to confirm

/// For something that can't be undone: hold the button until the ring fills.
struct HoldToConfirm: View {
    let title: String
    var icon: String = "trash"
    var tint: Color = Theme.red
    var seconds: Double = 1.1
    let action: () -> Void
    @State private var progress: CGFloat = 0
    @State private var holding = false
    @State private var fired = 0

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
            Text(holding ? "Keep holding…" : title).fontWeight(.semibold)
        }
        .font(.callout)
        .foregroundStyle(tint)
        .frame(maxWidth: .infinity)
        .frame(height: 50)
        .background {
            GeometryReader { g in
                ZStack(alignment: .leading) {
                    Capsule().fill(tint.opacity(0.12))
                    Capsule().fill(tint.opacity(0.28)).frame(width: g.size.width * progress)
                }
            }
        }
        .clipShape(Capsule())
        .overlay(Capsule().strokeBorder(tint.opacity(0.35)))
        .contentShape(Capsule())
        .onLongPressGesture(minimumDuration: seconds, maximumDistance: 40) {
            fired += 1
            action()
            withAnimation(.easeOut(duration: 0.2)) { progress = 0 }
        } onPressingChanged: { pressing in
            holding = pressing
            withAnimation(pressing ? .linear(duration: seconds) : .spring(response: 0.3)) { progress = pressing ? 1 : 0 }
        }
        .sensoryFeedback(.impact(weight: .heavy), trigger: fired)
        .sensoryFeedback(.selection, trigger: holding)
        // VoiceOver can't hold: a double-tap does it (VoiceOver users confirm by finding and activating it on purpose)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(title)
        .accessibilityAddTraits(.isButton)
        .accessibilityAction { fired += 1; action() }
    }
}

// MARK: - Calling orb

/// Rings that pulse out of an avatar while a call rings or is live.
struct PulseRings: View {
    var tint: Color = Theme.accent
    var active = true
    @State private var t = false
    var body: some View {
        ZStack {
            ForEach(0..<3, id: \.self) { i in
                Circle().strokeBorder(tint.opacity(0.35), lineWidth: 1.5)
                    .scaleEffect(t ? 1.9 : 1)
                    .opacity(t ? 0 : 0.9)
                    .animation(active ? .easeOut(duration: 2.4).repeatForever(autoreverses: false).delay(Double(i) * 0.8) : .default, value: t)
            }
        }
        .onAppear { t = active }
        .onChange(of: active) { _, v in t = v }
    }
}

// MARK: - Waveform scrubber

/// An audio timeline drawn as bars; drag (or tap) to seek.
struct WaveformScrub: View {
    let progress: Double
    var seed: String = "igani"
    var bars = 64
    let seek: (Double) -> Void
    @State private var dragging: Double?

    private var heights: [CGFloat] {
        var h = UInt64(bitPattern: Int64(seed.hashValue))
        return (0..<bars).map { i in
            h = h &* 6364136223846793005 &+ 1442695040888963407
            let r = CGFloat((h >> 33) % 1000) / 1000
            let wave = 0.55 + 0.45 * sin(Double(i) / 3.1)
            return 0.18 + 0.82 * r * CGFloat(wave)
        }
    }

    var body: some View {
        GeometryReader { g in
            let p = dragging ?? progress
            HStack(alignment: .center, spacing: 2) {
                ForEach(Array(heights.enumerated()), id: \.offset) { i, h in
                    Capsule().fill(Double(i) / Double(bars) <= p ? Theme.accent : Theme.raised)
                        .frame(height: max(4, g.size.height * h))
                }
            }
            .frame(maxHeight: .infinity)
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { v in dragging = min(1, max(0, v.location.x / Swift.max(1, g.size.width))) }
                    .onEnded { v in
                        let x = min(1, max(0, v.location.x / Swift.max(1, g.size.width)))
                        dragging = nil
                        seek(x)
                    }
            )
        }
        .frame(height: 44)
        .animation(.linear(duration: 0.2), value: progress)
        .accessibilityElement()
        .accessibilityLabel("Playback position")
        .accessibilityValue("\(Int((progress * 100).rounded())) percent")
        .accessibilityAdjustableAction { d in
            switch d {
            case .increment: seek(min(1, progress + 0.1))
            case .decrement: seek(max(0, progress - 0.1))
            @unknown default: break
            }
        }
    }
}

// MARK: - Text

/// Long text that opens with "More".
struct ExpandableText: View {
    let text: String
    var lines = 4
    @State private var open = false
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(text).font(.subheadline).foregroundStyle(Theme.text).lineLimit(open ? nil : lines).fixedSize(horizontal: false, vertical: true)
            if text.count > lines * 45 {
                Button(open ? "Less" : "More") { withAnimation(.snappy) { open.toggle() } }.font(.footnote.weight(.semibold)).foregroundStyle(Theme.accent)
            }
        }
    }
}

/// A small coloured tag.
struct Tag: View {
    let text: String
    var tint: Color = Theme.accent
    var icon: String? = nil
    var body: some View {
        HStack(spacing: 4) {
            if let icon { Image(systemName: icon).font(.system(size: 9, weight: .bold)) }
            Text(text).lineLimit(1)
        }
        .font(.caption2.weight(.bold))
        .foregroundStyle(tint)
        .padding(.horizontal, 8)
        .padding(.vertical, 3.5)
        .background(tint.opacity(0.14), in: Capsule())
    }
}

/// An icon in a soft rounded square.
struct IconChip: View {
    let icon: String
    var tint: Color = Theme.accent
    var size: CGFloat = 36
    var body: some View {
        Image(systemName: icon).font(.system(size: size * 0.42, weight: .semibold)).foregroundStyle(tint)
            .frame(width: size, height: size)
            .background(tint.opacity(0.15), in: RoundedRectangle(cornerRadius: size * 0.3, style: .continuous))
    }
}

/// A card section with a title.
struct Panel<Content: View>: View {
    let title: String
    var icon: String? = nil
    var trailing: String? = nil
    @ViewBuilder let content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                if let icon { Image(systemName: icon).font(.footnote.weight(.bold)).foregroundStyle(Theme.accent) }
                Text(title).font(.headline).foregroundStyle(Theme.text)
                Spacer()
                if let trailing { Text(trailing).font(.caption.weight(.medium)).foregroundStyle(Theme.muted) }
            }
            content
        }
        .card()
    }
}

/// "₪12,400" and friends.
enum Money {
    static func ils(_ n: Double?) -> String { n.map { "₪" + $0.formatted(.number.precision(.fractionLength(0))) } ?? "—" }
    static func ils(_ n: Int?) -> String { ils(n.map(Double.init)) }
    static func short(_ n: Double) -> String {
        if n >= 1_000_000 { return "₪" + (n / 1_000_000).formatted(.number.precision(.fractionLength(0...1))) + "M" }
        if n >= 10_000 { return "₪" + (n / 1000).formatted(.number.precision(.fractionLength(0))) + "K" }
        return ils(n)
    }
}

/// A row that changes something with a toggle, with a hint underneath.
struct ToggleRow: View {
    let title: String
    var hint: String? = nil
    @Binding var on: Bool
    var body: some View {
        Toggle(isOn: $on) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).foregroundStyle(Theme.text)
                if let hint { Text(hint).font(.caption).foregroundStyle(Theme.muted) }
            }
        }
        .tint(Theme.blue)
    }
}
