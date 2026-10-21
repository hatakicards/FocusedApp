import DeviceActivity
import FamilyControls
import ManagedSettings
import Foundation

// Fa partire e finire da solo il blocco dei programmi ricorrenti di Focus Time
// ("ogni giovedi' 15:00-18:00") anche quando l'app e' chiusa. L'app registra i programmi
// con DeviceActivityCenter (FocusedScreenTimePlugin.syncSchedules) e salva nell'App Group
// la modalita' di ciascuno; qui iOS ci chiama all'inizio e alla fine di ogni intervallo.
final class FocusedMonitorExtension: DeviceActivityMonitor {
    private let store = ManagedSettingsStore()
    private let defaults = UserDefaults(suiteName: "group.org.focusedapp.app")

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        let modes = defaults?.dictionary(forKey: "schedule_modes") as? [String: String] ?? [:]
        applyShield(mode: modes[activity.rawValue] ?? "selected")
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        // Una sessione avviata a mano dall'app e ancora in corso tiene lo shield fino alla sua fine.
        let manualEnd = defaults?.double(forKey: "block_end_at") ?? 0
        if manualEnd > Date().timeIntervalSince1970 { return }
        clearShield()
    }

    private func selection(_ key: String) -> FamilyActivitySelection? {
        guard let data = defaults?.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    }

    private func applyShield(mode: String) {
        if mode == "all_except" {
            // Focused deve restare apribile: senza il suo token non blocchiamo nulla.
            guard let selfToken = Application(bundleIdentifier: "org.focusedapp.app").token else { return }
            let keep = selection("app_selection_keep") ?? FamilyActivitySelection()
            var keepApps = keep.applicationTokens
            keepApps.insert(selfToken)
            store.shield.applications = nil
            store.shield.applicationCategories = .all(except: keepApps)
            store.shield.webDomains = nil
            store.shield.webDomainCategories = .all(except: keep.webDomainTokens)
        } else {
            guard let sel = selection("app_selection") else { return }
            let count = sel.applicationTokens.count + sel.categoryTokens.count + sel.webDomainTokens.count
            if count == 0 { return }
            store.shield.applications = sel.applicationTokens.isEmpty ? nil : sel.applicationTokens
            store.shield.applicationCategories = sel.categoryTokens.isEmpty ? nil : .specific(sel.categoryTokens)
            store.shield.webDomains = sel.webDomainTokens.isEmpty ? nil : sel.webDomainTokens
        }
    }

    private func clearShield() {
        store.shield.applications = nil
        store.shield.applicationCategories = nil
        store.shield.webDomains = nil
        store.shield.webDomainCategories = nil
    }
}
