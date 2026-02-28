/**
 * Firebase Firestore geo-broadcast service — Phase 7.
 *
 * Writes /broadcasts/{userId} with geohash + 5-min TTL.
 * Queries nearby documents using geohash range queries (geofire-common).
 * Re-filters by actual distance (geohash bounds are rectangular, not circular).
 *
 * Firestore document shape:
 *   displayName?, isAnonymous, geohash, lat, lon,
 *   trackName, artistName, albumName?, albumArtUrl?, totalDuration, sourceApp,
 *   deepLinkUri?, spotifyTrackId?,
 *   startedAt, positionAtStart, isPlaying,
 *   updatedAt (Timestamp), expiresAt (Timestamp)
 */

import {
  collection, doc, setDoc, deleteDoc,
  query, where, onSnapshot, Timestamp,
} from 'firebase/firestore';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';
import { db } from './firebaseConfig';
import { encode as geohashEncode } from '../../utils/geohash';
import type { NowPlayingTrack, PlaybackSyncPacket, Broadcaster } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const BROADCASTS_COLLECTION = 'broadcasts';
const BROADCAST_TTL_MS      = 5 * 60 * 1000;  // 5 minutes
const HEARTBEAT_INTERVAL_MS = 60 * 1000;       // 60 seconds

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BroadcastPayload {
  userId:      string;
  displayName: string;
  isAnonymous: boolean;
  lat:         number;
  lon:         number;
  track:       NowPlayingTrack;
  sync:        PlaybackSyncPacket;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function writeBroadcast(payload: BroadcastPayload): Promise<void> {
  const geohash = geohashEncode(payload.lat, payload.lon, 9);

  await setDoc(doc(db, BROADCASTS_COLLECTION, payload.userId), {
    displayName:     payload.isAnonymous ? null : payload.displayName,
    isAnonymous:     payload.isAnonymous,
    geohash,
    lat:             payload.lat,
    lon:             payload.lon,
    trackName:       payload.track.trackName,
    artistName:      payload.track.artistName,
    albumName:       payload.track.albumName     ?? null,
    albumArtUrl:     payload.track.albumArtUrl   ?? null,
    totalDuration:   payload.track.totalDuration,
    sourceApp:       payload.track.sourceApp,
    deepLinkUri:     payload.track.deepLinkUri   ?? null,
    spotifyTrackId:  payload.track.spotifyTrackId ?? null,
    startedAt:       payload.sync.startedAt,
    positionAtStart: payload.sync.positionAtStart,
    isPlaying:       payload.sync.isPlaying,
    updatedAt:       Timestamp.now(),
    expiresAt:       Timestamp.fromMillis(Date.now() + BROADCAST_TTL_MS),
  });
}

export async function deleteBroadcast(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, BROADCASTS_COLLECTION, userId));
  } catch {
    // Already deleted or network error — ignore
  }
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export function startBroadcastHeartbeat(getPayload: () => BroadcastPayload | null): void {
  stopBroadcastHeartbeat();
  heartbeatTimer = setInterval(async () => {
    const payload = getPayload();
    if (payload) await writeBroadcast(payload).catch(() => {});
  }, HEARTBEAT_INTERVAL_MS);
}

export function stopBroadcastHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

// ─── Subscribe ────────────────────────────────────────────────────────────────

/**
 * Subscribes to nearby broadcasts within radiusKm using geohash range queries.
 *
 * Fires onUpdate with a fresh Broadcaster[] array whenever Firestore updates.
 * Returns an unsubscribe function — call it to clean up all listeners.
 */
export function subscribeNearbyBroadcasts(
  lat: number,
  lon: number,
  radiusKm: number,
  onUpdate: (broadcasters: Broadcaster[]) => void,
): () => void {
  const radiusM = radiusKm * 1000;
  const bounds = geohashQueryBounds([lat, lon], radiusM);

  // One result map per query — merged on each snapshot update
  const queryResults = new Map<number, Map<string, Broadcaster>>();
  const unsubs: Array<() => void> = [];

  bounds.forEach((bound, index) => {
    queryResults.set(index, new Map());

    const q = query(
      collection(db, BROADCASTS_COLLECTION),
      where('geohash', '>=', bound[0]),
      where('geohash', '<=', bound[1]),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const results = queryResults.get(index)!;
      const now = Date.now();

      snapshot.docChanges().forEach((change) => {
        const id = change.doc.id;

        if (change.type === 'removed') {
          results.delete(id);
          return;
        }

        const data = change.doc.data();

        // Client-side TTL filter
        const expiresAtMs = (data.expiresAt as Timestamp)?.toMillis?.() ?? 0;
        if (expiresAtMs < now) {
          results.delete(id);
          return;
        }

        // Client-side distance filter (geohash bounds are rectangular)
        const distKm = distanceBetween([data.lat as number, data.lon as number], [lat, lon]);
        if (distKm > radiusKm) {
          results.delete(id);
          return;
        }

        const broadcaster = docToBroadcaster(id, data, distKm * 1000);
        if (broadcaster) results.set(id, broadcaster);
      });

      // Emit merged de-duplicated list
      const all: Broadcaster[] = [];
      for (const map of queryResults.values()) {
        for (const b of map.values()) all.push(b);
      }
      onUpdate(all);
    }, () => {
      // Network error — keep existing results visible, stale eviction will clean up
    });

    unsubs.push(unsub);
  });

  return () => unsubs.forEach((u) => u());
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function docToBroadcaster(
  id: string,
  d: Record<string, unknown>,
  distanceMeters: number,
): Broadcaster | null {
  const trackName = d.trackName as string | undefined;
  if (!trackName) return null;

  return {
    id,
    displayName: (d.displayName as string | null) ?? 'Anonymous',
    isAnonymous: (d.isAnonymous as boolean) ?? false,
    track: {
      trackName,
      artistName:     (d.artistName as string)    ?? '',
      albumName:      d.albumName    as string | undefined,
      albumArtUrl:    d.albumArtUrl  as string | undefined,
      totalDuration:  (d.totalDuration as number) ?? 0,
      sourceApp:      (d.sourceApp as NowPlayingTrack['sourceApp']) ?? 'unknown',
      deepLinkUri:    d.deepLinkUri    as string | undefined,
      spotifyTrackId: d.spotifyTrackId as string | undefined,
    },
    sync: {
      startedAt:       (d.startedAt       as number) ?? Date.now(),
      positionAtStart: (d.positionAtStart as number) ?? 0,
      isPlaying:       (d.isPlaying       as boolean) ?? false,
    },
    source:         'gps',
    distanceMeters,
    lat:            d.lat as number,
    lon:            d.lon as number,
    lastSeen:       Date.now(),
  };
}
