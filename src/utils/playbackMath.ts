import type { PlaybackSyncPacket } from '../types';

/**
 * Calculate the current playback position in seconds from a sync packet.
 * No server polling — receivers calculate locally using wall clock.
 */
export function currentPosition(sync: PlaybackSyncPacket): number {
  if (!sync.isPlaying) {
    return sync.positionAtStart;
  }
  const elapsed = (Date.now() - sync.startedAt) / 1000;
  return sync.positionAtStart + elapsed;
}

/**
 * Format seconds into mm:ss display string.
 */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

/**
 * Progress fraction [0, 1] clamped.
 */
export function progressFraction(sync: PlaybackSyncPacket, totalDuration: number): number {
  if (totalDuration <= 0) return 0;
  return Math.min(1, Math.max(0, currentPosition(sync) / totalDuration));
}
