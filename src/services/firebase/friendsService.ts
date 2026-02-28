/**
 * friendsService — all friend-related Firestore operations.
 *
 * Firestore structure:
 *   /usernames/{username}                         → { uid }
 *   /users/{uid}/friends/{friendUid}              → Friend
 *   /users/{uid}/friendRequests/{fromUid}         → FriendRequest (pending only)
 */

import {
  doc, getDoc, setDoc, deleteDoc, getDocs,
  collection, query, where, orderBy, limit,
  onSnapshot, runTransaction, writeBatch,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { UserProfile, Friend, FriendRequest, Broadcaster } from '../../types';

// ─── Validation ────────────────────────────────────────────────────────────────

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

/** Returns an error string if invalid, null if valid. */
export function validateUsername(username: string): string | null {
  if (!username) return 'Username is required.';
  if (!USERNAME_RE.test(username)) {
    return 'Username must be 3–20 characters: lowercase letters, numbers, or underscores.';
  }
  return null;
}

// ─── Username ops ─────────────────────────────────────────────────────────────

/** Check availability without reserving. */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'usernames', username));
  return !snap.exists();
}

/**
 * Atomically reserve a username and write the user doc.
 * Called from authService.signUp() — not a standalone public call.
 * Throws if username already taken.
 */
export async function reserveUsername(
  uid: string,
  username: string,
  displayName: string,
  email: string,
): Promise<void> {
  const usernameRef = doc(db, 'usernames', username);
  const userRef = doc(db, 'users', uid);

  await runTransaction(db, async (tx) => {
    const existing = await tx.get(usernameRef);
    if (existing.exists()) {
      throw Object.assign(new Error('Username already taken.'), { code: 'username-taken' });
    }
    tx.set(userRef, {
      displayName,
      email,
      username,
      createdAt: serverTimestamp(),
      preferences: { defaultRadius: 100, discoveryMode: 'all' },
    });
    tx.set(usernameRef, { uid });
  });
}

/**
 * Claim a username for the first time (existing user who registered before Phase 13).
 * Uses updateDoc (merge) so it doesn't overwrite other user doc fields.
 */
export async function claimUsername(uid: string, username: string): Promise<void> {
  const usernameRef = doc(db, 'usernames', username);
  const userRef = doc(db, 'users', uid);
  await runTransaction(db, async (tx) => {
    const existing = await tx.get(usernameRef);
    if (existing.exists()) {
      throw Object.assign(new Error('Username already taken.'), { code: 'username-taken' });
    }
    tx.update(userRef, { username });
    tx.set(usernameRef, { uid });
  });
}

/** Update username: release old, claim new, update user doc. */
export async function updateUsername(
  uid: string,
  oldUsername: string,
  newUsername: string,
): Promise<void> {
  const oldRef = doc(db, 'usernames', oldUsername);
  const newRef = doc(db, 'usernames', newUsername);
  const userRef = doc(db, 'users', uid);

  await runTransaction(db, async (tx) => {
    const existing = await tx.get(newRef);
    if (existing.exists()) {
      throw Object.assign(new Error('Username already taken.'), { code: 'username-taken' });
    }
    tx.delete(oldRef);
    tx.set(newRef, { uid });
    tx.update(userRef, { username: newUsername });
  });
}

/** Look up a user by username. Returns null if not found. */
export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  const usernameSnap = await getDoc(doc(db, 'usernames', username));
  if (!usernameSnap.exists()) return null;
  const uid = usernameSnap.data().uid as string;
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists()) return null;
  const data = userSnap.data();
  return { uid, displayName: data.displayName, username: data.username };
}

// ─── Search ────────────────────────────────────────────────────────────────────

/**
 * Prefix search on username field.
 * Requires a Firestore single-field index on `users.username`.
 */
export async function searchUsersByUsername(
  prefix: string,
  excludeUid: string,
): Promise<UserProfile[]> {
  if (!prefix || prefix.length < 1) return [];
  const q = query(
    collection(db, 'users'),
    where('username', '>=', prefix),
    where('username', '<=', prefix + '\uf8ff'),
    limit(10),
  );
  const snap = await getDocs(q);
  return snap.docs
    .filter((d) => d.id !== excludeUid)
    .map((d) => {
      const data = d.data();
      return { uid: d.id, displayName: data.displayName, username: data.username };
    });
}

// ─── Friend Requests ──────────────────────────────────────────────────────────

export async function sendFriendRequest(
  fromUid: string,
  fromDisplayName: string,
  fromUsername: string,
  toUid: string,
): Promise<void> {
  await setDoc(doc(db, 'users', toUid, 'friendRequests', fromUid), {
    fromUid,
    fromDisplayName,
    fromUsername,
    createdAt: serverTimestamp(),
    status: 'pending',
  });
}

