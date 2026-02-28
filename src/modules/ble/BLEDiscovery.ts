/**
 * BLEDiscovery — low-level BLE interface.
 *
 * Scanning: react-native-ble-plx (central role)
 * Advertising + GATT server: native modules
 *   Android → BLEAdvertiserModule (Kotlin)
 *   iOS     → BLEPeripheralBridge (Swift)
 *
 * Service UUID:  A1B2C3D4-0001-0000-0000-000000000000
 * Track char:    A1B2C3D4-0002-0000-0000-000000000000
 *
 * GATT characteristic value: full broadcast JSON (UTF-8, base64 encoded by BLE layer)
 */

import { NativeModules, Platform } from 'react-native';

// ─── BLE-PLX (central / scanner) ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let bleManager: any = null;

try {
  const { BleManager } = require('react-native-ble-plx');
  bleManager = new BleManager();
} catch {
  // Not linked (web preview) — scanning disabled
}

// ─── Native advertiser module (peripheral) ────────────────────────────────────

const Advertiser = Platform.OS === 'android'
  ? NativeModules.BLEAdvertiserModule ?? null
  : NativeModules.BLEPeripheralBridge ?? null;

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_UUID    = 'A1B2C3D4-0001-0000-0000-000000000000';
const TRACK_CHAR_UUID = 'A1B2C3D4-0002-0000-0000-000000000000';

/** Re-fetch interval per device — avoids hammering connections. */
const FETCH_CACHE_TTL_MS = 25_000;

// ─── State ────────────────────────────────────────────────────────────────────

interface FetchCache { lastFetched: number; json: string; }
const fetchCache = new Map<string, FetchCache>();
const pendingConnections = new Set<string>();
let backgroundMode = false;

/**
 * Switch between foreground (normal power) and background (low power) scan modes.
 * Call from RadarScreen's AppState listener.
 */
export function setBackgroundMode(isBackground: boolean): void {
  backgroundMode = isBackground;
}

// ─── Advertising (peripheral role) ───────────────────────────────────────────

export function startAdvertising(trackJson: string): void {
  try { Advertiser?.startAdvertising(trackJson); } catch { /* BLE unavailable */ }
}

export function updateBroadcastTrack(trackJson: string): void {
  try { Advertiser?.updateTrackData(trackJson); } catch { /* BLE unavailable */ }
}

export function stopAdvertising(): void {
  try { Advertiser?.stopAdvertising(); } catch { /* BLE unavailable */ }
}

// ─── Scanning (central role) ──────────────────────────────────────────────────

/**
 * Scans for Wavelength devices.
 * Calls onDeviceFound with the full parsed JSON packet whenever a new device
 * is discovered (or re-discovered after its cache expires).
 */
export function startScanning(
  onDeviceFound: (deviceId: string, packetJson: string, rssi: number) => void,
): void {
  if (!bleManager) return;

  // react-native-ble-plx ScanMode: 0=Opportunistic, 1=LowPower, 2=Balanced, 3=LowLatency
  const scanMode = backgroundMode ? 1 : 2; // LowPower in background, Balanced in foreground

  try {
    bleManager.startDeviceScan(
      [SERVICE_UUID],
      { allowDuplicates: true, scanMode },  // Must be true so we see repeat ads and can track lastSeen
      async (error: Error | null, device: any) => {
        if (error || !device) return;

        const id: string = device.id;
        const rssi: number = device.rssi ?? -99;

        // Return cached result if still fresh (avoids repeated GATT connections)
        const cached = fetchCache.get(id);
        if (cached && Date.now() - cached.lastFetched < FETCH_CACHE_TTL_MS) {
          // Still call callback so ProximityManager can update lastSeen
          onDeviceFound(id, cached.json, rssi);
          return;
        }

        if (pendingConnections.has(id)) return;

        const json = await fetchFullTrackData(id);
        if (json) {
          fetchCache.set(id, { lastFetched: Date.now(), json });
          onDeviceFound(id, json, rssi);
        }
      },
    );
  } catch {
    // BLE permission denied or hardware unavailable
  }
}

export function stopScanning(): void {
  try { bleManager?.stopDeviceScan(); } catch { /* ignore */ }
  fetchCache.clear();
  pendingConnections.clear();
}

// ─── GATT connect → read full data ───────────────────────────────────────────

export async function fetchFullTrackData(deviceId: string): Promise<string | null> {
  if (!bleManager) return null;
  pendingConnections.add(deviceId);
  try {
    const device = await bleManager.connectToDevice(deviceId, { requestMTU: 512 });
    await device.discoverAllServicesAndCharacteristics();
    const char = await device.readCharacteristicForService(SERVICE_UUID, TRACK_CHAR_UUID);
    await device.cancelConnection();
    if (!char.value) return null;
    return decodeBase64UTF8(char.value);
  } catch {
    return null;
  } finally {
    pendingConnections.delete(deviceId);
  }
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function decodeBase64UTF8(base64: string): string {
  const raw = atob(base64);
  const bytes = Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
