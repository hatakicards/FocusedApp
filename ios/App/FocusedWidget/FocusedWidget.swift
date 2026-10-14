import WidgetKit
import SwiftUI
import UIKit
import AppIntents

// Stessa configurazione di FocusedWidgetSyncPlugin.swift (App Group) e di
// src/lib/supabaseClient.js / capacitor.config.json (URL pubblici, non
// segreti: l'anon key e' pensata per essere usata lato client).
private let appGroupId = "group.org.focusedapp.app"
private let supabaseUrl = "https://thfriiqwnoxespaanbbq.supabase.co"
private let supabaseAnonKey = "sb_publishable_97k8aOwTnW19a-pcxyGHYA_WegOD1DG"
private let apiBaseUrl = "https://focused-app.pages.dev"

// MARK: - Modello dati (stessa forma di functions/api/widget-data.js)

struct WidgetTaskItem: Codable {
    let id: String
    let title: String
    let type: String
    let dueDate: String?
    let dueTime: String?
    let done: Bool?
}

struct WidgetGymInfo: Codable {
    let title: String
    let exerciseCount: Int
    let imageUrl: String?
}

struct WidgetScorePoint: Codable {
    let date: String
    let score: Double
}

struct WidgetRankInfo: Codable {
    let category: String
    let rankId: String?
}

struct WidgetPayload: Codable {
    let focusScore: Double?
    let focusScoreHistory: [WidgetScorePoint]?
    let streak: Int
    let ranks: [WidgetRankInfo]?
    let tasks: [WidgetTaskItem]
    let tasksDone: Int?
    let tasksTotal: Int?
    let gym: WidgetGymInfo?
    let date: String
}

// MARK: - Riferimenti statici (stessa forma di src/lib/constants.js)

private let rankImageFiles: [String: String] = [
    "bronzo": "bronzo.png", "argento": "argento.png", "oro": "oro.png",
    "pro": "pro.png", "elite": "elite.png",
]
private let rankNames: [String: String] = [
    "bronzo": "Bronzo", "argento": "Argento", "oro": "Oro", "pro": "Pro", "elite": "Elite",
]
private let categoryNames: [String: String] = [
    "fitness": "Fitness", "mente": "Mente", "apprendimento": "Apprendimento e Cultura",
]
private let categoryOrder = ["fitness", "mente", "apprendimento"]

private func rankImageURL(_ rankId: String?) -> URL? {
    guard let rankId, let file = rankImageFiles[rankId] else { return nil }
    return URL(string: "\(apiBaseUrl)/images/\(file)")
}

// MARK: - Sessione condivisa scritta da FocusedWidgetSyncPlugin quando l'app fa login/logout

enum SharedSession {
    static var defaults: UserDefaults? { UserDefaults(suiteName: appGroupId) }

    static var accessToken: String? { defaults?.string(forKey: "access_token") }
    static var refreshToken: String? { defaults?.string(forKey: "refresh_token") }
    static var expiresAt: Double? {
        guard let raw = defaults?.string(forKey: "expires_at") else { return nil }
        return Double(raw)
    }

    static func isExpired() -> Bool {
        guard let exp = expiresAt else { return true }
        return Date().timeIntervalSince1970 >= exp - 30
    }

    static func save(accessToken: String, refreshToken: String, expiresAt: Double) {
        defaults?.set(accessToken, forKey: "access_token")
        defaults?.set(refreshToken, forKey: "refresh_token")
        defaults?.set(String(expiresAt), forKey: "expires_at")
    }
}

// MARK: - Rete: legge /api/widget-data, rinnovando il token Supabase se serve.
// Il widget gira in un processo separato dalla WebView e non puo' leggere
// nulla dalla sessione dell'app: deve autenticarsi da solo con i token
// condivisi via App Group.

enum WidgetAPI {
    static func refreshAccessToken() async -> String? {
        guard let refreshToken = SharedSession.refreshToken,
              let url = URL(string: "\(supabaseUrl)/auth/v1/token?grant_type=refresh_token") else { return nil }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["refresh_token": refreshToken])

        guard let (data, response) = try? await URLSession.shared.data(for: request),
              let http = response as? HTTPURLResponse, http.statusCode == 200,
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let newAccessToken = json["access_token"] as? String,
              let newRefreshToken = json["refresh_token"] as? String,
              let expiresIn = json["expires_in"] as? Double
        else { return nil }

