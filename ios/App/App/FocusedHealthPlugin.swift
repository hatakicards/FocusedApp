import Foundation
import Capacitor
import HealthKit
import CoreMotion
import CoreLocation
import MapKit
import UserNotifications

// Segnali "reali" per capire cosa ha fatto l'utente senza che lo scriva: allenamenti,
// sonno e passi da Salute (HealthKit) e, per chi non ha un Watch, i tratti di corsa /
// camminata / bici che iOS riconosce da solo (Core Motion). Tutto resta sul telefono:
// al server arriva solo quello che l'utente conferma rispondendo alla domanda.
// Nota HealthKit: iOS non dice mai se la lettura e' stata concessa; se negata le
// query tornano semplicemente vuote.
@objc(FocusedHealthPlugin)
public class FocusedHealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FocusedHealthPlugin"
    public let jsName = "FocusedHealth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getWorkouts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSleep", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getMotionSegments", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSteps", returnType: CAPPluginReturnPromise),
    ]

    private let store = HKHealthStore()
    private let motion = CMMotionActivityManager()
    private let iso = ISO8601DateFormatter()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve([
            "health": HKHealthStore.isHealthDataAvailable(),
            "motion": CMMotionActivityManager.isActivityAvailable(),
        ])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["done": false])
            return
        }
        let types: Set<HKObjectType> = [
            HKObjectType.workoutType(),
            HKCategoryType(.sleepAnalysis),
            HKQuantityType(.stepCount),
        ]
        store.requestAuthorization(toShare: nil, read: types) { [weak self] _, _ in
            guard let self = self, CMMotionActivityManager.isActivityAvailable() else {
                call.resolve(["done": true])
                return
            }
            // La prima lettura dei movimenti e' quella che fa comparire il permesso "Movimento e fitness".
            let now = Date()
            self.motion.queryActivityStarting(from: now.addingTimeInterval(-3600), to: now, to: .main) { _, _ in
                call.resolve(["done": true])
            }
        }
    }

    // MARK: - Allenamenti

    @objc func getWorkouts(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["workouts": []])
            return
        }
        let days = call.getInt("sinceDays") ?? 7
        let since = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()
        let predicate = HKQuery.predicateForSamples(withStart: since, end: Date(), options: .strictStartDate)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(sampleType: HKObjectType.workoutType(), predicate: predicate, limit: 60, sortDescriptors: [sort]) { [weak self] _, samples, _ in
            guard let self = self else { return }
            let items: [[String: Any]] = (samples as? [HKWorkout] ?? []).map { w in
                [
                    "id": w.uuid.uuidString,
                    "type": Self.workoutName(w.workoutActivityType),
                    "start": self.iso.string(from: w.startDate),
                    "end": self.iso.string(from: w.endDate),
                    "minutes": Int((w.duration / 60).rounded()),
                    "kcal": Int(w.totalEnergyBurned?.doubleValue(for: .kilocalorie()) ?? 0),
                ]
            }
            call.resolve(["workouts": items])
        }
        store.execute(query)
    }

    private static func workoutName(_ type: HKWorkoutActivityType) -> String {
        switch type {
        case .running: return "running"
        case .walking: return "walking"
        case .hiking: return "hiking"
        case .cycling: return "cycling"
        case .swimming: return "swimming"
        case .yoga, .pilates: return "yoga"
        case .traditionalStrengthTraining, .functionalStrengthTraining, .crossTraining: return "strength"
        case .highIntensityIntervalTraining: return "hiit"
        default: return "other"
        }
    }

    // MARK: - Sonno

    @objc func getSleep(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["nights": []])
            return
        }
        let days = call.getInt("sinceDays") ?? 7
        let since = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()
        let predicate = HKQuery.predicateForSamples(withStart: since, end: Date(), options: [])
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        let query = HKSampleQuery(sampleType: HKCategoryType(.sleepAnalysis), predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sort]) { [weak self] _, samples, _ in
            guard let self = self else { return }
            // Valori di sonno vero: unspecified 1, core 3, deep 4, REM 5 (0 = a letto, 2 = sveglio).
            let asleepValues: Set<Int> = [1, 3, 4, 5]
            let asleep = (samples as? [HKCategorySample] ?? []).filter { asleepValues.contains($0.value) }

            // Raggruppa i campioni vicini (pausa < 90 minuti) nella stessa notte.
            var sessions: [(start: Date, end: Date, seconds: TimeInterval)] = []
            for s in asleep {
                let seconds = s.endDate.timeIntervalSince(s.startDate)
                if let last = sessions.last, s.startDate.timeIntervalSince(last.end) < 90 * 60 {
                    sessions[sessions.count - 1] = (last.start, max(last.end, s.endDate), last.seconds + seconds)
                } else {
                    sessions.append((s.startDate, s.endDate, seconds))
                }
            }
            let dayFormatter = DateFormatter()
            dayFormatter.dateFormat = "yyyy-MM-dd"
            let nights: [[String: Any]] = sessions
                .filter { $0.seconds >= 180 * 60 }
                .map { sess in
                    [
                        "date": dayFormatter.string(from: sess.end),
                        "bedtime": self.iso.string(from: sess.start),
                        "wake": self.iso.string(from: sess.end),
                        "minutes": Int((sess.seconds / 60).rounded()),
                    ]
                }
            call.resolve(["nights": nights])
        }
        store.execute(query)
    }

    // MARK: - Passi

    // Passi giornalieri degli ultimi `days` giorni (oggi compreso), da Salute.
    @objc func getSteps(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["days": []])
            return
        }
        let days = max(1, call.getInt("days") ?? 1)
        let cal = Calendar.current
        let end = Date()
        let startOfToday = cal.startOfDay(for: end)
        guard let start = cal.date(byAdding: .day, value: -(days - 1), to: startOfToday) else {
            call.resolve(["days": []])
            return
        }
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let query = HKStatisticsCollectionQuery(
            quantityType: HKQuantityType(.stepCount),
            quantitySamplePredicate: predicate,
            options: .cumulativeSum,
            anchorDate: startOfToday,
            intervalComponents: DateComponents(day: 1)
        )
        query.initialResultsHandler = { _, results, _ in
            let fmt = DateFormatter()
            fmt.dateFormat = "yyyy-MM-dd"
            var out: [[String: Any]] = []
            results?.enumerateStatistics(from: start, to: end) { stat, _ in
                let n = stat.sumQuantity()?.doubleValue(for: .count()) ?? 0
                out.append(["date": fmt.string(from: stat.startDate), "steps": Int(n.rounded())])
            }
            call.resolve(["days": out])
        }
        store.execute(query)
    }

    // MARK: - Movimento (Core Motion)

    @objc func getMotionSegments(_ call: CAPPluginCall) {
        guard CMMotionActivityManager.isActivityAvailable() else {
            call.resolve(["segments": []])
            return
        }
        let hours = call.getInt("sinceHours") ?? 24
        let now = Date()
        let from = now.addingTimeInterval(-Double(hours) * 3600)
        motion.queryActivityStarting(from: from, to: now, to: .main) { [weak self] activities, error in
            guard let self = self, let activities = activities, error == nil else {
                call.resolve(["segments": [], "denied": error != nil])
                return
            }
            func kind(_ a: CMMotionActivity) -> String? {
                if a.confidence == .low { return nil }
                if a.running { return "running" }
                if a.cycling { return "cycling" }
                if a.walking { return "walking" }
                return nil
            }
            var segments: [[String: Any]] = []
            var currentKind: String?
            var currentStart: Date?
            func flush(until end: Date) {
                if let k = currentKind, let s = currentStart {
                    let minutes = Int(end.timeIntervalSince(s) / 60)
                    if minutes >= 5 {
                        segments.append([
                            "type": k,
                            "start": self.iso.string(from: s),
                            "end": self.iso.string(from: end),
                            "minutes": minutes,
                        ])
                    }
                }
                currentKind = nil
                currentStart = nil
            }
            for a in activities {
                let k = kind(a)
                if k != nil && k == currentKind {
                    continue // stesso tipo di prima: il tratto continua
                }
                flush(until: a.startDate)
                if let k = k {
                    currentKind = k
                    currentStart = a.startDate
                }
            }
            flush(until: now)
            call.resolve(["segments": segments])
        }
    }
}

