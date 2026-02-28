/**
 * ProximityManager — unified orchestrator for all discovery layers.
 *
 * Phase 5: BLE layer active.
 * Phase 7: GPS + Firestore geo-queries.
 * Phase 8: mDNS/Zeroconf (same-WiFi layer).
 *
 * All sources feed into nearbySlice, deduplicated by userId.
 * Started once from App.tsx on mount.
 */

import { PermissionsAndroid, Platform, AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import * as BLE from '../../modules/ble/BLEDiscovery';
import * as MDNS from '../../modules/mdns/MDNSDiscovery';
import {
  writeBroadcast,
  deleteBroadcast,
  startBroadcastHeartbeat,
  stopBroadcastHeartbeat,
  subscribeNearbyBroadcasts,
  type BroadcastPayload,
} from '../firebase/geobroadcast';
import { useNearbyStore } from '../../store/nearbySlice';
import { useSettingsStore } from '../../store/settingsSlice';
import type { Broadcaster, NowPlayingTrack, PlaybackSyncPacket } from '../../types';
import { scheduleNearbyNotification } from '../notifications/notificationsService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BroadcastData {
  userId:      string;
  displayName: string;
  isAnonymous: boolean;
  track:       NowPlayingTrack;
  sync:        PlaybackSyncPacket;
}

// ─── State ────────────────────────────────────────────────────────────────────


let evictionTimer:   ReturnType<typeof setInterval> | null = null;
let gpsUnsubscribe:  (() => void) | null = null;
let discoveryActive  = false;
let lastBroadcastData: BroadcastData | null = null;
let lastLocation:    { lat: number; lon: number } | null = null;

// ─── Discovery ────────────────────────────────────────────────────────────────

/** Start passive scanning across all enabled layers. Call once from App.tsx. */
export async function startDiscovery(): Promise<void> {
  if (discoveryActive) return;
  discoveryActive = true;

  // Stale eviction
  evictionTimer = setInterval(() => {
    useNearbyStore.getState().evictStale();
  }, 10_000);

  // ── BLE layer ──
  const hasBLE = await requestBLEPermissions();
  if (hasBLE) {
    BLE.startScanning((deviceId, packetJson, rssi) => {
      try {
        const data = JSON.parse(packetJson) as Record<string, unknown>;
        const broadcaster = bleParseToBroadcaster(deviceId, data, rssi);
        if (broadcaster) {
          const isNew = !useNearbyStore.getState().broadcasters.has(broadcaster.id);
          useNearbyStore.getState().upsertBroadcaster(broadcaster);
          if (isNew) {
            scheduleNearbyNotification(broadcaster.track.trackName, broadcaster.track.artistName).catch(() => {});
          }
        }
      } catch { /* malformed JSON */ }
    });
  }

  // ── WiFi / mDNS layer ──
  const { wifiEnabled } = useSettingsStore.getState();
  if (wifiEnabled) {
    MDNS.startBrowsing((deviceId, packetJson) => {
      try {
        const data = JSON.parse(packetJson) as Record<string, unknown>;
        const broadcaster = mdnsParseToBroadcaster(deviceId, data);
        if (broadcaster) useNearbyStore.getState().upsertBroadcaster(broadcaster);
      } catch { /* malformed JSON */ }
    });
  }

  // ── GPS layer (skip if offline) ──
  const { gpsEnabled, radiusKm } = useSettingsStore.getState();
  if (gpsEnabled) {
    const net = await NetInfo.fetch();
    if (net.isConnected) {
      await startGPSDiscovery(radiusKm);
    }
  }
}

export function stopDiscovery(): void {
  discoveryActive = false;
  BLE.stopScanning();
  MDNS.stopBrowsing();
  stopGPSDiscovery();
  if (evictionTimer) { clearInterval(evictionTimer); evictionTimer = null; }
}

// ─── Broadcasting ─────────────────────────────────────────────────────────────

export async function startBroadcasting(data: BroadcastData): Promise<void> {
  lastBroadcastData = data;
  const packetJson = buildPacketJson(data);

  // BLE advertising
  BLE.startAdvertising(packetJson);

  // WiFi / mDNS advertising
  const { wifiEnabled } = useSettingsStore.getState();
  if (wifiEnabled) {
    MDNS.publishService(data.userId, packetJson);
  }

  // GPS broadcast write + heartbeat (skip if offline)
  const { gpsEnabled } = useSettingsStore.getState();
  if (gpsEnabled) {
    const net = await NetInfo.fetch().catch(() => ({ isConnected: false }));
    if (net.isConnected) {
      const loc = await getLocation();
      if (loc) {
        lastLocation = loc;
        const payload = toGeoPayload(data, loc);
        await writeBroadcast(payload).catch(() => {});
        startBroadcastHeartbeat(() => {
          if (!lastBroadcastData || !lastLocation) return null;
          return toGeoPayload(lastBroadcastData, lastLocation);
        });
      }
    }
  }
}

