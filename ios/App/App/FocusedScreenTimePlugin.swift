import Foundation
import Capacitor
import SwiftUI
import UIKit
import FamilyControls
import ManagedSettings
import DeviceActivity

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
        CAPPluginMethod(name: "setShieldContent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncSchedules", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setKeepAwake", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hasUsageReport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showUsageReport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setUsageStrings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showUsageEmbed", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hideUsageEmbed", returnType: CAPPluginReturnPromise),
    ]

    static let appGroupId = "group.org.focusedapp.app"
    private static let selectionKey = "app_selection" // lista "block" (chiave storica)
    private static let keepKey = "app_selection_keep"
    private static let blockEndKey = "block_end_at"

    private let store = ManagedSettingsStore()
    private var blockTimer: Timer?
    private var usageHost: UIHostingController<UsageReportView>?

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

    // MARK: - Schermata di blocco

    // Testo della schermata mostrata quando si apre un'app bloccata (estensione
    // FocusedShield): sogno dell'utente, sottotitolo e bottone, gia' nella sua lingua.
    // L'estensione li legge dall'App Group; se mancano usa dei default inglesi.
    @objc func setShieldContent(_ call: CAPPluginCall) {
        let defaults = sharedDefaults
        defaults?.set(call.getString("dream") ?? "", forKey: "shield_dream")
        defaults?.set(call.getString("subtitle") ?? "", forKey: "shield_subtitle")
        defaults?.set(call.getString("button") ?? "", forKey: "shield_button")
        call.resolve()
    }

    // MARK: - Tempo di utilizzo (estensione FocusedReport)

    @objc func hasUsageReport(_ call: CAPPluginCall) {
        call.resolve(["available": true, "embed": true])
    }

    // Stringhe nella lingua dell'utente per la vista del report (l'estensione non conosce la lingua dell'app).
    @objc func setUsageStrings(_ call: CAPPluginCall) {
        let d = sharedDefaults
        d?.set(call.getString("today") ?? "Today", forKey: "usage_today")
        d?.set(call.getString("continuing") ?? "At this rate you'll spend on your phone", forKey: "usage_continuing")
        d?.set(call.getString("yearOne") ?? "year", forKey: "usage_year_one")
        d?.set(call.getString("yearMany") ?? "years", forKey: "usage_year_many")
        call.resolve()
    }

    // Incolla la vista del report sopra la pagina web, nel rettangolo (coordinate della finestra) della
    // scheda in Optimize. La pagina la riposiziona a ogni scroll e la nasconde se la scheda esce dallo schermo.
    @objc func showUsageEmbed(_ call: CAPPluginCall) {
        let frame = CGRect(
            x: call.getDouble("x") ?? 0, y: call.getDouble("y") ?? 0,
            width: call.getDouble("width") ?? 0, height: call.getDouble("height") ?? 0
        )
        DispatchQueue.main.async {
            guard let web = self.bridge?.webView else { call.reject("no_webview"); return }
            if let host = self.usageHost {
                host.view.frame = frame
                host.view.isHidden = false
                call.resolve()
                return
            }
            let host = UIHostingController(rootView: UsageReportView())
            host.view.backgroundColor = .clear
            host.view.frame = frame
            host.view.layer.cornerRadius = 20
            host.view.clipsToBounds = true
            // Figlio del view controller dell'app: la vista di sistema (DeviceActivityReport) vive in un
            // processo remoto e ha bisogno del ciclo di vita completo per mostrarsi.
            if let parent = self.bridge?.viewController {
                parent.addChild(host)
                web.addSubview(host.view)
                host.didMove(toParent: parent)
            } else {
                web.addSubview(host.view)
            }
            self.usageHost = host
            call.resolve()
        }
    }

    @objc func hideUsageEmbed(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.usageHost?.view.isHidden = true
            call.resolve()
        }
    }

    // Apre a schermo la vista di sistema con il tempo di utilizzo di oggi: iOS non passa il
    // numero all'app, lo mostra solo l'estensione.
    @objc func showUsageReport(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let top = self.bridge?.viewController else {
                call.reject("no_view_controller")
                return
            }
            let host = UIHostingController(rootView: UsageReportSheet())
            top.present(host, animated: true)
            call.resolve()
        }
    }

    // MARK: - Schermo sempre acceso

    @objc func setKeepAwake(_ call: CAPPluginCall) {
        let enabled = call.getBool("enabled") ?? false
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = enabled
            call.resolve()
        }
    }

    // MARK: - Programmi ricorrenti

    // Registra i programmi di Focus Time in DeviceActivity: l'estensione FocusedMonitor
    // applica e toglie lo shield all'ora giusta anche con l'app chiusa. Ogni programma
    // genera un intervallo per giorno (weekday 1 = domenica, come Calendar).
    @objc func syncSchedules(_ call: CAPPluginCall) {
        guard AuthorizationCenter.shared.authorizationStatus == .approved else {
            call.resolve(["registered": 0])
            return
        }
        _ = exemptionToken() // lo mette da parte per l'estensione
        let center = DeviceActivityCenter()
        center.stopMonitoring(center.activities.filter { !$0.rawValue.hasPrefix("focus.session") })
        var modes = (sharedDefaults?.dictionary(forKey: "schedule_modes") as? [String: String] ?? [:])
            .filter { $0.key.hasPrefix("focus.session") }
        var registered = 0
        for item in call.getArray("schedules", JSObject.self) ?? [] {
            guard let id = item["id"] as? String,
                  let rawDays = item["days"] as? [Any],
                  let sh = item["startHour"] as? Int, let sm = item["startMinute"] as? Int,
                  let eh = item["endHour"] as? Int, let em = item["endMinute"] as? Int else { continue }
            let mode = (item["mode"] as? String) ?? "selected"
            let days = rawDays.compactMap { ($0 as? NSNumber)?.intValue }
            for day in days {
                let name = DeviceActivityName("focus.\(id).\(day)")
                let schedule = DeviceActivitySchedule(
                    intervalStart: DateComponents(hour: sh, minute: sm, weekday: day),
                    intervalEnd: DateComponents(hour: eh, minute: em, weekday: day),
                    repeats: true
                )
                do {
                    try center.startMonitoring(name, during: schedule)
                    modes[name.rawValue] = mode
                    registered += 1
                } catch {
                    // Intervallo non valido (es. meno di 15 minuti): si salta quel giorno.
                }
            }
        }
        sharedDefaults?.set(modes, forKey: "schedule_modes")
        call.resolve(["registered": registered])
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
            // Focused dovrebbe restare apribile. Se iOS non da' il suo token (succede spesso) non si
            // rinuncia a bloccare: le sessioni da 15 minuti in su le chiude l'estensione FocusedMonitor
            // anche con Focused bloccata; per quelle piu' brevi serve il token, altrimenti non si
            // potrebbe piu' aprire l'app per fermarla.
            let selfToken = exemptionToken()
            if selfToken == nil && endAt.timeIntervalSinceNow < 15 * 60 {
                call.reject("cannot_exempt_self")
                return
            }
            let keep = loadSelection("keep") ?? FamilyActivitySelection()
            var keepApps = keep.applicationTokens
            if let selfToken = selfToken { keepApps.insert(selfToken) }
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
        monitorSession(endAt: endAt, mode: mode)
        call.resolve(["active": true])
    }

    // Token di Focused per escluderla da "tutte tranne". Quando iOS lo restituisce lo salviamo nel
    // contenitore condiviso: l'estensione dei programmi ricorrenti lo ritrova li'.
    private func exemptionToken() -> ApplicationToken? {
        if let id = Bundle.main.bundleIdentifier, let token = Application(bundleIdentifier: id).token {
            if let data = try? JSONEncoder().encode(token) { sharedDefaults?.set(data, forKey: "self_token") }
            return token
        }
        if let data = sharedDefaults?.data(forKey: "self_token") {
            return try? JSONDecoder().decode(ApplicationToken.self, from: data)
        }
        return nil
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

    // Registra la sessione in corso in DeviceActivity: allo scadere e' l'estensione FocusedMonitor
    // a togliere lo shield, cosi' le app si sbloccano anche se Focused e' chiusa. iOS accetta
    // intervalli di almeno 15 minuti: per le sessioni piu' brevi resta il timer dell'app.
    private func monitorSession(endAt: Date, mode: String) {
        let center = DeviceActivityCenter()
        let name = DeviceActivityName("focus.session")
        center.stopMonitoring([name])
        guard endAt.timeIntervalSinceNow >= 15 * 60 else { return }
        let parts: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute]
        let schedule = DeviceActivitySchedule(
            intervalStart: Calendar.current.dateComponents(parts, from: Date()),
            intervalEnd: Calendar.current.dateComponents(parts, from: endAt),
            repeats: false
        )
        var modes = sharedDefaults?.dictionary(forKey: "schedule_modes") as? [String: String] ?? [:]
        modes[name.rawValue] = mode
        sharedDefaults?.set(modes, forKey: "schedule_modes")
        try? center.startMonitoring(name, during: schedule)
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
        DeviceActivityCenter().stopMonitoring([DeviceActivityName("focus.session")])
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

@available(iOS 16.0, *)
extension DeviceActivityReport.Context {
    static let totalActivity = Self("Total Activity")
}

@available(iOS 16.0, *)
private struct UsageReportView: View {
    var body: some View {
        let end = Date()
        let start = Calendar.current.date(byAdding: .day, value: -6, to: Calendar.current.startOfDay(for: end)) ?? end
        DeviceActivityReport(
            .totalActivity,
            filter: DeviceActivityFilter(
                segment: .daily(during: DateInterval(start: start, end: end)),
                users: .all,
                devices: .init([.iPhone, .iPad])
            )
        )
    }
}

@available(iOS 16.0, *)
private struct UsageReportSheet: View {
    var body: some View { UsageReportView() }
}
