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
        defaults.set(call.getString("refreshToken"), forKey: "refresh_token")
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
        call.resolve()
    }

    @objc func refreshWidgets(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
}
