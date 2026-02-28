package com.wavelength.service

import android.content.Intent
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ForegroundServiceModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    init {
        // Expose reactContext so StopBroadcastReceiver can emit events to JS
        Companion.reactContext = reactContext
    }

    companion object {
        var reactContext: ReactApplicationContext? = null
    }

    override fun getName() = "ForegroundServiceModule"

    /** Start (or update) the foreground service with current track info. */
    @ReactMethod
    fun start(trackName: String, artistName: String) {
        val intent = Intent(reactContext, WavelengthForegroundService::class.java).apply {
            putExtra(WavelengthForegroundService.EXTRA_MODE, WavelengthForegroundService.MODE_BROADCAST)
            putExtra(WavelengthForegroundService.EXTRA_TRACK, trackName)
            putExtra(WavelengthForegroundService.EXTRA_ARTIST, artistName)
        }
        ContextCompat.startForegroundService(reactContext, intent)
    }

    /** Start the foreground service in discovery mode (keeps BLE scanning alive in background). */
    @ReactMethod
    fun startDiscovery() {
        val intent = Intent(reactContext, WavelengthForegroundService::class.java).apply {
            putExtra(WavelengthForegroundService.EXTRA_MODE, WavelengthForegroundService.MODE_DISCOVERY)
        }
        ContextCompat.startForegroundService(reactContext, intent)
    }

    /** Stop the foreground service (call when broadcasting is turned off). */
    @ReactMethod
    fun stop() {
        reactContext.stopService(
            Intent(reactContext, WavelengthForegroundService::class.java)
        )
    }
}
