import Foundation
import Capacitor
import SwiftUI
import UIKit
import FamilyControls
import ManagedSettings
import DeviceActivity

// Blocco app di Focus Time (Family Controls + ManagedSettings + DeviceActivity).
//
// 1.5: un solo "blocco corrente" condiviso con l'estensione FocusedMonitor nell'App Group
// (FocusBlockEngine, sotto). Prima l'app sapeva solo delle sessioni avviate a mano: un blocco
// partito da un programma non risultava aperto l'app e restava acceso. Adesso:
// - ogni blocco (sessione o programma) scrive chi l'ha fatto partire, la modalita' e la fine;
// - l'app all'apertura legge lo stato reale (getBlockState) e toglie gli shield rimasti orfani;
// - i programmi si registrano senza spegnere quelli invariati (spegnere un monitor durante il suo
//   intervallo non chiama intervalDidEnd e lasciava le app bloccate per sempre);
// - un programma tutti i giorni usa un solo monitor (iOS ne accetta circa 20 in tutto);
// - pausa: lo shield si toglie per N minuti e torna da solo (monitor "focus.resume").
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
        CAPPluginMethod(name: "pauseBlock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resumeBlock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setShieldContent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncSchedules", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setKeepAwake", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hasUsageReport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showUsageReport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setUsageStrings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setUsageGoal", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showUsageEmbed", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hideUsageEmbed", returnType: CAPPluginReturnPromise),
    ]

    static let appGroupId = FocusBlockEngine.appGroupId
    private static let selectionKey = "app_selection" // lista "block" (chiave storica)
    private static let keepKey = "app_selection_keep"

    private let engine = FocusBlockEngine(selfBundleId: Bundle.main.bundleIdentifier ?? "org.focusedapp.app")
    private var endTimer: Timer?
    private var pauseTimer: Timer?
    private var usageHost: UIHostingController<UsageReportView>?
    private var usageFrame: CGRect = .zero

    private var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: Self.appGroupId)
    }

    public override func load() {
        reconcileAndArmTimers()
        NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.reconcileAndArmTimers()
        }
    }

    private var isAuthorized: Bool {
        AuthorizationCenter.shared.authorizationStatus == .approved
    }

    // Allinea lo shield allo stato salvato e prepara i timer di fine blocco e fine pausa
    // (servono quando l'app e' aperta; ad app chiusa ci pensa l'estensione).
    private func reconcileAndArmTimers() {
        guard isAuthorized else { return }
        let before = engine.currentBlock()
        engine.reconcile()
        let after = engine.currentBlock()
        if before != nil && after == nil { notifyListeners("blockEnded", data: [:]) }
        armTimers()
    }

    private func armTimers() {
        DispatchQueue.main.async {
            self.endTimer?.invalidate()
            self.pauseTimer?.invalidate()
            self.endTimer = nil
            self.pauseTimer = nil
            guard let block = self.engine.currentBlock() else { return }
            let endIn = block.endAt - Date().timeIntervalSince1970
            if endIn > 0 {
                self.endTimer = Timer.scheduledTimer(withTimeInterval: max(1, endIn), repeats: false) { [weak self] _ in
                    self?.reconcileAndArmTimers()
                }
            }
            let pauseIn = self.engine.pauseUntil - Date().timeIntervalSince1970
            if self.engine.pauseUntil > 0 && pauseIn > 0 {
                self.pauseTimer = Timer.scheduledTimer(withTimeInterval: max(1, pauseIn), repeats: false) { [weak self] _ in
                    self?.reconcileAndArmTimers()
                    self?.notifyListeners("blockResumed", data: [:])
                }
            }
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
                if let result = result {
                    self.saveSelection(result, kind)
                    // Un blocco in corso usa subito la nuova lista.
                    self.engine.reapplyIfActive()
                }
                let sel = self.loadSelection(kind)
                call.resolve([
                    "count": self.selectionCount(sel),
                    "apps": sel?.applicationTokens.count ?? 0,
                    "categories": sel?.categoryTokens.count ?? 0,
                    "overLimit": (sel?.applicationTokens.count ?? 0) > FocusBlockEngine.maxTokens,
                ])
            }
            let hosting = UIHostingController(rootView: picker)
            topVC.present(hosting, animated: true)
        }
    }

    @objc func getSelectionSummary(_ call: CAPPluginCall) {
        let kind = call.getString("kind") ?? "block"
        let sel = loadSelection(kind)
        call.resolve([
            "count": selectionCount(sel),
            "apps": sel?.applicationTokens.count ?? 0,
            "categories": sel?.categoryTokens.count ?? 0,
            "overLimit": (sel?.applicationTokens.count ?? 0) > FocusBlockEngine.maxTokens,
        ])
    }

    private func selectionCount(_ selection: FamilyActivitySelection?) -> Int {
        guard let s = selection else { return 0 }
        return s.applicationTokens.count + s.categoryTokens.count + s.webDomainTokens.count
    }

    // MARK: - Schermata di blocco

    // Testo della schermata mostrata quando si apre un'app bloccata (estensione
    // FocusedShield): sogno dell'utente, sottotitolo e bottone, gia' nella sua lingua.
    @objc func setShieldContent(_ call: CAPPluginCall) {
        let defaults = sharedDefaults
        defaults?.set(call.getString("dream") ?? "", forKey: "shield_dream")
        defaults?.set(call.getString("subtitle") ?? "", forKey: "shield_subtitle")
        defaults?.set(call.getString("button") ?? "", forKey: "shield_button")
        call.resolve()
    }

    // MARK: - Tempo di utilizzo (estensione FocusedReport)

    @objc func hasUsageReport(_ call: CAPPluginCall) {
        call.resolve(["available": true, "embed": true, "version": 2])
    }

    // Stringhe nella lingua dell'utente per la vista del report (l'estensione non conosce la lingua dell'app).
    @objc func setUsageStrings(_ call: CAPPluginCall) {
        let d = sharedDefaults
        for key in ["today", "goal", "vote", "topApps", "noData", "continuing", "yearOne", "yearMany", "over", "left"] {
            if let v = call.getString(key) { d?.set(v, forKey: "usage_\(key)") }
        }
        call.resolve()
    }

    // Obiettivo di tempo di utilizzo al giorno (minuti): l'estensione lo usa per il voto.
    @objc func setUsageGoal(_ call: CAPPluginCall) {
        let minutes = max(0, call.getInt("minutes") ?? 0)
        sharedDefaults?.set(minutes, forKey: "usage_goal_minutes")
        // La vista di sistema non si accorge del cambio: la ricreo.
        DispatchQueue.main.async {
            if let host = self.usageHost {
                let wasHidden = host.view.isHidden
                host.willMove(toParent: nil)
                host.view.removeFromSuperview()
                host.removeFromParent()
                self.usageHost = nil
                if !wasHidden { self.mountUsageHost(frame: self.usageFrame) }
            }
            call.resolve()
        }
    }

    // Incolla la vista del report sopra la pagina web, nel rettangolo (coordinate della finestra) della
    // scheda in Focus Time. La pagina la riposiziona a ogni scroll e la nasconde se la scheda esce dallo schermo.
    @objc func showUsageEmbed(_ call: CAPPluginCall) {
        let frame = CGRect(
            x: call.getDouble("x") ?? 0, y: call.getDouble("y") ?? 0,
            width: call.getDouble("width") ?? 0, height: call.getDouble("height") ?? 0
        )
        DispatchQueue.main.async {
            self.usageFrame = frame
            if let host = self.usageHost {
                host.view.frame = frame
                host.view.isHidden = false
                call.resolve()
                return
            }
            self.mountUsageHost(frame: frame)
            call.resolve()
        }
    }

    private func mountUsageHost(frame: CGRect) {
        guard let web = self.bridge?.webView else { return }
        let host = UIHostingController(rootView: UsageReportView())
        host.view.backgroundColor = .clear
        host.view.frame = frame
        host.view.layer.cornerRadius = 24
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
    }

    @objc func hideUsageEmbed(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.usageHost?.view.isHidden = true
            call.resolve()
        }
    }

    // Apre a schermo la vista di sistema con il tempo di utilizzo di oggi.
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

    // Registra i programmi di Focus Time in DeviceActivity: l'estensione FocusedMonitor applica e
    // toglie lo shield all'ora giusta anche con l'app chiusa. Un programma su tutti i giorni usa un
    // solo monitor; uno su alcuni giorni ne usa uno per giorno (weekday 1 = domenica). I monitor
    // gia' registrati e invariati non si toccano.
    @objc func syncSchedules(_ call: CAPPluginCall) {
        guard isAuthorized else {
            call.resolve(["registered": 0, "skipped": 0, "failed": 0, "reason": "not_authorized"])
            return
        }
        _ = engine.selfToken() // lo mette da parte per l'estensione
        let center = DeviceActivityCenter()

        var desired: [String: (schedule: DeviceActivitySchedule, meta: [String: Any], sig: String)] = [:]
        var order: [String] = []
        for item in call.getArray("schedules", JSObject.self) ?? [] {
            guard let id = item["id"] as? String,
                  let rawDays = item["days"] as? [Any],
                  let sh = (item["startHour"] as? NSNumber)?.intValue, let sm = (item["startMinute"] as? NSNumber)?.intValue,
                  let eh = (item["endHour"] as? NSNumber)?.intValue, let em = (item["endMinute"] as? NSNumber)?.intValue else { continue }
            let mode = (item["mode"] as? String) ?? "selected"
            let days = Array(Set(rawDays.compactMap { ($0 as? NSNumber)?.intValue }.filter { $0 >= 1 && $0 <= 7 })).sorted()
            if days.isEmpty { continue }
            let entries = days.count == 7 ? [0] : days
            for day in entries {
                let name = day == 0 ? "focus.\(id).all" : "focus.\(id).\(day)"
                let start = day == 0 ? DateComponents(hour: sh, minute: sm) : DateComponents(hour: sh, minute: sm, weekday: day)
                let end = day == 0 ? DateComponents(hour: eh, minute: em) : DateComponents(hour: eh, minute: em, weekday: day)
                let meta: [String: Any] = ["id": id, "mode": mode, "sh": sh, "sm": sm, "eh": eh, "em": em, "day": day]
                desired[name] = (DeviceActivitySchedule(intervalStart: start, intervalEnd: end, repeats: true), meta, "\(day)|\(sh):\(sm)-\(eh):\(em)|\(mode)")
                order.append(name)
            }
        }

        let kept = Array(order.prefix(FocusBlockEngine.maxScheduleMonitors))
        let keptSet = Set(kept)
        let oldSigs = sharedDefaults?.dictionary(forKey: "schedule_signatures") as? [String: String] ?? [:]
        let current = center.activities.filter { $0 != FocusBlockEngine.sessionName && $0 != FocusBlockEngine.resumeName }
        let toStop = current.filter { !keptSet.contains($0.rawValue) || oldSigs[$0.rawValue] != desired[$0.rawValue]?.sig }
        if !toStop.isEmpty { center.stopMonitoring(toStop) }
        let stillRunning = Set(current.map { $0.rawValue }).subtracting(toStop.map { $0.rawValue })

        var meta: [String: [String: Any]] = [:]
        var sigs: [String: String] = [:]
        var registered = 0
        var failed = 0
        for name in kept {
            guard let d = desired[name] else { continue }
            meta[name] = d.meta
            if stillRunning.contains(name) {
                sigs[name] = d.sig
                registered += 1
                continue
            }
            do {
                try center.startMonitoring(DeviceActivityName(name), during: d.schedule)
                sigs[name] = d.sig
                registered += 1
            } catch {
                failed += 1 // intervallo non valido (es. meno di 15 minuti)
            }
        }
        sharedDefaults?.set(meta, forKey: FocusBlockEngine.metaKey)
        sharedDefaults?.set(sigs, forKey: "schedule_signatures")

        // Programma tolto, spento o cambiato mentre era in corso: il suo blocco si aggiorna o finisce;
        // un programma che e' in corso adesso parte subito (iOS puo' non chiamare intervalDidStart
        // per un intervallo gia' iniziato).
        reconcileAndArmTimers()
        call.resolve(["registered": registered, "skipped": order.count - kept.count, "failed": failed])
    }

    // MARK: - Blocco

    @objc func startBlock(_ call: CAPPluginCall) {
        guard isAuthorized else {
            call.reject("not_authorized")
            return
        }
        guard let endAtStr = call.getString("endAt"), let endAt = Self.parseDate(endAtStr) else {
            call.reject("invalid_end_at")
            return
        }
        let mode = call.getString("mode") ?? "selected"
        if mode == "all_except" && engine.selfToken() == nil && endAt.timeIntervalSinceNow < 15 * 60 {
            // Senza il token di Focused e senza il monitor (sotto i 15 minuti) non si potrebbe piu'
            // aprire l'app per fermare il blocco.
            call.reject("cannot_exempt_self")
            return
        }
        let effective = engine.startSession(id: call.getString("id") ?? "", mode: mode, endAt: endAt)
        armTimers()
        call.resolve(["active": engine.shieldApplied, "mode": effective, "version": 2])
    }

    @objc func stopBlock(_ call: CAPPluginCall) {
        engine.stopCurrent(dismissSchedule: call.getBool("dismissSchedule") ?? true)
        armTimers()
        notifyListeners("blockEnded", data: [:])
        call.resolve(["active": engine.currentBlock() != nil])
    }

    @objc func pauseBlock(_ call: CAPPluginCall) {
        let minutes = max(1, call.getInt("minutes") ?? 15)
        let result = engine.pause(minutes: minutes)
        armTimers()
        var data: [String: Any] = ["paused": result.paused, "ended": result.ended, "resumeMonitor": result.monitored]
        if result.paused { data["pausedUntil"] = Self.iso(engine.pauseUntil) }
        if result.ended { notifyListeners("blockEnded", data: [:]) }
        call.resolve(data)
    }

    @objc func resumeBlock(_ call: CAPPluginCall) {
        engine.resume()
        armTimers()
        call.resolve(["active": engine.shieldApplied])
    }

    @objc func getBlockState(_ call: CAPPluginCall) {
        if isAuthorized { engine.reconcile() }
        armTimers()
        guard let block = engine.currentBlock() else {
            call.resolve(["active": false, "version": 2])
            return
        }
        var data: [String: Any] = [
            "active": true,
            "version": 2,
            "source": block.source,
            "scheduleId": block.source == "schedule" ? block.id : "",
            "sessionId": block.source == "session" ? block.id : "",
            "mode": block.mode,
            "endAt": Self.iso(block.endAt),
            "shieldApplied": engine.shieldApplied,
        ]
        if engine.pauseUntil > Date().timeIntervalSince1970 {
            data["paused"] = true
            data["pausedUntil"] = Self.iso(engine.pauseUntil)
        } else {
            data["paused"] = false
        }
        call.resolve(data)
    }

    private static func iso(_ t: Double) -> String {
        ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: t))
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