// MARK: - Posizione della palestra (smart tracking)

// Monitora un'area intorno alla palestra dell'utente: iOS sveglia l'app anche da chiusa quando
// si entra o si esce dall'area. All'uscita (dopo almeno 20 minuti) salva la visita: l'app la legge
// al prossimo avvio e chiede "com'e' andato l'allenamento?". Vive fuori dal plugin e parte da
// AppDelegate, perche' un avvio in background non carica la WebView.
final class GymRegionMonitor: NSObject, CLLocationManagerDelegate {
    static let shared = GymRegionMonitor()
    static let regionId = "focused.gym"

    let manager = CLLocationManager()
    private let defaults = UserDefaults(suiteName: "group.org.focusedapp.app") ?? .standard
    var authWaiters: [(String) -> Void] = []
    var locationWaiters: [(CLLocation?) -> Void] = []

    override init() {
        super.init()
        manager.delegate = self
    }

    func status() -> String {
        switch manager.authorizationStatus {
        case .authorizedAlways: return "always"
        case .authorizedWhenInUse: return "when_in_use"
        case .denied, .restricted: return "denied"
        default: return "not_determined"
        }
    }

    func start(lat: Double, lon: Double, radius: Double) {
        stop()
        let r = max(100, min(radius, manager.maximumRegionMonitoringDistance))
        let region = CLCircularRegion(center: CLLocationCoordinate2D(latitude: lat, longitude: lon), radius: r, identifier: Self.regionId)
        region.notifyOnEntry = true
        region.notifyOnExit = true
        manager.startMonitoring(for: region)
        defaults.set(["lat": lat, "lon": lon, "radius": r], forKey: "gym_region")
    }