export async function updateBroadcasting(data: BroadcastData): Promise<void> {
  lastBroadcastData = data;
  const packetJson = buildPacketJson(data);

  BLE.updateBroadcastTrack(packetJson);
  MDNS.updateService(packetJson);

  // Refresh Firestore doc with new sync packet
  const { gpsEnabled } = useSettingsStore.getState();
  if (gpsEnabled && lastLocation) {
    await writeBroadcast(toGeoPayload(data, lastLocation)).catch(() => {});
  }
}

export async function stopBroadcasting(): Promise<void> {
  const userId = lastBroadcastData?.userId;
  lastBroadcastData = null;

  BLE.stopAdvertising();
  MDNS.unpublishService();
  stopBroadcastHeartbeat();
  if (userId) await deleteBroadcast(userId).catch(() => {});
}

// ─── GPS helpers ──────────────────────────────────────────────────────────────

async function startGPSDiscovery(radiusKm: number): Promise<void> {
  const loc = await getLocation();
  if (!loc) return;
  lastLocation = loc;

  gpsUnsubscribe = subscribeNearbyBroadcasts(loc.lat, loc.lon, radiusKm, (broadcasters) => {
    const { upsertBroadcaster } = useNearbyStore.getState();
    broadcasters.forEach(upsertBroadcaster);
  });
}

function stopGPSDiscovery(): void {
  gpsUnsubscribe?.();
  gpsUnsubscribe = null;
}

async function getLocation(): Promise<{ lat: number; lon: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return null;
  }
}

// ─── Packet helpers ───────────────────────────────────────────────────────────

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

function toGeoPayload(
  data: BroadcastData,
  loc: { lat: number; lon: number },
): BroadcastPayload {
  return {
    userId:      data.userId,
    displayName: data.displayName,
    isAnonymous: data.isAnonymous,
    lat:         loc.lat,
    lon:         loc.lon,
    track:       data.track,
    sync:        data.sync,
  };
}

function bleParseToBroadcaster(
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
      albumName:      d.albumName      as string | undefined,
      albumArtUrl:    d.albumArtUrl    as string | undefined,
      totalDuration:  (d.totalDuration as number | undefined) ?? 0,
      sourceApp:      (d.sourceApp as NowPlayingTrack['sourceApp'] | undefined) ?? 'unknown',
      deepLinkUri:    d.deepLinkUri    as string | undefined,
      spotifyTrackId: d.spotifyTrackId as string | undefined,
    },
    sync: {
      startedAt:       (d.startedAt       as number | undefined) ?? Date.now(),
      positionAtStart: (d.positionAtStart as number | undefined) ?? 0,
      isPlaying:       (d.isPlaying       as boolean | undefined) ?? false,
    },
    source:         'ble',
    distanceMeters: rssiToDistance(rssi),
    lastSeen:       Date.now(),
  };
}

// ─── Permissions ──────────────────────────────────────────────────────────────

async function requestBLEPermissions(): Promise<boolean> {
  if (Platform.OS === 'ios') return true;
  try {
    if (Platform.Version >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      ]);
      return Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
    } else {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch { return false; }
}

function mdnsParseToBroadcaster(
  deviceId: string,
  d: Record<string, unknown>,
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
      albumName:      d.albumName      as string | undefined,
      albumArtUrl:    d.albumArtUrl    as string | undefined,
      totalDuration:  (d.totalDuration as number | undefined) ?? 0,
      sourceApp:      (d.sourceApp as NowPlayingTrack['sourceApp'] | undefined) ?? 'unknown',
      deepLinkUri:    d.deepLinkUri    as string | undefined,
      spotifyTrackId: d.spotifyTrackId as string | undefined,
    },
    sync: {
      startedAt:       (d.startedAt       as number | undefined) ?? Date.now(),
      positionAtStart: (d.positionAtStart as number | undefined) ?? 0,
      isPlaying:       (d.isPlaying       as boolean | undefined) ?? false,
    },
    source:         'mdns',
    distanceMeters: undefined, // same network — distance not meaningful
    lastSeen:       Date.now(),
  };
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function rssiToDistance(rssi: number): number {
  const txPower = -59;
  const n = 2.0;
  return Math.pow(10, (txPower - rssi) / (10 * n));
}
