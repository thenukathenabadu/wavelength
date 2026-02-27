import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBroadcastStore, useIsBroadcasting } from '../../store/broadcastSlice';
import ProgressBar from '../../components/ui/ProgressBar';
import { formatDuration, currentPosition } from '../../utils/playbackMath';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { MOCK_CURRENT_TRACK, MOCK_CURRENT_SYNC } from '../../dev/mockData';

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
  unknown: 'Unknown app',
};

export default function BroadcastScreen() {
  const { mode, setMode } = useBroadcastStore();
  const isBroadcasting = useIsBroadcasting();

  // Phase 1: use mock track — Phase 3/4 will replace with NowPlayingModule
  const track = MOCK_CURRENT_TRACK;
  const sync = MOCK_CURRENT_SYNC;

  const appColor = APP_COLOR[track.sourceApp] ?? colors.text.muted;
  const position = currentPosition(sync);

  // Broadcast ring animation
  const ringAnim = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isBroadcasting) {
      ringAnim.setValue(0);
      ringOpacity.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.parallel([
        Animated.timing(ringAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(ringOpacity, { toValue: 0.5, duration: 500, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ]),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [isBroadcasting]);

  const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Broadcasting</Text>
        <Text style={styles.subtitle}>
          {isBroadcasting ? 'Your track is visible to nearby listeners' : 'You are invisible'}
        </Text>
      </View>

      {/* Main toggle card */}
      <View style={styles.toggleCard}>
        <View style={styles.toggleCardTop}>
          {/* Animated ring behind the toggle label */}
          <View style={styles.ringContainer}>
            {isBroadcasting && (
              <Animated.View
                style={[
                  styles.ring,
                  { transform: [{ scale: ringScale }], opacity: ringOpacity },
                ]}
              />
            )}
            <View style={[styles.statusDot, isBroadcasting && styles.statusDotActive]} />
          </View>

          <View style={styles.toggleLabels}>
            <Text style={styles.toggleLabel}>
              {isBroadcasting ? 'Broadcasting ON' : 'Broadcasting OFF'}
            </Text>
            <Text style={styles.toggleSublabel}>
              {isBroadcasting
                ? 'Others nearby can see what you\'re listening to'
                : 'Turn on to share your listening with the world'}
            </Text>
          </View>

          <Switch
            value={isBroadcasting}
            onValueChange={(v) => setMode(v ? 'named' : 'off')}
            trackColor={{ false: colors.border.strong, true: colors.brand.default }}
            thumbColor={colors.text.primary}
            ios_backgroundColor={colors.border.strong}
          />
        </View>

        {/* Anonymous toggle — only shown when broadcasting */}
        {isBroadcasting && (
          <View style={styles.anonRow}>
            <View style={styles.anonLeft}>
              <Text style={styles.anonLabel}>Anonymous mode</Text>
              <Text style={styles.anonSub}>
                {mode === 'anonymous' ? 'Your name is hidden' : 'Sharing your display name'}
              </Text>
            </View>
            <Switch
              value={mode === 'anonymous'}
              onValueChange={(v) => setMode(v ? 'anonymous' : 'named')}
              trackColor={{ false: colors.border.strong, true: colors.brand.default }}
              thumbColor={colors.text.primary}
              ios_backgroundColor={colors.border.strong}
            />
          </View>
        )}
      </View>

      {/* Current track card */}
      <View style={styles.sectionLabel}>
        <Text style={styles.sectionTitle}>Now Playing</Text>
        <View style={[styles.appPill, { borderColor: `${appColor}44` }]}>
          <View style={[styles.appDot, { backgroundColor: appColor }]} />
          <Text style={[styles.appPillText, { color: appColor }]}>
            {APP_LABEL[track.sourceApp]}
          </Text>
        </View>
      </View>

      <View style={[styles.trackCard, isBroadcasting && { borderColor: `${appColor}33` }]}>
        <View style={styles.trackTop}>
          <View style={styles.trackArtWrapper}>
            {track.albumArtUrl ? (
              <Image
                source={{ uri: track.albumArtUrl }}
                style={styles.trackArt}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.trackArtPlaceholder, { backgroundColor: `${appColor}22` }]} />
            )}
          </View>

          <View style={styles.trackMeta}>
            <Text style={styles.trackName} numberOfLines={2}>
              {track.trackName}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {track.artistName}
            </Text>
            {track.albumName && (
              <Text style={styles.trackAlbum} numberOfLines={1}>
                {track.albumName}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.trackProgress}>
          <ProgressBar sync={sync} totalDuration={track.totalDuration} height={3} fillColor={appColor} />
          <View style={styles.trackTiming}>
            <Text style={styles.timingText}>{formatDuration(position)}</Text>
            <Text style={styles.timingText}>{formatDuration(track.totalDuration)}</Text>
          </View>
        </View>
      </View>

      {/* Phase 3 notice */}
      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          Track detection is automatic on device.{'\n'}
          Android reads any app · iOS reads Spotify + Apple Music.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    paddingHorizontal: spacing[5],
  },

  header: {
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
    gap: spacing[1],
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.black,
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
  },

  // Toggle card
  toggleCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing[5],
    overflow: 'hidden',
  },
  toggleCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
  },
  ringContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.brand.default,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.border.strong,
  },
  statusDotActive: {
    backgroundColor: colors.brand.default,
    ...shadows.brand,
  },
  toggleLabels: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  toggleSublabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    lineHeight: typography.size.xs * 1.5,
  },
  anonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    gap: spacing[3],
  },
  anonLeft: {
    flex: 1,
    gap: 2,
  },
  anonLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  anonSub: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },

  // Section label
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  appPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    borderWidth: 1,
  },
  appDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  appPillText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },

  // Track card
  trackCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[4],
    gap: spacing[4],
  },
  trackTop: {
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'center',
  },
  trackArtWrapper: {},
  trackArt: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.bg.cardElevated,
  },
  trackArtPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
  },
  trackMeta: {
    flex: 1,
    gap: spacing[1],
  },
  trackName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
  trackArtist: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  trackAlbum: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },
  trackProgress: {
    gap: spacing[1],
  },
  trackTiming: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timingText: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    fontVariant: ['tabular-nums'],
  },

  // Notice
  notice: {
    marginTop: spacing[5],
    paddingHorizontal: spacing[2],
  },
  noticeText: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: typography.size.xs * 1.6,
  },
});
