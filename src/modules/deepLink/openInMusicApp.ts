import { Linking, Platform } from 'react-native';
import type { NowPlayingTrack } from '../../types';

/**
 * Deep link URI schemes per app.
 *
 * Spotify:       spotify:track:{id}
 * Apple Music:   music://music.apple.com/us/album/{id}
 * YouTube Music: youtubemusic://music.youtube.com/watch?v={id}
 * Fallback:      web URL if app not installed
 */

const WEB_FALLBACKS: Record<string, string> = {
  spotify: 'https://open.spotify.com',
  apple_music: 'https://music.apple.com',
  youtube_music: 'https://music.youtube.com',
  podcasts: 'https://podcasts.apple.com',
};

/**
 * Attempt to open a track in its native music app.
 * Falls back to the web URL if the app is not installed or no deepLinkUri available.
 */
export async function openInMusicApp(track: NowPlayingTrack): Promise<void> {
  const { deepLinkUri, sourceApp } = track;

  if (deepLinkUri) {
    const canOpen = await Linking.canOpenURL(deepLinkUri).catch(() => false);
    if (canOpen) {
      await Linking.openURL(deepLinkUri);
      return;
    }
  }

  // Fallback: open web version
  const fallback = WEB_FALLBACKS[sourceApp] ?? 'https://www.google.com';
  if (deepLinkUri) {
    // Try to construct a web fallback from the deep link
    const webUrl = deepLinkUriToWebUrl(deepLinkUri, sourceApp) ?? fallback;
    await Linking.openURL(webUrl);
  } else {
    await Linking.openURL(fallback);
  }
}

function deepLinkUriToWebUrl(uri: string, sourceApp: string): string | null {
  try {
    if (sourceApp === 'spotify') {
      // spotify:track:4iV5W9uYEdYUVa79Axb7Rh → https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh
      const parts = uri.replace('spotify:', '').split(':');
      return `https://open.spotify.com/${parts.join('/')}`;
    }
    if (sourceApp === 'apple_music') {
      // music://music.apple.com/... → https://music.apple.com/...
      return uri.replace('music://', 'https://');
    }
    if (sourceApp === 'youtube_music') {
      // youtubemusic://music.youtube.com/watch?v=... → https://music.youtube.com/watch?v=...
      return uri.replace('youtubemusic://', 'https://');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Build a Spotify deep link URI from a track ID.
 */
export function spotifyDeepLink(trackId: string): string {
  return `spotify:track:${trackId}`;
}

/**
 * Check if a given music app is installed on the device.
 */
export async function isMusicAppInstalled(
  sourceApp: NowPlayingTrack['sourceApp'],
): Promise<boolean> {
  const schemeMap: Partial<Record<NowPlayingTrack['sourceApp'], string>> = {
    spotify: 'spotify://',
    apple_music: Platform.OS === 'ios' ? 'music://' : undefined,
    youtube_music: 'youtubemusic://',
  };
  const scheme = schemeMap[sourceApp];
  if (!scheme) return false;
  return Linking.canOpenURL(scheme).catch(() => false);
}
