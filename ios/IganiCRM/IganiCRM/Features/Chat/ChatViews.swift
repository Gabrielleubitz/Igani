import PhotosUI
import SwiftUI
import UniformTypeIdentifiers

// MARK: - Conversations list

/// Team chat: channels and direct messages, with unread counts (More → Team chat).
struct ChatHomeView: View {
    @Environment(Toasts.self) private var toasts
    @State private var overview: ChatOverview?
    @State private var failed: String?
    @State private var query = ""
    @State private var sheet: Sheet?

    enum Sheet: String, Identifiable { case channel, dm; var id: String { rawValue } }

    var body: some View {
        Group {
            if let o = overview {
                list(o)
            } else if let failed {
                LoadFailed(message: failed) { await load() }
            } else {
                IganiLoader(text: "Opening team chat").frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .screenBackground()
        .navigationTitle("Team chat")
        .searchable(text: $query, prompt: "Find a conversation or message")
        .task(id: query) {
            let q = query.trimmingCharacters(in: .whitespaces)
            guard q.count >= 2 else { hits = nil; return }
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
            hits = (try? await API.shared.act("chatSearch", q)) ?? []
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button { sheet = .dm } label: { Label("Message someone", systemImage: "bubble.left") }
                    Button { sheet = .channel } label: { Label("New channel", systemImage: "number") }
                } label: { Image(systemName: "square.and.pencil") }
                .accessibilityLabel("New conversation")
            }
        }
        .sheet(item: $sheet) { s in
            switch s {
            case .channel:
                NewChannelSheet(people: (overview?.people ?? []).filter { $0.id != overview?.me.id }) { made in
                    // open the new channel once the sheet is down
                    pendingOpen = made
                    await load()
                }
            case .dm:
                PeopleSheet(title: "Message someone", people: overview?.people ?? [], meId: overview?.me.id ?? "", multi: false) { ids in
                    pendingDM = ids.first
                }
            }
        }
        .navigationDestination(item: $openDM) { id in
            ChatConversationView(channelId: id, title: "")
        }
        .navigationDestination(item: $openHit) { h in
            ChatConversationView(channelId: h.channelId, title: h.where, threadId: h.threadId)
        }
        .onChange(of: sheet) { _, s in
            if s == nil, let p = pendingDM {
                pendingDM = nil
                Task { await startDM(p) }
            }
            if s == nil, let c = pendingOpen {
                pendingOpen = nil
                openDM = c
            }
        }
        .task {
            #if DEBUG
            // -openChat <channel id> opens a conversation (for testing)
            if let c = UserDefaults.standard.string(forKey: "openChat") { UserDefaults.standard.removeObject(forKey: "openChat"); openDM = c }
            #endif
            while !Task.isCancelled {
                await load()
                try? await Task.sleep(for: .seconds(8))
            }
        }
        .refreshable { await load() }
    }

    @State private var pendingDM: String?
    @State private var pendingOpen: String?
    @State private var openDM: String?
    @State private var hits: [ChatSearchHit]?
    @State private var openHit: ChatSearchHit?

