package org.focusedapp.app

import android.content.Context
import android.content.SharedPreferences
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

// Legge la sessione sincronizzata da FocusedWidgetSyncPlugin (SharedPreferences
// "focused_widget_prefs"), chiama /api/widget-data rinnovando il token
// Supabase se serve, e salva un riepilogo gia' pronto per la UI cosi'
// FocusedWidgetProvider non deve mai fare rete.
class FocusedWidgetUpdateWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    companion object {
        private const val SUPABASE_URL = "https://thfriiqwnoxespaanbbq.supabase.co"
        private const val SUPABASE_ANON_KEY = "sb_publishable_97k8aOwTnW19a-pcxyGHYA_WegOD1DG"
        private const val API_BASE_URL = "https://focused-app.pages.dev"
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val prefs = applicationContext.getSharedPreferences(FocusedWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE)
        var accessToken = prefs.getString("access_token", null)

        if (accessToken == null) {
            FocusedWidgetProvider.updateAll(applicationContext)
            return@withContext Result.success()
        }

        val expiresAt = prefs.getString("expires_at", null)?.toDoubleOrNull()
        val isExpired = expiresAt == null || System.currentTimeMillis() / 1000.0 >= expiresAt - 30
        if (isExpired) {
            accessToken = refreshAccessToken(prefs) ?: accessToken
        }

        var payload = fetchWidgetData(accessToken)
        if (payload == null) {
            val refreshed = refreshAccessToken(prefs)
            if (refreshed != null) payload = fetchWidgetData(refreshed)
        }

        val editor = prefs.edit()
        if (payload != null) {
            applyPayload(editor, payload)
        } else {
            editor.putInt("widget_streak", -1)
            editor.putFloat("widget_focus_score", -1f)
            editor.remove("widget_line1")
            editor.remove("widget_line2")
        }
        editor.apply()

        FocusedWidgetProvider.updateAll(applicationContext)
        Result.success()
    }

    private fun applyPayload(editor: SharedPreferences.Editor, payload: JSONObject) {
        val focusScore = if (payload.has("focusScore") && !payload.isNull("focusScore")) {
            payload.getDouble("focusScore").toFloat()
        } else -1f
        val streak = if (payload.has("streak")) payload.getInt("streak") else -1
        val gym = payload.optJSONObject("gym")
        val tasks = payload.optJSONArray("tasks")

        val lines = mutableListOf<String>()
        if (gym != null) lines.add("Palestra: " + gym.optString("title"))
        if (tasks != null) {
            var i = 0
            while (i < tasks.length() && lines.size < 2) {
                lines.add("• " + tasks.getJSONObject(i).optString("title"))
                i++
            }
        }
        if (lines.isEmpty()) lines.add("Nessun impegno oggi")

        editor.putInt("widget_streak", streak)
        editor.putFloat("widget_focus_score", focusScore)
        editor.putString("widget_line1", lines.getOrNull(0) ?: "")
        editor.putString("widget_line2", lines.getOrNull(1) ?: "")
    }

    private fun refreshAccessToken(prefs: SharedPreferences): String? {
        val refreshToken = prefs.getString("refresh_token", null) ?: return null
        return try {
            val url = URL("$SUPABASE_URL/auth/v1/token?grant_type=refresh_token")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("apikey", SUPABASE_ANON_KEY)
            conn.doOutput = true
            OutputStreamWriter(conn.outputStream).use {
                it.write(JSONObject().put("refresh_token", refreshToken).toString())
            }
            if (conn.responseCode != 200) return null
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val json = JSONObject(body)
            val newAccess = json.getString("access_token")
            val newRefresh = json.getString("refresh_token")
            val expiresIn = json.getDouble("expires_in")
            prefs.edit()
                .putString("access_token", newAccess)
                .putString("refresh_token", newRefresh)
                .putString("expires_at", (System.currentTimeMillis() / 1000.0 + expiresIn).toString())
                .apply()
            newAccess
        } catch (e: Exception) {
            null
        }
    }

    private fun fetchWidgetData(token: String): JSONObject? {
        return try {
            val url = URL("$API_BASE_URL/api/widget-data")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.setRequestProperty("Authorization", "Bearer $token")
            if (conn.responseCode != 200) return null
            JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
        } catch (e: Exception) {
            null
        }
    }
}
