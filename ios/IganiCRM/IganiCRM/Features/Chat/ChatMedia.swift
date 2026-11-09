import AVKit
import PDFKit
import QuickLook
import SwiftUI

// The full-screen viewer for photos and files shared in team chat, like WhatsApp's: swipe between everything in the
// conversation, pinch or double-tap to zoom, swipe down to close, and Share (save to Photos), Forward, Reply, React.

struct ChatMediaItem: Identifiable, Hashable {
    let message: ChatMessage
    let index: Int
    var file: ChatFile { message.files[index] }
    var id: String { "\(message.id)-\(index)" }

    static func all(in messages: [ChatMessage]) -> [ChatMediaItem] {
        messages.filter { !$0.deleted && !$0.pending }.flatMap { m in m.files.indices.map { ChatMediaItem(message: m, index: $0) } }
    }
}

/// Where the viewer opens.
struct ChatMediaStart: Identifiable, Hashable {
    let messageId: String
    let index: Int
    let inThread: Bool
    var id: String { "\(messageId)-\(index)" }
}

/// Signed links and local copies of chat files (links come from the CRM; nothing carries your sign-in to Cloudinary).
enum ChatFiles {
    static func link(_ item: ChatMediaItem, mode: String) async -> URL? {
        struct L: Decodable { let url: String }
        let l: L? = try? await API.shared.act("chatFileUrl", item.message.id, item.index, mode)
        return l.flatMap { URL(string: $0.url) }
    }

    /// A copy in the temporary folder under the file's own name (for Share, Save and Quick Look).
    static func local(_ item: ChatMediaItem) async -> URL? {
        let dir = FileManager.default.temporaryDirectory.appending(path: "chat-\(item.id)", directoryHint: .isDirectory)
        let dest = dir.appending(path: item.file.name.replacingOccurrences(of: "/", with: "-"))
        if FileManager.default.fileExists(atPath: dest.path) { return dest }
        guard let src = await link(item, mode: item.file.view == nil ? "download" : "view"),
              let (data, resp) = try? await URLSession.shared.data(from: src),
              (resp as? HTTPURLResponse).map({ (200..<300).contains($0.statusCode) }) ?? false else { return nil }
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return (try? data.write(to: dest)) != nil ? dest : nil
    }
}

struct ChatMediaViewer: View {
    let items: [ChatMediaItem]
    let start: Int
    let meId: String
    let people: [String: ChatPerson]
    /// open the thread under this message (absent inside a thread)
    var onReply: ((ChatMessage) -> Void)?
    let onReact: (ChatMessage, String) -> Void
    @Environment(\.dismiss) private var dismiss
    @Environment(Toasts.self) private var toasts
    @State private var at = 0
    @State private var chrome = true
    @State private var drag: CGFloat = 0
    @State private var zoomed = false
    @State private var sharing: URL?
    @State private var busy = false
    @State private var forwarding = false
    @State private var quickLook: URL?

    private var item: ChatMediaItem? { items.indices.contains(at) ? items[at] : nil }

