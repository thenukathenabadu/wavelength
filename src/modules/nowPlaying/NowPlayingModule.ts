/**
 * NowPlayingModule — unified JS bridge for all Now Playing sources.
 *
 * Source priority (tried in order):
 *   1. react-native-spotify-remote  — if Spotify is installed + playing
 *   2. Platform native module        — Android: MediaSessionModule (any app)
 *                                      iOS:     NowPlayingBridge (lock screen)
 *   3. null                          — triggers manual entry in BroadcastScreen
 *
 * The rest of the app only imports from this file — never from individual sources.
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import type { NowPlayingTrack, PlaybackSyncPacket } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NowPlayingResult {
  track: NowPlayingTrack;
  sync: PlaybackSyncPacket;
}

// ─── Platform native module refs ─────────────────────────────────────────────

const AndroidMediaSession = Platform.OS === 'android'
  ? NativeModules.MediaSessionModule ?? null
  : null;

const IOSNowPlaying = Platform.OS === 'ios'
  ? NativeModules.NowPlayingBridge ?? null
  : null;

// ─── Spotify Remote ───────────────────────────────────────────────────────────

let spotifyRemote: typeof import('react-native-spotify-remote') | null = null;

try {
  // Dynamic require so the app doesn't crash if the package isn't linked yet
  spotifyRemote = require('react-native-spotify-remote');
} catch {
  // Not linked — will use other sources
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * One-shot fetch of the current track.
 * Returns null if nothing is playing or all sources fail.
 */
export async function getCurrentTrack(): Promise<NowPlayingResult | null> {
  // 1. Try Spotify Remote
  const spotify = await trySpotify();
  if (spotify) return spotify;

  // 2. Try platform native module
  const native = await tryNative();
  if (native) return native;

  return null;
}

/**
 * Subscribe to track changes from all sources.
 * Returns an unsubscribe function.
 *
 * onUpdate fires whenever:
 *   - The track changes
 *   - Playback starts / pauses
 *   - User seeks (position changes significantly)
 */
export function startListening(
  onUpdate: (result: NowPlayingResult) => void,
): () => void {
  const cleanups: Array<() => void> = [];

  // Spotify Remote listener
  if (spotifyRemote?.SpotifyRemote) {
    try {
      const sub = spotifyRemote.SpotifyRemote.addListener(
        'playerStateChanged',
        (state: SpotifyPlayerState) => {
          const result = spotifyStateToResult(state);
          if (result) onUpdate(result);
        },
      );
      cleanups.push(() => sub.remove?.());
    } catch {
      // Spotify not connected — ignore
    }
  }

  // Android MediaSession listener
  if (AndroidMediaSession) {
    try {
      AndroidMediaSession.startListening();
      const emitter = new NativeEventEmitter(AndroidMediaSession);
      const sub = emitter.addListener('onNowPlayingChange', (raw: NativeTrackRaw) => {
        const result = nativeRawToResult(raw);
        if (result) onUpdate(result);
      });
      cleanups.push(() => {
        sub.remove();
        AndroidMediaSession.stopListening?.();
      });
    } catch {
      // Module not yet linked
    }
  }

  // iOS NowPlaying listener
  if (IOSNowPlaying) {
    try {
      IOSNowPlaying.startListening?.();
      const emitter = new NativeEventEmitter(IOSNowPlaying);
      const sub = emitter.addListener('onNowPlayingChange', (raw: NativeTrackRaw) => {
        const result = nativeRawToResult(raw);
        if (result) onUpdate(result);
      });
      cleanups.push(() => {
        sub.remove();
        IOSNowPlaying.stopListening?.();
      });
    } catch {
      // Module not yet linked
    }
  }

  return () => cleanups.forEach((fn) => fn());
}

// ─── Source: Spotify Remote ───────────────────────────────────────────────────

interface SpotifyPlayerState {
  track?: {
    name: string;
    artist: { name: string };
    album: { name: string; images?: Array<{ url: string }> };
    duration: number;
    uri: string;
  };
  playbackPosition?: number;
  isPaused?: boolean;
}