    private func list(_ o: ChatOverview) -> some View {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        let match: (ChatChannelRow) -> Bool = { q.isEmpty || $0.name.lowercased().contains(q) }
        let channels = o.channels.filter { !$0.isDM && ($0.member || $0.name == "general") && match($0) }
        let browse = o.channels.filter { !$0.isDM && !$0.member && $0.name != "general" && match($0) }
        let dms = o.channels.filter { $0.isDM && match($0) }
        let peopleBy = Dictionary(o.people.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        return List {
            if let hits {
                Section("Messages") {
                    ForEach(hits) { h in
                        Button { openHit = h } label: {
                            VStack(alignment: .leading, spacing: 3) {
                                HStack {
                                    Text(h.name).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text)
                                    Spacer()
                                    Text(h.threadId == nil ? h.where : "\(h.where) · thread").font(.caption).foregroundStyle(Theme.muted)
                                }
                                Text(ChatText.display(h.body, people: peopleBy))
                                    .font(.subheadline).foregroundStyle(Theme.muted).lineLimit(2)
                            }
                        }
                        .listRowBackground(Theme.card)
                    }
                    if hits.isEmpty { Text("No messages match.").foregroundStyle(Theme.muted).listRowBackground(Theme.card) }
                }
            }
            Section("Channels") {
                ForEach(channels) { c in row(c) }
            }
            if !browse.isEmpty {
                Section("More channels to join") {
                    ForEach(browse) { c in row(c) }
                }
            }
            Section("Direct messages") {
                ForEach(dms) { c in row(c) }
                if dms.isEmpty {
                    Button { sheet = .dm } label: { Label("Message a teammate", systemImage: "plus.bubble") }
                        .listRowBackground(Theme.card)
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
    }

    private func row(_ c: ChatChannelRow) -> some View {
        NavigationLink(value: ChatRoute.channel(c.id, c.title)) {
            HStack(spacing: 12) {
                if c.isDM {
                    Avatar(name: c.name, url: c.photoURL, size: 34)
                        .overlay(alignment: .bottomTrailing) {
                            if c.dm?.online == true {
                                Circle().fill(Theme.green).frame(width: 10, height: 10).overlay(Circle().strokeBorder(Theme.card, lineWidth: 2))
                                    .accessibilityLabel("Online")
                            }
                        }
                } else {
                    Image(systemName: c.isPrivate ? "lock.fill" : "number")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 34, height: 34)
                        .background(Theme.gradient(for: c.name), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(c.name).font(.body.weight(c.unread > 0 && !c.muted ? .bold : .regular)).foregroundStyle(Theme.text).lineLimit(1)
                    if let t = c.topic, !t.isEmpty { Text(t).font(.caption).foregroundStyle(Theme.muted).lineLimit(1) }
                }
                Spacer()
                if c.muted { Image(systemName: "bell.slash").font(.caption).foregroundStyle(Theme.muted).accessibilityLabel("Muted") }
                if c.mentions > 0 {
                    Text("\(c.mentions)").font(.caption2.weight(.bold)).foregroundStyle(.white).padding(.horizontal, 7).padding(.vertical, 3).background(Theme.red, in: Capsule())
                        .accessibilityLabel(c.isDM ? "\(c.mentions) unread" : "\(c.mentions) \(c.mentions == 1 ? "mention" : "mentions")")
                } else if c.unread > 0 && !c.muted {
                    Circle().fill(Theme.text.opacity(0.8)).frame(width: 8, height: 8).accessibilityLabel("\(c.unread) unread")
                }
            }
        }
        .listRowBackground(Theme.card)
    }

    private func load() async {
        do {
            if let o: ChatOverview = try await API.shared.act("chatOverview") {
                withAnimation(.snappy) { overview = o }
                failed = nil
            }
        } catch {
            if overview == nil { failed = error.localizedDescription }
        }
    }

    private func startDM(_ userId: String) async {
        struct Opened: Decodable { let id: String }
        do {
            if let o: Opened = try await API.shared.act("chatOpenDm", userId) { openDM = o.id }
        } catch { toasts.show(error.localizedDescription, tone: .warn) }
    }
}

extension String: @retroactive Identifiable { public var id: String { self } }

extension View {
    func chatRoutes() -> some View {
        navigationDestination(for: ChatRoute.self) { r in
            switch r {
            case .channel(let id, let title): ChatConversationView(channelId: id, title: title)
            case .dm(let userId, let name): ChatDMLoader(userId: userId, name: name)
            }
        }
    }
}

/// Opens (or makes) the direct conversation with a teammate, then shows it.
struct ChatDMLoader: View {
    let userId: String
    let name: String
    @State private var channelId: String?
    @State private var failed: String?
    var body: some View {
        Group {
            if let channelId { ChatConversationView(channelId: channelId, title: name) }
            else if let failed { LoadFailed(message: failed) { await open() } }
            else { ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity).screenBackground() }
        }
        .task { await open() }
    }
    private func open() async {
        struct Opened: Decodable { let id: String }
        do { if let o: Opened = try await API.shared.act("chatOpenDm", userId) { channelId = o.id } } catch { failed = error.localizedDescription }
    }
}

// MARK: - A conversation (or a thread in it)

struct ChatConversationView: View {
    let channelId: String
    let title: String
    /// set: this screen is the thread under that message
    var threadId: String? = nil
    @Environment(Toasts.self) private var toasts
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    @State private var info: ChatChannelInfo?
    @State private var messages: [ChatMessage] = []
    @State private var parent: ChatMessage?
    @State private var people: [ChatPerson] = []
    @State private var meId = ""
    @State private var isAdmin = false
    @State private var filesOn = false
    @State private var more = false
    @State private var cursor: String?
    @State private var seenAt: Date?
    @State private var newSince: Date?
    @State private var openedAt: Date?
    @State private var typing: [String] = []
    @State private var failed: String?
    @State private var draft = ""
    @State private var editing: ChatMessage?
    @State private var deleting: ChatMessage?
    @State private var showInfo = false
    /// the channel was left or archived from its details: go back once the sheet is down
    @State private var closeAfterInfo = false
    @State private var openThread: String?
    @State private var viewing: ChatMediaStart?
    @State private var tick = 0
    @State private var lastTypingPing = Date.distantPast
    @State private var uploads: [ChatUpload] = []
    @State private var uploadTasks: [UUID: Task<Void, Never>] = [:]
    @State private var pickedPhotos: [PhotosPickerItem] = []
    @State private var pickingPhotos = false
    @State private var pickingFiles = false
    @State private var loadingOlder = false
    /// after loading earlier messages: keep this one where it was
    @State private var keepInView: String?
    /// the list is scrolled to (near) the newest message
    @State private var atBottom = true
    /// something arrived while you were scrolled up
    @State private var unseenBelow = false
    /// bumps on every change made here, so a poll that was already in flight can't put old state back
    @State private var rev = 0
    @FocusState private var focused: Bool

    /// the server takes at most 10 files a message
    private let maxFiles = 10

    private var peopleBy: [String: ChatPerson] { Dictionary(people.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a }) }
    private var isThread: Bool { threadId != nil }
    private var screenTitle: String {
        if isThread { return "Thread" }
        return info.map { $0.isDM ? $0.name : "#\($0.name)" } ?? title
    }

    var body: some View {
        VStack(spacing: 0) {
            if info != nil || (isThread && parent != nil) {
                messageList
                typingLine
                if let info, !info.isDM, !info.member, !isThread { joinBar(info) }
                mentionSuggestions
                uploadStrip
                composer
            } else if let failed {
                LoadFailed(message: failed) { await first() }
                Spacer()
            } else {
                Spacer(); ProgressView(); Spacer()
            }
        }
        .frame(maxWidth: .infinity)
        .screenBackground()
        .navigationTitle(screenTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if let info, !isThread {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        if info.member {
                            Button { Task { await setMuted(!info.muted) } } label: {
                                Label(info.muted ? "Unmute" : "Mute", systemImage: info.muted ? "bell" : "bell.slash")
                            }
                        }
                        if !info.isDM {
                            Button { showInfo = true } label: { Label("Channel details", systemImage: "info.circle") }
                        }
                    } label: {
                        Image(systemName: info.muted ? "bell.slash" : "ellipsis.circle")
                    }
                    .accessibilityLabel(info.muted ? "Conversation options, muted" : "Conversation options")
                }
            }
        }
        .sheet(isPresented: $showInfo, onDismiss: {
            if closeAfterInfo { closeAfterInfo = false; dismiss() }
        }) {
            if let info {
                ChannelInfoSheet(info: info, team: people, isAdmin: isAdmin) { changed in
                    if changed == .left || changed == .archived { closeAfterInfo = true } else { Task { await refreshInfo() } }
                }
            }
        }
        .sheet(item: $editing) { m in
            EditMessageSheet(text: ChatText.display(m.body, people: peopleBy)) { text in saveEdit(m, text) }
        }
        .confirmationDialog("Delete this message?", isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } }), titleVisibility: .visible, presenting: deleting) { m in
            Button("Delete", role: .destructive) { remove(m) }
        } message: { _ in
            Text("It shows as deleted for everyone, and its files go with it.")
        }
        .fullScreenCover(item: $viewing) { v in
            let items = ChatMediaItem.all(in: (isThread ? [parent].compactMap { $0 } : []) + messages)
            ChatMediaViewer(
                items: items,
                start: items.firstIndex { $0.message.id == v.messageId && $0.index == v.index } ?? 0,
                meId: meId,
                people: peopleBy,
                onReply: isThread ? nil : { m in openThread = m.id },
                onReact: { m, e in handle(.react(e), m) }
            )
        }
        .navigationDestination(item: $openThread) { t in
            ChatConversationView(channelId: channelId, title: title, threadId: t)
        }
        .photosPicker(isPresented: $pickingPhotos, selection: $pickedPhotos, maxSelectionCount: max(1, maxFiles - uploads.count), matching: .any(of: [.images, .screenshots]))
        .fileImporter(isPresented: $pickingFiles, allowedContentTypes: [.item], allowsMultipleSelection: true) { r in
            switch r {
            case .success(let urls): for u in urls { addFile(u) }
            case .failure(let e): toasts.show(e.localizedDescription, tone: .warn)
            }
        }
        .onChange(of: pickedPhotos) { _, items in
            guard !items.isEmpty else { return }
            pickedPhotos = []
            for item in items { addPhoto(item) }
        }
        .onChange(of: draft) { _, d in
            guard !d.isEmpty, focused, Date().timeIntervalSince(lastTypingPing) > 3 else { return }
            lastTypingPing = Date()
            Task { try? await API.shared.run("chatTyping", channelId, threadId ?? NSNull()) }
        }
        .sensoryFeedback(.impact(weight: .light), trigger: tick)
        .onAppear { if !isThread { TabRouter.shared.chatOpen = true; ChatScreenTracker.open = channelId } }
        .onDisappear { if !isThread { TabRouter.shared.chatOpen = false; if ChatScreenTracker.open == channelId { ChatScreenTracker.open = nil } } }
        .task {
            // coming back from a thread or a lead: catch up instead of starting over (keeps earlier pages and your place)
            if info == nil && parent == nil { await first() } else { await poll() }
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(2.5))
                await poll()
            }
        }
        .onChange(of: scenePhase) { _, p in if p == .active { Task { await poll() } } }
    }

    // messages, grouped like Slack: name and photo once per run, day dividers, "New" where you left off
    private var messageList: some View {
        // "New" marks what was unread when you opened it, not what arrives while you watch
        let firstNew = newSince.flatMap { since in messages.first { $0.at > since && $0.at <= (openedAt ?? .distantFuture) && $0.userId != meId && !$0.pending }?.id }
        let replies = messages.filter { !$0.deleted }.count
        return ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 2) {
                    if isThread, let parent {
                        ChatMessageView(message: parent, grouped: false, meId: meId, canDelete: parent.userId == meId || isAdmin, people: peopleBy, inThread: true) { action in
                            handle(action, parent)
                        }
                        HStack {
                            Text("\(replies) \(replies == 1 ? "reply" : "replies")").font(.caption.weight(.semibold)).foregroundStyle(Theme.muted)
                            Rectangle().fill(Theme.line).frame(height: 1)
                        }
                        .padding(.vertical, 8)
                    } else if more {
                        Button { Task { await older() } } label: {
                            Group {
                                if loadingOlder { ProgressView() } else { Text("Load earlier messages") }
                            }
                            .font(.footnote.weight(.semibold)).frame(maxWidth: .infinity, minHeight: 44)
                        }
                        .disabled(loadingOlder)
                    } else if let info {
                        intro(info).padding(.bottom, 14)
                    }
                    ForEach(Array(messages.enumerated()), id: \.element.id) { i, m in
                        let prev = i > 0 ? messages[i - 1] : nil
                        let newDay = prev.map { !Calendar.current.isDate($0.at, inSameDayAs: m.at) } ?? true
                        let isNew = m.id == firstNew
                        if newDay && !isThread { dayDivider(m.at) }
                        if isNew { newDivider }
                        ChatMessageView(message: m, grouped: !newDay && !isNew && groups(prev, m), meId: meId, canDelete: m.userId == meId || isAdmin, people: peopleBy, inThread: isThread) { action in
                            handle(action, m)
                        }
                        .id(m.id)
                    }
                    if let last = messages.last, last.userId == meId, !last.pending, let seenAt, last.at <= seenAt {
                        Label("Seen", systemImage: "checkmark").font(.caption2).foregroundStyle(Theme.muted).frame(maxWidth: .infinity, alignment: .trailing).padding(.trailing, 8)
                    }
                    Color.clear.frame(height: 4).id("bottom")
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
            }
            .defaultScrollAnchor(.bottom)
            .scrollDismissesKeyboard(.interactively)
            .onScrollGeometryChange(for: Bool.self) { g in
                g.visibleRect.maxY >= g.contentSize.height - 120
            } action: { _, near in
                atBottom = near
                if near { unseenBelow = false }
            }
            // follow new messages only when you're already at the bottom (or it's yours), like the website
            .onChange(of: messages.last?.id) { _, _ in
                guard let last = messages.last else { return }
                if atBottom || last.userId == meId {
                    withAnimation(.snappy) { proxy.scrollTo("bottom", anchor: .bottom) }
                } else {
                    unseenBelow = true
                }
            }
            .onChange(of: keepInView) { _, id in
                guard let id else { return }
                proxy.scrollTo(id, anchor: .top)
                keepInView = nil
            }
            .overlay(alignment: .bottomTrailing) {
                if !atBottom && !messages.isEmpty {
                    Button {
                        withAnimation(.snappy) { proxy.scrollTo("bottom", anchor: .bottom) }
                    } label: {
                        Image(systemName: "chevron.down").font(.headline.weight(.semibold)).foregroundStyle(Theme.text)
                            .frame(width: 40, height: 40)
                            .glass(in: Circle(), interactive: true)
                            .overlay(alignment: .topTrailing) {
                                if unseenBelow { Circle().fill(Theme.accent).frame(width: 11, height: 11).offset(x: 1, y: -1) }
                            }
                            .frame(width: 44, height: 44)
                            .contentShape(Circle())
                    }
                    .buttonStyle(PressStyle())
                    .padding(.trailing, 12).padding(.bottom, 8)
                    .accessibilityLabel(unseenBelow ? "New messages below. Jump to latest" : "Jump to latest")
                    .transition(.scale.combined(with: .opacity))
                }
            }
            .animation(.snappy, value: atBottom)
        }
    }

    /// Same person, a few minutes apart, nothing in between: one name and photo for the run.
    private func groups(_ prev: ChatMessage?, _ m: ChatMessage) -> Bool {
        guard let prev, let uid = m.userId, prev.userId == uid, !prev.deleted, prev.replyCount == 0 else { return false }
        return m.at.timeIntervalSince(prev.at) < 300
    }

    private var newDivider: some View {
        HStack(spacing: 8) {
            Rectangle().fill(Theme.red.opacity(0.6)).frame(height: 1)
            Text("NEW").font(.caption2.weight(.heavy)).foregroundStyle(.white).padding(.horizontal, 7).padding(.vertical, 2).background(Theme.red, in: Capsule())
        }
        .padding(.vertical, 6)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("New messages")
    }

    @ViewBuilder private var typingLine: some View {
        if !typing.isEmpty {
            HStack(spacing: 6) {
                TypingDots()
                Text(typing.count == 1 ? "\(typing[0]) is typing…" : typing.count == 2 ? "\(typing[0]) and \(typing[1]) are typing…" : "Several people are typing…")
                    .font(.caption).foregroundStyle(Theme.muted)
                Spacer()
            }
            .padding(.horizontal, 16).padding(.vertical, 3)
            .transition(.opacity)
        }
    }

    private func intro(_ info: ChatChannelInfo) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if info.isDM {
                Avatar(name: info.name, url: info.members.first { $0.id != meId }?.photoURL, size: 56)
            } else {
                Image(systemName: info.isPrivate ? "lock.fill" : "number").font(.title2.weight(.bold)).foregroundStyle(Theme.accent)
                    .frame(width: 56, height: 56).background(Theme.accent.opacity(0.15), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            Text(info.isDM ? info.name : "Welcome to #\(info.name)").font(.title3.weight(.bold)).foregroundStyle(Theme.text)
            Text(info.isDM ? "This is the start of your conversation with \(info.name). Only the two of you can see it." : info.isPrivate ? "A private channel: only its members can see it." : "Everyone on the team can read and join #\(info.name).")
                .font(.subheadline).foregroundStyle(Theme.muted)
        }
        .padding(.top, 20)
        .padding(.horizontal, 4)
    }

    private func dayDivider(_ d: Date) -> some View {
        HStack {
            Rectangle().fill(Theme.line).frame(height: 1)
            Text(Calendar.current.isDateInToday(d) ? "Today" : Calendar.current.isDateInYesterday(d) ? "Yesterday" : d.formatted(.dateTime.weekday(.wide).month(.wide).day()))
                .font(.caption.weight(.semibold)).foregroundStyle(Theme.muted)
                .padding(.horizontal, 10).padding(.vertical, 3)
                .glass(in: Capsule())
            Rectangle().fill(Theme.line).frame(height: 1)
        }
        .padding(.vertical, 10)
        .accessibilityElement(children: .combine)
    }

    private func joinBar(_ info: ChatChannelInfo) -> some View {
        HStack {
            Text("Join #\(info.name) to get its new messages.").font(.footnote).foregroundStyle(Theme.muted)
            Spacer()
            Button("Join") { Task { await join() } }
                .buttonStyle(.borderedProminent).controlSize(.small)
        }
        .padding(.horizontal, 14).padding(.vertical, 8)
        .background(Theme.card)
    }

    // @mentions: suggestions for the word you're typing after "@"
    private var mentionQuery: String? {
        guard let at = draft.lastIndex(of: "@") else { return nil }
        let before = at == draft.startIndex ? " " : draft[draft.index(before: at)]
        guard before == " " || before == "\n" else { return nil }
        let q = String(draft[draft.index(after: at)...])
        return q.count <= 24 && !q.contains("\n") && !q.hasSuffix("  ") ? q : nil
    }

    @ViewBuilder private var mentionSuggestions: some View {
        if let q = mentionQuery {
            let options = people.filter { $0.id != meId && (q.isEmpty || $0.name.localizedCaseInsensitiveContains(q)) && "\($0.name) " != q }.prefix(6)
            if !options.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(options)) { p in
                            Button {
                                if let at = draft.lastIndex(of: "@") { draft = String(draft[..<at]) + "@\(p.name) " }
                            } label: {
                                HStack(spacing: 6) {
                                    Avatar(name: p.name, url: p.photoURL, size: 22)
                                    Text(p.name).font(.footnote.weight(.semibold)).foregroundStyle(Theme.text)
                                }
                                .padding(.leading, 4).padding(.trailing, 10).padding(.vertical, 6)
                                .glass(in: Capsule(), interactive: true)
                            }
                            .accessibilityLabel("Mention \(p.name)")
                        }
                    }
                    .padding(.horizontal, 12)
                }
                .padding(.vertical, 6)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
    }

    // files waiting to go out with the next message
    @ViewBuilder private var uploadStrip: some View {
        if !uploads.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(uploads) { u in
                        HStack(spacing: 8) {
                            if let img = u.preview {
                                Image(uiImage: img).resizable().scaledToFill().frame(width: 34, height: 34).clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                            } else {
                                Image(systemName: "doc.fill").foregroundStyle(Theme.accent).frame(width: 34, height: 34).background(Theme.raised, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                            }
                            VStack(alignment: .leading, spacing: 2) {
                                Text(u.name).font(.caption.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1).frame(maxWidth: 120, alignment: .leading)
                                if let e = u.error { Text(e).font(.caption2).foregroundStyle(Theme.red).lineLimit(2).frame(maxWidth: 120, alignment: .leading) }
                                else if u.done == nil { ProgressView(value: u.progress).frame(width: 90) }
                                else { Text("Ready").font(.caption2).foregroundStyle(Theme.green) }
                            }
                            Button { removeUpload(u.id) } label: {
                                Image(systemName: "xmark.circle.fill").foregroundStyle(Theme.muted).frame(width: 32, height: 32).contentShape(Rectangle())
                            }
                            .accessibilityLabel(u.done == nil && u.error == nil ? "Cancel \(u.name)" : "Remove \(u.name)")
                        }
                        .padding(6)
                        .background(Theme.card, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(u.error == nil ? Theme.line : Theme.red.opacity(0.5)))
                        .accessibilityElement(children: .contain)
                    }
                }
                .padding(.horizontal, 12)
            }
            .padding(.top, 6)
        }
    }

    private var readyFiles: [[String: Any]] { uploads.compactMap(\.done) }
    private var uploading: Bool { uploads.contains { $0.done == nil && $0.error == nil } }
    private var canSend: Bool { !uploading && (!draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !readyFiles.isEmpty) }

    private var composer: some View {
        HStack(alignment: .bottom, spacing: 6) {
            if filesOn {
                Menu {
                    Button { pickingPhotos = true } label: { Label("Photos", systemImage: "photo.on.rectangle") }
                    Button { pickingFiles = true } label: { Label("Files", systemImage: "folder") }
                } label: {
                    Image(systemName: "plus").font(.headline.weight(.semibold)).foregroundStyle(Theme.text)
                        .frame(width: 38, height: 38)
                        .background(Theme.card, in: Circle())
                        .overlay(Circle().strokeBorder(Theme.line))
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .disabled(uploads.count >= maxFiles)
                .accessibilityLabel("Attach")
            }
            TextField(isThread ? "Reply in thread" : info.map { $0.isDM ? "Message \($0.name)" : "Message #\($0.name)" } ?? "Message", text: $draft, axis: .vertical)
                .lineLimit(1...6)
                .focused($focused)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Theme.line))
                .padding(.vertical, 3)
            Button { Task { await send() } } label: {
                Image(systemName: "arrow.up").font(.headline.weight(.bold)).foregroundStyle(Theme.bg)
                    .frame(width: 38, height: 38)
                    .background(canSend ? Theme.accent : Theme.muted, in: Circle())
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(ElasticStyle())
            .disabled(!canSend)
            .accessibilityLabel(uploading ? "Send, waiting for files to upload" : "Send")
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background(.ultraThinMaterial)
        .animation(.snappy, value: mentionQuery)
    }

    // MARK: data

    private func pageArgs(_ extra: [String: Any] = [:]) -> [String: Any] {
        var a: [String: Any] = ["channelId": channelId]
        if let threadId { a["threadId"] = threadId }
        return a.merging(extra) { _, b in b }
    }

    private func apply(_ p: ChatPageData) {
        if let c = p.channel { info = c }
        if let pm = p.parent { parent = pm }
        let other = info?.members.first { $0.id != meId }?.id
        seenAt = info?.isDM == true ? p.readBy.first { $0.userId == other }?.at : nil
        if typing != (p.typing ?? []) { withAnimation(.snappy) { typing = p.typing ?? [] } }
        cursor = p.cursor
    }

    private func first() async {
        if people.isEmpty {
            // who you are decides which messages are yours (edit, delete, "Seen"): without it, don't show the conversation
            do {
                guard let o: ChatOverview = try await API.shared.act("chatOverview") else { failed = "Couldn’t load the team."; return }
                people = o.people
                meId = o.me.id
                isAdmin = o.isAdmin
                filesOn = o.files ?? false
            } catch {
                failed = error.localizedDescription
                return
            }
        }
        do {
            guard let p: ChatPageData = try await API.shared.act("chatMessages", pageArgs()) else { return }
            rev += 1
            apply(p)
            messages = p.messages
            more = p.more
            failed = nil
            if !isThread {
                newSince = p.myLastReadAt
                // the server's clock, like the website (a phone's clock can be off)
                openedAt = ISO8601DateFormatter.chat.date(from: p.cursor) ?? Date()
                try? await API.shared.run("chatMarkRead", channelId)
                await ChatBadge.shared.refresh()
            }
        } catch {
            failed = error.localizedDescription
        }
    }

    /// Only the channel's details (after renaming it or adding people), without reloading the messages.
    private func refreshInfo() async {
        if let p: ChatPageData = try? await API.shared.act("chatMessages", ["channelId": channelId]), let c = p.channel { info = c }
    }

    private func poll() async {
        guard scenePhase == .active, let cursor, !messages.contains(where: \.pending) else { return }
        let started = rev
        guard let p: ChatPageData = try? await API.shared.act("chatMessages", pageArgs(["since": cursor])) else { return }
        // something changed here while it ran (a send, edit, reaction, delete): its answer may be older than what's on screen,
        // so drop it; the next poll asks again from the same cursor
        guard started == rev, !Task.isCancelled else { return }
        apply(p)
        let known = Set(messages.map(\.id))
        let fresh = p.messages.filter { !known.contains($0.id) }
        guard !p.messages.isEmpty else { return }
        var next = messages
        for m in p.messages {
            if let i = next.firstIndex(where: { $0.id == m.id }) { next[i] = m } else { next.append(m) }
        }
        next.sort { $0.at < $1.at }
        messages = next
        if !fresh.isEmpty {
            if !isThread { try? await API.shared.run("chatMarkRead", channelId) }
            if fresh.contains(where: { $0.userId != meId }) { tick += 1 }
        }
    }

    private func older() async {
        guard !loadingOlder, let firstMessage = messages.first else { return }
        loadingOlder = true
        defer { loadingOlder = false }
        do {
            guard let p: ChatPageData = try await API.shared.act("chatMessages", ["channelId": channelId, "before": ISO8601DateFormatter.chat.string(from: firstMessage.at)]) else { return }
            let known = Set(messages.map(\.id))
            messages.insert(contentsOf: p.messages.filter { !known.contains($0.id) }, at: 0)
            more = p.more
            keepInView = firstMessage.id
        } catch {
            toasts.show(error.localizedDescription, tone: .warn)
        }
    }

    private func join() async {
        do {
            try await API.shared.run("chatJoin", channelId)
            info?.member = true
            try? await API.shared.run("chatMarkRead", channelId)
            await ChatBadge.shared.refresh()
            await refreshInfo()
        } catch {
            toasts.show(error.localizedDescription, tone: .warn)
        }
    }

    private func setMuted(_ muted: Bool) async {
        info?.muted = muted
        do { try await API.shared.run("chatMute", channelId, muted) } catch { info?.muted = !muted; toasts.show(error.localizedDescription, tone: .warn) }
        await ChatBadge.shared.refresh()
    }

    private func send() async {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        let sending = uploads.filter { $0.done != nil }
        let files = sending.compactMap(\.done)
        guard !uploading, !text.isEmpty || !files.isEmpty else { return }
        let body = ChatText.stored(text, people: people)
        draft = ""
        // what failed to upload stays in the strip (with its error) so you can see it didn't go
        uploads.removeAll { $0.done != nil }
        let me = people.first { $0.id == meId }
        var temp = ChatMessage(id: "tmp-\(UUID().uuidString)", userId: meId, name: me?.name ?? "You", photo: me?.photo, body: body.isEmpty ? "📎 Sending \(files.count) \(files.count == 1 ? "file" : "files")…" : body, at: Date(), edited: false, deleted: false, reactions: [], parentId: threadId)
        temp.pending = true
        rev += 1
        withAnimation(.snappy) { messages.append(temp) }
        struct Sent: Decodable { let id: String; let at: Date }
        var args: [String: Any] = ["channelId": channelId, "body": body, "files": files]
        if let threadId { args["parentId"] = threadId }
        do {
            let s: Sent? = try await API.shared.act("chatSend", args)
            rev += 1
            if let s, let i = messages.firstIndex(where: { $0.id == temp.id }) {
                if messages.contains(where: { $0.id == s.id }) {
                    // a poll already brought the real one in
                    messages.remove(at: i)
                } else {
                    messages[i].id = s.id
                    messages[i].at = s.at
                    messages[i].pending = false
                }
            } else {
                messages.removeAll { $0.id == temp.id }
            }
            tick += 1
            // posting in a public channel joins it
            if info?.member == false { info?.member = true; await ChatBadge.shared.refresh() }
            // the files (and their links) come with the next poll, which replaces the placeholder
            if !files.isEmpty || s == nil { await poll() }
        } catch {
            // not sent: your text and files go back to try again
            rev += 1
            withAnimation(.snappy) { messages.removeAll { $0.id == temp.id } }
            if draft.isEmpty { draft = text }
            uploads.insert(contentsOf: sending, at: 0)
            toasts.show("Not sent: \(error.localizedDescription)", tone: .warn)
        }
    }

    private func handle(_ action: ChatMessageView.Action, _ m: ChatMessage) {
        switch action {
        case .react(let emoji):
            withAnimation(.snappy) { toggleReaction(m.id, emoji) }
            tick += 1
            Task {
                do { try await API.shared.run("chatReact", ["messageId": m.id, "emoji": emoji]) } catch {
                    rev += 1
                    withAnimation(.snappy) { toggleReaction(m.id, emoji) }
                    toasts.show(error.localizedDescription, tone: .warn)
                }
            }
        case .edit:
            editing = m
        case .delete:
            deleting = m
        case .copy:
            UIPasteboard.general.string = ChatText.display(m.body, people: peopleBy)
            toasts.show("Copied")
        case .thread:
            openThread = m.id
        case .openFile(let i):
            viewing = ChatMediaStart(messageId: m.id, index: i, inThread: isThread)
        }
    }

    /// Your reaction on or off, as the website does it (undoing it is the same call).
    private func toggleReaction(_ id: String, _ emoji: String) {
        rev += 1
        let toggle: (inout [ChatReaction]) -> Void = { r in
            if let j = r.firstIndex(where: { $0.emoji == emoji }) {
                r[j].count += r[j].mine ? -1 : 1
                if r[j].mine { r[j].names.removeAll { $0 == "You" } } else { r[j].names.append("You") }
                r[j].mine.toggle()
                if r[j].count <= 0 { r.remove(at: j) }
            } else {
                r.append(ChatReaction(emoji: emoji, count: 1, mine: true, names: ["You"]))
            }
        }
        if let i = messages.firstIndex(where: { $0.id == id }) { toggle(&messages[i].reactions) }
        if parent?.id == id, var p = parent { toggle(&p.reactions); parent = p }
    }

    private func setBody(_ id: String, _ body: String, edited: Bool) {
        if let i = messages.firstIndex(where: { $0.id == id }) { messages[i].body = body; messages[i].edited = edited }
        if parent?.id == id { parent?.body = body; parent?.edited = edited }
    }

    private func saveEdit(_ m: ChatMessage, _ text: String) {
        let stored = ChatText.stored(text, people: people)
        guard !stored.isEmpty, stored != m.body else { return }
        rev += 1
        setBody(m.id, stored, edited: true)
        Task {
            do { try await API.shared.run("chatEdit", ["messageId": m.id, "body": stored]) } catch {
                rev += 1
                setBody(m.id, m.body, edited: m.edited)
                toasts.show("Not saved: \(error.localizedDescription)", tone: .warn)
            }
        }
    }

    private func remove(_ m: ChatMessage) {
        let before = messages.first { $0.id == m.id }
        let parentBefore = parent?.id == m.id ? parent : nil
        rev += 1
        withAnimation(.snappy) {
            if let i = messages.firstIndex(where: { $0.id == m.id }) { messages[i].deleted = true; messages[i].body = ""; messages[i].files = []; messages[i].reactions = []; messages[i].leads = [] }
            if parent?.id == m.id { parent?.deleted = true; parent?.body = ""; parent?.files = []; parent?.reactions = []; parent?.leads = [] }
        }
        Task {
            do { try await API.shared.run("chatDelete", m.id) } catch {
                rev += 1
                withAnimation(.snappy) {
                    if let before, let i = messages.firstIndex(where: { $0.id == m.id }) { messages[i] = before }
                    if let parentBefore { parent = parentBefore }
                }
                toasts.show("Not deleted: \(error.localizedDescription)", tone: .warn)
            }
        }
    }

    // MARK: files

    /// Room for one more file in this message (the server takes 10)?
    private func hasRoom() -> Bool {
        if uploads.count < maxFiles { return true }
        toasts.show("Up to \(maxFiles) files in one message.", tone: .warn)
        return false
    }

    private func removeUpload(_ id: UUID) {
        uploadTasks[id]?.cancel()
        uploadTasks[id] = nil
        withAnimation(.snappy) { uploads.removeAll { $0.id == id } }
    }

    private func addPhoto(_ item: PhotosPickerItem) {
        guard hasRoom() else { return }
        let u = ChatUpload(name: "Photo")
        uploads.append(u)
        uploadTasks[u.id] = Task {
            defer { uploadTasks[u.id] = nil }
            guard let data = try? await item.loadTransferable(type: Data.self), let img = UIImage(data: data) else { return fail(u.id, "Couldn’t read that photo.") }
            guard !Task.isCancelled else { return }
            let jpeg = img.jpegData(compressionQuality: 0.85) ?? data
            let name = "Photo \(Date().formatted(.dateTime.year().month(.twoDigits).day(.twoDigits).hour().minute())).jpg".replacingOccurrences(of: "/", with: "-").replacingOccurrences(of: ":", with: ".")
            update(u.id) { $0.name = name; $0.preview = img.preparingThumbnail(of: CGSize(width: 120, height: 120)) ?? img }
            await upload(u.id, data: jpeg, name: name, mime: "image/jpeg")
        }
    }

    private func addFile(_ url: URL) {
        guard hasRoom() else { return }
        let u = ChatUpload(name: url.lastPathComponent)
        uploads.append(u)
        uploadTasks[u.id] = Task {
            defer { uploadTasks[u.id] = nil }
            // read it off the main thread (a big PDF would freeze the screen)
            let data: Data? = await Task.detached {
                let ok = url.startAccessingSecurityScopedResource()
                defer { if ok { url.stopAccessingSecurityScopedResource() } }
                return try? Data(contentsOf: url)
            }.value
            guard let data else { return fail(u.id, "Couldn’t read that file.") }
            guard !Task.isCancelled else { return }
            let type = UTType(filenameExtension: url.pathExtension)
            let img = type?.conforms(to: .image) == true ? UIImage(data: data) : nil
            if let img { update(u.id) { $0.preview = img.preparingThumbnail(of: CGSize(width: 120, height: 120)) ?? img } }
            await upload(u.id, data: data, name: url.lastPathComponent, mime: type?.preferredMIMEType ?? "application/octet-stream")
        }
    }

    private func update(_ id: UUID, _ f: (inout ChatUpload) -> Void) {
        if let i = uploads.firstIndex(where: { $0.id == id }) { f(&uploads[i]) }
    }

    private func fail(_ id: UUID, _ msg: String) { update(id) { $0.error = msg } }

    /// Straight to Cloudinary with a ticket from the CRM (private, this channel's folder).
    private func upload(_ id: UUID, data: Data, name: String, mime: String) async {
        struct Ticket: Decodable { let url: String; let fields: [String: String]; let maxBytes: Int }
        struct Answer: Decodable { let public_id: String?; let resource_type: String?; let format: String?; let bytes: Int?; let width: Int?; let height: Int?; struct E: Decodable { let message: String }; let error: E? }
        do {
            guard let t: Ticket = try await API.shared.act("chatUploadTicket", channelId), let url = URL(string: t.url) else { return fail(id, "Couldn’t start the upload.") }
            if data.count > t.maxBytes { return fail(id, "Too big: up to \(t.maxBytes / 1_048_576) MB.") }
            let boundary = "igani-\(UUID().uuidString)"
            var body = Data()
            func part(_ s: String) { body.append(Data(s.utf8)) }
            for (k, v) in t.fields { part("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(k)\"\r\n\r\n\(v)\r\n") }
            part("--\(boundary)\r\nContent-Disposition: form-data; name=\"file\"; filename=\"\(name.replacingOccurrences(of: "\"", with: ""))\"\r\nContent-Type: \(mime)\r\n\r\n")
            body.append(data)
            part("\r\n--\(boundary)--\r\n")
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
            req.timeoutInterval = 300
            update(id) { $0.progress = 0.02 }
            let progress = UploadProgress { sent in
                Task { @MainActor in update(id) { $0.progress = max($0.progress, 0.02 + sent * 0.93) } }
            }
            let (resp, _) = try await URLSession.shared.upload(for: req, from: body, delegate: progress)
            guard let a = try? JSONDecoder().decode(Answer.self, from: resp) else { return fail(id, "The upload failed. Try again.") }
            guard let pid = a.public_id else { return fail(id, a.error?.message ?? "The upload failed.") }
            let isImage = mime.hasPrefix("image/") && a.resource_type == "image" && a.format != "pdf"
            let file: [String: Any] = [
                "publicId": pid, "kind": isImage ? "image" : "file", "resourceType": a.resource_type ?? "raw",
                "format": a.format ?? NSNull(), "name": name, "bytes": a.bytes ?? data.count, "mime": mime,
                "width": a.width ?? NSNull(), "height": a.height ?? NSNull(),
            ]
            update(id) { $0.progress = 1; $0.done = file }
        } catch {
            // removed from the strip: nothing to say
            if Task.isCancelled || (error as? URLError)?.code == .cancelled { return }
            fail(id, error.localizedDescription)
        }
    }
}

