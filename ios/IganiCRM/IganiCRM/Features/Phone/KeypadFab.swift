import SwiftUI

/// The keypad, one tap away on every screen: a floating glass button you can drag to either side.
/// It steps aside while a call is on (the call bar takes over), on the Phone tab (the keypad is right there),
/// and while the keyboard is up.
struct KeypadFab: View {
    @Environment(Session.self) private var session
    @State private var phone = Phone.shared
    @State private var router = TabRouter.shared
    @State private var open = false
    @State private var keyboard = false
    @State private var drag: CGSize = .zero
    @State private var dragging = false
    @AppStorage("fab.trailing") private var trailing = true
    @AppStorage("fab.lift") private var lift: Double = 96   // distance from the bottom of the safe area

    private let size: CGFloat = 60
    private var seller: Bool { ["ADMIN", "SALES"].contains(session.me?.role ?? "") }
    private var visible: Bool { seller && phone.active == nil && router.current != .phone && !keyboard }

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height
            let x = trailing ? w - size / 2 - 16 : size / 2 + 16
            let y = h - CGFloat(lift) - size / 2
            if visible {
                button
                    .position(x: x + drag.width, y: y + drag.height)
                    .gesture(
                        DragGesture(minimumDistance: 6)
                            .onChanged { v in dragging = true; drag = v.translation }
                            .onEnded { v in
                                let endX = x + v.predictedEndTranslation.width
                                let endY = y + v.translation.height
                                withAnimation(.spring(response: 0.42, dampingFraction: 0.72)) {
                                    trailing = endX > w / 2
                                    // keep clear of the title bar and the tab bar
                                    lift = Double(min(max(h - endY - size / 2, 76), h - 150))
                                    drag = .zero
                                }
                                dragging = false
                            }
                    )
                    .transition(.scale(scale: 0.4).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.38, dampingFraction: 0.78), value: visible)
        .sheet(isPresented: $open) { KeypadSheet() }
        .onChange(of: phone.active?.id) { _, id in if id != nil { open = false } }
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { _ in keyboard = true }
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in keyboard = false }
        #if DEBUG
        .task {
            // -keypadSheet 1 opens the floating keypad (for testing)
            if UserDefaults.standard.bool(forKey: "keypadSheet") {
                UserDefaults.standard.removeObject(forKey: "keypadSheet")
                try? await Task.sleep(for: .seconds(1.5))
                open = true
            }
        }
        #endif
    }

    private var button: some View {
        Button { open = true } label: {
            ZStack {
                Circle().fill(Theme.accent.opacity(0.22)).padding(5)
                Image(systemName: "circle.grid.3x3.fill")
                    .font(.system(size: 21, weight: .semibold))
                    .foregroundStyle(Theme.accent)
            }
            .frame(width: size, height: size)
            .glass(in: Circle(), interactive: true)
            .overlay(Circle().strokeBorder(.white.opacity(0.12)))
            .shadow(color: .black.opacity(dragging ? 0.5 : 0.35), radius: dragging ? 22 : 14, y: dragging ? 10 : 6)
            .scaleEffect(dragging ? 1.08 : 1)
        }
        .buttonStyle(ElasticStyle())
        .sensoryFeedback(.impact(weight: .light), trigger: open)
        .sensoryFeedback(.selection, trigger: trailing)
        .accessibilityLabel("Keypad")
        .accessibilityHint("Opens the dialer")
    }
}

/// The full dialer as a sheet, from anywhere in the app.
struct KeypadSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var phone = Phone.shared
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                LineBadge(setup: phone.setup)
                Button { dismiss() } label: {
                    Image(systemName: "xmark").font(.footnote.weight(.bold)).foregroundStyle(Theme.muted)
                        .frame(width: 36, height: 36).glass(in: Circle(), interactive: true)
                }
                .accessibilityLabel("Close")
            }
            .padding(.horizontal, 16)
            .padding(.top, 18)
            .padding(.bottom, 8)
            KeypadPane()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .screenBackground()
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(34)
        .task { await phone.prepare() }
    }
}
