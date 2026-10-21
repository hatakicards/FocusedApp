import DeviceActivity
import SwiftUI

// Il tempo di utilizzo di oggi, letto da Screen Time. iOS non lascia che l'app riceva il
// numero (resta nell'estensione): lo si puo' solo mostrare con questa vista, che l'app
// apre a schermo con DeviceActivityReport (plugin: showUsageReport).
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
    var total: TimeInterval
    var apps: [(name: String, duration: TimeInterval)]
}

struct TotalActivityScene: DeviceActivityReportScene {
    let context: DeviceActivityReport.Context = .totalActivity
    let content: (UsageSummary) -> TotalActivityView

    func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> UsageSummary {
        var total: TimeInterval = 0
        var perApp: [String: TimeInterval] = [:]
        for await activity in data {
            for await segment in activity.activitySegments {
                total += segment.totalActivityDuration
                for await category in segment.categories {
                    for await app in category.applications {
                        let name = app.application.localizedDisplayName ?? app.application.bundleIdentifier ?? "App"
                        perApp[name, default: 0] += app.totalActivityDuration
                    }
                }
            }
        }
        let top = perApp.sorted { $0.value > $1.value }.prefix(8).map { (name: $0.key, duration: $0.value) }
        return UsageSummary(total: total, apps: Array(top))
    }
}

struct TotalActivityView: View {
    let summary: UsageSummary

    private func format(_ t: TimeInterval) -> String {
        let minutes = Int(t / 60)
        let h = minutes / 60
        let m = minutes % 60
        return h > 0 ? "\(h) h \(m) min" : "\(m) min"
    }

    var body: some View {
        VStack(spacing: 20) {
            Text(format(summary.total))
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .padding(.top, 24)
            VStack(spacing: 10) {
                ForEach(Array(summary.apps.enumerated()), id: \.offset) { _, app in
                    HStack {
                        Text(app.name).lineLimit(1)
                        Spacer()
                        Text(format(app.duration)).foregroundColor(.secondary)
                    }
                    .font(.subheadline)
                }
            }
            .padding(.horizontal, 24)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
