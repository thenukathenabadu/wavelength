import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { Broadcaster } from '../types';

// Per-source TTL — GPS must be longer than the Firestore heartbeat (60s)
const EVICT_TTL_MS: Record<Broadcaster['source'], number> = {
  ble:  20_000,  // 20s — BLE packets are frequent
  mdns: 30_000,  // 30s — mDNS resolves are frequent
  gps:  90_000,  // 90s — Firestore heartbeat is 60s, give headroom
};

interface NearbyState {
  broadcasters: Map<string, Broadcaster>;

  // Merge a broadcaster from any source (deduplicates by id, source priority: ble > mdns > gps)
  upsertBroadcaster: (broadcaster: Broadcaster) => void;

  // Remove a broadcaster by id
  removeBroadcaster: (id: string) => void;

  // Evict broadcasters not seen within their source-specific TTL
  evictStale: () => void;
}

const SOURCE_PRIORITY: Record<Broadcaster['source'], number> = {
  ble: 3,
  mdns: 2,
  gps: 1,
};

export const useNearbyStore = create<NearbyState>((set) => ({
  broadcasters: new Map(),

  upsertBroadcaster: (incoming) =>
    set((state) => {
      const next = new Map(state.broadcasters);
      const existing = next.get(incoming.id);

      // Keep the higher-priority source if we have multiple
      if (existing && SOURCE_PRIORITY[existing.source] > SOURCE_PRIORITY[incoming.source]) {
        // Still update sync packet and lastSeen even if we prefer the existing source
        next.set(incoming.id, {
          ...existing,
          sync: incoming.sync,
          lastSeen: incoming.lastSeen,
        });
      } else {
        next.set(incoming.id, incoming);
      }

      return { broadcasters: next };
    }),

  removeBroadcaster: (id) =>
    set((state) => {
      const next = new Map(state.broadcasters);
      next.delete(id);
      return { broadcasters: next };
    }),

  evictStale: () =>
    set((state) => {
      const now = Date.now();
      let changed = false;
      const next = new Map(state.broadcasters);
      for (const [id, b] of next) {
        if (now - b.lastSeen > EVICT_TTL_MS[b.source]) {
          next.delete(id);
          changed = true;
        }
      }
      if (!changed) return state;
      return { broadcasters: next };
    }),
}));

// Selector helpers
export const useBroadcasterList = () =>
  useNearbyStore(useShallow((s) => Array.from(s.broadcasters.values())));
