/**
 * ProximityManager — unified orchestrator for all 3 discovery layers.
 *
 * All three sources feed into the Zustand nearbySlice, deduplicated by userId.
 *
 * Layer 1: BLE (~30–50m, no pairing, cross-platform)
 * Layer 2: mDNS/Zeroconf (same WiFi, cross-platform)
 * Layer 3: GPS + Firestore geo-queries (configurable radius, requires data connection)
 *
 * Phase 1: BLE only.
 * Phase 2: Wire up mDNS + GPS layers.
 */

import { startBLEDiscovery, stopBLEDiscovery, startBLEAdvertising, stopBLEAdvertising } from '../../modules/ble/BLEDiscovery';
import { startMDNSDiscovery, stopMDNSDiscovery, publishMDNSService, unpublishMDNSService } from '../../modules/mdns/MDNSDiscovery';
import { subscribeNearbyBroadcasts, writeBroadcast, deleteBroadcast, startBroadcastHeartbeat, stopBroadcastHeartbeat } from '../firebase/geobroadcast';
import { useNearbyStore } from '../../store/nearbySlice';
import type { BroadcastPayload } from '../firebase/geobroadcast';

type DiscoveryMode = 'ble' | 'mdns' | 'gps' | 'all';

interface ProximityConfig {
  userId: string;
  displayName: string;
  isAnonymous: boolean;
  mode: DiscoveryMode;
  radiusKm: number;
  getBroadcastPayload: () => BroadcastPayload | null;
}

let gpsUnsubscribe: (() => void) | null = null;
let activeConfig: ProximityConfig | null = null;

export async function startDiscovery(config: ProximityConfig): Promise<void> {
  activeConfig = config;
  const { mode, userId, getBroadcastPayload, radiusKm } = config;

  // Layer 1: BLE
  if (mode === 'ble' || mode === 'all') {
    await startBLEDiscovery();
    await startBLEAdvertising(userId);
  }

  // Layer 2: mDNS — Phase 2
  if (mode === 'mdns' || mode === 'all') {
    startMDNSDiscovery((_host, _port) => {
      // TODO (Phase 2): fetch track data from host:port via HTTP, upsert into store
    });
    publishMDNSService(8765, userId);
  }

  // Layer 3: GPS — Phase 2
  if (mode === 'gps' || mode === 'all') {
    const payload = getBroadcastPayload();
    if (payload) {
      await writeBroadcast(payload);
      startBroadcastHeartbeat(getBroadcastPayload);

      gpsUnsubscribe = subscribeNearbyBroadcasts(
        payload.lat,
        payload.lon,
        radiusKm,
        (broadcasters) => {
          const { upsertBroadcaster } = useNearbyStore.getState();
          broadcasters.forEach(upsertBroadcaster);
        },
      );
    }
  }
}

export async function stopDiscovery(): Promise<void> {
  const config = activeConfig;
  activeConfig = null;

  // Layer 1: BLE
  stopBLEDiscovery();
  stopBLEAdvertising();

  // Layer 2: mDNS
  stopMDNSDiscovery();
  unpublishMDNSService();

  // Layer 3: GPS
  stopBroadcastHeartbeat();
  if (gpsUnsubscribe) {
    gpsUnsubscribe();
    gpsUnsubscribe = null;
  }
  if (config) {
    await deleteBroadcast(config.userId);
  }
}