/// Reports how much of an upload has gone (URLSession calls it as the body is sent).
private final class UploadProgress: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    let onProgress: @Sendable (Double) -> Void
    init(_ onProgress: @escaping @Sendable (Double) -> Void) { self.onProgress = onProgress }
    func urlSession(_ session: URLSession, task: URLSessionTask, didSendBodyData bytesSent: Int64, totalBytesSent: Int64, totalBytesExpectedToSend: Int64) {
        guard totalBytesExpectedToSend > 0 else { return }
        onProgress(Double(totalBytesSent) / Double(totalBytesExpectedToSend))
    }
}

private struct TypingDots: View {
    @State private var on = false
    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<3) { i in
                Circle().fill(Theme.muted).frame(width: 5, height: 5)
                    .offset(y: on ? -2 : 1)
                    .animation(.easeInOut(duration: 0.45).repeatForever().delay(Double(i) * 0.15), value: on)
            }
        }
        .onAppear { on = true }
        .accessibilityHidden(true)
    }
}

extension ISO8601DateFormatter {
    static let chat: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
}

// MARK: - One message

struct ChatMessageView: View {
    enum Action { case react(String), edit, delete, copy, thread, openFile(Int) }
    let message: ChatMessage
    let grouped: Bool
    let meId: String
    let canDelete: Bool
    let people: [String: ChatPerson]
    var inThread = false
    let onAction: (Action) -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            if grouped {
                Color.clear.frame(width: 36, height: 1)
            } else {
                Avatar(name: message.name, url: message.photoURL, size: 36)
            }
            VStack(alignment: .leading, spacing: 3) {
                if !grouped {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(message.name).font(.subheadline.weight(.bold)).foregroundStyle(Theme.text)
                        Text(Fmt.time(message.at)).font(.caption2).foregroundStyle(Theme.muted)
                    }
                }
                if message.deleted {
                    Text("This message was deleted.").font(.subheadline.italic()).foregroundStyle(Theme.muted)
                    if !inThread && message.replyCount > 0 { threadSummary }
                } else {
                    if !message.body.isEmpty {
                        Text(ChatText.attributed(message.body, people: people, me: meId))
                            .font(.body)
                            .foregroundStyle(Theme.text)
                            .tint(Theme.accent)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    if !message.files.isEmpty { files }
                    ForEach(message.leads, id: \.id) { l in LeadChip(lead: l) }
                    if message.edited { Text("(edited)").font(.caption2).foregroundStyle(Theme.muted) }
                    if message.failed { Label("Not sent", systemImage: "exclamationmark.circle.fill").font(.caption2).foregroundStyle(Theme.red) }
                    if !message.reactions.isEmpty { reactions }
                    if !inThread && message.replyCount > 0 { threadSummary }
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, grouped ? 2 : 6)
        .padding(.horizontal, 4)
        .opacity(message.pending ? 0.55 : 1)
        .contentShape(Rectangle())
        .contextMenu {
            if !message.deleted && !message.pending {
                ControlGroup {
                    ForEach(ChatText.emoji.prefix(4), id: \.self) { e in Button(e) { onAction(.react(e)) } }
                }
                Menu("More reactions") { ForEach(ChatText.emoji.dropFirst(4), id: \.self) { e in Button(e) { onAction(.react(e)) } } }
                if !inThread { Button { onAction(.thread) } label: { Label("Reply in thread", systemImage: "arrowshape.turn.up.left") } }
                if !message.body.isEmpty { Button { onAction(.copy) } label: { Label("Copy text", systemImage: "doc.on.doc") } }
                if message.userId == meId && !message.body.isEmpty { Button { onAction(.edit) } label: { Label("Edit", systemImage: "pencil") } }
                if canDelete { Button(role: .destructive) { onAction(.delete) } label: { Label("Delete", systemImage: "trash") } }
            }
        }
    }

