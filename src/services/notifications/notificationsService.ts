import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Dedup: track which track names we've notified about in the last 5 minutes
const recentlyNotified = new Map<string, number>(); // trackName → timestamp
const DEDUP_MS = 5 * 60 * 1000;

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleNearbyNotification(
  trackName: string,
  artistName: string,
): Promise<void> {
  // Only fire when app is backgrounded
  if (AppState.currentState === 'active') return;

  // Dedup: skip if we notified about this track recently
  const now = Date.now();
  const lastNotified = recentlyNotified.get(trackName);
  if (lastNotified && now - lastNotified < DEDUP_MS) return;

  // Clean up old entries
  for (const [key, ts] of recentlyNotified) {
    if (now - ts > DEDUP_MS) recentlyNotified.delete(key);
  }

  recentlyNotified.set(trackName, now);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Someone nearby is listening',
      body: `${trackName} · ${artistName}`,
      data: { type: 'nearby_broadcaster' },
    },
    trigger: null, // fire immediately
  });
}
