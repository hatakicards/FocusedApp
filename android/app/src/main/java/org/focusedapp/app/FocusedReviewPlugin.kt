package org.focusedapp.app

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.play.core.review.ReviewManagerFactory

// Finestra di valutazione di Google Play (In-App Review): e' Play a decidere se mostrarla.
// Usata dal popup "Ti sta piacendo Focused?" (src/components/RatePrompt.jsx).
@CapacitorPlugin(name = "FocusedReview")
class FocusedReviewPlugin : Plugin() {
    @PluginMethod
    fun available(call: PluginCall) {
        call.resolve(JSObject().put("available", true))
    }

    @PluginMethod
    fun request(call: PluginCall) {
        val host = activity
        if (host == null) {
            call.resolve()
            return
        }
        val manager = ReviewManagerFactory.create(context)
        manager.requestReviewFlow().addOnCompleteListener { request ->
            if (request.isSuccessful) {
                manager.launchReviewFlow(host, request.result).addOnCompleteListener { call.resolve() }
            } else {
                call.resolve()
            }
        }
    }
}
