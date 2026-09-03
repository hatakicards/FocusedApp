package org.focusedapp.app

import android.content.Context
import android.content.Intent
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

// Ponte tra la sessione Supabase nella WebView (src/lib/nativeWidgetSync.js) e
// lo storage condiviso che i widget Glance (Fase 4) leggono per chiamare
// /api/widget-data. Stesso processo/app, quindi SharedPreferences basta —
// niente App Group come su iOS.
@CapacitorPlugin(name = "FocusedWidgetSync")
class FocusedWidgetSyncPlugin : Plugin() {
    companion object {
        const val PREFS_NAME = "focused_widget_prefs"
        const val REFRESH_ACTION = "org.focusedapp.app.REFRESH_WIDGETS"
    }

    @PluginMethod
    fun syncSession(call: PluginCall) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putString("access_token", call.getString("accessToken"))
            .putString("refresh_token", call.getString("refreshToken"))
            .putString("expires_at", call.getString("expiresAt"))
            .apply()
        call.resolve()
    }

    @PluginMethod
    fun clearSession(call: PluginCall) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().clear().apply()
        call.resolve()
    }

    @PluginMethod
    fun refreshWidgets(call: PluginCall) {
        // I singoli AppWidgetProvider Glance (Fase 4) ascoltano questo broadcast
        // per aggiornarsi subito invece di aspettare il refresh periodico di WorkManager.
        context.sendBroadcast(Intent(REFRESH_ACTION).setPackage(context.packageName))
        call.resolve()
    }
}
