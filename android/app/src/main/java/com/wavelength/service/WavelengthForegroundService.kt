package com.wavelength.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * WavelengthForegroundService — keeps the process alive while broadcasting.
 *
 * Without this, Android throttles JS timers and kills the process on screen lock,
 * stopping the Firestore heartbeat, BLE advertising, and mDNS publishing.
 *
 * Started when broadcasting is toggled ON, stopped when toggled OFF.
 * Notification includes a "Stop Broadcasting" action for quick user control.
 */
class WavelengthForegroundService : Service() {

    companion object {
        const val CHANNEL_ID      = "wavelength_broadcast"
        const val NOTIFICATION_ID = 1001
        const val EXTRA_TRACK     = "trackName"
        const val EXTRA_ARTIST    = "artistName"
        const val EXTRA_MODE      = "mode"
        const val MODE_BROADCAST  = "broadcast"
        const val MODE_DISCOVERY  = "discovery"
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val mode       = intent?.getStringExtra(EXTRA_MODE)   ?: MODE_BROADCAST
        val trackName  = intent?.getStringExtra(EXTRA_TRACK)  ?: "Unknown track"
        val artistName = intent?.getStringExtra(EXTRA_ARTIST) ?: ""
        startForeground(NOTIFICATION_ID, buildNotification(mode, trackName, artistName))
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    private fun buildNotification(mode: String, trackName: String, artistName: String): Notification {
        // Tap notification → open app
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val launchPending = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(launchPending)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)

        if (mode == MODE_DISCOVERY) {
            builder
                .setContentTitle("👂 Listening for nearby music")
                .setContentText("Wavelength is scanning for broadcasters")
        } else {
            // "Stop Broadcasting" action button (broadcast mode only)
            val stopIntent = Intent(this, StopBroadcastReceiver::class.java)
            val stopPending = PendingIntent.getBroadcast(
                this, 0, stopIntent,
                PendingIntent.FLAG_IMMUTABLE,
            )
            builder
                .setContentTitle("📡 Broadcasting: $trackName")
                .setContentText(artistName.ifBlank { "Wavelength" })
                .addAction(0, "Stop Broadcasting", stopPending)
        }

        return builder.build()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Wavelength Broadcasting",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Keeps your broadcast active in the background"
            setShowBadge(false)
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
}
