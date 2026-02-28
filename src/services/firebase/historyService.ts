/**
 * historyService — writes and reads per-user broadcast + listen history.
 *
 * Firestore structure:
 *   /users/{uid}/broadcastHistory/{docId}  — each broadcasting session
 *   /users/{uid}/listenHistory/{docId}     — each time user opens a broadcaster's sheet
 */

import {
  collection, addDoc, updateDoc, doc,
  query, orderBy, limit, onSnapshot,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { NowPlayingTrack, Broadcaster } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BroadcastHistoryEntry {
  id: string;
  trackName: string;
  artistName: string;
  albumArtUrl?: string;
  sourceApp: string;
  startedAt: number;   // Unix ms
  durationSecs?: number;
}

export interface ListenHistoryEntry {
  id: string;
  trackName: string;
  artistName: string;
  albumArtUrl?: string;
  sourceApp: string;
  broadcasterName: string;
  discoveredVia: 'ble' | 'mdns' | 'gps';
  listenedAt: number;  // Unix ms
}

// ─── Broadcast history ────────────────────────────────────────────────────────

/** Call when broadcasting starts. Returns the new doc ID. */
export async function logBroadcastStart(
  uid: string,
  track: NowPlayingTrack,
): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'broadcastHistory'), {
    trackName:   track.trackName,
    artistName:  track.artistName,
    albumArtUrl: track.albumArtUrl  ?? null,
    sourceApp:   track.sourceApp,
    startedAt:   serverTimestamp(),
    durationSecs: null,
  });
  return ref.id;
}

/** Call when broadcasting stops. Updates duration on the existing doc. */
export async function logBroadcastEnd(
  uid: string,
  docId: string,
  durationSecs: number,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'broadcastHistory', docId), {
    durationSecs: Math.round(durationSecs),
  });
}

// ─── Listen history ───────────────────────────────────────────────────────────

/** Call when the user opens a broadcaster's TrackDetailSheet. */
export async function logListen(
  uid: string,
  broadcaster: Broadcaster,
): Promise<void> {
  await addDoc(collection(db, 'users', uid, 'listenHistory'), {
    trackName:      broadcaster.track.trackName,
    artistName:     broadcaster.track.artistName,
    albumArtUrl:    broadcaster.track.albumArtUrl ?? null,
    sourceApp:      broadcaster.track.sourceApp,
    broadcasterName: broadcaster.isAnonymous ? null : broadcaster.displayName,
    isAnonymous:    broadcaster.isAnonymous,
    discoveredVia:  broadcaster.source,
    listenedAt:     serverTimestamp(),
  });
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export function subscribeBroadcastHistory(
  uid: string,
  onUpdate: (entries: BroadcastHistoryEntry[]) => void,
): () => void {
  const q = query(
    collection(db, 'users', uid, 'broadcastHistory'),
    orderBy('startedAt', 'desc'),
    limit(30),
  );
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => {
      const data = d.data();
      return {
        id:          d.id,
        trackName:   data.trackName,
        artistName:  data.artistName,
        albumArtUrl: data.albumArtUrl ?? undefined,
        sourceApp:   data.sourceApp,
        startedAt:   (data.startedAt as Timestamp)?.toMillis?.() ?? 0,
        durationSecs: data.durationSecs ?? undefined,
      };
    }));
  }, () => onUpdate([]));
}

export function subscribeListenHistory(
  uid: string,
  onUpdate: (entries: ListenHistoryEntry[]) => void,
): () => void {
  const q = query(
    collection(db, 'users', uid, 'listenHistory'),
    orderBy('listenedAt', 'desc'),
    limit(30),
  );
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => {
      const data = d.data();
      return {
        id:             d.id,
        trackName:      data.trackName,
        artistName:     data.artistName,
        albumArtUrl:    data.albumArtUrl ?? undefined,
        sourceApp:      data.sourceApp,
        broadcasterName: data.isAnonymous ? 'Anonymous' : (data.broadcasterName ?? 'Unknown'),
        discoveredVia:  data.discoveredVia,
        listenedAt:     (data.listenedAt as Timestamp)?.toMillis?.() ?? 0,
      };
    }));
  }, () => onUpdate([]));
}
