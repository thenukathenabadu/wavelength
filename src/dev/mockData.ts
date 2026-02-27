/**
 * Realistic mock broadcasters for Phase 1 UI development.
 * All sync packets use wall-clock math so progress bars animate live.
 *
 * Remove this file in Phase 5 when real BLE data flows in.
 */

import type { Broadcaster } from '../types';

function syncAt(positionSeconds: number, isPlaying = true) {
  // Snapshot the position as if it was taken 3 seconds ago
  return {
    startedAt: Date.now() - 3000,
    positionAtStart: positionSeconds - 3,
    isPlaying,
  };
}

export const MOCK_BROADCASTERS: Broadcaster[] = [
  {
    id: 'user-001',
    displayName: 'Sarah K.',
    isAnonymous: false,
    source: 'ble',
    distanceMeters: 12,
    lastSeen: Date.now(),
    track: {
      trackName: 'Not Like Us',
      artistName: 'Kendrick Lamar',
      albumName: 'GNX',
      albumArtUrl: 'https://via.placeholder.com/300/1a1a2e/9F6FF4?text=KL',
      totalDuration: 274,
      sourceApp: 'spotify',
      deepLinkUri: 'spotify:track:6AI3ezQ4o3HUoP6Dhudph3',
      spotifyTrackId: '6AI3ezQ4o3HUoP6Dhudph3',
    },
    sync: syncAt(170),
  },
  {
    id: 'user-002',
    displayName: 'Anonymous',
    isAnonymous: true,
    source: 'ble',
    distanceMeters: 28,
    lastSeen: Date.now(),
    track: {
      trackName: '#2148 — Elon Musk',
      artistName: 'The Joe Rogan Experience',
      albumName: 'The Joe Rogan Experience',
      albumArtUrl: 'https://via.placeholder.com/300/0a0a0a/9333EA?text=JRE',
      totalDuration: 10800,
      sourceApp: 'podcasts',
      deepLinkUri: undefined,
    },
    sync: syncAt(3340),
  },
  {
    id: 'user-003',
    displayName: 'Marcus T.',
    isAnonymous: false,
    source: 'mdns',
    distanceMeters: 45,
    lastSeen: Date.now(),
    track: {
      trackName: 'Blinding Lights',
      artistName: 'The Weeknd',
      albumName: 'After Hours',
      albumArtUrl: 'https://via.placeholder.com/300/2d0000/FA3552?text=AH',
      totalDuration: 200,
      sourceApp: 'apple_music',
      deepLinkUri: 'music://music.apple.com/us/album/1495204169',
    },
    sync: syncAt(156),
  },
  {
    id: 'user-004',
    displayName: 'Priya N.',
    isAnonymous: false,
    source: 'gps',
    distanceMeters: 340,
    lastSeen: Date.now(),
    track: {
      trackName: 'Atomic Habits — Chapter 4',
      artistName: 'James Clear',
      albumName: 'Atomic Habits',
      albumArtUrl: 'https://via.placeholder.com/300/0d1117/FB923C?text=AH',
      totalDuration: 1920,
      sourceApp: 'unknown',
      deepLinkUri: undefined,
    },
    sync: syncAt(720),
  },
  {
    id: 'user-005',
    displayName: 'Jake L.',
    isAnonymous: false,
    source: 'ble',
    distanceMeters: 8,
    lastSeen: Date.now(),
    track: {
      trackName: 'HUMBLE.',
      artistName: 'Kendrick Lamar',
      albumName: 'DAMN.',
      albumArtUrl: 'https://via.placeholder.com/300/1a1a2e/9F6FF4?text=DAMN',
      totalDuration: 177,
      sourceApp: 'youtube_music',
      deepLinkUri: 'youtubemusic://music.youtube.com/watch?v=tvTRZJ-4EyI',
    },
    sync: syncAt(92, false), // paused
  },
];

export const MOCK_CURRENT_TRACK = MOCK_BROADCASTERS[0].track;
export const MOCK_CURRENT_SYNC = { ...MOCK_BROADCASTERS[0].sync, isPlaying: true };