// MARK: - Motore del blocco
//
// STESSA LOGICA in ios/App/FocusedMonitor/FocusedMonitorExtension.swift (FocusBlockEngine):
// le due copie vanno tenute uguali. Sono due target diversi e l'estensione non vede i file dell'app.
@available(iOS 16.0, *)
struct FocusBlockEngine {
    static let appGroupId = "group.org.focusedapp.app"
    static let maxTokens = 50              // limite di ManagedSettings per lista di app / siti
    static let maxScheduleMonitors = 18    // iOS ne accetta ~20: 2 restano a sessione e ripresa
    static let sessionName = DeviceActivityName("focus.session")
    static let resumeName = DeviceActivityName("focus.resume")
    static let metaKey = "schedule_meta"
    static let tolerance: Double = 120     // secondi di margine sui bordi degli intervalli

    struct Block: Equatable {
        var source: String // "session" | "schedule"
        var id: String
        var name: String
        var mode: String
        var endAt: Double
    }

    let selfBundleId: String
    let store = ManagedSettingsStore()
    let defaults = UserDefaults(suiteName: FocusBlockEngine.appGroupId)

    private var now: Double { Date().timeIntervalSince1970 }

    // MARK: stato

    func currentBlock() -> Block? {
        guard let d = defaults?.dictionary(forKey: "current_block"),
              let source = d["source"] as? String,
              let mode = d["mode"] as? String,
              let endAt = (d["endAt"] as? NSNumber)?.doubleValue else { return nil }
        return Block(source: source, id: d["id"] as? String ?? "", name: d["name"] as? String ?? "", mode: mode, endAt: endAt)
    }