    private var files: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(message.files.enumerated()), id: \.offset) { i, f in
                ChatFileView(messageId: message.id, index: i, file: f) { onAction(.openFile(i)) }
            }
        }
        .padding(.top, 2)
    }

    private var threadSummary: some View {
        Button { onAction(.thread) } label: {
            HStack(spacing: 6) {
                HStack(spacing: -6) {
                    ForEach(Array(message.repliers.prefix(3).enumerated()), id: \.offset) { _, r in
                        Avatar(name: r.name, url: r.photoURL, size: 20).overlay(Circle().strokeBorder(Theme.bg, lineWidth: 1.5))
                    }
                }
                Text("\(message.replyCount) \(message.replyCount == 1 ? "reply" : "replies")").font(.caption.weight(.bold)).foregroundStyle(Theme.accent)
                if let last = message.lastReplyAt { Text(last.formatted(.relative(presentation: .named))).font(.caption).foregroundStyle(Theme.muted) }
                Image(systemName: "chevron.right").font(.caption2.weight(.bold)).foregroundStyle(Theme.muted)
            }
            .padding(.vertical, 4).padding(.horizontal, 6)
            .background(Theme.card.opacity(0.6), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
        .buttonStyle(PressStyle())
        .padding(.top, 2)
        .accessibilityLabel("Open thread, \(message.replyCount) replies")
    }

    private var reactions: some View {
        HStack(spacing: 6) {
            ForEach(message.reactions, id: \.emoji) { r in
                Button { onAction(.react(r.emoji)) } label: {
                    HStack(spacing: 4) {
                        Text(r.emoji).font(.system(size: 14))
                        Text("\(r.count)").font(.caption.weight(.bold)).monospacedDigit().foregroundStyle(r.mine ? Theme.text : Theme.muted)
                    }
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(r.mine ? Theme.accent.opacity(0.2) : Theme.raised, in: Capsule())
                    .overlay(Capsule().strokeBorder(r.mine ? Theme.accent.opacity(0.6) : Theme.line))
                }
                .buttonStyle(PressStyle())
                .accessibilityLabel("\(r.emoji) \(r.count): \(r.names.joined(separator: ", "))")
            }
        }
        .padding(.top, 2)
    }
}

/// A shared file: photos show inline (tap for full size), other files open in the browser. Links come from the CRM.
struct ChatFileView: View {
    let messageId: String
    let index: Int
    let file: ChatFile
    let onOpen: () -> Void
    @State private var thumb: URL?
    @State private var thumbFailed = false

    var body: some View {
        Group {
            if file.isImage {
                Button(action: onOpen) {
                    let ratio = CGFloat(file.width ?? 4) / CGFloat(max(file.height ?? 3, 1))
                    ZStack {
                        Theme.raised
                        if let thumb {
                            AsyncImage(url: thumb) { phase in
                                switch phase {
                                case .success(let img): img.resizable().scaledToFill()
                                case .failure: Image(systemName: "photo").font(.title2).foregroundStyle(Theme.muted)
                                default: ProgressView()
                                }
                            }
                        } else if thumbFailed {
                            Image(systemName: "photo").font(.title2).foregroundStyle(Theme.muted)
                        } else {
                            ProgressView()
                        }
                    }
                    .aspectRatio(min(max(ratio, 0.6), 2.2), contentMode: .fit)
                    .frame(maxWidth: 240, maxHeight: 260, alignment: .leading)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Theme.line))
                }
                .buttonStyle(PressStyle())
                .accessibilityLabel("Photo \(file.name)")
                .task(id: messageId) {
                    guard thumb == nil, !messageId.hasPrefix("tmp-") else { return }
                    thumb = await link(thumb: true)
                    thumbFailed = thumb == nil
                }
            } else {
                Button(action: onOpen) {
                    HStack(spacing: 10) {
                        Image(systemName: file.mime.contains("pdf") ? "doc.richtext.fill" : "doc.fill").font(.title3).foregroundStyle(Theme.accent)
                            .frame(width: 38, height: 38).background(Theme.accent.opacity(0.14), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                        VStack(alignment: .leading, spacing: 1) {
                            Text(file.name).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1)
                            Text(file.size).font(.caption).foregroundStyle(Theme.muted)
                        }
                        Spacer(minLength: 0)
                        Image(systemName: file.view == nil ? "square.and.arrow.down" : "eye").foregroundStyle(Theme.muted)
                    }
                    .padding(8)
                    .frame(maxWidth: 280)
                    .background(Theme.card, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Theme.line))
                }
                .buttonStyle(PressStyle())
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("File \(file.name), \(file.size)")
                .accessibilityAddTraits(.isButton)
            }
        }
    }

    private func link(thumb: Bool) async -> URL? {
        struct L: Decodable { let url: String }
        let l: L? = try? await API.shared.act("chatFileUrl", messageId, index, thumb)
        return l.flatMap { URL(string: $0.url) }
    }

}

