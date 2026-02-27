import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { Broadcaster } from '../../types';
import ProgressBar from './ProgressBar';
import { currentPosition, formatDuration } from '../../utils/playbackMath';
import { openInMusicApp } from '../../modules/deepLink/openInMusicApp';
import { colors, typography, spacing, radius, shadows } from '../../theme';

const APP_COLOR: Record<string, string> = {
  spotify: colors.app.spotify,
  apple_music: colors.app.apple_music,
  youtube_music: colors.app.youtube_music,
  podcasts: colors.app.podcasts,
  unknown: colors.text.muted,
};

const APP_LABEL: Record<string, string> = {
  spotify: 'Open in Spotify',
  apple_music: 'Open in Apple Music',
  youtube_music: 'Open in YouTube Music',
  podcasts: 'Open in Podcasts',
  unknown: 'Open Track',
};

const SOURCE_INFO: Record<string, { label: string; color: string; desc: string }> = {
  ble: { label: 'Bluetooth', color: colors.source.ble, desc: 'Discovered via Bluetooth — within ~50m' },
  mdns: { label: 'WiFi', color: colors.source.mdns, desc: 'On the same network as you' },
  gps: { label: 'Cloud', color: colors.source.gps, desc: 'Discovered via GPS cloud layer' },
};

interface Props {
  broadcaster: Broadcaster | null;
  onClose: () => void;
  sheetRef: React.RefObject<BottomSheet>;
}

export default function TrackDetailSheet({ broadcaster, onClose, sheetRef }: Props) {
  const snapPoints = ['70%'];

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
        onPress={onClose}
      />
    ),
    [onClose],
  );

  if (!broadcaster) return null;

  const { track, sync, displayName, isAnonymous, source, distanceMeters } = broadcaster;
  const position = currentPosition(sync);
  const appColor = APP_COLOR[track.sourceApp] ?? colors.text.muted;
  const srcInfo = SOURCE_INFO[source];

  async function handleOpen() {
    try {
      await openInMusicApp(track);
    } catch {
      // handled inside openInMusicApp
    }
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.content}>
        {/* Album art + identity row */}
        <View style={styles.topRow}>
          <View style={styles.artWrapper}>
            {track.albumArtUrl ? (
              <Image
                source={{ uri: track.albumArtUrl }}
                style={styles.art}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.artPlaceholder, { backgroundColor: `${appColor}22` }]}>
                <View style={[styles.artDot, { backgroundColor: appColor }]} />
              </View>
            )}
          </View>

          <View style={styles.identity}>
            <View style={[styles.sourcePill, { borderColor: `${srcInfo.color}55` }]}>
              <View style={[styles.sourceDot, { backgroundColor: srcInfo.color }]} />
              <Text style={[styles.sourceLabel, { color: srcInfo.color }]}>
                {srcInfo.label}
                {distanceMeters !== undefined
                  ? ` · ${distanceMeters < 1000 ? `${Math.round(distanceMeters)}m` : `${(distanceMeters / 1000).toFixed(1)}km`}`
                  : ''}
              </Text>
            </View>
            <Text style={styles.identityName}>
              {isAnonymous ? 'Anonymous listener' : displayName}
            </Text>
            <Text style={styles.identityDesc}>{srcInfo.desc}</Text>
          </View>
        </View>

        {/* Track metadata */}
        <View style={styles.trackBlock}>
          <Text style={styles.trackName} numberOfLines={2}>
            {track.trackName}
          </Text>
          <Text style={styles.artistName} numberOfLines={1}>
            {track.artistName}
          </Text>
          {track.albumName && (
            <Text style={styles.albumName} numberOfLines={1}>
              {track.albumName}
            </Text>
          )}
        </View>

        {/* Live progress */}
        <View style={styles.progressBlock}>
          <View style={styles.progressStatus}>
            <View style={styles.statusRow}>
              {sync.isPlaying ? (
                <>
                  <View style={styles.playingDot} />
                  <Text style={[styles.statusText, { color: appColor }]}>Playing</Text>
                </>
              ) : (
                <Text style={styles.statusText}>Paused</Text>
              )}
            </View>
            <Text style={styles.progressTime}>
              {formatDuration(position)} / {formatDuration(track.totalDuration)}
            </Text>
          </View>
          <ProgressBar
            sync={sync}
            totalDuration={track.totalDuration}
            height={4}
            fillColor={appColor}
          />
        </View>

        {/* Open in music app CTA */}
        <TouchableOpacity
          style={[styles.openButton, { backgroundColor: appColor }]}
          onPress={handleOpen}
          activeOpacity={0.85}
        >
          <Text style={styles.openButtonText}>
            {APP_LABEL[track.sourceApp] ?? 'Open Track'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Opens the track at the current position in {APP_LABEL[track.sourceApp] ?? 'the app'}.
        </Text>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
  },
  handle: {
    backgroundColor: colors.border.strong,
    width: 36,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[5],
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    gap: spacing[4],
    alignItems: 'center',
  },
  artWrapper: {
    ...shadows.md,
  },
  art: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
  },
  artPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artDot: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    opacity: 0.7,
  },
  identity: {
    flex: 1,
    gap: spacing[2],
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  sourceDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
  },
  sourceLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.3,
  },
  identityName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  identityDesc: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    lineHeight: typography.size.xs * 1.5,
  },

  // Track
  trackBlock: {
    gap: spacing[1],
  },
  trackName: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
    letterSpacing: -0.5,
    lineHeight: typography.size.xl * 1.2,
  },
  artistName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  albumName: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
  },

  // Progress
  progressBlock: {
    gap: spacing[2],
  },
  progressStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  playingDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.status.live,
  },
  statusText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
  },
  progressTime: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    fontVariant: ['tabular-nums'],
  },

  // CTA
  openButton: {
    borderRadius: radius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
    marginTop: spacing[2],
  },
  openButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: '#ffffff',
  },
  disclaimer: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: typography.size.xs * 1.5,
    marginTop: -spacing[3],
  },
});
