/**
 * ProximityManager — unified orchestrator for all discovery layers.
 *
 * Phase 5: BLE layer active.
 * Phase 7: GPS + Firestore (cloud layer).
 * Phase 8: mDNS/Zeroconf (same-WiFi layer).
 *
 * All sources feed into nearbySlice, deduplicated by userId.
 * Designed to be started once from App.tsx on mount.
 */

import { PermissionsAndroid, Platform } from 'react-native';
import * as BLE from '../../modules/ble/BLEDiscovery';
import { useNearbyStore } from '../../store/nearbySlice';
import type { Broadcaster, NowPlayingTrack, PlaybackSyncPacket } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BroadcastData {
  userId: string;
  displayName: string;
  isAnonymous: boolean;
  track: NowPlayingTrack;
  sync: PlaybackSyncPacket;
}

// ─── State ────────────────────────────────────────────────────────────────────

const STALE_TTL_MS = 30_000;
let evictionTimer: ReturnType<typeof setInterval> | null = null;
let discoveryActive = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/** Start passive scanning. Call once from App.tsx on mount. */
export async function startDiscovery(): Promise<void> {
  if (discoveryActive) return;
  discoveryActive = true;

  const hasPermission = await requestBLEPermissions();
  if (!hasPermission) return;

  // Stale eviction every 10s
  evictionTimer = setInterval(() => {
    useNearbyStore.getState().evictStale(STALE_TTL_MS);
  }, 10_000);

  // BLE scan — feeds nearbySlice
  BLE.startScanning((deviceId, packetJson, rssi) => {
    try {
      const data = JSON.parse(packetJson) as Record<string, unknown>;
      const broadcaster = packetToBroadcaster(deviceId, data, rssi);
      if (broadcaster) {
        useNearbyStore.getState().upsertBroadcaster(broadcaster);
      }
    } catch {
      // Malformed JSON — ignore
    }
  });
}

/** Stop all discovery and clean up. */
export function stopDiscovery(): void {
  discoveryActive = false;
  BLE.stopScanning();
  if (evictionTimer) {
    clearInterval(evictionTimer);
    evictionTimer = null;
  }
}

/** Start broadcasting your track to nearby scanners. */
export function startBroadcasting(data: BroadcastData): void {
  BLE.startAdvertising(buildPacketJson(data));
}

/** Update the GATT characteristic while already broadcasting (track changed). */
export function updateBroadcasting(data: BroadcastData): void {
  BLE.updateBroadcastTrack(buildPacketJson(data));
}

/** Stop broadcasting (removes you from others' Radar). */
export function stopBroadcasting(): void {
  BLE.stopAdvertising();
}

// ─── Packet helpers ───────────────────────────────────────────────────────────

/** Serialises broadcast data into the GATT JSON packet. */
export function buildPacketJson(data: BroadcastData): string {
  return JSON.stringify({
    userId:          data.userId,
    displayName:     data.displayName,
    isAnonymous:     data.isAnonymous,
    trackName:       data.track.trackName,
    artistName:      data.track.artistName,
    albumName:       data.track.albumName,
    albumArtUrl:     data.track.albumArtUrl,
    totalDuration:   data.track.totalDuration,
    sourceApp:       data.track.sourceApp,
    deepLinkUri:     data.track.deepLinkUri,
    spotifyTrackId:  data.track.spotifyTrackId,
    startedAt:       data.sync.startedAt,
    positionAtStart: data.sync.positionAtStart,
    isPlaying:       data.sync.isPlaying,
  });
}

/** Parses a GATT JSON packet into a Broadcaster object. */
function packetToBroadcaster(
  deviceId: string,
  d: Record<string, unknown>,
  rssi: number,
): Broadcaster | null {
  const trackName = d.trackName as string | undefined;
  if (!trackName) return null;

  return {
    id:          (d.userId as string | undefined) ?? deviceId,
    displayName: (d.displayName as string | undefined) ?? 'Unknown',
    isAnonymous: (d.isAnonymous as boolean | undefined) ?? false,
    track: {
      trackName,
      artistName:     (d.artistName as string | undefined) ?? '',
      albumName:      d.albumName as string | undefined,
      albumArtUrl:    d.albumArtUrl as string | undefined,
      totalDuration:  (d.totalDuration as number | undefined) ?? 0,
      sourceApp:      (d.sourceApp as NowPlayingTrack['sourceApp'] | undefined) ?? 'unknown',
      deepLinkUri:    d.deepLinkUri as string | undefined,
      spotifyTrackId: d.spotifyTrackId as string | undefined,
    },
    sync: {
      startedAt:       (d.startedAt as number | undefined) ?? Date.now(),
      positionAtStart: (d.positionAtStart as number | undefined) ?? 0,
      isPlaying:       (d.isPlaying as boolean | undefined) ?? false,
    },
    source:        'ble',
    distanceMeters: rssiToDistance(rssi),
    lastSeen:       Date.now(),
  };
}

// ─── Permissions ──────────────────────────────────────────────────────────────

async function requestBLEPermissions(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    // iOS prompts automatically on first CBCentralManager/CBPeripheralManager use
    return true;
  }

  try {
    if (Platform.Version >= 31) {
      // Android 12+
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      ]);
      return Object.values(results).every(
        (r) => r === PermissionsAndroid.RESULTS.GRANTED,
      );
    } else {
      // Android < 12: location permission gates BLE scanning
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch {
    return false;
  }
}

// ─── Utils ────────────────────────────────────────────────────────────────────

/** Rough RSSI → distance conversion (log-distance path loss model). */
function rssiToDistance(rssi: number): number {
  const txPower = -59; // typical measured power at 1m
  const n = 2.0;       // path loss exponent (2 = free space)
  return Math.pow(10, (txPower - rssi) / (10 * n));
}
