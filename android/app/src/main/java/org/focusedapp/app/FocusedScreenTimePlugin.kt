package org.focusedapp.app

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Process
import android.provider.Settings
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray

// Fase 2 dello Screen Time nativo: qui c'e' tutto cio' che si puo' fare senza
// una nuova build Codemagic dedicata (autorizzazione, selezione app, lettura
// impostazioni). Il blocco vero e proprio (AccessibilityService + overlay,
// worker periodico sulla soglia giornaliera, AlarmManager per le sessioni
// Focus Time) e' la Fase 4, non ancora implementata qui.
@CapacitorPlugin(name = "FocusedScreenTime")
class FocusedScreenTimePlugin : Plugin() {
    companion object {
        const val PREFS_NAME = "focused_screentime_prefs"
        const val KEY_SELECTED_APPS = "selected_package_ids"
        const val KEY_DAILY_LIMIT_MINUTES = "daily_limit_minutes"
    }

    private fun prefs() = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    @PluginMethod
    fun getAuthorizationStatus(call: PluginCall) {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName
        )
        val granted = mode == AppOpsManager.MODE_ALLOWED
        val result = JSObject()
        result.put("status", if (granted) "authorized" else "not_determined")
        call.resolve(result)
    }

    // Non esiste un permesso runtime per "Usage access": va concesso a mano
    // dall'utente in Impostazioni, quindi lo portiamo li' direttamente.
    @PluginMethod
    fun requestAuthorization(call: PluginCall) {
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            val result = JSObject()
            result.put("status", "redirected_to_settings")
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Impossibile aprire le impostazioni", e)
        }
    }

    // Elenca le app utente installate (esclude le app di sistema senza icona
    // di avvio) cosi' che la UI web possa mostrare una lista reale con nomi.
    @PluginMethod
    fun listInstalledApps(call: PluginCall) {
        try {
            val pm = context.packageManager
            val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
            val result = JSObject()
            val arr = JSArray()
            for (app: ApplicationInfo in apps) {
                if (pm.getLaunchIntentForPackage(app.packageName) == null) continue
                if (app.packageName == context.packageName) continue
                val entry = JSObject()
                entry.put("packageId", app.packageName)
                entry.put("name", pm.getApplicationLabel(app).toString())
                arr.put(entry)
            }
            result.put("apps", arr)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Errore lettura app installate", e)
        }
    }

    @PluginMethod
    fun saveSelectedApps(call: PluginCall) {
        val packageIds = call.getArray("packageIds") ?: JSArray()
        prefs().edit().putString(KEY_SELECTED_APPS, packageIds.toString()).apply()
        call.resolve()
    }

    @PluginMethod
    fun getSelectionSummary(call: PluginCall) {
        val raw = prefs().getString(KEY_SELECTED_APPS, "[]") ?: "[]"
        val count = try { JSONArray(raw).length() } catch (e: Exception) { 0 }
        val result = JSObject()
        result.put("count", count)
        call.resolve(result)
    }

    // Salva la soglia giornaliera. L'enforcement vero (sommare l'uso reale
    // via UsageStatsManager e attivare il blocco al superamento) e' la Fase 4.
    @PluginMethod
    fun setDailyLimit(call: PluginCall) {
        val minutes = call.getInt("minutes") ?: 0
        prefs().edit().putInt(KEY_DAILY_LIMIT_MINUTES, minutes).apply()
        call.resolve()
    }

    @PluginMethod
    fun clearDailyLimit(call: PluginCall) {
        prefs().edit().remove(KEY_DAILY_LIMIT_MINUTES).apply()
        call.resolve()
    }

    // Placeholder per la Fase 4 (AlarmManager per la finestra esatta della
    // sessione Focus Time) — per ora conferma solo la richiesta.
    @PluginMethod
    fun scheduleFocusBlock(call: PluginCall) {
        call.resolve()
    }

    @PluginMethod
    fun cancelFocusBlock(call: PluginCall) {
        call.resolve()
    }
}
