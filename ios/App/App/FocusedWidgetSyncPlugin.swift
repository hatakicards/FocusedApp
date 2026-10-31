import Foundation
import Capacitor
import WidgetKit

// Ponte tra la sessione Supabase nella WebView (src/lib/nativeWidgetSync.js) e
// l'App Group condiviso che il target Widget Extension (Fase 3) legge per
// chiamare /api/widget-data. L'App Group va creato in Xcode (Signing &
// Capabilities su entrambi i target, app + widget extension) quando si
// aggiunge il target — fino ad allora syncSession fallisce in modo pulito.
@objc(FocusedWidgetSyncPlugin)
public class FocusedWidgetSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FocusedWidgetSyncPlugin"
    public let jsName = "FocusedWidgetSync"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "syncSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refreshWidgets", returnType: CAPPluginReturnPromise),
    ]

    static let appGroupId = "group.org.focusedapp.app"

    @objc func syncSession(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: Self.appGroupId) else {
            call.reject("App Group non ancora configurato in Xcode")
            return
        }
        defaults.set(call.getString("accessToken"), forKey: "access_token")
        // Il refresh token non va mai condiviso con il widget (e' monouso): se un'app
        // piu' vecchia ne avesse salvato uno, lo togliamo.
        defaults.removeObject(forKey: "refresh_token")
        defaults.set(call.getString("expiresAt"), forKey: "expires_at")
        call.resolve()
    }

    @objc func clearSession(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: Self.appGroupId) else {
            call.reject("App Group non ancora configurato in Xcode")
            return
        }
        defaults.removeObject(forKey: "access_token")
        defaults.removeObject(forKey: "refresh_token")
        defaults.removeObject(forKey: "expires_at")
        defaults.removeObject(forKey: "widget_payload_cache")
        call.resolve()
    }

    @objc func refreshWidgets(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
}

// Capacitor non scopre da solo i plugin che stanno nel target dell'app (solo
// quelli npm): senza questa registrazione syncSession fallisce con "plugin not
// implemented" e il widget resta sempre su "Accedi nell'app".
final class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(FocusedWidgetSyncPlugin())
        bridge?.registerPluginInstance(FocusedSpeechPlugin())
        bridge?.registerPluginInstance(FocusedNotificationsPlugin())
        bridge?.registerPluginInstance(FocusedHealthPlugin())
        bridge?.registerPluginInstance(FocusedLocationPlugin())
        if #available(iOS 16.0, *) {
            bridge?.registerPluginInstance(FocusedScreenTimePlugin())
        }
    }
}