/// A lead linked in a message: tap to open it.
private struct LeadChip: View {
    let lead: ChatLead
    var body: some View {
        NavigationLink(value: Route.lead(lead.id)) {
            HStack(spacing: 10) {
                Avatar(name: lead.name, size: 32)
                VStack(alignment: .leading, spacing: 1) {
                    Text(lead.name).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.text).lineLimit(1)
                    Text([lead.company, lead.status.replacingOccurrences(of: "_", with: " ").capitalized, lead.owner].compactMap { $0 }.joined(separator: " · "))
                        .font(.caption).foregroundStyle(Theme.muted).lineLimit(1)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").font(.caption.weight(.bold)).foregroundStyle(Theme.muted)
            }
            .padding(8)
            .frame(maxWidth: 300)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Theme.line))
        }
        .buttonStyle(PressStyle())
        .padding(.top, 2)
    }
}

// MARK: - Sheets

struct EditMessageSheet: View {
    @State var text: String
    let onSave: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @FocusState private var focused: Bool
    var body: some View {
        NavigationStack {
            TextField("Message", text: $text, axis: .vertical)
                .lineLimit(3...12)
                .focused($focused)
                .onAppear { focused = true }
                .padding(14)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .padding()
                .frame(maxHeight: .infinity, alignment: .top)
                .screenBackground()
                .navigationTitle("Edit message")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save") { onSave(text.trimmingCharacters(in: .whitespacesAndNewlines)); dismiss() }
                            .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                }
        }
        .presentationDetents([.medium, .large])
    }
}

