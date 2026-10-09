import WidgetKit
import SwiftUI

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
    "fitness": "Fitness", "mente": "Mente", "apprendimento": "Cultura",
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

    static func fetchData() async -> WidgetPayload? {
        guard var token = SharedSession.accessToken else { return nil }
        if SharedSession.isExpired(), let refreshed = await refreshAccessToken() {
            token = refreshed
        }
        guard let url = URL(string: "\(apiBaseUrl)/api/widget-data") else { return nil }

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
        let tasks = [WidgetTaskItem(id: "1", title: "Esempio attività", type: "todo", dueDate: nil)]
        let payload = WidgetPayload(focusScore: 78, focusScoreHistory: history, streak: 5, ranks: ranks, tasks: tasks, gym: gym, date: "")
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

// MARK: - Stile condiviso

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

// MARK: - Focus Score (small: fiamma+numero — medium: + sparkline 7gg)

private struct Sparkline: Shape {
    let values: [Double]

    func path(in rect: CGRect) -> Path {
        var path = Path()
        guard values.count > 1 else { return path }
        let minV = values.min() ?? 0
        let maxV = values.max() ?? 1
        let range = max(maxV - minV, 1)
        let stepX = rect.width / CGFloat(values.count - 1)
        for (i, v) in values.enumerated() {
            let x = CGFloat(i) * stepX
            let y = rect.height - (CGFloat((v - minV) / range) * rect.height)
            if i == 0 { path.move(to: CGPoint(x: x, y: y)) } else { path.addLine(to: CGPoint(x: x, y: y)) }
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

    private func core(_ payload: WidgetPayload, flameSize: CGFloat, numberFont: Font) -> some View {
        VStack(spacing: 8) {
            Image(systemName: "flame.fill")
                .font(.system(size: flameSize))
                .foregroundStyle(.white)
            Text(payload.focusScore != nil ? "\(Int(payload.focusScore!))" : "—")
                .font(numberFont).bold()
            Text("FOCUS SCORE").font(.system(size: 10, weight: .semibold)).tracking(1.5).foregroundStyle(.gray)
        }
    }

    private func smallView(_ payload: WidgetPayload) -> some View {
        core(payload, flameSize: 26, numberFont: .system(size: 42))
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .foregroundStyle(.white)
            .focusedWidgetBackground()
    }

    private func mediumView(_ payload: WidgetPayload) -> some View {
        HStack(spacing: 14) {
            core(payload, flameSize: 22, numberFont: .system(size: 34))
                .frame(width: 108)

            VStack(alignment: .leading, spacing: 6) {
                Text("ULTIMI 7 GIORNI").font(.system(size: 9, weight: .semibold)).tracking(1).foregroundStyle(.gray)
                let values = (payload.focusScoreHistory ?? []).map { $0.score }
                if values.count > 1 {
                    ZStack {
                        SparklineFill(values: values)
                            .fill(LinearGradient(colors: [.white.opacity(0.28), .white.opacity(0)], startPoint: .top, endPoint: .bottom))
                        Sparkline(values: values)
                            .stroke(Color.white, style: StrokeStyle(lineWidth: 2.2, lineCap: .round, lineJoin: .round))
                    }
                    .frame(height: 44)
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

        return VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("I TUOI RANK").font(.system(size: 13, weight: .semibold)).tracking(0.5)
                Spacer()
                Text("LifeGame").font(.system(size: 10)).foregroundStyle(.gray)
            }

            VStack(spacing: 12) {
                ForEach(categoryOrder, id: \.self) { cat in
                    let rankId = ranksByCategory[cat] ?? nil
                    HStack(spacing: 14) {
                        ZStack {
                            Circle().fill(Color(white: 0.06)).overlay(Circle().stroke(Color.white.opacity(0.12)))
                            if let url = rankImageURL(rankId) {
                                AsyncImage(url: url) { image in
                                    image.resizable().scaledToFit().padding(6)
                                } placeholder: { EmptyView() }
                            }
                        }
                        .frame(width: 48, height: 48)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(categoryNames[cat] ?? cat).font(.system(size: 14, weight: .bold))
                            Text(rankId.flatMap { rankNames[$0] } ?? "Nessun rank")
                                .font(.system(size: 11, weight: .semibold)).tracking(0.5).foregroundStyle(.gray)
                        }
                        Spacer()
                    }
                }
            }
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

// MARK: - To-do (lista con check)

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

    private func content(_ payload: WidgetPayload) -> some View {
        let limit = family == .systemLarge ? 6 : 3
        let visible = Array(payload.tasks.prefix(limit))

        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("DA FARE").font(.system(size: 13, weight: .semibold)).tracking(0.5)
                Spacer()
                Text("\(payload.tasks.count)").font(.system(size: 13, weight: .bold)).foregroundStyle(.gray)
            }

            if visible.isEmpty {
                Spacer()
                Text("Nessuna attività in programma").font(.system(size: 12)).foregroundStyle(.gray)
                Spacer()
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(visible.enumerated()), id: \.element.id) { index, task in
                        HStack(spacing: 10) {
                            Circle()
                                .strokeBorder(Color.white.opacity(0.35), lineWidth: 1.6)
                                .frame(width: 17, height: 17)
                            Text(task.title).font(.system(size: 12.5)).lineLimit(1)
                            Spacer()
                        }
                        .padding(.vertical, 8)
                        if index < visible.count - 1 {
                            Divider().overlay(Color.white.opacity(0.08))
                        }
                    }
                }
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
        .configurationDisplayName("Da fare")
        .description("Le tue prossime attività, sempre sott'occhio.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// MARK: - Scheda palestra (foto + nome)

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

            LinearGradient(colors: [.black.opacity(0.25), .black.opacity(0.9)], startPoint: .top, endPoint: .bottom)

            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: "dumbbell.fill").font(.system(size: 11))
                    Text("SCHEDA DI OGGI").font(.system(size: 11, weight: .semibold)).tracking(1.2)
                }
                .foregroundStyle(.gray)
                Spacer()
                Text(gym.title).font(.system(size: 22, weight: .bold))
                HStack {
                    Text("\(gym.exerciseCount) esercizi").font(.system(size: 12)).foregroundStyle(.gray)
                    Spacer()
                    ZStack {
                        Circle().fill(Color.white)
                        Image(systemName: "arrow.right").font(.system(size: 12, weight: .bold)).foregroundStyle(.black)
                    }
                    .frame(width: 30, height: 30)
                }
            }
            .padding()
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
        .configurationDisplayName("Scheda palestra")
        .description("La scheda di oggi, pronta da aprire.")
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
