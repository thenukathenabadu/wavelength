package com.wavelength.mediasession

import android.service.notification.NotificationListenerService

/**
 * Stub NotificationListenerService required by MediaSessionManager.getActiveSessions().
 *
 * Android requires a NotificationListenerService to be declared and granted
 * notification access before MediaSessionManager will return active sessions.
 * This stub does nothing itself — it just satisfies the system requirement.
 *
 * User must grant access once via:
 *   Settings → Notifications → Notification access → Wavelength → Allow
 */
class NotificationListenerStub : NotificationListenerService()
