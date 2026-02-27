import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import type { NowPlayingTrack, PlaybackSyncPacket } from '../../types';

/**
 * JS bridge to the platform-specific Now Playing native modules.
 *
 * Android: MediaSessionModule (Kotlin) — reads MediaSessionManager.getActiveSessions()
 *          Requires BIND_NOTIFICATION_LISTENER_SERVICE permission (Notification Access).
 *
 * iOS:     NowPlayingBridge (Swift) — reads MPMusicPlayerController (Apple Music)
 *          and react-native-spotify-remote for Spotify.
 *          Other apps: MPNowPlayingInfoCenter (best-effort, lock screen metadata).
 *
 * TODO (Week 2–4): Implement native modules and wire up below.
 */

interface NowPlayingNativeModule {
  getCurrentTrack(): Promise<NowPlayingTrackRaw | null>;
  startListening(): void;
  stopListening(): void;
}

interface NowPlayingTrackRaw {
  trackName: string;
  artistName: string;
  albumName?: string;
  albumArtUrl?: string;
  totalDuration: number;
  currentPosition: number;
  isPlaying: boolean;
  sourceApp: string;
  spotifyTrackId?: string;
}

const NativeNowPlaying: NowPlayingNativeModule | null =
  Platform.OS === 'android'
    ? (NativeModules.MediaSessionModule as NowPlayingNativeModule | null)
    : Platform.OS === 'ios'
    ? (NativeModules.NowPlayingBridge as NowPlayingNativeModule | null)
    : null;

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getCurrentTrack(): Promise<{
  track: NowPlayingTrack;
  sync: PlaybackSyncPacket;
} | null> {
  if (!NativeNowPlaying) {
    console.warn('[NowPlayingModule] Native module not available on this platform');
    return null;
  }

  try {
    const raw = await NativeNowPlaying.getCurrentTrack();
    if (!raw) return null;
    return rawToTyped(raw);
  } catch (e) {
    console.warn('[NowPlayingModule] getCurrentTrack failed:', e);
    return null;
  }
}

export function startListening(
  onUpdate: (data: { track: NowPlayingTrack; sync: PlaybackSyncPacket }) => void,
): () => void {
  if (!NativeNowPlaying) return () => {};

  NativeNowPlaying.startListening();

  const emitter = new NativeEventEmitter(NativeModules.MediaSessionModule ?? NativeModules.NowPlayingBridge);
  const subscription = emitter.addListener('onNowPlayingChange', (raw: NowPlayingTrackRaw) => {
    const typed = rawToTyped(raw);
    if (typed) onUpdate(typed);
  });

  return () => {
    subscription.remove();
    NativeNowPlaying.stopListening();
  };
}

function rawToTyped(raw: NowPlayingTrackRaw): { track: NowPlayingTrack; sync: PlaybackSyncPacket } {
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
    spotify: 'spotify',
    'com.apple.Music': 'apple_music',
    apple_music: 'apple_music',
    'com.google.android.apps.youtube.music': 'youtube_music',
    youtube_music: 'youtube_music',
    'com.apple.podcasts': 'podcasts',
    podcasts: 'podcasts',
  };
  return map[raw] ?? 'unknown';
}

function buildDeepLink(sourceApp: NowPlayingTrack['sourceApp'], raw: NowPlayingTrackRaw): string | undefined {
  if (sourceApp === 'spotify' && raw.spotifyTrackId) {
    return `spotify:track:${raw.spotifyTrackId}`;
  }
  return undefined;
}