    func setCurrentBlock(_ b: Block?) {
        guard let b = b else {
            defaults?.removeObject(forKey: "current_block")
            defaults?.removeObject(forKey: "block_end_at")
            return
        }
        defaults?.set(["source": b.source, "id": b.id, "name": b.name, "mode": b.mode, "endAt": b.endAt], forKey: "current_block")
        // Chiave storica letta dalle versioni precedenti dell'estensione.
        if b.source == "session" { defaults?.set(b.endAt, forKey: "block_end_at") } else { defaults?.removeObject(forKey: "block_end_at") }
    }

    var pauseUntil: Double { defaults?.double(forKey: "pause_until") ?? 0 }

    func setPauseUntil(_ v: Double?) {
        if let v = v { defaults?.set(v, forKey: "pause_until") } else { defaults?.removeObject(forKey: "pause_until") }
    }

    var shieldApplied: Bool {
        store.shield.applications != nil || store.shield.applicationCategories != nil
            || store.shield.webDomains != nil || store.shield.webDomainCategories != nil
    }

    // MARK: shield

    func selection(_ key: String) -> FamilyActivitySelection? {
        guard let data = defaults?.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    }

    // Token di Focused per escluderla da "tutte tranne": salvato quando iOS lo restituisce.
    func selfToken() -> ApplicationToken? {
        if let token = Application(bundleIdentifier: selfBundleId).token {
            if let data = try? JSONEncoder().encode(token) { defaults?.set(data, forKey: "self_token") }
            return token
        }
        if let data = defaults?.data(forKey: "self_token") {
            return try? JSONDecoder().decode(ApplicationToken.self, from: data)
        }
        return nil
    }

