package com.wavelength.mediasession

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.os.Build
import android.provider.Settings
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * MediaSessionModule — reads active media sessions on Android.
 *
 * Requires BIND_NOTIFICATION_LISTENER_SERVICE permission.
 * User must grant Notification Access once in system settings.
 * (Settings → Notifications → Notification access → Wavelength → Allow)
 *
 * Emits "onNowPlayingChange" events to JS whenever the active session changes.
 */
class MediaSessionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "MediaSessionModule"

    private var sessionManager: MediaSessionManager? = null
    private var activeController: MediaController? = null
    private var sessionCallback: MediaController.Callback? = null
    private var listening = false

    // ── getCurrentTrack ────────────────────────────────────────────────────

    @ReactMethod
    fun getCurrentTrack(promise: Promise) {
        try {
            val controller = getActiveController()
            if (controller == null) {
                promise.resolve(null)
                return
            }
            promise.resolve(controllerToWritableMap(controller))
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    // ── startListening / stopListening ────────────────────────────────────

    @ReactMethod
    fun startListening() {
        if (listening) return
        listening = true

        try {
            val manager = reactContext.getSystemService(Context.MEDIA_SESSION_SERVICE)
                    as? MediaSessionManager ?: return

            sessionManager = manager

            val listenerComponent = ComponentName(
                reactContext,
                NotificationListenerStub::class.java,
            )

            manager.addOnActiveSessionsChangedListener(
                { controllers ->
                    controllers?.firstOrNull()?.let { registerCallback(it) }
                },
                listenerComponent,
            )

            // Register callback on the already-active controller (e.g. Spotify already playing)
            getActiveController()?.let { registerCallback(it) }

        } catch (e: SecurityException) {
            // Notification Access not granted — silently ignore
        } catch (e: Exception) {
            // Any other error — degrade gracefully
        }
    }

    @ReactMethod
    fun stopListening() {
        listening = false
        activeController = null
        sessionManager = null
    }

    // ── Internal helpers ──────────────────────────────────────────────────

    private fun getActiveController(): MediaController? {
        return try {
            val manager = reactContext.getSystemService(Context.MEDIA_SESSION_SERVICE)
                    as? MediaSessionManager

            val listenerComponent = ComponentName(
                reactContext,
                NotificationListenerStub::class.java,
            )

            manager?.getActiveSessions(listenerComponent)?.firstOrNull()
        } catch (e: Exception) {
            null
        }
    }

    private fun registerCallback(controller: MediaController) {
        // Unregister from previous controller to avoid duplicate callbacks
        activeController?.let { old -> sessionCallback?.let { old.unregisterCallback(it) } }

        activeController = controller
        sessionCallback = object : MediaController.Callback() {
            override fun onMetadataChanged(metadata: MediaMetadata?) {
                emitTrackChange(controller)
            }
            override fun onPlaybackStateChanged(state: PlaybackState?) {
                emitTrackChange(controller)
            }
        }
        controller.registerCallback(sessionCallback!!)
        emitTrackChange(controller)
    }

    private fun emitTrackChange(controller: MediaController) {
        val map = controllerToWritableMap(controller) ?: return
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onNowPlayingChange", map)
    }

    private fun controllerToWritableMap(controller: MediaController): WritableMap? {
        val metadata = controller.metadata ?: return null
        val state = controller.playbackState

        val trackName = metadata.getString(MediaMetadata.METADATA_KEY_TITLE)
            ?: return null
        val artistName = metadata.getString(MediaMetadata.METADATA_KEY_ARTIST)
            ?: metadata.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST)
            ?: ""
        val albumName = metadata.getString(MediaMetadata.METADATA_KEY_ALBUM)
        val duration = metadata.getLong(MediaMetadata.METADATA_KEY_DURATION)
        val isPlaying = state?.state == PlaybackState.STATE_PLAYING
        // Extrapolate live position: state.position is stale, add elapsed time since last update
        val position = if (state != null && isPlaying) {
            val elapsed = android.os.SystemClock.elapsedRealtime() - state.lastPositionUpdateTime
            state.position + (elapsed * state.playbackSpeed).toLong()
        } else {
            state?.position ?: 0L
        }
        val packageName = controller.packageName

        return Arguments.createMap().apply {
            putString("trackName", trackName)
            putString("artistName", artistName)
            putString("albumName", albumName)
            putNull("albumArtUrl")  // Bitmap → URL conversion handled separately if needed
            putDouble("totalDuration", duration.toDouble() / 1000.0)
            putDouble("currentPosition", position.toDouble() / 1000.0)
            putBoolean("isPlaying", isPlaying)
            putString("sourceApp", packageName)
        }
    }

    // ── Notification access helpers ────────────────────────────────────────────

    /**
     * Returns true if the user has granted Notification Access to Wavelength.
     * Without this, MediaSessionManager.getActiveSessions() always returns empty.
     */
    @ReactMethod
    fun isNotificationAccessGranted(promise: Promise) {
        try {
            val enabledListeners = Settings.Secure.getString(
                reactContext.contentResolver,
                "enabled_notification_listeners",
            )
            promise.resolve(enabledListeners?.contains(reactContext.packageName) == true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Opens the system Notification Access settings screen so the user can
     * enable access for Wavelength.
     */
    @ReactMethod
    fun openNotificationAccessSettings() {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
        } catch (e: Exception) {
            // Fallback: open general app settings
            try {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = android.net.Uri.fromParts("package", reactContext.packageName, null)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(intent)
            } catch (_: Exception) {}
        }
    }

    // Required for RN event emitter
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
