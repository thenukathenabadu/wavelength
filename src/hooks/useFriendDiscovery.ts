import { useEffect, useRef } from 'react';
import {
  subscribeFriends,
  subscribeFriendBroadcasts,
} from '../services/firebase/friendsService';
import { useNearbyStore } from '../store/nearbySlice';
import { useCurrentUser } from '../store/authSlice';

/**
 * Subscribes to friend broadcasts and feeds active ones into nearbySlice so that
 * friends appear on RadarScreen regardless of geographic distance (bypasses the
 * GPS radius filter that applies to random nearby users).
 *
 * Call once from MainTabNavigator — always mounted when the user is logged in.
 */
export function useFriendDiscovery(): void {
  const uid = useCurrentUser()?.uid ?? '';
  const friendUidsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!uid) return;

    let unsubBroadcasts: (() => void) | null = null;

    const unsubFriends = subscribeFriends(uid, (friends) => {
      friendUidsRef.current = friends.map((f) => f.friendUid);

      // Re-subscribe to broadcasts whenever the friends list changes
      unsubBroadcasts?.();
      if (friends.length === 0) return;

      unsubBroadcasts = subscribeFriendBroadcasts(friends, (broadcastMap) => {
        const store = useNearbyStore.getState();
        broadcastMap.forEach((broadcaster, friendUid) => {
          if (broadcaster) {
            store.upsertBroadcaster(broadcaster);
          } else {
            store.removeBroadcaster(friendUid);
          }
        });
      });
    });

    return () => {
      unsubFriends();
      unsubBroadcasts?.();
      // Remove friend entries from nearbySlice on logout / unmount
      const store = useNearbyStore.getState();
      friendUidsRef.current.forEach((id) => store.removeBroadcaster(id));
    };
  }, [uid]);
}
