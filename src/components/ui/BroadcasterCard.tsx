import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import type { Broadcaster } from '../../types';
import ProgressBar from './ProgressBar';
import { currentPosition, formatDuration } from '../../utils/playbackMath';

interface Props {
  broadcaster: Broadcaster;
  onPress?: () => void;
}

const SOURCE_BADGE: Record<Broadcaster['source'], string> = {
  ble: 'BLE',
  mdns: 'WiFi',
  gps: 'GPS',
};

export default function BroadcasterCard({ broadcaster, onPress }: Props) {
  const { track, sync, displayName, isAnonymous, source, distanceMeters } = broadcaster;
  const position = currentPosition(sync);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.row}>
        {track.albumArtUrl ? (
          <Image source={{ uri: track.albumArtUrl }} style={styles.albumArt} />
        ) : (
          <View style={[styles.albumArt, styles.albumArtPlaceholder]} />
        )}

        <View style={styles.info}>
          <Text style={styles.trackName} numberOfLines={1}>
            {track.trackName}
          </Text>
          <Text style={styles.artistName} numberOfLines={1}>
            {track.artistName}
          </Text>

          <ProgressBar sync={sync} totalDuration={track.totalDuration} />

          <View style={styles.meta}>
            <Text style={styles.metaText}>
              {formatDuration(position)} / {formatDuration(track.totalDuration)}
            </Text>
            <View style={styles.badges}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{SOURCE_BADGE[source]}</Text>
              </View>
              {distanceMeters !== undefined && (
                <Text style={styles.distance}>
                  {distanceMeters < 1000
                    ? `${Math.round(distanceMeters)}m`
                    : `${(distanceMeters / 1000).toFixed(1)}km`}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.broadcaster}>
          {isAnonymous ? 'Anonymous' : displayName}
        </Text>
        <Text style={styles.appLabel}>{track.sourceApp.replace('_', ' ')}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  albumArt: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  albumArtPlaceholder: {
    backgroundColor: '#2a2a2a',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  trackName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  artistName: {
    fontSize: 13,
    color: '#999',
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  metaText: {
    fontSize: 11,
    color: '#555',
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#6c47ff22',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    color: '#6c47ff',
    fontWeight: '700',
  },
  distance: {
    fontSize: 11,
    color: '#555',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  broadcaster: {
    fontSize: 12,
    color: '#777',
  },
  appLabel: {
    fontSize: 12,
    color: '#555',
    textTransform: 'capitalize',
  },
});
