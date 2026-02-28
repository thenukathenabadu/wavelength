/**
 * GlobalScreen — Phase 9.
 *
 * Real-time view of what the world is listening to right now.
 * Subscribes to all active /broadcasts documents, aggregates
 * by track and by source app, and renders a live leaderboard.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GlobalHeatmapMap, { type HeatPoint } from '../../components/maps/GlobalHeatmapMap';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';
import { colors, typography, spacing, radius } from '../../theme';
import type { NowPlayingTrack } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawBroadcast {
  trackName: string;
  artistName: string;
  sourceApp: NowPlayingTrack['sourceApp'];
  expiresAt: Timestamp;
  lat?: number;
  lon?: number;
}

interface TrackStat {
  key: string; // `${trackName}||${artistName}`
  trackName: string;
  artistName: string;
  count: number;
}

interface PlatformStat {
  app: NowPlayingTrack['sourceApp'];
  count: number;
  pct: number;
}

// ─── App display meta ─────────────────────────────────────────────────────────

const APP_META: Record<NowPlayingTrack['sourceApp'], { label: string; color: string }> = {
  spotify:       { label: 'Spotify',       color: colors.app.spotify },
  apple_music:   { label: 'Apple Music',   color: colors.app.apple_music },
  youtube_music: { label: 'YouTube Music', color: colors.app.youtube_music },
  podcasts:      { label: 'Podcasts',      color: colors.app.podcasts },
  unknown:       { label: 'Other',         color: colors.app.unknown },
};

// ─── Aggregation ──────────────────────────────────────────────────────────────

function aggregate(docs: RawBroadcast[]): {
  total: number;
  topTracks: TrackStat[];
  platforms: PlatformStat[];
  heatPoints: HeatPoint[];
} {
  const now = Date.now();
  const active = docs.filter((d) => d.expiresAt?.toMillis?.() > now);
  const total = active.length;

  // Count by track
  const trackMap = new Map<string, TrackStat>();
  const platformMap = new Map<NowPlayingTrack['sourceApp'], number>();

  for (const d of active) {
    const key = `${d.trackName}||${d.artistName}`;
    const existing = trackMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      trackMap.set(key, { key, trackName: d.trackName, artistName: d.artistName, count: 1 });
    }

    platformMap.set(d.sourceApp, (platformMap.get(d.sourceApp) ?? 0) + 1);
  }

  const topTracks = Array.from(trackMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const platforms: PlatformStat[] = Array.from(platformMap.entries())
    .map(([app, count]) => ({ app, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  const heatPoints: HeatPoint[] = active
    .filter((d) => d.lat != null && d.lon != null)
    .map((d) => ({ latitude: d.lat!, longitude: d.lon!, weight: 1 }));

  return { total, topTracks, platforms, heatPoints };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GlobalScreen() {
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [topTracks, setTopTracks] = useState<TrackStat[]>([]);
  const [platforms, setPlatforms] = useState<PlatformStat[]>([]);
  const [heatPoints, setHeatPoints] = useState<HeatPoint[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'broadcasts'),
      (snapshot) => {
        const docs: RawBroadcast[] = snapshot.docs.map((d) => d.data() as RawBroadcast);
        const result = aggregate(docs);
        setTotal(result.total);
        setTopTracks(result.topTracks);
        setPlatforms(result.platforms);
        setHeatPoints(result.heatPoints);
        setLoading(false);
      },
      () => {
        // Firestore error (offline, permissions) — show empty state
        setLoading(false);
      },
    );

    return unsub;
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Global</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.brand.default} size="large" />
          </View>
        ) : (
          <>
            {/* Hero stat */}
            <View style={styles.heroCard}>
              <Text style={styles.heroCount}>{total.toLocaleString()}</Text>
              <Text style={styles.heroLabel}>
                {total === 1 ? 'person listening right now' : 'people listening right now'}
              </Text>
            </View>

            {/* Top Tracks */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Tracks</Text>
              {topTracks.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No active broadcasts yet.</Text>
                </View>
              ) : (
                <View style={styles.listCard}>
                  {topTracks.map((track, i) => (
                    <TrackRow key={track.key} rank={i + 1} track={track} />
                  ))}
                </View>
              )}
            </View>

            {/* Platform breakdown */}
            {platforms.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>By Platform</Text>
                <View style={styles.listCard}>
                  {platforms.map((p) => (
                    <PlatformRow key={p.app} stat={p} />
                  ))}
                </View>
              </View>
            )}

            {/* Listening Heatmap */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Listening Map</Text>
              <GlobalHeatmapMap heatPoints={heatPoints} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TrackRow({ rank, track }: { rank: number; track: TrackStat }) {
  return (
    <View style={[styles.row, rank < 10 && styles.rowBorder]}>
      <Text style={styles.rank}>{rank}</Text>
      <View style={styles.rowLabels}>
        <Text style={styles.trackName} numberOfLines={1}>{track.trackName}</Text>
        <Text style={styles.artistName} numberOfLines={1}>{track.artistName}</Text>
      </View>
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{track.count}</Text>
      </View>
    </View>
  );
}

function PlatformRow({ stat }: { stat: PlatformStat }) {
  const meta = APP_META[stat.app] ?? APP_META.unknown;
  return (
    <View style={[styles.row, styles.rowBorder]}>
      <View style={[styles.platformDot, { backgroundColor: meta.color }]} />
      <Text style={styles.platformLabel}>{meta.label}</Text>
      <View style={styles.platformRight}>
        <Text style={[styles.platformPct, { color: meta.color }]}>{stat.pct}%</Text>
        <Text style={styles.platformCount}>{stat.count}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  scroll: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[10],
    gap: spacing[6],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    backgroundColor: `${colors.status.live}22`,
    borderWidth: 1,
    borderColor: `${colors.status.live}55`,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.status.live,
  },
  liveText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.status.live,
    letterSpacing: 1,
  },

  // Loading
  loadingWrap: {
    paddingTop: spacing[20],
    alignItems: 'center',
  },

  // Hero
  heroCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.brand,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[1],
  },
  heroCount: {
    fontSize: typography.size['4xl'],
    fontWeight: typography.weight.black,
    color: colors.brand.light,
  },
  heroLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },

  // Sections
  section: {
    gap: spacing[3],
  },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Cards
  listCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  emptyCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[6],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
  },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },

  // Track row
  rank: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text.muted,
    width: 20,
    textAlign: 'center',
  },
  rowLabels: {
    flex: 1,
    gap: 2,
  },
  trackName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  artistName: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  countBadge: {
    backgroundColor: colors.brand.dim,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    minWidth: 32,
    alignItems: 'center',
  },
  countText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.brand.light,
  },

  // Platform row
  platformDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  platformLabel: {
    flex: 1,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  platformRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  platformPct: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    minWidth: 36,
    textAlign: 'right',
  },
  platformCount: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    minWidth: 24,
    textAlign: 'right',
  },
});
