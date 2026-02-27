/**
 * Firebase Firestore geo-broadcast service — Phase 2
 *
 * Writes the current user's broadcast to /broadcasts/{userId} with a geohash.
 * Reads nearby broadcasts using geohash range queries (geofire-common).
 * TTL: document expires at (now + 5 min), refreshed every 60s via broadcastHeartbeat().
 *
 * TODO (Phase 2, Week 9): Install firebase + geofire-common, implement below.
 */

import type { NowPlayingTrack, PlaybackSyncPacket, Broadcaster } from '../../types';
import { encode as geohashEncode } from '../../utils/geohash';

// import firestore from '@react-native-firebase/firestore';
// import { geohashQueryBounds } from 'geofire-common';

const BROADCASTS_COLLECTION = 'broadcasts';
const BROADCAST_TTL_MS = 5 * 60 * 1000; // 5 minutes
const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 60 seconds

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export interface BroadcastPayload {
  userId: string;
  displayName: string;
  isAnonymous: boolean;
  lat: number;
  lon: number;
  track: NowPlayingTrack;
  sync: PlaybackSyncPacket;
}

export async function writeBroadcast(_payload: BroadcastPayload): Promise<void> {
  console.log('[GeoBroadcast] writeBroadcast — stub (implement in Phase 2)');

  const geohash = geohashEncode(_payload.lat, _payload.lon);

  // TODO:
  // await firestore().collection(BROADCASTS_COLLECTION).doc(_payload.userId).set({
  //   displayName: _payload.isAnonymous ? null : _payload.displayName,
  //   isAnonymous: _payload.isAnonymous,
  //   geohash,
  //   location: firestore.GeoPoint(_payload.lat, _payload.lon),
  //   track: _payload.track,
  //   sync: _payload.sync,
  //   updatedAt: firestore.FieldValue.serverTimestamp(),
  //   expiresAt: new Date(Date.now() + BROADCAST_TTL_MS),
  // });
}

export async function deleteBroadcast(_userId: string): Promise<void> {
  // await firestore().collection(BROADCASTS_COLLECTION).doc(_userId).delete();
}

export function startBroadcastHeartbeat(getPayload: () => BroadcastPayload | null): void {
  stopBroadcastHeartbeat();
  heartbeatTimer = setInterval(async () => {
    const payload = getPayload();
    if (payload) await writeBroadcast(payload);
  }, HEARTBEAT_INTERVAL_MS);
}

export function stopBroadcastHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

/**
 * Subscribe to nearby broadcasts within radiusKm.
 * Returns an unsubscribe function.
 *
 * TODO (Phase 2): implement with geohashQueryBounds + Firestore onSnapshot
 */
export function subscribeNearbyBroadcasts(
  _lat: number,
  _lon: number,
  _radiusKm: number,
  _onUpdate: (broadcasters: Broadcaster[]) => void,
): () => void {
  console.log('[GeoBroadcast] subscribeNearbyBroadcasts — stub (implement in Phase 2)');
  return () => {};
}