    func stop() {
        for region in manager.monitoredRegions where region.identifier == Self.regionId {
            manager.stopMonitoring(for: region)
        }
        defaults.removeObject(forKey: "gym_region")
        defaults.removeObject(forKey: "gym_visit_start")
    }

    // Riattiva il monitoraggio dopo un riavvio dell'app (iOS lo conserva, ma non costa nulla verificare).
    func restoreIfNeeded() {
        guard let saved = defaults.dictionary(forKey: "gym_region"),
              let lat = saved["lat"] as? Double, let lon = saved["lon"] as? Double else { return }
        let r = (saved["radius"] as? Double) ?? 150
        if !manager.monitoredRegions.contains(where: { $0.identifier == Self.regionId }) {
            start(lat: lat, lon: lon, radius: r)
        }
    }

    private func notify(_ titleKey: String, _ bodyKey: String) {
        guard let title = defaults.string(forKey: titleKey), !title.isEmpty else { return }
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = defaults.string(forKey: bodyKey) ?? ""
        content.sound = .default
        let request = UNNotificationRequest(identifier: "focused.gym.\(titleKey)", content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request)
    }

    func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        guard region.identifier == Self.regionId else { return }
        defaults.set(Date().timeIntervalSince1970, forKey: "gym_visit_start")
        notify("gym_notif_enter_title", "gym_notif_enter_body")
    }

    func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
        guard region.identifier == Self.regionId else { return }
        let start = defaults.double(forKey: "gym_visit_start")
        defaults.removeObject(forKey: "gym_visit_start")
        guard start > 0 else { return }
        let end = Date().timeIntervalSince1970
        let minutes = Int((end - start) / 60)
        guard minutes >= 20 else { return }
        let iso = ISO8601DateFormatter()
        var visits = defaults.array(forKey: "gym_visits") as? [[String: Any]] ?? []
        visits.append([
            "start": iso.string(from: Date(timeIntervalSince1970: start)),
            "end": iso.string(from: Date(timeIntervalSince1970: end)),
            "minutes": minutes,
        ])
        defaults.set(visits, forKey: "gym_visits")
        notify("gym_notif_exit_title", "gym_notif_exit_body")
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let s = status()
        if s == "not_determined" { return }
        let waiters = authWaiters
        authWaiters = []
        waiters.forEach { $0(s) }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let waiters = locationWaiters
        locationWaiters = []
        waiters.forEach { $0(locations.last) }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        let waiters = locationWaiters
        locationWaiters = []
        waiters.forEach { $0(nil) }
    }

    func popVisits() -> [[String: Any]] {
        let visits = defaults.array(forKey: "gym_visits") as? [[String: Any]] ?? []
        defaults.removeObject(forKey: "gym_visits")
        return visits
    }

    func setStrings(_ s: [String: String]) {
        s.forEach { defaults.set($0.value, forKey: $0.key) }
    }
}

