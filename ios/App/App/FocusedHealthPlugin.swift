import Foundation
import Capacitor
import HealthKit
import CoreMotion

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
        store.requestAuthorization(toShare: nil, read: types) { _, _ in
            call.resolve(["done": true])
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
