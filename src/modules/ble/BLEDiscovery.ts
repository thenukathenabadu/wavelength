/**
 * BLE Discovery module — Phase 1, Week 4–5
 *
 * Architecture:
 *   - Advertising: broadcast a custom service UUID + manufacturer data packet (~25 bytes)
 *   - Scanning: scan for the same service UUID, parse manufacturer data for quick preview
 *   - GATT on tap: connect to a specific peripheral, read full track JSON, disconnect
 *
 * BLE Packet layout (manufacturer data, ~25 bytes):
 *   [0–3]   userId hash (4 bytes)
 *   [4–5]   flags: isPlaying(1b) + sourceApp(3b) + reserved(12b)
 *   [6–9]   startedAt (Unix seconds, 4 bytes)
 *   [10–11] positionAtStart (seconds, uint16)
 *   [12–24] trackName prefix (13 bytes, UTF-8 truncated)
 *
 * Service UUID: WVLN-0001-0000-0000-000000000000 (must be included for iOS background scanning)
 *
 * TODO (Week 4–5): Implement using react-native-ble-plx v3+
 */

import type { Broadcaster } from '../../types';
import { useNearbyStore } from '../../store/nearbySlice';

// Placeholder — real implementation requires react-native-ble-plx
// import { BleManager } from 'react-native-ble-plx';

export const WAVELENGTH_SERVICE_UUID = 'WVLN0001-0000-0000-0000-000000000000';
export const WAVELENGTH_MANUFACTURER_ID = 0xFFFF; // Replace with registered ID for prod

let scanning = false;

export async function startBLEDiscovery(): Promise<void> {
  if (scanning) return;
  scanning = true;

  console.log('[BLE] startBLEDiscovery — stub (implement with react-native-ble-plx in Week 4-5)');

  // TODO:
  // 1. const manager = new BleManager();
  // 2. await manager.startDeviceScan([WAVELENGTH_SERVICE_UUID], null, onDeviceFound);
}

export function stopBLEDiscovery(): void {
  scanning = false;
  console.log('[BLE] stopBLEDiscovery — stub');
  // TODO: manager.stopDeviceScan();
}

export async function startBLEAdvertising(_userId: string): Promise<void> {
  console.log('[BLE] startBLEAdvertising — stub');
  // TODO: Android: use react-native-ble-advertiser or custom native module
  //       iOS: CBPeripheralManager — can advertise but not in background without entitlement
}

export function stopBLEAdvertising(): void {
  console.log('[BLE] stopBLEAdvertising — stub');
}

/**
 * Called when a device is found during scan.
 * Parses manufacturer data for the quick preview and upserts into the nearby store.
 */
function _onDeviceFound(/* device: Device */) {
  // TODO:
  // 1. Parse manufacturer data from device.manufacturerData
  // 2. Decode userId hash, flags, startedAt, positionAtStart, trackName prefix
  // 3. Construct a partial Broadcaster and call useNearbyStore.getState().upsertBroadcaster(...)
  // 4. Full metadata is fetched via GATT on user tap (see fetchFullTrackViaGATT below)
}

/**
 * Tap handler: connect via GATT, read full track JSON from characteristic, disconnect.
 * Call this when user taps a BroadcasterCard with source === 'ble'.
 */
export async function fetchFullTrackViaGATT(_peripheralId: string): Promise<Broadcaster | null> {
  console.log('[BLE] fetchFullTrackViaGATT — stub');
  // TODO:
  // 1. manager.connectToDevice(peripheralId)
  // 2. device.discoverAllServicesAndCharacteristics()
  // 3. device.readCharacteristicForService(WAVELENGTH_SERVICE_UUID, TRACK_CHAR_UUID)
  // 4. Parse JSON from characteristic value (base64)
  // 5. device.cancelConnection()
  return null;
}
