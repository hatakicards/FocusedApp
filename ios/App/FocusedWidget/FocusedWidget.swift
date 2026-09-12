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
}

struct WidgetPayload: Codable {
    let focusScore: Double?
    let streak: Int
    let tasks: [WidgetTaskItem]
    let gym: WidgetGymInfo?
    let date: String
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

// MARK: - Timeline

struct FocusedEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayload?
    let loggedOut: Bool
}

struct FocusedProvider: TimelineProvider {
    func placeholder(in context: Context) -> FocusedEntry {
        FocusedEntry(date: Date(), payload: WidgetPayload(focusScore: 78, streak: 5, tasks: [], gym: nil, date: ""), loggedOut: false)
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

// MARK: - UI

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

struct FocusedWidgetEntryView: View {
    var entry: FocusedProvider.Entry
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
        .foregroundStyle(.white)
        .focusedWidgetBackground()
    }

    private func messageView(icon: String, text: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon).font(.title2)
            Text(text).font(.caption2).multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func smallView(_ payload: WidgetPayload) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: "flame.fill").foregroundStyle(.orange)
                Text("\(payload.streak)").font(.title2).bold()
            }
            Spacer()
            Text("FOCUS SCORE").font(.system(size: 9)).foregroundStyle(.secondary)
            Text(payload.focusScore != nil ? "\(Int(payload.focusScore!))" : "—").font(.title).bold()
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }

    private func mediumView(_ payload: WidgetPayload) -> some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 4) {
                    Image(systemName: "flame.fill").foregroundStyle(.orange)
                    Text("\(payload.streak)").font(.title3).bold()
                }
                Text("FOCUS SCORE").font(.system(size: 9)).foregroundStyle(.secondary)
                Text(payload.focusScore != nil ? "\(Int(payload.focusScore!))" : "—").font(.title2).bold()
            }
            .frame(width: 90, alignment: .leading)

            VStack(alignment: .leading, spacing: 4) {
                Text("OGGI").font(.system(size: 9)).foregroundStyle(.secondary)
                if let gym = payload.gym {
                    HStack(spacing: 4) {
                        Image(systemName: "dumbbell.fill").font(.caption2)
                        Text(gym.title).font(.caption).lineLimit(1)
                    }
                }
                ForEach(Array(payload.tasks.prefix(2)), id: \.id) { task in
                    Text("• \(task.title)").font(.caption).lineLimit(1)
                }
                if payload.tasks.isEmpty && payload.gym == nil {
                    Text("Nessun impegno oggi").font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct FocusedWidget: Widget {
    let kind: String = "FocusedWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FocusedProvider()) { entry in
            FocusedWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Focused")
        .description("Il tuo streak e il Focus Score di oggi.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct FocusedWidgetBundle: WidgetBundle {
    var body: some Widget {
        FocusedWidget()
    }
}
