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
import { colors, typography, spacing, radius } from '../../theme';

interface Props {
  broadcaster: Broadcaster;
  onPress?: () => void;
}

// Labels shown in the source badge
const SOURCE_LABEL: Record<Broadcaster['source'], string> = {
  ble: 'BLE',
  mdns: 'WiFi',
  gps: 'GPS',
};

const SOURCE_COLOR: Record<Broadcaster['source'], string> = {
  ble: colors.source.ble,
  mdns: colors.source.mdns,
  gps: colors.source.gps,
};

const APP_COLOR: Record<string, string> = {
  spotify: colors.app.spotify,
  apple_music: colors.app.apple_music,
  youtube_music: colors.app.youtube_music,
  podcasts: colors.app.podcasts,
  unknown: colors.text.muted,
};

const APP_LABEL: Record<string, string> = {
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  youtube_music: 'YouTube Music',
  podcasts: 'Podcasts',
  unknown: 'Unknown',
};

export default function BroadcasterCard({ broadcaster, onPress }: Props) {
  const { track, sync, displayName, isAnonymous, source, distanceMeters } = broadcaster;
  const position = currentPosition(sync);
  const appColor = APP_COLOR[track.sourceApp] ?? colors.text.muted;
  const sourceColor = SOURCE_COLOR[source];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Album art + main info row */}
      <View style={styles.topRow}>
        <View style={styles.artContainer}>
          {track.albumArtUrl ? (
            <Image
              source={{ uri: track.albumArtUrl }}
              style={styles.art}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.artPlaceholder}>
              <View style={[styles.artPlaceholderDot, { backgroundColor: appColor }]} />
            </View>
          )}
          {/* Paused overlay */}
          {!sync.isPlaying && (
            <View style={styles.pausedOverlay}>
              <Text style={styles.pausedIcon}>⏸</Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.trackName} numberOfLines={1}>
            {track.trackName}
          </Text>
          <Text style={styles.artistName} numberOfLines={1}>
            {track.artistName}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressRow}>
            <ProgressBar
              sync={sync}
              totalDuration={track.totalDuration}
              height={3}
              fillColor={appColor}
            />
          </View>

          <View style={styles.timingRow}>
            <Text style={styles.timing}>
              {formatDuration(position)}
            </Text>
            <Text style={styles.timing}>
              {formatDuration(track.totalDuration)}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer row */}
      <View style={styles.footer}>
        {/* Left — broadcaster identity */}
        <View style={styles.footerLeft}>
          <View style={styles.avatarDot}>
            <Text style={styles.avatarInitial}>
              {isAnonymous ? '?' : (displayName[0] ?? '?')}
            </Text>
          </View>
          <Text style={styles.displayName}>
            {isAnonymous ? 'Anonymous' : displayName}
          </Text>
        </View>

        {/* Right — badges */}
        <View style={styles.badges}>
          {/* App badge */}
          <View style={[styles.badge, { borderColor: `${appColor}44` }]}>
            <View style={[styles.badgeDot, { backgroundColor: appColor }]} />
            <Text style={[styles.badgeText, { color: appColor }]}>
              {APP_LABEL[track.sourceApp] ?? 'Unknown'}
            </Text>
          </View>

          {/* Source badge */}
          <View style={[styles.badge, { borderColor: `${sourceColor}44` }]}>
            <Text style={[styles.badgeText, { color: sourceColor }]}>
              {SOURCE_LABEL[source]}
            </Text>
            {distanceMeters !== undefined && (
              <Text style={[styles.badgeText, { color: sourceColor }]}>
                {' · '}
                {distanceMeters < 1000
                  ? `${Math.round(distanceMeters)}m`
                  : `${(distanceMeters / 1000).toFixed(1)}km`}
              </Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[4],
    marginBottom: spacing[3],
    gap: spacing[3],
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  artContainer: {
    position: 'relative',
  },
  art: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.bg.cardElevated,
  },
  artPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.bg.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artPlaceholderDot: {
    width: 16,
    height: 16,
    borderRadius: radius.full,
    opacity: 0.6,
  },
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pausedIcon: {
    fontSize: 18,
  },
  info: {
    flex: 1,
    gap: spacing[1],
    justifyContent: 'center',
  },
  trackName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
  artistName: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  progressRow: {
    marginTop: spacing[2],
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[1],
  },
  timing: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    fontVariant: ['tabular-nums'],
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  avatarDot: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.brand.dim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.brand.light,
  },
  displayName: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: 4,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.2,
  },
});