struct NewChannelSheet: View {
    let people: [ChatPerson]
    /// the new channel's id
    let onCreated: (String?) async -> Void
    @Environment(\.dismiss) private var dismiss
    @Environment(Toasts.self) private var toasts
    @State private var name = ""
    @State private var topic = ""
    @State private var isPrivate = false
    @State private var members: Set<String> = []
    @State private var busy = false

    private var slug: String {
        name.lowercased().replacing(#/[^\p{L}\p{N}]+/#, with: "-").trimmingCharacters(in: CharacterSet(charactersIn: "-"))
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Image(systemName: "number").foregroundStyle(Theme.muted)
                        TextField("e.g. sales-floor", text: $name).textInputAutocapitalization(.never)
                    }
                    TextField("Topic (optional)", text: $topic)
                } footer: {
                    if !slug.isEmpty && slug != name { Text("Will be #\(slug)") }
                }
                .listRowBackground(Theme.card)
                Section {
                    Toggle(isOn: $isPrivate) { Label("Private", systemImage: "lock") }
                } footer: {
                    Text(isPrivate ? "Only the people in it can see it." : "Everyone on the team can read and join it.")
                }
                .listRowBackground(Theme.card)
                Section("Add people") {
                    ForEach(people) { p in
                        Button {
                            if members.contains(p.id) { members.remove(p.id) } else { members.insert(p.id) }
                        } label: {
                            HStack(spacing: 12) {
                                Avatar(name: p.name, url: p.photoURL, size: 30)
                                Text(p.name).foregroundStyle(Theme.text)
                                Spacer()
                                if members.contains(p.id) { Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.accent) }
                            }
                        }
                    }
                }
                .listRowBackground(Theme.card)
            }
            .scrollContentBackground(.hidden)
            .screenBackground()
            .navigationTitle("New channel")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    if busy { ProgressView() } else { Button("Create") { Task { await create() } }.disabled(slug.isEmpty) }
                }
            }
            // the app's toasts sit under sheets: show them here too
            .overlay { ToastOverlay() }
        }
        .interactiveDismissDisabled(busy)
    }

    private func create() async {
        busy = true
        defer { busy = false }
        struct Made: Decodable { let id: String }
        do {
            let made: Made? = try await API.shared.act("chatCreateChannel", ["name": name, "topic": topic, "private": isPrivate, "memberIds": Array(members)] as [String: Any])
            await onCreated(made?.id)
            dismiss()
        } catch {
            toasts.show(error.localizedDescription, tone: .warn)
        }
    }
}

