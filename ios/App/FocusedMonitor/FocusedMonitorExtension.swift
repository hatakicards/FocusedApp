import DeviceActivity
import FamilyControls
import ManagedSettings
import Foundation

// Fa partire e finire da solo il blocco di Focus Time anche quando l app e chiusa:
// - programmi ricorrenti ("ogni giovedi 15:00-18:00"), registrati dall app (syncSchedules);
// - fine di una sessione avviata a mano (monitor "focus.session");
// - ripresa dopo una pausa (monitor "focus.resume").
// Lo stato del blocco corrente e condiviso con l app nell App Group (FocusBlockEngine).
final class FocusedMonitorExtension: DeviceActivityMonitor {
    private let engine = FocusBlockEngine(selfBundleId: "org.focusedapp.app")

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        if activity == FocusBlockEngine.resumeName {
            engine.resume()
            return
        }
        if activity == FocusBlockEngine.sessionName {
            // La sessione l ha gia applicata l app: qui solo una conferma, se non e in pausa.
            engine.reapplyIfActive()
            return
        }
        guard let m = engine.meta()[activity.rawValue], let id = m["id"] as? String else { return }
        if engine.isDismissedToday(id) { return }
        let end = engine.windowEnd(m, tolerance: FocusBlockEngine.tolerance) ?? Date().addingTimeInterval(60).timeIntervalSince1970
        engine.startSchedule(FocusBlockEngine.Block(
            source: "schedule", id: id, name: activity.rawValue,
            mode: m["mode"] as? String ?? "selected", endAt: end
        ))
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        if activity == FocusBlockEngine.resumeName { return }
        guard let current = engine.currentBlock() else { return }
        if activity == FocusBlockEngine.sessionName {
            if current.source == "session" && current.endAt <= Date().timeIntervalSince1970 + FocusBlockEngine.tolerance {
                engine.endCurrent()
            }
            return
        }
        if current.source == "schedule" && current.name == activity.rawValue {
            engine.endCurrent(excluding: activity.rawValue)
        }
    }
}

// MARK: - Motore del blocco
//
// COPIA di FocusBlockEngine in ios/App/App/FocusedScreenTimePlugin.swift: tenere le due copie uguali.
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

