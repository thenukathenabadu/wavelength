import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { openInMusicApp, isMusicAppInstalled } from '../../modules/deepLink/openInMusicApp';
import type { NowPlayingTrack } from '../../types';

const APP_LABELS: Record<NowPlayingTrack['sourceApp'], string> = {
  spotify: 'Open in Spotify',
  apple_music: 'Open in Apple Music',
  youtube_music: 'Open in YouTube Music',
  podcasts: 'Open in Podcasts',
  unknown: 'Open Track',
};

interface Props {
  track: NowPlayingTrack;
}

export default function DeepLinkButton({ track }: Props) {
  const [opening, setOpening] = useState(false);
  const [appInstalled, setAppInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    isMusicAppInstalled(track.sourceApp).then(setAppInstalled);
  }, [track.sourceApp]);

  async function handlePress() {
    setOpening(true);
    try {
      await openInMusicApp(track);
    } finally {
      setOpening(false);
    }
  }

  const label = APP_LABELS[track.sourceApp];
  const showFallback = appInstalled === false;

  return (
    <TouchableOpacity
      style={[styles.button, showFallback && styles.fallbackButton]}
      onPress={handlePress}
      disabled={opening}
    >
      {opening ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={styles.label}>
          {showFallback ? `${label} (web)` : label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#6c47ff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 12,
  },
  fallbackButton: {
    backgroundColor: '#333',
  },
  label: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