    // Applica lo shield e restituisce la modalita' davvero usata. "selected" senza app scelte
    // blocca tutto tranne le app da lasciare (prima non bloccava niente).
    @discardableResult
    func applyShield(mode: String) -> String {
        if mode == "selected", let sel = selection("app_selection"),
           sel.applicationTokens.count + sel.categoryTokens.count + sel.webDomainTokens.count > 0 {
            let apps = Set(sel.applicationTokens.prefix(Self.maxTokens))
            let webs = Set(sel.webDomainTokens.prefix(Self.maxTokens))
            store.shield.applications = apps.isEmpty ? nil : apps
            store.shield.applicationCategories = sel.categoryTokens.isEmpty ? nil : .specific(sel.categoryTokens)
            store.shield.webDomains = webs.isEmpty ? nil : webs
            store.shield.webDomainCategories = sel.categoryTokens.isEmpty ? nil : .specific(sel.categoryTokens)
            return "selected"
        }
        let keep = selection("app_selection_keep") ?? FamilyActivitySelection()
        var keepApps = Set(keep.applicationTokens.prefix(Self.maxTokens))
        if let token = selfToken() { keepApps.insert(token) }
        store.shield.applications = nil
        store.shield.applicationCategories = .all(except: keepApps)
        store.shield.webDomains = nil
        store.shield.webDomainCategories = .all(except: Set(keep.webDomainTokens.prefix(Self.maxTokens)))
        return "all_except"
    }