        SharedSession.save(accessToken: newAccessToken, refreshToken: newRefreshToken, expiresAt: Date().timeIntervalSince1970 + expiresIn)
        return newAccessToken
    }

    // Spunta / de-spunta un'attivita' direttamente dal widget (stessi campi che scrive l'app).
    static func setTask(id: String, done: Bool) async {
        guard var token = SharedSession.accessToken else { return }
        if SharedSession.isExpired(), let refreshed = await refreshAccessToken() { token = refreshed }
        guard let url = URL(string: "\(supabaseUrl)/rest/v1/task_item?id=eq.\(id)") else { return }

        let fmt = DateFormatter()
        fmt.locale = Locale(identifier: "en_US_POSIX")
        fmt.timeZone = TimeZone(identifier: "UTC")
        fmt.dateFormat = "yyyy-MM-dd"
        let body: [String: Any] = done
            ? ["status": "done", "completed_date": fmt.string(from: Date())]
            : ["status": "active", "completed_date": NSNull(), "rating": NSNull()]

        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        _ = try? await URLSession.shared.data(for: request)
    }

    static func fetchData() async -> WidgetPayload? {
        guard var token = SharedSession.accessToken else { return nil }
        if SharedSession.isExpired(), let refreshed = await refreshAccessToken() {
            token = refreshed
        }
        guard let url = URL(string: "\(apiBaseUrl)/api/widget-data?v=2") else { return nil }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        guard let (data, response) = try? await URLSession.shared.data(for: request) else { return nil }

        if let http = response as? HTTPURLResponse, http.statusCode == 401,
           let refreshed = await refreshAccessToken() {
            var retry = URLRequest(url: url)
            retry.setValue("Bearer \(refreshed)", forHTTPHeaderField: "Authorization")
            guard let (retryData, _) = try? await URLSession.shared.data(for: retry) else { return nil }
            return try? JSONDecoder().decode(WidgetPayload.self, from: retryData)
        }

        return try? JSONDecoder().decode(WidgetPayload.self, from: data)
    }
}

// MARK: - Timeline (condivisa da tutti i widget: stessi dati, viste diverse)

struct FocusedEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayload?
    let loggedOut: Bool
}

struct FocusedProvider: TimelineProvider {
    func placeholder(in context: Context) -> FocusedEntry {
        let history = (0..<7).map { WidgetScorePoint(date: "", score: Double(40 + $0 * 6)) }
        let ranks = categoryOrder.map { WidgetRankInfo(category: $0, rankId: "oro") }
        let gym = WidgetGymInfo(title: "Gym", exerciseCount: 6, imageUrl: nil)
        let tasks = [
            WidgetTaskItem(id: "1", title: "Allenamento gambe", type: "todo", dueDate: nil, dueTime: nil, done: true),
            WidgetTaskItem(id: "2", title: "Chiamare cliente", type: "todo", dueDate: nil, dueTime: "15:00", done: false),
        ]
        let payload = WidgetPayload(focusScore: 78, focusScoreHistory: history, streak: 5, ranks: ranks, tasks: tasks, tasksDone: 1, tasksTotal: 2, gym: gym, date: "")
        return FocusedEntry(date: Date(), payload: payload, loggedOut: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (FocusedEntry) -> Void) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FocusedEntry>) -> Void) {
        Task {
            let nextUpdate = Date().addingTimeInterval(30 * 60)
            guard SharedSession.accessToken != nil else {
                completion(Timeline(entries: [FocusedEntry(date: Date(), payload: nil, loggedOut: true)], policy: .after(nextUpdate)))
                return
            }
            let payload = await WidgetAPI.fetchData()
            completion(Timeline(entries: [FocusedEntry(date: Date(), payload: payload, loggedOut: false)], policy: .after(nextUpdate)))
        }
    }
}

// MARK: - Stile condiviso (nero puro, solo bianco/nero — come "Focused Widgets" del designer)

private let faint = Color(red: 0.34, green: 0.34, blue: 0.35)   // #57575a
private let dim = Color(red: 0.60, green: 0.60, blue: 0.62)     // #9a9a9d
private let rule = Color(red: 0.11, green: 0.11, blue: 0.12)    // #1c1c1e

// Bebas Neue se e' inclusa nell'app (BebasNeue-Regular.ttf nel widget), altrimenti un
// grassetto di sistema che ci si avvicina.
private func display(_ size: CGFloat) -> Font {
    if UIFont(name: "BebasNeue-Regular", size: size) != nil {
        return .custom("BebasNeue-Regular", size: size)
    }
    return .system(size: size, weight: .heavy)
}