@objc(FocusedLocationPlugin)
public class FocusedLocationPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FocusedLocationPlugin"
    public let jsName = "FocusedLocation"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getAuthorizationStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentLocation", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setGymRegion", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearGymRegion", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "popGymVisits", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickPlace", returnType: CAPPluginReturnPromise),
    ]

    @objc func getAuthorizationStatus(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(["status": GymRegionMonitor.shared.status()]) }
    }

    // iOS chiede prima "Mentre usi l'app" e poi, piu' tardi, "Sempre": per riconoscere la palestra
    // ad app chiusa serve "Sempre".
    @objc func requestAuthorization(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let monitor = GymRegionMonitor.shared
            if monitor.status() == "always" || monitor.status() == "denied" {
                call.resolve(["status": monitor.status()])
                return
            }
            monitor.authWaiters.append { status in call.resolve(["status": status]) }
            if monitor.status() == "when_in_use" {
                monitor.manager.requestAlwaysAuthorization()
            } else {
                monitor.manager.requestWhenInUseAuthorization()
            }
        }
    }

    @objc func getCurrentLocation(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let monitor = GymRegionMonitor.shared
            monitor.locationWaiters.append { location in
                if let l = location {
                    call.resolve(["lat": l.coordinate.latitude, "lon": l.coordinate.longitude, "accuracy": l.horizontalAccuracy])
                } else {
                    call.reject("no_location")
                }
            }
            monitor.manager.requestLocation()
        }
    }

    @objc func setGymRegion(_ call: CAPPluginCall) {
        guard let lat = call.getDouble("lat"), let lon = call.getDouble("lon") else {
            call.reject("invalid_coordinates")
            return
        }
        let radius = call.getDouble("radius") ?? 150
        var strings: [String: String] = [:]
        for key in ["gym_notif_enter_title", "gym_notif_enter_body", "gym_notif_exit_title", "gym_notif_exit_body"] {
            if let v = call.getString(key) { strings[key] = v }
        }
        DispatchQueue.main.async {
            GymRegionMonitor.shared.setStrings(strings)
            GymRegionMonitor.shared.start(lat: lat, lon: lon, radius: radius)
            call.resolve()
        }
    }

    @objc func clearGymRegion(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            GymRegionMonitor.shared.stop()
            call.resolve()
        }
    }

    @objc func popGymVisits(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(["visits": GymRegionMonitor.shared.popVisits()]) }
    }

    // Mappa di Apple a schermo intero: cerchi o sposti la mappa, il segno al centro e' la palestra.
    @objc func pickPlace(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            var start: CLLocationCoordinate2D?
            if let lat = call.getDouble("lat"), let lon = call.getDouble("lon") {
                start = CLLocationCoordinate2D(latitude: lat, longitude: lon)
            }
            var strings: [String: String] = [:]
            for key in ["title", "hint", "search", "confirm"] {
                if let v = call.getString(key) { strings[key] = v }
            }
            let picker = GymPlacePickerController(start: start, strings: strings)
            picker.modalPresentationStyle = .fullScreen
            picker.completion = { coordinate in
                if let c = coordinate {
                    call.resolve(["lat": c.latitude, "lon": c.longitude])
                } else {
                    call.resolve(["cancelled": true])
                }
            }
            guard let host = self.bridge?.viewController else {
                call.reject("no_view")
                return
            }
            host.present(picker, animated: true)
        }
    }
}

final class GymPlacePickerController: UIViewController, UISearchBarDelegate {
    var completion: ((CLLocationCoordinate2D?) -> Void)?
    private let start: CLLocationCoordinate2D?
    private let strings: [String: String]
    private let map = MKMapView()
    private let search = UISearchBar()
    private var finished = false

    init(start: CLLocationCoordinate2D?, strings: [String: String]) {
        self.start = start
        self.strings = strings
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) non usato") }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    override func viewDidLoad() {
        super.viewDidLoad()
        overrideUserInterfaceStyle = .dark
        view.backgroundColor = .black

        map.translatesAutoresizingMaskIntoConstraints = false
        map.showsUserLocation = true
        if let c = start {
            map.setRegion(MKCoordinateRegion(center: c, latitudinalMeters: 600, longitudinalMeters: 600), animated: false)
        } else {
            map.setUserTrackingMode(.follow, animated: false)
        }
        view.addSubview(map)

        let pin = UIImageView(image: UIImage(systemName: "mappin.circle.fill"))
        pin.tintColor = .white
        pin.translatesAutoresizingMaskIntoConstraints = false
        pin.layer.shadowColor = UIColor.black.cgColor
        pin.layer.shadowOpacity = 0.5
        pin.layer.shadowRadius = 4
        view.addSubview(pin)

        let topBar = UIView()
        topBar.translatesAutoresizingMaskIntoConstraints = false
        topBar.backgroundColor = UIColor.black.withAlphaComponent(0.85)
        view.addSubview(topBar)