struct PeopleSheet: View {
    let title: String
    let people: [ChatPerson]
    let meId: String
    let multi: Bool
    let onPick: ([String]) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var picked: Set<String> = []

    var body: some View {
        NavigationStack {
            List {
                ForEach(people.filter { query.isEmpty || $0.name.localizedCaseInsensitiveContains(query) }) { p in
                    Button {
                        if multi {
                            if picked.contains(p.id) { picked.remove(p.id) } else { picked.insert(p.id) }
                        } else {
                            onPick([p.id])
                            dismiss()
                        }
                    } label: {
                        HStack(spacing: 12) {
                            Avatar(name: p.name, url: p.photoURL, size: 36)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(p.id == meId ? "\(p.name) (you)" : p.name).foregroundStyle(Theme.text)
                                Text(p.roleLabel).font(.caption).foregroundStyle(Theme.muted)
                            }
                            Spacer()
                            if multi, picked.contains(p.id) { Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.accent) }
                        }
                    }
                    .listRowBackground(Theme.card)
                }
            }
            .scrollContentBackground(.hidden)
            .screenBackground()
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search the team")
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                if multi {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Add") { onPick(Array(picked)); dismiss() }.disabled(picked.isEmpty)
                    }
                }
            }
        }
    }
}

struct ChannelInfoSheet: View {
    enum Change { case edited, left, archived, added }
    let info: ChatChannelInfo
    let team: [ChatPerson]
    let isAdmin: Bool
    let onChange: (Change) -> Void
    @Environment(\.dismiss) private var dismiss
    @Environment(Toasts.self) private var toasts
    @State private var name = ""
    @State private var topic = ""
    @State private var adding = false
    @State private var confirmArchive = false
    @State private var confirmLeave = false
    @State private var saving = false