    var body: some View {
        ZStack {
            Color.black.opacity(1 - min(abs(drag) / 500, 0.6)).ignoresSafeArea()
            TabView(selection: $at) {
                ForEach(Array(items.enumerated()), id: \.element.id) { i, it in
                    page(it).tag(i)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .offset(y: drag)
            .simultaneousGesture(
                DragGesture(minimumDistance: 20)
                    .onChanged { v in if !zoomed, abs(v.translation.height) > abs(v.translation.width) { drag = max(v.translation.height, 0) } }
                    .onEnded { v in
                        if !zoomed, v.translation.height > 140 { dismiss() } else { withAnimation(.spring) { drag = 0 } }
                    }
            )
            .onTapGesture { withAnimation(.easeInOut(duration: 0.2)) { chrome.toggle() } }
            if chrome, let item { overlay(item).transition(.opacity) }
        }
        .statusBarHidden(!chrome)
        .onAppear { at = min(max(start, 0), max(items.count - 1, 0)) }
        .onChange(of: at) { _, _ in zoomed = false }
        .sheet(item: $sharing) { url in ShareSheet(items: [url]).presentationDetents([.medium, .large]) }
        .sheet(isPresented: $forwarding) {
            if let item { ForwardSheet(item: item) { place in toasts.show("Forwarded to \(place)", tone: .ok) } }
        }
        .quickLookPreview($quickLook)
    }

    @ViewBuilder private func page(_ it: ChatMediaItem) -> some View {
        switch it.file.view {
        case "image": ZoomableRemoteImage(item: it, zoomed: $zoomed)
        case "video": RemoteVideo(item: it)
        case "pdf": RemotePDF(item: it)
        default: otherFile(it)
        }
    }

    private func otherFile(_ it: ChatMediaItem) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.fill").font(.system(size: 44)).foregroundStyle(.white)
                .frame(width: 92, height: 92).background(.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
            VStack(spacing: 4) {
                Text(it.file.name).font(.headline).foregroundStyle(.white).multilineTextAlignment(.center)
                Text(it.file.size).font(.subheadline).foregroundStyle(.white.opacity(0.6))
            }
            Button {
                Task { busy = true; quickLook = await ChatFiles.local(it); busy = false; if quickLook == nil { toasts.show("Couldn’t open that file.", tone: .warn) } }
            } label: {
                Label("Open", systemImage: "eye").font(.subheadline.weight(.semibold)).padding(.horizontal, 18).padding(.vertical, 10)
                    .background(.white, in: Capsule()).foregroundStyle(.black)
            }
        }
        .padding(30)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func overlay(_ it: ChatMediaItem) -> some View {
        VStack(spacing: 0) {
            // who and when
            HStack(spacing: 12) {
                Button { dismiss() } label: {
                    Image(systemName: "xmark").font(.headline).foregroundStyle(.white).frame(width: 40, height: 40).background(.white.opacity(0.12), in: Circle())
                }
                .accessibilityLabel("Close")
                Avatar(name: it.message.name, url: it.message.photoURL, size: 34)
                VStack(alignment: .leading, spacing: 1) {
                    Text(it.message.userId == meId ? "You" : it.message.name).font(.subheadline.weight(.semibold)).foregroundStyle(.white)
                    Text(it.message.at.formatted(.relative(presentation: .named)) + (items.count > 1 ? " · \(at + 1) of \(items.count)" : ""))
                        .font(.caption).foregroundStyle(.white.opacity(0.65))
                }
                Spacer()
            }
            .padding(.horizontal, 14).padding(.top, 6).padding(.bottom, 10)
            .background(LinearGradient(colors: [.black.opacity(0.7), .clear], startPoint: .top, endPoint: .bottom).ignoresSafeArea(edges: .top))
            Spacer()
            VStack(spacing: 10) {
                if !it.message.body.isEmpty {
                    Text(ChatText.attributed(it.message.body, people: people, me: meId))
                        .font(.subheadline).foregroundStyle(.white).multilineTextAlignment(.center).lineLimit(4)
                        .padding(.horizontal, 20)
                } else if it.file.forwarded == true {
                    Label("Forwarded", systemImage: "arrowshape.turn.up.right").font(.caption.italic()).foregroundStyle(.white.opacity(0.6))
                }
                if !it.message.reactions.isEmpty {
                    HStack(spacing: 6) {
                        ForEach(it.message.reactions, id: \.emoji) { r in
                            Text("\(r.emoji) \(r.count)").font(.caption.weight(.semibold)).foregroundStyle(.white)
                                .padding(.horizontal, 8).padding(.vertical, 3).background(.white.opacity(r.mine ? 0.25 : 0.1), in: Capsule())
                        }
                    }
                }
                if items.count > 1 { thumbnails }
                actions(it)
            }
            .padding(.top, 30)
            .background(LinearGradient(colors: [.clear, .black.opacity(0.75)], startPoint: .top, endPoint: .bottom).ignoresSafeArea(edges: .bottom))
        }
    }

    private var thumbnails: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(Array(items.enumerated()), id: \.element.id) { i, it in
                        Button { withAnimation { at = i } } label: {
                            ChatThumb(item: it)
                                .frame(width: 44, height: 44)
                                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                .overlay(RoundedRectangle(cornerRadius: 8, style: .continuous).strokeBorder(.white, lineWidth: i == at ? 2 : 0))
                                .opacity(i == at ? 1 : 0.55)
                        }
                        .id(i)
                    }
                }
                .padding(.horizontal, 16)
            }
            .onChange(of: at) { _, i in withAnimation { proxy.scrollTo(i, anchor: .center) } }
        }
    }

    private func actions(_ it: ChatMediaItem) -> some View {
        HStack {
            action("Share", "square.and.arrow.up") {
                Task {
                    busy = true
                    sharing = await ChatFiles.local(it)
                    busy = false
                    if sharing == nil { toasts.show("Couldn’t get that file.", tone: .warn) }
                }
            }
            action("Forward", "arrowshape.turn.up.right") { forwarding = true }
            Menu {
                ForEach(ChatText.emoji, id: \.self) { e in Button(e) { onReact(it.message, e) } }
            } label: { actionLabel("React", "face.smiling") }
            if let onReply { action("Reply", "arrowshape.turn.up.left") { dismiss(); onReply(it.message) } }
        }
        .overlay { if busy { ProgressView().tint(.white) } }
        .padding(.horizontal, 12).padding(.bottom, 6)
    }

    private func action(_ title: String, _ icon: String, _ run: @escaping () -> Void) -> some View {
        Button(action: run) { actionLabel(title, icon) }.disabled(busy)
    }

    private func actionLabel(_ title: String, _ icon: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon).font(.system(size: 20, weight: .medium))
            Text(title).font(.caption2.weight(.medium))
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity, minHeight: 50)
        .contentShape(Rectangle())
    }
}

