import AuthenticationServices
import SwiftUI

/// Igani CRM sign-in: Google only, for teammates an admin has added (the CRM's own sign-in page does the checking).
struct SignInView: View {
    @Environment(Session.self) private var session
    @Environment(\.webAuthenticationSession) private var webAuth
    @State private var busy = false
    @State private var appear = false
    @State private var t: CGFloat = 0
    #if DEBUG
    @State private var devEmail = UserDefaults.standard.string(forKey: "devEmail") ?? ""
    #endif

    var body: some View {
        ZStack {
            backdrop
            VStack(spacing: 0) {
                Spacer()
                IganiLoader(size: 170)
                    .padding(.bottom, 10)
                    .accessibilityHidden(true)
                VStack(spacing: 10) {
                    Text("Igani CRM").font(.system(size: 40, weight: .bold, design: .rounded)).foregroundStyle(.white)
                    Text("Your pipeline, calls, tasks and meetings,\nwherever you are.")
                        .font(.body).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
                }
                .opacity(appear ? 1 : 0)
                .offset(y: appear ? 0 : 16)
                Spacer()
                VStack(spacing: 14) {
                    Button {
                        busy = true
                        Task {
                            await session.signIn(with: webAuth)
                            busy = false
                        }
                    } label: {
                        HStack(spacing: 10) {
                            if busy { ProgressView().tint(.black) } else { GoogleG().frame(width: 20, height: 20).accessibilityHidden(true) }
                            Text(busy ? "Opening Google…" : "Continue with Google").fontWeight(.semibold)
                        }
                        .foregroundStyle(Color(hex: 0x0F172A))
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .shadow(color: Theme.blue.opacity(0.45), radius: 20, y: 10)
                    }
                    .buttonStyle(PressStyle())
                    .disabled(busy)
                    .sensoryFeedback(.impact, trigger: busy)

                    if let e = session.signInError {
                        Text(e).font(.footnote).foregroundStyle(Theme.red).multilineTextAlignment(.center)
                            .accessibilityLabel("Error: \(e)")
                    }
                    Label("Team access only. Ask an admin if your Google account isn’t accepted.", systemImage: "lock.shield")
                        .font(.footnote).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
                    #if DEBUG
                    if Config.isLocal {
                        HStack {
                            TextField("Dev email", text: $devEmail).textInputAutocapitalization(.never).keyboardType(.emailAddress).autocorrectionDisabled()
                            Button("Dev sign in") { Task { await session.devSignIn(email: devEmail) } }
                        }
                        .font(.footnote)
                        .padding(12)
                        .background(Theme.card, in: RoundedRectangle(cornerRadius: 14))
                    }
                    #endif
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
                .opacity(appear ? 1 : 0)
            }
        }
        .onAppear { withAnimation(.easeOut(duration: 0.8).delay(0.2)) { appear = true } }
    }

    /// Slowly drifting Igani blues.
    private var backdrop: some View {
        TimelineView(.animation) { ctx in
            let s = Float(ctx.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 20) / 20 * 2 * .pi)
            MeshGradient(
                width: 3, height: 3,
                points: [
                    [0, 0], [0.5, 0], [1, 0],
                    [0, 0.5], [0.5 + 0.12 * sin(s), 0.45 + 0.1 * cos(s)], [1, 0.5],
                    [0, 1], [0.5, 1], [1, 1],
                ],
                colors: [
                    Color(hex: 0x0B1A3D), Color(hex: 0x0E1626), Color(hex: 0x1D3A6B),
                    Color(hex: 0x0E1626), Color(hex: 0x2B5296), Color(hex: 0x0E1626),
                    Color(hex: 0x1E1B4B), Color(hex: 0x0E1626), Color(hex: 0x0B1230),
                ]
            )
            .ignoresSafeArea()
        }
    }
}

/// Google's "G".
struct GoogleG: View {
    var body: some View {
        Canvas { ctx, size in
            let w = size.width
            let c = CGPoint(x: w / 2, y: w / 2)
            let r = w * 0.4
            let lw = w * 0.18
            let arcs: [(Double, Double, Color)] = [(-40, 45, Color(hex: 0x4285F4)), (45, 135, Color(hex: 0x34A853)), (135, 220, Color(hex: 0xFBBC05)), (220, 320, Color(hex: 0xEA4335))]
            for (a, b, col) in arcs {
                var p = Path()
                p.addArc(center: c, radius: r, startAngle: .degrees(a), endAngle: .degrees(b), clockwise: false)
                ctx.stroke(p, with: .color(col), lineWidth: lw)
            }
            ctx.fill(Path(CGRect(x: c.x, y: c.y - lw / 2, width: r + lw / 2, height: lw)), with: .color(Color(hex: 0x4285F4)))
        }
    }
}