    var body: some View {
        NavigationStack {
            Form {
                if info.canManage {
                    Section("About") {
                        if info.name != "general" { TextField("Name", text: $name).textInputAutocapitalization(.never) }
                        TextField("Topic", text: $topic, axis: .vertical)
                        Button { Task { await save() } } label: {
                            if saving { ProgressView() } else { Text("Save") }
                        }
                        .disabled(saving || (info.name != "general" && name.trimmingCharacters(in: .whitespaces).isEmpty) || (name == info.name && topic == (info.topic ?? "")))
                    }
                    .listRowBackground(Theme.card)
                } else if let t = info.topic, !t.isEmpty {
                    Section("Topic") { Text(t) }.listRowBackground(Theme.card)
                }
                Section("\(info.members.count) \(info.members.count == 1 ? "member" : "members")") {
                    Button { adding = true } label: { Label("Add people", systemImage: "person.badge.plus") }
                    ForEach(info.members) { p in
                        HStack(spacing: 12) {
                            Avatar(name: p.name, url: p.photoURL, size: 30)
                            Text(p.name)
                            Spacer()
                            Text(p.roleLabel).font(.caption).foregroundStyle(Theme.muted)
                        }
                    }
                }
                .listRowBackground(Theme.card)
                if info.name != "general" {
                    Section {
                        if info.member {
                            Button("Leave channel", role: .destructive) { confirmLeave = true }
                        }
                        if info.canManage {
                            Button("Archive channel", role: .destructive) { confirmArchive = true }
                        }
                    }
                    .listRowBackground(Theme.card)
                }
            }
            .scrollContentBackground(.hidden)
            .screenBackground()
            .navigationTitle(info.isPrivate ? "🔒 \(info.name)" : "#\(info.name)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .sheet(isPresented: $adding) {
                PeopleSheet(title: "Add people", people: team.filter { p in !info.members.contains { $0.id == p.id } }, meId: "", multi: true) { ids in
                    Task {
                        do { try await API.shared.run("chatAddMembers", ["channelId": info.id, "userIds": ids] as [String: Any]); onChange(.added) } catch { toasts.show(error.localizedDescription, tone: .warn) }
                    }
                }
            }
            .confirmationDialog(info.isPrivate ? "Leave #\(info.name)? Someone in it will have to add you back." : "Leave #\(info.name)?", isPresented: $confirmLeave, titleVisibility: .visible) {
                Button("Leave", role: .destructive) {
                    Task {
                        do { try await API.shared.run("chatLeave", info.id); dismiss(); onChange(.left) } catch { toasts.show(error.localizedDescription, tone: .warn) }
                    }
                }
            }
            .confirmationDialog("Archive #\(info.name) for everyone?", isPresented: $confirmArchive, titleVisibility: .visible) {
                Button("Archive", role: .destructive) {
                    Task {
                        do { try await API.shared.run("chatArchiveChannel", info.id); dismiss(); onChange(.archived) } catch { toasts.show(error.localizedDescription, tone: .warn) }
                    }
                }
            }
            .onAppear {
                name = info.name
                topic = info.topic ?? ""
            }
            .overlay { ToastOverlay() }
        }
    }

    private func save() async {
        saving = true
        defer { saving = false }
        do {
            var input: [String: Any] = ["channelId": info.id, "topic": topic]
            if info.name != "general" { input["name"] = name }
            try await API.shared.run("chatUpdateChannel", input)
            dismiss()
            onChange(.edited)
        } catch {
            toasts.show(error.localizedDescription, tone: .warn)
        }
    }
}