        let close = UIButton(type: .system)
        close.setImage(UIImage(systemName: "xmark"), for: .normal)
        close.tintColor = .white
        close.translatesAutoresizingMaskIntoConstraints = false
        close.addTarget(self, action: #selector(cancel), for: .touchUpInside)
        topBar.addSubview(close)

        let title = UILabel()
        title.text = strings["title"] ?? "Palestra"
        title.textColor = .white
        title.font = .systemFont(ofSize: 17, weight: .semibold)
        title.translatesAutoresizingMaskIntoConstraints = false
        topBar.addSubview(title)

        search.placeholder = strings["search"]
        search.delegate = self
        search.searchBarStyle = .minimal
        search.translatesAutoresizingMaskIntoConstraints = false
        topBar.addSubview(search)

        let bottom = UIView()
        bottom.translatesAutoresizingMaskIntoConstraints = false
        bottom.backgroundColor = UIColor.black.withAlphaComponent(0.85)
        view.addSubview(bottom)

        let hint = UILabel()
        hint.text = strings["hint"]
        hint.textColor = UIColor.white.withAlphaComponent(0.6)
        hint.font = .systemFont(ofSize: 13)
        hint.numberOfLines = 0
        hint.textAlignment = .center
        hint.translatesAutoresizingMaskIntoConstraints = false
        bottom.addSubview(hint)

        let confirm = UIButton(type: .system)
        confirm.setTitle(strings["confirm"] ?? "OK", for: .normal)
        confirm.setTitleColor(.black, for: .normal)
        confirm.titleLabel?.font = .systemFont(ofSize: 16, weight: .bold)
        confirm.backgroundColor = UIColor(white: 0.88, alpha: 1)
        confirm.layer.cornerRadius = 16
        confirm.translatesAutoresizingMaskIntoConstraints = false
        confirm.addTarget(self, action: #selector(done), for: .touchUpInside)
        bottom.addSubview(confirm)

        NSLayoutConstraint.activate([
            map.topAnchor.constraint(equalTo: view.topAnchor),
            map.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            map.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            map.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            pin.centerXAnchor.constraint(equalTo: map.centerXAnchor),
            pin.centerYAnchor.constraint(equalTo: map.centerYAnchor, constant: -18),
            pin.widthAnchor.constraint(equalToConstant: 36),
            pin.heightAnchor.constraint(equalToConstant: 36),

            topBar.topAnchor.constraint(equalTo: view.topAnchor),
            topBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            close.leadingAnchor.constraint(equalTo: topBar.leadingAnchor, constant: 16),
            close.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 10),
            close.widthAnchor.constraint(equalToConstant: 32),
            close.heightAnchor.constraint(equalToConstant: 32),
            title.centerYAnchor.constraint(equalTo: close.centerYAnchor),
            title.centerXAnchor.constraint(equalTo: topBar.centerXAnchor),
            search.topAnchor.constraint(equalTo: close.bottomAnchor, constant: 4),
            search.leadingAnchor.constraint(equalTo: topBar.leadingAnchor, constant: 8),
            search.trailingAnchor.constraint(equalTo: topBar.trailingAnchor, constant: -8),
            search.bottomAnchor.constraint(equalTo: topBar.bottomAnchor, constant: -6),

            bottom.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bottom.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            bottom.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            hint.topAnchor.constraint(equalTo: bottom.topAnchor, constant: 14),
            hint.leadingAnchor.constraint(equalTo: bottom.leadingAnchor, constant: 24),
            hint.trailingAnchor.constraint(equalTo: bottom.trailingAnchor, constant: -24),
            confirm.topAnchor.constraint(equalTo: hint.bottomAnchor, constant: 12),
            confirm.leadingAnchor.constraint(equalTo: bottom.leadingAnchor, constant: 24),
            confirm.trailingAnchor.constraint(equalTo: bottom.trailingAnchor, constant: -24),
            confirm.heightAnchor.constraint(equalToConstant: 52),
            confirm.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -10),
        ])
    }

    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        searchBar.resignFirstResponder()
        guard let text = searchBar.text, !text.isEmpty else { return }
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = text
        request.region = map.region
        MKLocalSearch(request: request).start { [weak self] response, _ in
            guard let item = response?.mapItems.first else { return }
            self?.map.setUserTrackingMode(.none, animated: false)
            self?.map.setRegion(MKCoordinateRegion(center: item.placemark.coordinate, latitudinalMeters: 500, longitudinalMeters: 500), animated: true)
        }
    }

    private func finish(_ coordinate: CLLocationCoordinate2D?) {
        guard !finished else { return }
        finished = true
        dismiss(animated: true) { [completion] in completion?(coordinate) }
    }

    @objc private func cancel() { finish(nil) }
    @objc private func done() { finish(map.centerCoordinate) }
}