    func clearShield() {
        store.shield.applications = nil
        store.shield.applicationCategories = nil
        store.shield.webDomains = nil
        store.shield.webDomainCategories = nil
    }

    func reapplyIfActive() {
        guard let b = currentBlock(), b.endAt > now, pauseUntil <= now else { return }
        applyShield(mode: b.mode)
    }

    // MARK: programmi

    func meta() -> [String: [String: Any]] {
        defaults?.dictionary(forKey: Self.metaKey) as? [String: [String: Any]] ?? [:]
    }

    private static func todayKey(_ date: Date = Date()) -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }

    func isDismissedToday(_ scheduleId: String) -> Bool {
        let map = defaults?.dictionary(forKey: "dismissed_schedules") as? [String: String] ?? [:]
        return map[scheduleId] == Self.todayKey()
    }

    func dismissToday(_ scheduleId: String) {
        guard !scheduleId.isEmpty else { return }
        var map = defaults?.dictionary(forKey: "dismissed_schedules") as? [String: String] ?? [:]
        let today = Self.todayKey()
        map = map.filter { $0.value == today }
        map[scheduleId] = today
        defaults?.set(map, forKey: "dismissed_schedules")
    }

    // Fine di oggi del programma `m` se in questo momento e' nel suo intervallo, altrimenti nil.
    func windowEnd(_ m: [String: Any], at date: Date = Date(), tolerance: Double = 0) -> Double? {
        guard let sh = (m["sh"] as? NSNumber)?.intValue, let sm = (m["sm"] as? NSNumber)?.intValue,
              let eh = (m["eh"] as? NSNumber)?.intValue, let em = (m["em"] as? NSNumber)?.intValue else { return nil }
        let day = (m["day"] as? NSNumber)?.intValue ?? 0
        let cal = Calendar.current
        if day != 0 && cal.component(.weekday, from: date) != day { return nil }
        guard let start = cal.date(bySettingHour: sh, minute: sm, second: 0, of: date),
              let end = cal.date(bySettingHour: eh, minute: em, second: 0, of: date) else { return nil }
        let t = date.timeIntervalSince1970
        if t >= start.timeIntervalSince1970 - tolerance && t < end.timeIntervalSince1970 {
            return end.timeIntervalSince1970
        }
        return nil
    }

    // Il programma in corso adesso (non chiuso oggi dall'utente); se piu' d'uno, quello che finisce dopo.
    func activeSchedule(excluding: String? = nil) -> Block? {
        var best: Block?
        for (name, m) in meta() where name != excluding {
            guard let id = m["id"] as? String, !isDismissedToday(id), let end = windowEnd(m) else { continue }
            if best == nil || end > best!.endAt {
                best = Block(source: "schedule", id: id, name: name, mode: m["mode"] as? String ?? "selected", endAt: end)
            }
        }
        return best
    }

    // MARK: azioni

    @discardableResult
    func startSession(id: String, mode: String, endAt: Date) -> String {
        setPauseUntil(nil)
        DeviceActivityCenter().stopMonitoring([Self.resumeName])
        setCurrentBlock(Block(source: "session", id: id, name: Self.sessionName.rawValue, mode: mode, endAt: endAt.timeIntervalSince1970))
        let effective = applyShield(mode: mode)
        monitorSession(endAt: endAt)
        return effective
    }

    // Allo scadere e' l'estensione a togliere lo shield, anche ad app chiusa. iOS accetta intervalli
    // di almeno 15 minuti: per le sessioni piu' brevi ci pensa l'app.
    private func monitorSession(endAt: Date) {
        let center = DeviceActivityCenter()
        center.stopMonitoring([Self.sessionName])
        guard endAt.timeIntervalSinceNow >= 15 * 60 else { return }
        let parts: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]
        let schedule = DeviceActivitySchedule(
            intervalStart: Calendar.current.dateComponents(parts, from: Date()),
            intervalEnd: Calendar.current.dateComponents(parts, from: endAt),
            repeats: false
        )
        try? center.startMonitoring(Self.sessionName, during: schedule)
    }

    func startSchedule(_ b: Block) {
        // Una sessione avviata a mano e ancora in corso ha la precedenza: il programma riparte quando finisce.
        if let cur = currentBlock(), cur.source == "session", cur.endAt > now { return }
        setPauseUntil(nil)
        setCurrentBlock(b)
        applyShield(mode: b.mode)
    }

    // Fine del blocco corrente; se nel frattempo e' in corso un programma, parte quello.
    func endCurrent(excluding: String? = nil) {
        clearShield()
        setCurrentBlock(nil)
        setPauseUntil(nil)
        DeviceActivityCenter().stopMonitoring([Self.sessionName, Self.resumeName])
        if let next = activeSchedule(excluding: excluding) { startSchedule(next) }
    }

    // L'utente chiude il blocco dall'app: se era un programma, per oggi non riparte.
    func stopCurrent(dismissSchedule: Bool) {
        if dismissSchedule, let b = currentBlock(), b.source == "schedule" { dismissToday(b.id) }
        endCurrent(excluding: currentBlock()?.source == "schedule" ? currentBlock()?.name : nil)
    }

    // Pausa: le app si sbloccano per `minutes` e lo shield torna da solo (monitor "focus.resume",
    // che inizia all'ora di ripresa; iOS vuole intervalli di almeno 15 minuti, quindi dura 16).
    func pause(minutes: Int) -> (paused: Bool, ended: Bool, monitored: Bool) {
        guard let b = currentBlock(), b.endAt > now else { return (false, false, false) }
        let until = now + Double(minutes) * 60
        if until >= b.endAt - 30 {
            stopCurrent(dismissSchedule: true)
            return (false, true, false)
        }
        setPauseUntil(until)
        clearShield()
        let center = DeviceActivityCenter()
        center.stopMonitoring([Self.resumeName])
        let parts: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]
        let startDate = Date(timeIntervalSince1970: until)
        let schedule = DeviceActivitySchedule(
            intervalStart: Calendar.current.dateComponents(parts, from: startDate),
            intervalEnd: Calendar.current.dateComponents(parts, from: startDate.addingTimeInterval(16 * 60)),
            repeats: false
        )
        let monitored = (try? center.startMonitoring(Self.resumeName, during: schedule)) != nil
        return (true, false, monitored)
    }

    func resume() {
        setPauseUntil(nil)
        DeviceActivityCenter().stopMonitoring([Self.resumeName])
        reapplyIfActive()
    }

    // Allinea lo shield allo stato salvato: fine scaduta, pausa finita, programma in corso, shield orfani.
    func reconcile() {
        let t = now
        if var b = currentBlock() {
            if b.source == "schedule" {
                // Programma tolto o cambiato: si aggiorna la fine o il blocco finisce.
                if let m = meta()[b.name], let end = windowEnd(m, tolerance: Self.tolerance) {
                    if abs(end - b.endAt) > 1 { b.endAt = end; setCurrentBlock(b) }
                } else {
                    endCurrent(excluding: b.name)
                    return
                }
            }
            if b.endAt <= t {
                endCurrent(excluding: b.source == "schedule" ? b.name : nil)
                return
            }
            if pauseUntil > 0 {
                if pauseUntil <= t {
                    resume()
                } else if shieldApplied {
                    clearShield()
                }
                return
            }
            if !shieldApplied { applyShield(mode: b.mode) }
            return
        }
        if pauseUntil > 0 { setPauseUntil(nil) }
        if let next = activeSchedule() {
            startSchedule(next)
            return
        }
        // Shield rimasto da una versione precedente o da un monitor spento a meta': si toglie.
        if shieldApplied { clearShield() }
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