/** Accept: write bidirectional /friends docs + delete the request in a batch. */
export async function acceptFriendRequest(
  myUid: string,
  myDisplayName: string,
  myUsername: string,
  fromUid: string,
  fromDisplayName: string,
  fromUsername: string,
): Promise<void> {
  const batch = writeBatch(db);
  const now = serverTimestamp();

  // A's friends list gets B
  batch.set(doc(db, 'users', myUid, 'friends', fromUid), {
    friendUid: fromUid,
    displayName: fromDisplayName,
    username: fromUsername,
    addedAt: now,
  });
  // B's friends list gets A
  batch.set(doc(db, 'users', fromUid, 'friends', myUid), {
    friendUid: myUid,
    displayName: myDisplayName,
    username: myUsername,
    addedAt: now,
  });
  // Delete the pending request
  batch.delete(doc(db, 'users', myUid, 'friendRequests', fromUid));

  await batch.commit();
}

export async function declineFriendRequest(myUid: string, fromUid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', myUid, 'friendRequests', fromUid));
}

/** Remove friend from both sides in a single batch. */
export async function removeFriend(myUid: string, friendUid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', myUid, 'friends', friendUid));
  batch.delete(doc(db, 'users', friendUid, 'friends', myUid));
  await batch.commit();
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export function subscribeFriends(
  uid: string,
  onUpdate: (friends: Friend[]) => void,
): () => void {
  const q = query(
    collection(db, 'users', uid, 'friends'),
    orderBy('addedAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => {
      const data = d.data();
      return {
        friendUid:   d.id,
        displayName: data.displayName,
        username:    data.username,
        addedAt:     (data.addedAt as Timestamp)?.toMillis?.() ?? 0,
      };
    }));
  }, () => onUpdate([]));
}

export function subscribeFriendRequests(
  uid: string,
  onUpdate: (requests: FriendRequest[]) => void,
): () => void {
  const q = query(
    collection(db, 'users', uid, 'friendRequests'),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => {
      const data = d.data();
      return {
        fromUid:         d.id,
        fromDisplayName: data.fromDisplayName,
        fromUsername:    data.fromUsername,
        createdAt:       (data.createdAt as Timestamp)?.toMillis?.() ?? 0,
      };
    }));
  }, () => onUpdate([]));
}

/**
 * Subscribe to the current broadcast for each friend individually.
 * Maintains a per-friend listener map, diffed on each friends change.
 * onUpdate receives a Map<friendUid, Broadcaster | null>.
 */
export function subscribeFriendBroadcasts(
  friends: Friend[],
  onUpdate: (broadcasts: Map<string, Broadcaster | null>) => void,
): () => void {
  const listeners = new Map<string, () => void>();
  const broadcasts = new Map<string, Broadcaster | null>();

  function syncListeners(currentFriends: Friend[]) {
    const currentUids = new Set(currentFriends.map((f) => f.friendUid));

    // Remove listeners for friends no longer in the list
    for (const [uid, unsub] of listeners) {
      if (!currentUids.has(uid)) {
        unsub();
        listeners.delete(uid);
        broadcasts.delete(uid);
      }
    }

    // Add listeners for new friends
    for (const friend of currentFriends) {
      if (listeners.has(friend.friendUid)) continue;

      broadcasts.set(friend.friendUid, null);

      const unsub = onSnapshot(
        doc(db, 'broadcasts', friend.friendUid),
        (snap) => {
          if (!snap.exists()) {
            broadcasts.set(friend.friendUid, null);
          } else {
            const data = snap.data();
            const now = Date.now();
            const expiresAt = (data.expiresAt as Timestamp)?.toMillis?.() ?? 0;
            if (expiresAt < now) {
              broadcasts.set(friend.friendUid, null);
            } else {
              broadcasts.set(friend.friendUid, {
                id:           friend.friendUid,
                displayName:  data.displayName ?? friend.displayName,
                isAnonymous:  data.isAnonymous ?? false,
                track: {
                  trackName:     data.trackName,
                  artistName:    data.artistName,
                  albumName:     data.albumName,
                  albumArtUrl:   data.albumArtUrl,
                  totalDuration: data.totalDuration,
                  sourceApp:     data.sourceApp,
                  deepLinkUri:   data.deepLinkUri,
                  spotifyTrackId: data.spotifyTrackId,
                },
                sync: {
                  startedAt:       data.startedAt,
                  positionAtStart: data.positionAtStart,
                  isPlaying:       data.isPlaying,
                },
                source:      'gps',
                lastSeen:    now,
              });
            }
          }
          onUpdate(new Map(broadcasts));
        },
        () => {
          broadcasts.set(friend.friendUid, null);
          onUpdate(new Map(broadcasts));
        },
      );

      listeners.set(friend.friendUid, unsub);
    }

    onUpdate(new Map(broadcasts));
  }

  syncListeners(friends);

  return () => {
    for (const unsub of listeners.values()) unsub();
    listeners.clear();
  };
}