/// A photo with pinch and double-tap zoom, and drag to look around while zoomed.
private struct ZoomableRemoteImage: View {
    let item: ChatMediaItem
    @Binding var zoomed: Bool
    @State private var url: URL?
    @State private var scale: CGFloat = 1
    @State private var base: CGFloat = 1
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero

    var body: some View {
        GeometryReader { geo in
            ZStack {
                if let url {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let img): img.resizable().scaledToFit()
                        case .failure: Label("Couldn’t load the photo", systemImage: "exclamationmark.triangle").foregroundStyle(.white.opacity(0.7))
                        default: ProgressView().tint(.white)
                        }
                    }
                } else {
                    ProgressView().tint(.white)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
            .scaleEffect(scale)
            .offset(offset)
            .gesture(
                MagnifyGesture()
                    .onChanged { v in scale = min(max(base * v.magnification, 1), 5) }
                    .onEnded { _ in
                        base = scale
                        if scale <= 1.02 { reset() } else { zoomed = true }
                    }
            )
            .simultaneousGesture(
                DragGesture()
                    .onChanged { v in
                        guard scale > 1 else { return }
                        offset = CGSize(width: lastOffset.width + v.translation.width, height: lastOffset.height + v.translation.height)
                    }
                    .onEnded { _ in lastOffset = offset },
                including: scale > 1 ? .all : .subviews
            )
            .onTapGesture(count: 2) { location in
                withAnimation(.spring(duration: 0.3)) {
                    if scale > 1 { reset() } else {
                        scale = 2.5; base = 2.5; zoomed = true
                        offset = CGSize(width: (geo.size.width / 2 - location.x) * 1.5, height: (geo.size.height / 2 - location.y) * 1.5)
                        lastOffset = offset
                    }
                }
            }
        }
        .task { if url == nil { url = await ChatFiles.link(item, mode: "view") } }
        .accessibilityLabel("Photo \(item.file.name)")
    }

    private func reset() {
        scale = 1; base = 1; offset = .zero; lastOffset = .zero; zoomed = false
    }
}

