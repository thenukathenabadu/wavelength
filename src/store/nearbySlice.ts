import { create } from 'zustand';
import type { Broadcaster } from '../types';

interface NearbyState {
  broadcasters: Map<string, Broadcaster>;

  // Merge a broadcaster from any source (deduplicates by id, source priority: ble > mdns > gps)
  upsertBroadcaster: (broadcaster: Broadcaster) => void;

  // Remove a broadcaster by id
  removeBroadcaster: (id: string) => void;

  // Evict broadcasters not seen within ttlMs (call periodically)
  evictStale: (ttlMs: number) => void;
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

  evictStale: (ttlMs) =>
    set((state) => {
      const now = Date.now();
      const next = new Map(state.broadcasters);
      for (const [id, b] of next) {
        if (now - b.lastSeen > ttlMs) {
          next.delete(id);
        }
      }
      return { broadcasters: next };
    }),
}));

// Selector helpers
export const useBroadcasterList = () =>
  useNearbyStore((s) => Array.from(s.broadcasters.values()));
