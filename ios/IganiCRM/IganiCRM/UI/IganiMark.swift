import SwiftUI

/// The Igani Meet mark, drawn natively so it can move: two pills (that bounce like a level meter with `talk`) and the
/// camera. Proportions match public/meet/igani-meet-icon.svg.
struct IganiMark: View {
    var talk = false
    var slot: Color = Theme.bg
    @State private var up = false

    var body: some View {
        GeometryReader { g in
            let s = min(g.size.width / 1062, g.size.height / 1302)
            ZStack(alignment: .topLeading) {
                pill(x: 20, y: 116, w: 327, h: 1166, slotY: 134, slotH: 290, color: Theme.light, s: s)
                    .scaleEffect(x: 1, y: talk ? (up ? 0.84 : 1.02) : 1, anchor: .bottom)
                pill(x: 420, y: 20, w: 325, h: 1262, slotY: 808, slotH: 294, color: Theme.blue, s: s)
                    .scaleEffect(x: 1, y: talk ? (up ? 1.03 : 0.88) : 1, anchor: .bottom)
                Camera()
                    .fill(Theme.blue)
                    .frame(width: 254 * s, height: 434 * s)
                    .offset(x: 788 * s, y: 235 * s)
            }
            .frame(width: 1062 * s, height: 1302 * s, alignment: .topLeading)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .aspectRatio(1062 / 1302, contentMode: .fit)
        .onAppear {
            guard talk else { return }
            withAnimation(.easeInOut(duration: 0.55).repeatForever(autoreverses: true)) { up = true }
        }
    }

    private func pill(x: CGFloat, y: CGFloat, w: CGFloat, h: CGFloat, slotY: CGFloat, slotH: CGFloat, color: Color, s: CGFloat) -> some View {
        ZStack(alignment: .top) {
            Capsule().fill(color)
            Capsule().fill(slot).frame(width: 104 * s, height: slotH * s).offset(y: slotY * s)
        }
        .frame(width: w * s, height: h * s)
        .offset(x: x * s, y: y * s)
    }

    /// The camera's rounded trapezoid.
    struct Camera: Shape {
        func path(in r: CGRect) -> Path {
            let w = r.width, h = r.height
            var p = Path()
            p.move(to: CGPoint(x: 0, y: h * 0.27))
            p.addLine(to: CGPoint(x: w, y: 0))
            p.addLine(to: CGPoint(x: w, y: h))
            p.addLine(to: CGPoint(x: 0, y: h * 0.73))
            p.closeSubpath()
            return p.strokedPath(StrokeStyle(lineWidth: w * 0.17, lineJoin: .round)).union(p)
        }
    }
}

/// The Igani loader: the app tile with the mark building itself, two orbit rings turning, and a line of status.
struct IganiLoader: View {
    var text: String? = nil
    var size: CGFloat = 150
    @State private var spin = false
    @State private var shown = false

    var body: some View {
        VStack(spacing: 22) {
            ZStack {
                Circle().fill(Theme.blue.opacity(0.35)).blur(radius: 30).scaleEffect(spin ? 1.05 : 0.85)
                Circle()
                    .trim(from: 0, to: 0.3)
                    .stroke(AngularGradient(colors: [Theme.light.opacity(0), Theme.light], center: .center), style: StrokeStyle(lineWidth: 2.2, lineCap: .round))
                    .rotationEffect(.degrees(spin ? 360 : 0))
                Circle()
                    .stroke(Theme.blue.opacity(0.45), style: StrokeStyle(lineWidth: 1.4, lineCap: .round, dash: [3, 7]))
                    .padding(size * 0.09)
                    .rotationEffect(.degrees(spin ? -360 : 0))
                RoundedRectangle(cornerRadius: size * 0.15, style: .continuous)
                    .fill(LinearGradient(colors: [Color(hex: 0x1B2D48), Color(hex: 0x13213A)], startPoint: .top, endPoint: .bottom))
                    .overlay(RoundedRectangle(cornerRadius: size * 0.15, style: .continuous).strokeBorder(.white.opacity(0.1)))
                    .frame(width: size * 0.53, height: size * 0.53)
                    .overlay(IganiMark(talk: true, slot: Color(hex: 0x16263F)).padding(size * 0.1))
                    .shadow(color: .black.opacity(0.5), radius: 20, y: 10)
                    .scaleEffect(shown ? 1 : 0.6)
                    .opacity(shown ? 1 : 0)
            }
            .frame(width: size, height: size)
            if let text {
                Text(text).font(.subheadline).foregroundStyle(Theme.muted).contentTransition(.opacity)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(text ?? "Igani")
        .onAppear {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.6)) { shown = true }
            withAnimation(.linear(duration: 6).repeatForever(autoreverses: false)) { spin = true }
        }
    }
}

#Preview { IganiLoader(text: "Opening Igani CRM").frame(maxWidth: .infinity, maxHeight: .infinity).background(Theme.bg) }