extension View {
    @ViewBuilder
    func focusedWidgetBackground() -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(.black, for: .widget)
        } else {
            background(Color.black)
        }
    }
}

private func messageView(icon: String, text: String) -> some View {
    VStack(spacing: 6) {
        Image(systemName: icon).font(.title2)
        Text(text).font(.caption2).multilineTextAlignment(.center)
    }
    .padding()
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .foregroundStyle(.white)
    .focusedWidgetBackground()
}

// MARK: - Focus Score (small: fiamma+numero — medium: + andamento 7 giorni)

private struct Sparkline: Shape {
    let values: [Double]

    func point(_ i: Int, in rect: CGRect) -> CGPoint {
        let minV = values.min() ?? 0
        let maxV = values.max() ?? 1
        let range = max(maxV - minV, 1)
        let stepX = rect.width / CGFloat(max(values.count - 1, 1))
        let x = CGFloat(i) * stepX
        let norm = CGFloat((values[i] - minV) / range)
        let y = rect.height - (norm * rect.height * 0.85) - rect.height * 0.05
        return CGPoint(x: x, y: y)
    }

    func path(in rect: CGRect) -> Path {
        var path = Path()
        guard values.count > 1 else { return path }
        for i in values.indices {
            let pt = point(i, in: rect)
            if i == 0 { path.move(to: pt) } else { path.addLine(to: pt) }
        }
        return path
    }
}

private struct SparklineFill: Shape {
    let values: [Double]

    func path(in rect: CGRect) -> Path {
        var path = Sparkline(values: values).path(in: rect)
        guard values.count > 1 else { return path }
        path.addLine(to: CGPoint(x: rect.width, y: rect.height))
        path.addLine(to: CGPoint(x: 0, y: rect.height))
        path.closeSubpath()
        return path
    }
}

private struct SparklineChart: View {
    let values: [Double]

    var body: some View {
        GeometryReader { geo in
            let rect = CGRect(origin: .zero, size: geo.size)
            ZStack {
                ForEach([0.25, 0.5, 0.75], id: \.self) { f in
                    Path { p in
                        p.move(to: CGPoint(x: 0, y: rect.height * f))
                        p.addLine(to: CGPoint(x: rect.width, y: rect.height * f))
                    }
                    .stroke(rule, lineWidth: 1)
                }
                SparklineFill(values: values)
                    .fill(LinearGradient(colors: [.white.opacity(0.28), .white.opacity(0)], startPoint: .top, endPoint: .bottom))
                Sparkline(values: values)
                    .stroke(Color.white, style: StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))
                if values.count > 1 {
                    let last = Sparkline(values: values).point(values.count - 1, in: rect)
                    Circle().fill(Color.white).frame(width: 8, height: 8).position(x: last.x - 3, y: last.y)
                }
            }
        }
    }
}