private struct RemoteVideo: View {
    let item: ChatMediaItem
    @State private var player: AVPlayer?
    var body: some View {
        ZStack {
            if let player { VideoPlayer(player: player).onDisappear { player.pause() } } else { ProgressView().tint(.white) }
        }
        .task { if player == nil, let u = await ChatFiles.link(item, mode: "view") { player = AVPlayer(url: u) } }
    }
}

private struct RemotePDF: View {
    let item: ChatMediaItem
    @State private var doc: PDFDocument?
    @State private var failed = false
    var body: some View {
        ZStack {
            if let doc { PDFKitView(document: doc).padding(.vertical, 60) }
            else if failed { Label("Couldn’t load the PDF", systemImage: "exclamationmark.triangle").foregroundStyle(.white.opacity(0.7)) }
            else { ProgressView().tint(.white) }
        }
        .task {
            guard doc == nil else { return }
            if let local = await ChatFiles.local(item), let d = PDFDocument(url: local) { doc = d } else { failed = true }
        }
    }
}

private struct PDFKitView: UIViewRepresentable {
    let document: PDFDocument
    func makeUIView(context: Context) -> PDFView {
        let v = PDFView()
        v.document = document
        v.autoScales = true
        v.backgroundColor = .clear
        return v
    }
    func updateUIView(_ v: PDFView, context: Context) {}
}

/// A small square preview for the strip and the chat.
struct ChatThumb: View {
    let item: ChatMediaItem
    @State private var url: URL?
    var body: some View {
        ZStack {
            Color.white.opacity(0.1)
            if item.file.isImage {
                if let url { AsyncImage(url: url) { $0.resizable().scaledToFill() } placeholder: { Color.clear } }
            } else {
                Text(item.file.view == "video" ? "▶" : String((item.file.name.split(separator: ".").last ?? "file").prefix(4)).uppercased())
                    .font(.system(size: 10, weight: .bold)).foregroundStyle(.white)
            }
        }
        .task { if item.file.isImage, url == nil { url = await ChatFiles.link(item, mode: "thumb") } }
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController { UIActivityViewController(activityItems: items, applicationActivities: nil) }
    func updateUIViewController(_ vc: UIActivityViewController, context: Context) {}
}

/// Pick a conversation and send the file there.
private struct ForwardSheet: View {
    let item: ChatMediaItem
    let onDone: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @Environment(Toasts.self) private var toasts
    @State private var channels: [ChatChannelRow] = []
    @State private var query = ""
    @State private var busy: String?

    var body: some View {
        NavigationStack {
            List {
                ForEach(channels.filter { ($0.isDM || $0.member) && (query.isEmpty || $0.name.localizedCaseInsensitiveContains(query)) }) { c in
                    Button { Task { await send(c) } } label: {
                        HStack(spacing: 12) {
                            if c.isDM { Avatar(name: c.name, url: c.photoURL, size: 34) }
                            else {
                                Image(systemName: c.isPrivate ? "lock.fill" : "number").font(.system(size: 14, weight: .bold)).foregroundStyle(.white)
                                    .frame(width: 34, height: 34).background(Theme.gradient(for: c.name), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                            }
                            Text(c.title).foregroundStyle(Theme.text)
                            Spacer()
                            if busy == c.id { ProgressView() } else { Image(systemName: "arrowshape.turn.up.right").foregroundStyle(Theme.muted) }
                        }
                    }
                    .disabled(busy != nil)
                    .listRowBackground(Theme.card)
                }
            }
            .scrollContentBackground(.hidden)
            .screenBackground()
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search conversations")
            .navigationTitle("Forward to…")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
            .task { if let o: ChatOverview = try? await API.shared.act("chatOverview") { channels = o.channels } }
        }
        .presentationDetents([.medium, .large])
    }

    private func send(_ c: ChatChannelRow) async {
        busy = c.id
        defer { busy = nil }
        do {
            try await API.shared.run("chatForward", ["messageId": item.message.id, "index": item.index, "toChannelId": c.id] as [String: Any])
            dismiss()
            onDone(c.title)
        } catch {
            toasts.show(error.localizedDescription, tone: .warn)
        }
    }
}
