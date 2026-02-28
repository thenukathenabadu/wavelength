import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const Native = NativeModules.ForegroundServiceModule;

/**
 * Start (or update) the Android foreground service notification.
 * Keeps the process alive on screen lock so BLE, mDNS, and Firestore heartbeat continue.
 * No-op on iOS/web.
 */
export function startForegroundService(trackName: string, artistName: string): void {
  if (Platform.OS !== 'android') return;
  Native?.start(trackName, artistName);
}

/**
 * Start the foreground service in discovery mode.
 * Keeps the process alive so BLE scanning isn't throttled in the background.
 * No-op on iOS/web.
 */
export function startDiscoveryService(): void {
  if (Platform.OS !== 'android') return;
  Native?.startDiscovery();
}

/**
 * Stop the foreground service. Call when broadcasting is toggled OFF.
 */
export function stopForegroundService(): void {
  if (Platform.OS !== 'android') return;
  Native?.stop();
}

/**
 * Subscribe to the "Stop Broadcasting" notification action tap.
 * Returns an unsubscribe function.
 */
export function subscribeToStopAction(callback: () => void): () => void {
  if (Platform.OS !== 'android' || !Native) return () => {};
  const emitter = new NativeEventEmitter(Native);
  const sub = emitter.addListener('StopBroadcastFromNotification', callback);
  return () => sub.remove();
}