async function trySpotify(): Promise<NowPlayingResult | null> {
  if (!spotifyRemote?.SpotifyRemote) return null;
  try {
    const isConnected = await spotifyRemote.SpotifyRemote.isConnectedAsync();
    if (!isConnected) return null;
    const state = await spotifyRemote.SpotifyRemote.getPlayerState();
    return spotifyStateToResult(state);
  } catch {
    return null;
  }
}

function spotifyStateToResult(state: SpotifyPlayerState): NowPlayingResult | null {
  if (!state?.track) return null;

  const trackUri = state.track.uri ?? '';
  const spotifyTrackId = trackUri.startsWith('spotify:track:')
    ? trackUri.replace('spotify:track:', '')
    : undefined;

  const track: NowPlayingTrack = {
    trackName: state.track.name,
    artistName: state.track.artist?.name ?? '',
    albumName: state.track.album?.name,
    albumArtUrl: state.track.album?.images?.[0]?.url,
    totalDuration: Math.round((state.track.duration ?? 0) / 1000),
    sourceApp: 'spotify',
    deepLinkUri: trackUri,
    spotifyTrackId,
  };

  const sync: PlaybackSyncPacket = {
    startedAt: Date.now(),
    positionAtStart: Math.round((state.playbackPosition ?? 0) / 1000),
    isPlaying: !(state.isPaused ?? true),
  };

  return { track, sync };
}

// ─── Source: Platform native module ──────────────────────────────────────────

interface NativeTrackRaw {
  trackName: string;
  artistName: string;
  albumName?: string;
  albumArtUrl?: string;
  totalDuration: number;   // seconds
  currentPosition: number; // seconds
  isPlaying: boolean;
  sourceApp: string;       // package name or app identifier
  spotifyTrackId?: string;
}

async function tryNative(): Promise<NowPlayingResult | null> {
  const module = AndroidMediaSession ?? IOSNowPlaying;
  if (!module) return null;
  try {
    const raw: NativeTrackRaw | null = await module.getCurrentTrack();
    if (!raw) return null;
    return nativeRawToResult(raw);
  } catch {
    return null;
  }
}

function nativeRawToResult(raw: NativeTrackRaw): NowPlayingResult | null {
  if (!raw?.trackName) return null;

  const sourceApp = normalizeSourceApp(raw.sourceApp);

  const track: NowPlayingTrack = {
    trackName: raw.trackName,
    artistName: raw.artistName,
    albumName: raw.albumName,
    albumArtUrl: raw.albumArtUrl,
    totalDuration: raw.totalDuration,
    sourceApp,
    spotifyTrackId: raw.spotifyTrackId,
    deepLinkUri: buildDeepLink(sourceApp, raw),
  };

  const sync: PlaybackSyncPacket = {
    startedAt: Date.now(),
    positionAtStart: raw.currentPosition,
    isPlaying: raw.isPlaying,
  };

  return { track, sync };
}

function normalizeSourceApp(raw: string): NowPlayingTrack['sourceApp'] {
  const map: Record<string, NowPlayingTrack['sourceApp']> = {
    'com.spotify.music': 'spotify',
    'com.apple.Music': 'apple_music',
    'com.google.android.apps.youtube.music': 'youtube_music',
    'com.apple.podcasts': 'podcasts',
    'com.google.android.youtube': 'youtube_music',
    spotify: 'spotify',
    apple_music: 'apple_music',
    youtube_music: 'youtube_music',
    podcasts: 'podcasts',
  };
  return map[raw] ?? 'unknown';
}

function buildDeepLink(
  sourceApp: NowPlayingTrack['sourceApp'],
  raw: NativeTrackRaw,
): string | undefined {
  if (sourceApp === 'spotify' && raw.spotifyTrackId) {
    return `spotify:track:${raw.spotifyTrackId}`;
  }
  return undefined;
}