private struct FocusScoreEntryView: View {
    var entry: FocusedEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        Group {
            if entry.loggedOut {
                messageView(icon: "bolt.slash", text: "Accedi nell'app per vedere i tuoi progressi")
            } else if let payload = entry.payload {
                if family == .systemMedium {
                    mediumView(payload)
                } else {
                    smallView(payload)
                }
            } else {
                messageView(icon: "wifi.slash", text: "Dati non disponibili al momento")
            }
        }
    }

    private func scoreText(_ payload: WidgetPayload) -> String {
        if let score = payload.focusScore { return "\(Int(score))" }
        return "—"
    }

    private func smallView(_ payload: WidgetPayload) -> some View {
        VStack(spacing: 8) {
            Image(systemName: "flame.fill").font(.system(size: 30)).foregroundStyle(.white)
            Text(scoreText(payload)).font(display(56)).monospacedDigit()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .foregroundStyle(.white)
        .focusedWidgetBackground()
    }

    private func mediumView(_ payload: WidgetPayload) -> some View {
        HStack(spacing: 14) {
            VStack(spacing: 6) {
                Image(systemName: "flame.fill").font(.system(size: 26)).foregroundStyle(.white)
                Text(scoreText(payload)).font(display(48)).monospacedDigit()
            }
            .frame(width: 112)

            VStack(alignment: .leading, spacing: 8) {
                Text("ULTIMI 7 GIORNI").font(display(11)).tracking(1).foregroundStyle(faint)
                let values = (payload.focusScoreHistory ?? []).map { $0.score }
                if values.count > 1 {
                    SparklineChart(values: values).frame(height: 64)
                } else {
                    Spacer()
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .foregroundStyle(.white)
        .focusedWidgetBackground()
    }
}

struct FocusScoreWidget: Widget {
    let kind: String = "FocusScoreWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FocusedProvider()) { entry in
            FocusScoreEntryView(entry: entry)
        }
        .configurationDisplayName("Focus Score")
        .description("Il tuo Focus Score di oggi, con l'andamento della settimana.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Rank (large: badge veri per categoria)

private struct RankEntryView: View {
    var entry: FocusedEntry

    var body: some View {
        Group {
            if entry.loggedOut {
                messageView(icon: "bolt.slash", text: "Accedi nell'app per vedere i tuoi progressi")
            } else if let payload = entry.payload {
                content(payload)
            } else {
                messageView(icon: "wifi.slash", text: "Dati non disponibili al momento")
            }
        }
    }

    private func content(_ payload: WidgetPayload) -> some View {
        let ranksByCategory = Dictionary(uniqueKeysWithValues: (payload.ranks ?? []).map { ($0.category, $0.rankId) })

        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("I TUOI RANK").font(display(18)).tracking(0.7)
                Spacer()
                Text("LifeGame").font(.system(size: 10)).foregroundStyle(faint)
            }

            Spacer(minLength: 0)
            VStack(spacing: 14) {
                ForEach(categoryOrder, id: \.self) { cat in
                    let rankId = ranksByCategory[cat] ?? nil
                    HStack(spacing: 14) {
                        ZStack {
                            Circle().fill(Color(white: 0.05)).overlay(Circle().stroke(Color.white.opacity(0.12)))
                            if let url = rankImageURL(rankId) {
                                AsyncImage(url: url) { image in
                                    image.resizable().scaledToFit().padding(5)
                                } placeholder: { EmptyView() }
                            }
                        }
                        .frame(width: 56, height: 56)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(categoryNames[cat] ?? cat)
                                .font(.system(size: 13.5, weight: .bold)).lineLimit(1)
                            Text((rankId.flatMap { rankNames[$0] } ?? "Nessun rank").uppercased())
                                .font(display(12)).tracking(0.7).foregroundStyle(dim)
                        }
                        Spacer()
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .foregroundStyle(.white)
        .focusedWidgetBackground()
    }
}

struct RankWidget: Widget {
    let kind: String = "RankWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FocusedProvider()) { entry in
            RankEntryView(entry: entry)
        }
        .configurationDisplayName("Rank")
        .description("I tuoi badge per categoria, sempre a colpo d'occhio.")
        .supportedFamilies([.systemLarge])
    }
}

// MARK: - Cose da fare (spuntabili dal widget su iOS 17+)

@available(iOS 17.0, *)
struct ToggleTaskIntent: AppIntent {
    static let title: LocalizedStringResource = "Completa attività"

    @Parameter(title: "Attività") var taskId: String
    @Parameter(title: "Completata") var completed: Bool

    init() {}

    init(taskId: String, completed: Bool) {
        self.taskId = taskId
        self.completed = completed
    }

    func perform() async throws -> some IntentResult {
        await WidgetAPI.setTask(id: taskId, done: completed)
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

private struct TodoEntryView: View {
    var entry: FocusedEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        Group {
            if entry.loggedOut {
                messageView(icon: "bolt.slash", text: "Accedi nell'app per vedere i tuoi progressi")
            } else if let payload = entry.payload {
                content(payload)
            } else {
                messageView(icon: "wifi.slash", text: "Dati non disponibili al momento")
            }
        }
    }

    private func checkCircle(_ done: Bool) -> some View {
        ZStack {
            if done {
                Circle().fill(Color.white)
                Image(systemName: "checkmark").font(.system(size: 10, weight: .black)).foregroundStyle(.black)
            } else {
                Circle().strokeBorder(Color(red: 0.29, green: 0.29, blue: 0.31), lineWidth: 1.6)
            }
        }
        .frame(width: 19, height: 19)
    }

    @ViewBuilder
    private func check(_ task: WidgetTaskItem) -> some View {
        let done = task.done ?? false
        if #available(iOS 17.0, *) {
            Button(intent: ToggleTaskIntent(taskId: task.id, completed: !done)) { checkCircle(done) }
                .buttonStyle(.plain)
        } else {
            checkCircle(done)
        }
    }

    private func content(_ payload: WidgetPayload) -> some View {
        let limit = family == .systemLarge ? 6 : 2
        let visible = Array(payload.tasks.prefix(limit))
        let total = payload.tasksTotal ?? payload.tasks.count
        let doneCount = payload.tasksDone ?? payload.tasks.filter { $0.done ?? false }.count

        return VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("OGGI").font(display(17)).tracking(0.5)
                Spacer()
                Text("\(doneCount)/\(total)").font(display(13)).foregroundStyle(faint)
            }

            if visible.isEmpty {
                Spacer()
                Text("Nessuna attività per oggi").font(.system(size: 12)).foregroundStyle(dim)
                    .frame(maxWidth: .infinity, alignment: .center)
                Spacer()
            } else {
                Spacer(minLength: 0)
                VStack(spacing: 0) {
                    ForEach(Array(visible.enumerated()), id: \.element.id) { index, task in
                        let done = task.done ?? false
                        HStack(spacing: 10) {
                            check(task)
                            Text(task.title)
                                .font(.system(size: 12.5))
                                .lineLimit(1)
                                .strikethrough(done)
                                .foregroundStyle(done ? faint : Color.white)
                            Spacer()
                            if let time = task.dueTime, !time.isEmpty {
                                Text(time).font(.system(size: 10)).foregroundStyle(faint)
                            }
                        }
                        .padding(.vertical, 8)
                        if index < visible.count - 1 {
                            Rectangle().fill(rule).frame(height: 1)
                        }
                    }
                }
                Spacer(minLength: 0)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .foregroundStyle(.white)
        .focusedWidgetBackground()
    }
}

struct TodoWidget: Widget {
    let kind: String = "TodoWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FocusedProvider()) { entry in
            TodoEntryView(entry: entry)
        }
        .configurationDisplayName("Cose da fare")
        .description("L'agenda di oggi: spunta le attività direttamente dal widget.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// MARK: - La scheda (foto + nome + avvio rapido)

private struct GymEntryView: View {
    var entry: FocusedEntry

    var body: some View {
        Group {
            if entry.loggedOut {
                messageView(icon: "bolt.slash", text: "Accedi nell'app per vedere i tuoi progressi")
            } else if let payload = entry.payload {
                if let gym = payload.gym {
                    content(gym)
                } else {
                    messageView(icon: "dumbbell", text: "Nessuna scheda in programma oggi")
                }
            } else {
                messageView(icon: "wifi.slash", text: "Dati non disponibili al momento")
            }
        }
    }

    private func content(_ gym: WidgetGymInfo) -> some View {
        ZStack(alignment: .bottomLeading) {
            if let urlString = gym.imageUrl, let url = URL(string: urlString) {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFill().saturation(0).contrast(1.08)
                } placeholder: {
                    Color(white: 0.08)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .clipped()
            } else {
                Color(white: 0.08)
            }

            LinearGradient(colors: [.black.opacity(0.35), .black.opacity(0.88)], startPoint: .top, endPoint: .bottom)

            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 8) {
                    Image(systemName: "dumbbell.fill").font(.system(size: 12))
                    Text("SCHEDA DI OGGI").font(display(12)).tracking(1.4)
                }
                .foregroundStyle(dim)
                Text(gym.title.uppercased()).font(display(26)).lineLimit(1).padding(.top, 6)
                Spacer(minLength: 0)
                HStack {
                    Text("\(gym.exerciseCount) esercizi").font(.system(size: 12)).foregroundStyle(dim)
                    Spacer()
                    ZStack {
                        Circle().fill(Color.white)
                        Image(systemName: "play.fill").font(.system(size: 13)).foregroundStyle(.black).offset(x: 1)
                    }
                    .frame(width: 32, height: 32)
                }
            }
            .padding(14)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .foregroundStyle(.white)
        .focusedWidgetBackground()
    }
}

struct GymWidget: Widget {
    let kind: String = "GymWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FocusedProvider()) { entry in
            GymEntryView(entry: entry)
        }
        .configurationDisplayName("La scheda")
        .description("L'allenamento di oggi, pronto da aprire.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// MARK: - Bundle

@main
struct FocusedWidgetBundle: WidgetBundle {
    var body: some Widget {
        FocusScoreWidget()
        RankWidget()
        TodoWidget()
        GymWidget()
    }
}
