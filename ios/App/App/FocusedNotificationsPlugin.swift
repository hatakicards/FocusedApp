import Foundation
import Capacitor
import UserNotifications

// Notifiche locali di Focused (promemoria serale, lezioni, scadenze, fine sessione). Sta nell'app, come
// Salute e Posizione, invece di passare dal pacchetto @capacitor/local-notifications: quello su
// alcuni telefoni non faceva mai comparire la richiesta di permesso e il benvenuto si bloccava.
// Le notifiche sono tutte "una tantum" a una data precisa: e' il lato web a riprogrammarle.
@objc(FocusedNotificationsPlugin)
public class FocusedNotificationsPlugin: CAPPlugin, CAPBridgedPlugin, UNUserNotificationCenterDelegate {
    public let identifier = "FocusedNotificationsPlugin"
    public let jsName = "FocusedNotifications"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "ask", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleAll", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelIds", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pendingList", returnType: CAPPluginReturnPromise),
    ]

    private static let prefix = "focused.n."

    public override func load() {
        // Con l'app aperta iOS non mostra le notifiche se nessuno lo chiede: lo chiediamo noi.
        let center = UNUserNotificationCenter.current()
        center.delegate = self
    }

    public func userNotificationCenter(_ center: UNUserNotificationCenter,
                                       willPresent notification: UNNotification,
                                       withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound, .badge])
    }

    public func userNotificationCenter(_ center: UNUserNotificationCenter,
                                       didReceive response: UNNotificationResponse,
                                       withCompletionHandler completionHandler: @escaping () -> Void) {
        completionHandler()
    }

    private func label(_ status: UNAuthorizationStatus) -> String {
        switch status {
        case .authorized, .provisional, .ephemeral: return "granted"
        case .denied: return "denied"
        default: return "prompt"
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            call.resolve(["display": self.label(settings.authorizationStatus)])
        }
    }

    // La richiesta parte dal thread principale: e' li' che iOS mostra il popup di sistema.
    @objc func ask(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
                var result: [String: Any] = ["display": granted ? "granted" : "denied"]
                if let error = error { result["error"] = error.localizedDescription }
                call.resolve(result)
            }
        }
    }

    // notifications: [{ id, title, body, at }]  — at in millisecondi (ora locale del telefono); senza at parte subito.
    @objc func scheduleAll(_ call: CAPPluginCall) {
        guard let items = call.getArray("notifications", JSObject.self) else {
            call.reject("notifications mancante")
            return
        }
        let center = UNUserNotificationCenter.current()
        let group = DispatchGroup()
        let lock = NSLock()
        var scheduled = 0
        var errors: [String] = []

        for item in items {
            guard let id = (item["id"] as? NSNumber)?.intValue else { continue }
            let content = UNMutableNotificationContent()
            content.title = (item["title"] as? String) ?? "Focused"
            content.body = (item["body"] as? String) ?? ""
            content.sound = .default

            let trigger: UNNotificationTrigger
            if let ms = (item["at"] as? NSNumber)?.doubleValue {
                let date = Date(timeIntervalSince1970: ms / 1000)
                if date.timeIntervalSinceNow > 1 {
                    let parts = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: date)
                    trigger = UNCalendarNotificationTrigger(dateMatching: parts, repeats: false)
                } else {
                    trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
                }
            } else {
                trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
            }

            let request = UNNotificationRequest(identifier: FocusedNotificationsPlugin.prefix + String(id), content: content, trigger: trigger)
            group.enter()
            center.add(request) { error in
                lock.lock()
                if let error = error { errors.append("\(id): \(error.localizedDescription)") } else { scheduled += 1 }
                lock.unlock()
                group.leave()
            }
        }

        group.notify(queue: .main) {
            call.resolve(["scheduled": scheduled, "errors": errors])
        }
    }

    @objc func cancelIds(_ call: CAPPluginCall) {
        let ids = (call.getArray("ids") ?? []).compactMap { ($0 as? NSNumber)?.intValue }
        let identifiers = ids.map { FocusedNotificationsPlugin.prefix + String($0) }
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: identifiers)
        center.removeDeliveredNotifications(withIdentifiers: identifiers)
        call.resolve()
    }

    @objc func pendingList(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
            var list: [[String: Any]] = []
            for request in requests where request.identifier.hasPrefix(FocusedNotificationsPlugin.prefix) {
                guard let id = Int(request.identifier.dropFirst(FocusedNotificationsPlugin.prefix.count)) else { continue }
                var entry: [String: Any] = ["id": id]
                if let trigger = request.trigger as? UNCalendarNotificationTrigger,
                   let next = trigger.nextTriggerDate() {
                    entry["at"] = next.timeIntervalSince1970 * 1000
                }
                list.append(entry)
            }
            call.resolve(["notifications": list])
        }
    }
}
