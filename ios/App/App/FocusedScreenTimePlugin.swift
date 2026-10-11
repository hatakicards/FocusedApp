import Foundation
import Capacitor
import SwiftUI
import UIKit
import FamilyControls
import ManagedSettings

// Blocco app durante le sessioni Focus Time. Gira tutto nell'app principale:
// autorizzazione Family Controls, selezione app (FamilyActivityPicker nativo:
// Apple non dice a nessuna app QUALI app l'utente ha scelto, solo token opachi)
// e shield ManagedSettings per la durata della sessione.
//
// Due liste scelte dall'utente: "block" (app da bloccare) e "keep" (app da lasciare
// attive). Modalita' di blocco: "selected" blocca solo la lista block; "all_except"
// blocca tutto tranne la lista keep. In "all_except" Focused viene SEMPRE esentato
// (token ricavato dal bundle id): se non e' possibile ottenerlo il blocco non parte,
// cosi' l'utente non resta mai chiuso fuori dall'app che deve sbloccare.
//
// Limite noto: senza un'estensione DeviceActivityMonitor nessuno sblocca lo shield
// a sessione finita se l'app e' chiusa. Per questo la fine del blocco e' salvata
// nell'App Group e ogni volta che l'app torna attiva (e al caricamento del
// plugin) lo shield scaduto viene tolto.
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
        CAPPluginMethod(name: "startBlock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopBlock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getBlockState", returnType: CAPPluginReturnPromise),
    ]

    static let appGroupId = "group.org.focusedapp.app"
    private static let selectionKey = "app_selection" // lista "block" (chiave storica)
    private static let keepKey = "app_selection_keep"
    private static let blockEndKey = "block_end_at"

    private let store = ManagedSettingsStore()
    private var blockTimer: Timer?

    private var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: Self.appGroupId)
    }

    public override func load() {
        clearIfExpired()
        NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.clearIfExpired()
        }
    }

    // MARK: - Autorizzazione

    @objc func getAuthorizationStatus(_ call: CAPPluginCall) {
        call.resolve(["status": statusString()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        Task {
            do {
                try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                call.resolve(["status": statusString()])
            } catch {
                call.reject("authorization_failed", nil, error)
            }
        }
    }

    private func statusString() -> String {
        switch AuthorizationCenter.shared.authorizationStatus {
        case .approved: return "authorized"
        case .denied: return "denied"
        case .notDetermined: return "not_determined"
        @unknown default: return "not_determined"
        }
    }

    // MARK: - Selezione app

    @objc func pickApps(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let topVC = self.bridge?.viewController else {
                call.reject("no_view_controller")
                return
            }
            let title = call.getString("title") ?? "Apps"
            let done = call.getString("done") ?? "Done"
            let kind = call.getString("kind") ?? "block"
            let existing = self.loadSelection(kind) ?? FamilyActivitySelection()
            // Lo sheet si puo' chiudere anche trascinandolo giu': la promise va risolta una sola volta.
            var finished = false
            let picker = FamilyActivityPickerHost(selection: existing, title: title, doneLabel: done) { result in
                if finished { return }
                finished = true
                if let result = result { self.saveSelection(result, kind) }
                call.resolve(["count": self.selectionCount(self.loadSelection(kind))])
            }
            let hosting = UIHostingController(rootView: picker)
            topVC.present(hosting, animated: true)
        }
    }

    @objc func getSelectionSummary(_ call: CAPPluginCall) {
        let kind = call.getString("kind") ?? "block"
        call.resolve(["count": selectionCount(loadSelection(kind))])
    }

    private func selectionCount(_ selection: FamilyActivitySelection?) -> Int {
        guard let s = selection else { return 0 }
        return s.applicationTokens.count + s.categoryTokens.count + s.webDomainTokens.count
    }

    // MARK: - Blocco

    @objc func startBlock(_ call: CAPPluginCall) {
        guard AuthorizationCenter.shared.authorizationStatus == .approved else {
            call.reject("not_authorized")
            return
        }
        guard let endAtStr = call.getString("endAt"), let endAt = Self.parseDate(endAtStr) else {
            call.reject("invalid_end_at")
            return
        }
        let mode = call.getString("mode") ?? "selected"
        if mode == "all_except" {
            // Focused deve restare apribile: senza il suo token non blocchiamo nulla.
            guard let selfId = Bundle.main.bundleIdentifier,
                  let selfToken = Application(bundleIdentifier: selfId).token else {
                call.reject("cannot_exempt_self")
                return
            }
            let keep = loadSelection("keep") ?? FamilyActivitySelection()
            var keepApps = keep.applicationTokens
            keepApps.insert(selfToken)
            store.shield.applications = nil
            store.shield.applicationCategories = .all(except: keepApps)
            store.shield.webDomains = nil
            store.shield.webDomainCategories = .all(except: keep.webDomainTokens)
        } else {
            guard let selection = loadSelection("block"), selectionCount(selection) > 0 else {
                call.reject("no_selection")
                return
            }
            store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
            store.shield.applicationCategories = selection.categoryTokens.isEmpty ? nil : .specific(selection.categoryTokens)
            store.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
        }
        sharedDefaults?.set(endAt.timeIntervalSince1970, forKey: Self.blockEndKey)

        scheduleEndTimer(for: endAt)
        call.resolve(["active": true])
    }

    @objc func stopBlock(_ call: CAPPluginCall) {
        endBlock()
        call.resolve(["active": false])
    }

    @objc func getBlockState(_ call: CAPPluginCall) {
        clearIfExpired()
        let end = sharedDefaults?.double(forKey: Self.blockEndKey) ?? 0
        if end > Date().timeIntervalSince1970 {
            call.resolve(["active": true, "endAt": ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: end))])
        } else {
            call.resolve(["active": false])
        }
    }

    private func scheduleEndTimer(for endAt: Date) {
        DispatchQueue.main.async {
            self.blockTimer?.invalidate()
            let interval = max(1, endAt.timeIntervalSinceNow)
            self.blockTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: false) { [weak self] _ in
                self?.endBlock()
            }
        }
    }

    private func endBlock() {
        DispatchQueue.main.async {
            self.blockTimer?.invalidate()
            self.blockTimer = nil
        }
        store.shield.applications = nil
        store.shield.applicationCategories = nil
        store.shield.webDomains = nil
        store.shield.webDomainCategories = nil
        sharedDefaults?.removeObject(forKey: Self.blockEndKey)
        notifyListeners("blockEnded", data: [:])
    }

    private func clearIfExpired() {
        let end = sharedDefaults?.double(forKey: Self.blockEndKey) ?? 0
        if end > 0 && end <= Date().timeIntervalSince1970 {
            endBlock()
        }
    }

    private static func parseDate(_ s: String) -> Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = withFraction.date(from: s) { return d }
        return ISO8601DateFormatter().date(from: s)
    }

    // MARK: - Persistenza selezione

    private func key(_ kind: String) -> String {
        kind == "keep" ? Self.keepKey : Self.selectionKey
    }

    private func saveSelection(_ selection: FamilyActivitySelection, _ kind: String) {
        if let data = try? JSONEncoder().encode(selection) {
            sharedDefaults?.set(data, forKey: key(kind))
        }
    }

    private func loadSelection(_ kind: String) -> FamilyActivitySelection? {
        guard let data = sharedDefaults?.data(forKey: key(kind)) else { return nil }
        return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    }
}

@available(iOS 16.0, *)
private struct FamilyActivityPickerHost: View {
    @State var selection: FamilyActivitySelection
    let title: String
    let doneLabel: String
    let onDone: (FamilyActivitySelection?) -> Void
    @Environment(\.presentationMode) var presentationMode

    var body: some View {
        NavigationView {
            FamilyActivityPicker(selection: $selection)
                .navigationTitle(title)
                .navigationBarTitleDisplayMode(.inline)
                .navigationBarItems(trailing: Button(doneLabel) {
                    onDone(selection)
                    presentationMode.wrappedValue.dismiss()
                })
                .onDisappear { onDone(nil) }
        }
    }
}
