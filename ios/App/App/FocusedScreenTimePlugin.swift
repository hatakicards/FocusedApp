import Foundation
import Capacitor
import SwiftUI
import FamilyControls
import ManagedSettings

// Fase 2 dello Screen Time nativo: qui c'e' tutto cio' che si puo' fare senza
// il target "Device Activity Monitor Extension" dedicato (Fase 3) — cioe'
// autorizzazione, selezione app (FamilyActivityPicker nativo, obbligatorio:
// Apple non lascia leggere quali app l'utente ha scelto da nessuna app, la
// nostra compresa), e il blocco immediato in foreground per le sessioni
// Focus Time. L'enforcement in background (soglia giornaliera mentre l'app
// e' chiusa) richiede la Fase 3 e, prima ancora, l'entitlement Family
// Controls approvato da Apple — senza quello requestAuthorization fallisce
// sempre, per design, anche a codice corretto.
@available(iOS 16.0, *)
@objc(FocusedScreenTimePlugin)
public class FocusedScreenTimePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FocusedScreenTimePlugin"
    public let jsName = "FocusedScreenTime"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getAuthorizationStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickApps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSelectionSummary", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setDailyLimit", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearDailyLimit", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleFocusBlock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelFocusBlock", returnType: CAPPluginReturnPromise),
    ]

    static let appGroupId = "group.org.focusedapp.app"
    private let store = ManagedSettingsStore()
    private var focusBlockTimer: Timer?

    private var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: Self.appGroupId)
    }

    @objc func getAuthorizationStatus(_ call: CAPPluginCall) {
        let status: String
        switch AuthorizationCenter.shared.authorizationStatus {
        case .approved: status = "authorized"
        case .denied: status = "denied"
        case .notDetermined: status = "not_determined"
        @unknown default: status = "not_determined"
        }
        call.resolve(["status": status])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        Task {
            do {
                try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                call.resolve(["status": "authorized"])
            } catch {
                // Fallisce sempre cosi' finche' Apple non approva l'entitlement
                // Family Controls per questo bundle ID — non e' un bug nostro.
                call.reject("Autorizzazione negata o entitlement Family Controls non ancora approvato da Apple", nil, error)
            }
        }
    }

    @objc func pickApps(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let topVC = self.bridge?.viewController else {
                call.reject("Nessuna view controller disponibile")
                return
            }
            let existing = self.loadSelection() ?? FamilyActivitySelection()
            let picker = FamilyActivityPickerHost(selection: existing) { result in
                if let result = result {
                    self.saveSelection(result)
                    call.resolve(["count": result.applicationTokens.count + result.categoryTokens.count])
                } else {
                    call.resolve(["count": (self.loadSelection()?.applicationTokens.count ?? 0) + (self.loadSelection()?.categoryTokens.count ?? 0)])
                }
            }
            let hosting = UIHostingController(rootView: picker)
            topVC.present(hosting, animated: true)
        }
    }

    @objc func getSelectionSummary(_ call: CAPPluginCall) {
        let selection = loadSelection() ?? FamilyActivitySelection()
        call.resolve(["count": selection.applicationTokens.count + selection.categoryTokens.count])
    }

    @objc func setDailyLimit(_ call: CAPPluginCall) {
        let minutes = call.getInt("minutes") ?? 0
        sharedDefaults?.set(minutes, forKey: "daily_limit_minutes")
        // L'attivazione vera dello shield al superamento soglia, anche ad app
        // chiusa, richiede il DeviceActivityMonitor della Fase 3.
        call.resolve()
    }

    @objc func clearDailyLimit(_ call: CAPPluginCall) {
        sharedDefaults?.removeObject(forKey: "daily_limit_minutes")
        call.resolve()
    }

    @objc func scheduleFocusBlock(_ call: CAPPluginCall) {
        guard let endAtStr = call.getString("endAt"), let endAt = ISO8601DateFormatter().date(from: endAtStr) else {
            call.reject("endAt mancante o non valido")
            return
        }
        let selection = loadSelection() ?? FamilyActivitySelection()
        store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
        store.shield.applicationCategories = selection.categoryTokens.isEmpty ? nil : .specific(selection.categoryTokens)

        focusBlockTimer?.invalidate()
        let interval = max(1, endAt.timeIntervalSinceNow)
        focusBlockTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: false) { [weak self] _ in
            self?.clearShield()
        }
        call.resolve(["success": true])
    }

    @objc func cancelFocusBlock(_ call: CAPPluginCall) {
        focusBlockTimer?.invalidate()
        focusBlockTimer = nil
        clearShield()
        call.resolve()
    }

    private func clearShield() {
        store.shield.applications = nil
        store.shield.applicationCategories = nil
    }

    private func saveSelection(_ selection: FamilyActivitySelection) {
        if let data = try? JSONEncoder().encode(selection) {
            sharedDefaults?.set(data, forKey: "app_selection")
        }
    }

    private func loadSelection() -> FamilyActivitySelection? {
        guard let data = sharedDefaults?.data(forKey: "app_selection") else { return nil }
        return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    }
}

@available(iOS 16.0, *)
private struct FamilyActivityPickerHost: View {
    @State var selection: FamilyActivitySelection
    let onDone: (FamilyActivitySelection?) -> Void
    @Environment(\.presentationMode) var presentationMode

    var body: some View {
        NavigationView {
            FamilyActivityPicker(selection: $selection)
                .navigationTitle("Scegli le app da bloccare")
                .navigationBarItems(trailing: Button("Fatto") {
                    onDone(selection)
                    presentationMode.wrappedValue.dismiss()
                })
        }
    }
}
