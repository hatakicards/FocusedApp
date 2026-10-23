import DeviceActivity
import SwiftUI

// Il tempo di utilizzo di oggi, letto da Screen Time, con sotto "continuando cosi' userai il
// telefono per X anni". iOS non lascia che l'app riceva il numero (resta in questa
// estensione): l'app incolla questa vista dentro la scheda di Optimize (plugin: showUsageEmbed).
// I testi arrivano dall'app tramite App Group (setUsageStrings), gia' nella lingua dell'utente.
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

struct UsageSummary {
    var today: TimeInterval
    var average: TimeInterval
}

struct TotalActivityScene: DeviceActivityReportScene {
    let context: DeviceActivityReport.Context = .totalActivity
    let content: (UsageSummary) -> TotalActivityView

    func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> UsageSummary {
        var perDay: [(interval: DateInterval, total: TimeInterval)] = []
        for await activity in data {
            for await segment in activity.activitySegments {
                perDay.append((segment.dateInterval, segment.totalActivityDuration))
            }
        }
        let now = Date()
        let today = perDay.first(where: { $0.interval.contains(now) })?.total ?? 0
        let withData = perDay.filter { $0.total > 60 }
        let average = withData.isEmpty ? today : withData.map { $0.total }.reduce(0, +) / Double(withData.count)
        return UsageSummary(today: today, average: average)
    }
}

struct TotalActivityView: View {
    let summary: UsageSummary
    private let defaults = UserDefaults(suiteName: "group.org.focusedapp.app")

    private func text(_ key: String, _ fallback: String) -> String {
        defaults?.string(forKey: key) ?? fallback
    }

    private func format(_ t: TimeInterval) -> String {
        let minutes = Int(t / 60)
        let h = minutes / 60
        let m = minutes % 60
        return h > 0 ? "\(h) h \(String(format: "%02d", m))" : "\(m) min"
    }

    // Ore al giorno x 80 anni di vita / 24: gli anni passati davanti al telefono.
    private var years: Int {
        let hours = (summary.average > 0 ? summary.average : summary.today) / 3600
        return Int((hours * 80 / 24).rounded(.up))
    }

    private func impact(_ size: CGFloat) -> Font {
        .custom("AvenirNextCondensed-Heavy", size: size)
    }

    var body: some View {
        VStack(spacing: 14) {
            Text(text("usage_today", "Today").uppercased())
                .font(.system(size: 11, weight: .semibold))
                .tracking(2)
                .foregroundColor(.white.opacity(0.55))
            Text(format(summary.today))
                .font(impact(64))
                .foregroundColor(.white)
            Rectangle().fill(Color.white.opacity(0.12)).frame(height: 1).padding(.horizontal, 24)
            if years > 0 {
                Text(text("usage_continuing", "At this rate you'll spend on your phone").uppercased())
                    .font(.system(size: 11, weight: .semibold))
                    .tracking(1.5)
                    .multilineTextAlignment(.center)
                    .foregroundColor(.white.opacity(0.55))
                    .padding(.horizontal, 16)
                Text("\(years) \(text(years == 1 ? "usage_year_one" : "usage_year_many", "years").uppercased())")
                    .font(impact(72))
                    .foregroundColor(.white)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.white.opacity(0.1), lineWidth: 1))
    }
}
