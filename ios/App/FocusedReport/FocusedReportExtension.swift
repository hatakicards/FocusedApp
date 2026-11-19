import DeviceActivity
import FamilyControls
import ManagedSettings
import SwiftUI

// Focus Time (1.5): tempo di utilizzo di oggi letto da Screen Time, grande e in titanio, con
// sotto le 3 app piu' usate oggi (icona, nome, tempo) e il voto della giornata rispetto
// all'obiettivo. iOS non lascia che l'app riceva questi dati: restano in questa estensione e
// l'app incolla la vista nella pagina (plugin: showUsageEmbed). Testi e obiettivo arrivano
// dall'app tramite App Group (setUsageStrings, setUsageGoal), gia' nella lingua dell'utente.
extension DeviceActivityReport.Context {
    static let totalActivity = Self("Total Activity")
}

@main
struct FocusedReportExtension: DeviceActivityReportExtension {
    var body: some DeviceActivityReportScene {
        TotalActivityScene { summary in
            TotalActivityView(summary: summary)
        }
    }
}

struct TopApp: Identifiable {
    let id: String
    let token: ApplicationToken?
    let name: String
    let duration: TimeInterval
}

struct UsageSummary {
    var today: TimeInterval
    var average: TimeInterval
    var topApps: [TopApp]
}

struct TotalActivityScene: DeviceActivityReportScene {
    let context: DeviceActivityReport.Context = .totalActivity
    let content: (UsageSummary) -> TotalActivityView

    func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> UsageSummary {
        var perDay: [(interval: DateInterval, total: TimeInterval)] = []
        var todayApps: [String: TopApp] = [:]
        let now = Date()
        for await activity in data {
            for await segment in activity.activitySegments {
                perDay.append((segment.dateInterval, segment.totalActivityDuration))
                guard segment.dateInterval.contains(now) else { continue }
                for await category in segment.categories {
                    for await app in category.applications {
                        let name = app.application.localizedDisplayName ?? app.application.bundleIdentifier ?? ""
                        let key = app.application.bundleIdentifier ?? name
                        if key.isEmpty { continue }
                        let prev = todayApps[key]?.duration ?? 0
                        todayApps[key] = TopApp(id: key, token: app.application.token, name: name, duration: prev + app.totalActivityDuration)
                    }
                }
            }
        }
        let today = perDay.filter { $0.interval.contains(now) }.map { $0.total }.reduce(0, +)
        let withData = perDay.filter { $0.total > 60 }
        let average = withData.isEmpty ? today : withData.map { $0.total }.reduce(0, +) / Double(withData.count)
        let top = todayApps.values.filter { $0.duration >= 60 }.sorted { $0.duration > $1.duration }.prefix(3)
        return UsageSummary(today: today, average: average, topApps: Array(top))
    }
}

struct TotalActivityView: View {
    let summary: UsageSummary
    private let defaults = UserDefaults(suiteName: "group.org.focusedapp.app")

    private func text(_ key: String, _ fallback: String) -> String {
        let v = defaults?.string(forKey: "usage_\(key)") ?? ""
        return v.isEmpty ? fallback : v
    }

    private func format(_ t: TimeInterval) -> String {
        let minutes = Int(t / 60)
        let h = minutes / 60
        let m = minutes % 60
        if h > 0 { return m > 0 ? "\(h)h \(m)m" : "\(h)h" }
        return "\(m)m"
    }

    private var goalMinutes: Int { defaults?.integer(forKey: "usage_goal_minutes") ?? 0 }

    // Voto 1-5 della giornata: quanto del tuo obiettivo hai usato finora.
    private var vote: Int? {
        guard goalMinutes > 0 else { return nil }
        let ratio = (summary.today / 60) / Double(goalMinutes)
        switch ratio {
        case ..<0.5: return 5
        case ..<0.8: return 4
        case ..<1.0: return 3
        case ..<1.3: return 2
        default: return 1
        }
    }

    private let titanium = LinearGradient(
        colors: [
            Color(red: 0.96, green: 0.96, blue: 0.97),
            Color(red: 0.62, green: 0.63, blue: 0.66),
            Color(red: 0.90, green: 0.90, blue: 0.92),
            Color(red: 0.55, green: 0.56, blue: 0.59),
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    private func caption(_ s: String) -> some View {
        Text(s.uppercased())
            .font(.system(size: 11, weight: .semibold))
            .tracking(1.8)
            .foregroundColor(.white.opacity(0.5))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            caption(text("today", "Today"))
            Text(format(summary.today))
                .font(.system(size: 64, weight: .heavy, design: .rounded))
                .foregroundStyle(titanium)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
                .padding(.top, 2)
            if goalMinutes > 0 {
                let left = Double(goalMinutes) * 60 - summary.today
                Text(left >= 0
                     ? "\(format(left)) \(text("left", "left"))"
                     : "\(format(-left)) \(text("over", "over your goal"))")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.white.opacity(0.55))
            }

            if !summary.topApps.isEmpty {
                Rectangle().fill(Color.white.opacity(0.1)).frame(height: 1).padding(.vertical, 14)
                caption(text("topApps", "Most used"))
                    .padding(.bottom, 8)
                VStack(spacing: 10) {
                    ForEach(summary.topApps) { app in
                        HStack(spacing: 10) {
                            if let token = app.token {
                                Label(token)
                                    .labelStyle(.iconOnly)
                                    .frame(width: 26, height: 26)
                            } else {
                                RoundedRectangle(cornerRadius: 6).fill(Color.white.opacity(0.12)).frame(width: 26, height: 26)
                            }
                            Group {
                                if let token = app.token {
                                    Label(token).labelStyle(.titleOnly)
                                } else {
                                    Text(app.name)
                                }
                            }
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(.white)
                            .lineLimit(1)
                            Spacer(minLength: 8)
                            Text(format(app.duration))
                                .font(.system(size: 15, weight: .semibold, design: .rounded))
                                .monospacedDigit()
                                .foregroundColor(.white.opacity(0.8))
                        }
                    }
                }
            }

            if let vote = vote {
                Rectangle().fill(Color.white.opacity(0.1)).frame(height: 1).padding(.vertical, 14)
                HStack {
                    caption(text("vote", "Today's score"))
                    Spacer()
                    HStack(spacing: 5) {
                        ForEach(1...5, id: \.self) { i in
                            Circle()
                                .fill(i <= vote ? AnyShapeStyle(titanium) : AnyShapeStyle(Color.white.opacity(0.15)))
                                .frame(width: 9, height: 9)
                        }
                    }
                    Text("\(vote)/5")
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(titanium)
                        .padding(.leading, 6)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(20)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color.black)
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color.white.opacity(0.1), lineWidth: 1))
    }
}
