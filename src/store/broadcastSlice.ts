import { create } from 'zustand';
import type { NowPlayingTrack, PlaybackSyncPacket } from '../types';

type BroadcastMode = 'named' | 'anonymous' | 'off';

interface BroadcastState {
  mode: BroadcastMode;
  currentTrack: NowPlayingTrack | null;
  syncPacket: PlaybackSyncPacket | null;

  setMode: (mode: BroadcastMode) => void;
  setTrack: (track: NowPlayingTrack) => void;
  updateSync: (sync: PlaybackSyncPacket) => void;
  clearTrack: () => void;
}

export const useBroadcastStore = create<BroadcastState>((set) => ({
  mode: 'off',
  currentTrack: null,
  syncPacket: null,

  setMode: (mode) => set({ mode }),

  setTrack: (track) => set({ currentTrack: track }),

  updateSync: (sync) => set({ syncPacket: sync }),

  clearTrack: () => set({ currentTrack: null, syncPacket: null }),
}));

export const useIsBroadcasting = () =>
  useBroadcastStore((s) => s.mode !== 'off');
