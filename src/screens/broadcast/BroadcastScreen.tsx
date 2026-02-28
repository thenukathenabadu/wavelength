import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Switch,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBroadcastStore, useIsBroadcasting } from '../../store/broadcastSlice';
import ProgressBar from '../../components/ui/ProgressBar';
import { formatDuration, currentPosition } from '../../utils/playbackMath';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import {
  getCurrentTrack,
  startListening,
  type NowPlayingResult,
} from '../../modules/nowPlaying/NowPlayingModule';
import type { NowPlayingTrack, PlaybackSyncPacket } from '../../types';

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

  const [result, setResult] = useState<NowPlayingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualEntryVisible, setManualEntryVisible] = useState(false);

  // Subscribe to now-playing updates
  useEffect(() => {
    let stopFn: (() => void) | null = null;

    async function init() {
      const initial = await getCurrentTrack();
      setResult(initial);
      setLoading(false);

      stopFn = startListening((update) => {
        setResult(update);
      });
    }

    init();
    return () => stopFn?.();
  }, []);

  const track = result?.track ?? null;
  const sync = result?.sync ?? null;
  const appColor = APP_COLOR[track?.sourceApp ?? 'unknown'] ?? colors.text.muted;
  const positionSecs = sync ? currentPosition(sync) : 0;

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

  function handleManualEntry(manual: { trackName: string; artistName: string }) {
    const manualTrack: NowPlayingTrack = {
      trackName: manual.trackName,
      artistName: manual.artistName,
      totalDuration: 0,
      sourceApp: 'unknown',
    };
    const manualSync: PlaybackSyncPacket = {
      startedAt: Date.now(),
      positionAtStart: 0,
      isPlaying: true,
    };
    setResult({ track: manualTrack, sync: manualSync });
    setManualEntryVisible(false);
  }

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
                ? "Others nearby can see what you're listening to"
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

      {/* Now Playing section */}
      <View style={styles.sectionLabel}>
        <Text style={styles.sectionTitle}>Now Playing</Text>
        {track && (
          <View style={[styles.appPill, { borderColor: `${appColor}44` }]}>
            <View style={[styles.appDot, { backgroundColor: appColor }]} />
            <Text style={[styles.appPillText, { color: appColor }]}>
              {APP_LABEL[track.sourceApp]}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.emptyCard}>
          <ActivityIndicator color={colors.brand.default} />
          <Text style={styles.emptyText}>Detecting track…</Text>
        </View>
      ) : track && sync ? (
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

          {track.totalDuration > 0 && (
            <View style={styles.trackProgress}>
              <ProgressBar sync={sync} totalDuration={track.totalDuration} height={3} fillColor={appColor} />
              <View style={styles.trackTiming}>
                <Text style={styles.timingText}>{formatDuration(positionSecs)}</Text>
                <Text style={styles.timingText}>{formatDuration(track.totalDuration)}</Text>
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No track detected</Text>
          <Text style={styles.emptyText}>
            Play something in Spotify, Apple Music, or another app, then come back.
          </Text>
          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => setManualEntryVisible(true)}
          >
            <Text style={styles.manualButtonText}>Enter track manually</Text>
          </TouchableOpacity>
        </View>
      )}

      <ManualEntryModal
        visible={manualEntryVisible}
        onDismiss={() => setManualEntryVisible(false)}
        onConfirm={handleManualEntry}
      />
    </SafeAreaView>
  );
}

// ─── Manual Entry Modal ───────────────────────────────────────────────────────

function ManualEntryModal({
  visible,
  onDismiss,
  onConfirm,
}: {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (v: { trackName: string; artistName: string }) => void;
}) {
  const [trackName, setTrackName] = useState('');
  const [artistName, setArtistName] = useState('');

  function handleConfirm() {
    if (!trackName.trim()) return;
    onConfirm({ trackName: trackName.trim(), artistName: artistName.trim() });
    setTrackName('');
    setArtistName('');
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Enter track manually</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Track name"
            placeholderTextColor={colors.text.muted}
            value={trackName}
            onChangeText={setTrackName}
            returnKeyType="next"
          />
          <TextInput
            style={styles.modalInput}
            placeholder="Artist name (optional)"
            placeholderTextColor={colors.text.muted}
            value={artistName}
            onChangeText={setArtistName}
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancel} onPress={onDismiss}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirm, !trackName.trim() && styles.modalConfirmDisabled]}
              onPress={handleConfirm}
              disabled={!trackName.trim()}
            >
              <Text style={styles.modalConfirmText}>Broadcast</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  toggleLabels: { flex: 1, gap: 2 },
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
  anonLeft: { flex: 1, gap: 2 },
  anonLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  anonSub: { fontSize: typography.size.xs, color: colors.text.muted },

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
  appDot: { width: 6, height: 6, borderRadius: radius.full },
  appPillText: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold },

  // Track card
  trackCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[4],
    gap: spacing[4],
  },
  trackTop: { flexDirection: 'row', gap: spacing[3], alignItems: 'center' },
  trackArtWrapper: {},
  trackArt: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.bg.cardElevated },
  trackArtPlaceholder: { width: 64, height: 64, borderRadius: radius.md },
  trackMeta: { flex: 1, gap: spacing[1] },
  trackName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
  trackArtist: { fontSize: typography.size.sm, color: colors.text.secondary },
  trackAlbum: { fontSize: typography.size.xs, color: colors.text.muted },
  trackProgress: { gap: spacing[1] },
  trackTiming: { flexDirection: 'row', justifyContent: 'space-between' },
  timingText: { fontSize: typography.size.xs, color: colors.text.muted },

  // Empty / loading state
  emptyCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[3],
  },
  emptyTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: typography.size.sm * 1.5,
  },
  manualButton: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand.default,
  },
  manualButtonText: {
    fontSize: typography.size.sm,
    color: colors.brand.light,
    fontWeight: typography.weight.semibold,
  },

  // Manual entry modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    padding: spacing[4],
  },
  modalCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.xl,
    padding: spacing[5],
    gap: spacing[3],
  },
  modalTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  modalInput: {
    backgroundColor: colors.bg.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  modalButtons: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[1] },
  modalCancel: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.brand.default,
    alignItems: 'center',
  },
  modalConfirmDisabled: { opacity: 0.4 },
  modalConfirmText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontWeight: typography.weight.bold,
  },
});
