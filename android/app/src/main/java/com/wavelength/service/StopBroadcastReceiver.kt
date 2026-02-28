package com.wavelength.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * BroadcastReceiver triggered by the "Stop Broadcasting" notification action.
 * Stops the foreground service and emits an event to React Native so the JS
 * layer can sync the broadcast toggle state.
 */
class StopBroadcastReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        // Stop the foreground service
        context.stopService(Intent(context, WavelengthForegroundService::class.java))

        // Emit event to React Native JS layer
        val reactContext = ForegroundServiceModule.reactContext
        reactContext?.let {
            if (it.hasActiveReactInstance()) {
                it.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("StopBroadcastFromNotification", null)
            }
        }
    }
}
