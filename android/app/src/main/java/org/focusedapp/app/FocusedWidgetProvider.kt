package org.focusedapp.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

// Disegna il widget leggendo solo la cache in SharedPreferences (mai rete qui
// dentro: onUpdate/onReceive girano sul thread principale con un budget di
// pochi secondi). I dati veri li scarica FocusedWidgetUpdateWorker.
class FocusedWidgetProvider : AppWidgetProvider() {

    companion object {
        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, FocusedWidgetProvider::class.java))
            if (ids.isNotEmpty()) render(context, manager, ids)
        }

        fun render(context: Context, manager: AppWidgetManager, ids: IntArray) {
            val prefs = context.getSharedPreferences(FocusedWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE)
            val loggedIn = prefs.contains("access_token")
            val streak = prefs.getInt("widget_streak", -1)
            val focusScore = prefs.getFloat("widget_focus_score", -1f)
            val line1 = prefs.getString("widget_line1", null)
            val line2 = prefs.getString("widget_line2", null)

            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent()
            val pendingIntent = PendingIntent.getActivity(
                context, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            for (id in ids) {
                val views = RemoteViews(context.packageName, R.layout.widget_focused)
                views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

                when {
                    !loggedIn -> {
                        views.setTextViewText(R.id.widget_streak, "—")
                        views.setTextViewText(R.id.widget_focus_score, "—")
                        views.setTextViewText(R.id.widget_line1, "Accedi nell'app per")
                        views.setTextViewText(R.id.widget_line2, "vedere i tuoi progressi")
                    }
                    streak < 0 -> {
                        views.setTextViewText(R.id.widget_streak, "—")
                        views.setTextViewText(R.id.widget_focus_score, "—")
                        views.setTextViewText(R.id.widget_line1, "Dati non disponibili")
                        views.setTextViewText(R.id.widget_line2, "al momento")
                    }
                    else -> {
                        views.setTextViewText(R.id.widget_streak, streak.toString())
                        views.setTextViewText(R.id.widget_focus_score, if (focusScore >= 0) focusScore.toInt().toString() else "—")
                        views.setTextViewText(R.id.widget_line1, line1 ?: "")
                        views.setTextViewText(R.id.widget_line2, line2 ?: "")
                    }
                }

                manager.updateAppWidget(id, views)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        render(context, appWidgetManager, appWidgetIds)
        WorkManager.getInstance(context).enqueue(OneTimeWorkRequestBuilder<FocusedWidgetUpdateWorker>().build())
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == FocusedWidgetSyncPlugin.REFRESH_ACTION) {
            WorkManager.getInstance(context).enqueue(OneTimeWorkRequestBuilder<FocusedWidgetUpdateWorker>().build())
        }
    }
}
