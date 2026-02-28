/**
 * InsightsScreen — Phase 11: Platform Intelligence.
 *
 * Sections:
 *   1. Your Stats       — personal broadcast + listen summary
 *   2. Platform Pulse   — live app market share from /broadcasts
 *   3. Cross-Platform Hits — tracks playing on 2+ platforms right now
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
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';
import {
  subscribeBroadcastHistory,
  subscribeListenHistory,
  type BroadcastHistoryEntry,
  type ListenHistoryEntry,
} from '../../services/firebase/historyService';
import { useCurrentUser } from '../../store/authSlice';
import { colors, typography, spacing, radius } from '../../theme';
import type { NowPlayingTrack } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawBroadcast {
  trackName: string;
  artistName: string;
  sourceApp: NowPlayingTrack['sourceApp'];
  expiresAt: Timestamp;
}

interface PlatformStat {
  app: NowPlayingTrack['sourceApp'];
  label: string;
  color: string;
  count: number;
  pct: number;
}

interface CrossHit {
  key: string;
  trackName: string;
  artistName: string;
  platforms: NowPlayingTrack['sourceApp'][];
  total: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_META: Record<NowPlayingTrack['sourceApp'], { label: string; color: string }> = {
  spotify:       { label: 'Spotify',       color: colors.app.spotify },
  apple_music:   { label: 'Apple Music',   color: colors.app.apple_music },
  youtube_music: { label: 'YouTube Music', color: colors.app.youtube_music },
  podcasts:      { label: 'Podcasts',      color: colors.app.podcasts },
  unknown:       { label: 'Other',         color: colors.app.unknown },
};

const SOURCE_LABEL: Record<string, string> = {
  ble:  'Bluetooth',
  mdns: 'WiFi',
  gps:  'Cloud',
};

// ─── Aggregation helpers ───────────────────────────────────────────────────────

function aggregateLive(docs: RawBroadcast[]): {
  total: number;
  platforms: PlatformStat[];
  crossHits: CrossHit[];
} {
  const now = Date.now();
  const active = docs.filter((d) => d.expiresAt?.toMillis?.() > now);
  const total = active.length;

  const platformMap = new Map<NowPlayingTrack['sourceApp'], number>();
  // track -> set of platforms
  const trackPlatformMap = new Map<string, { trackName: string; artistName: string; platforms: Set<NowPlayingTrack['sourceApp']>; total: number }>();

  for (const d of active) {
    platformMap.set(d.sourceApp, (platformMap.get(d.sourceApp) ?? 0) + 1);

    const key = `${d.trackName}||${d.artistName}`;
    const existing = trackPlatformMap.get(key);
    if (existing) {
      existing.platforms.add(d.sourceApp);
      existing.total++;
    } else {
      trackPlatformMap.set(key, {
        trackName: d.trackName,
        artistName: d.artistName,
        platforms: new Set([d.sourceApp]),
        total: 1,
      });
    }
  }

  const platforms: PlatformStat[] = Array.from(platformMap.entries())
    .map(([app, count]) => ({
      app,
      label: APP_META[app].label,
      color: APP_META[app].color,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const crossHits: CrossHit[] = Array.from(trackPlatformMap.entries())
    .filter(([, v]) => v.platforms.size >= 2)
    .map(([key, v]) => ({
      key,
      trackName: v.trackName,
      artistName: v.artistName,
      platforms: Array.from(v.platforms),
      total: v.total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return { total, platforms, crossHits };
}

function computePersonal(
  broadcasts: BroadcastHistoryEntry[],
  listens: ListenHistoryEntry[],
): {
  totalBroadcastMins: number;
  topBroadcastArtist: string | null;
  topDiscoveryMethod: string | null;
  topListenedArtist: string | null;
} {
  // Total broadcast time
  const totalSecs = broadcasts.reduce((s, b) => s + (b.durationSecs ?? 0), 0);
  const totalBroadcastMins = Math.round(totalSecs / 60);

  // Most broadcast artist
  const artistCount = new Map<string, number>();
  for (const b of broadcasts) {
    artistCount.set(b.artistName, (artistCount.get(b.artistName) ?? 0) + 1);
  }
  const topBroadcastArtist = artistCount.size > 0
    ? Array.from(artistCount.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  // Favourite discovery method
  const viaCount = new Map<string, number>();
  for (const l of listens) {
    viaCount.set(l.discoveredVia, (viaCount.get(l.discoveredVia) ?? 0) + 1);
  }
  const topDiscoveryMethod = viaCount.size > 0
    ? SOURCE_LABEL[Array.from(viaCount.entries()).sort((a, b) => b[1] - a[1])[0][0]] ?? null
    : null;

  // Most listened-to artist (from discoveries)
  const listenArtist = new Map<string, number>();
  for (const l of listens) {
    listenArtist.set(l.artistName, (listenArtist.get(l.artistName) ?? 0) + 1);
  }
  const topListenedArtist = listenArtist.size > 0
    ? Array.from(listenArtist.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  return { totalBroadcastMins, topBroadcastArtist, topDiscoveryMethod, topListenedArtist };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InsightsScreen() {
  const user = useCurrentUser();

  const [liveLoading, setLiveLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [platforms, setPlatforms] = useState<PlatformStat[]>([]);
  const [crossHits, setCrossHits] = useState<CrossHit[]>([]);

  const [broadcasts, setBroadcasts] = useState<BroadcastHistoryEntry[]>([]);
  const [listens, setListens] = useState<ListenHistoryEntry[]>([]);

  // Live /broadcasts subscription
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'broadcasts'),
      (snap) => {
        const docs: RawBroadcast[] = snap.docs.map((d) => d.data() as RawBroadcast);
        const result = aggregateLive(docs);
        setTotal(result.total);
        setPlatforms(result.platforms);
        setCrossHits(result.crossHits);
        setLiveLoading(false);
      },
      () => setLiveLoading(false),
    );
    return unsub;
  }, []);

  // Personal history subscriptions
  useEffect(() => {
    if (!user?.uid) return;
    const unsubB = subscribeBroadcastHistory(user.uid, setBroadcasts);
    const unsubL = subscribeListenHistory(user.uid, setListens);
    return () => { unsubB(); unsubL(); };
  }, [user?.uid]);

  const personal = computePersonal(broadcasts, listens);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Insights</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {/* ── Your Stats ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <StatCard
              value={broadcasts.length.toString()}
              label="Broadcasts"
              sub={personal.topBroadcastArtist ? `Top: ${personal.topBroadcastArtist}` : undefined}
              color={colors.brand.light}
            />
            <StatCard
              value={personal.totalBroadcastMins.toString()}
              label="Mins Broadcast"
              color={colors.app.spotify}
            />
            <StatCard
              value={listens.length.toString()}
              label="Discovered"
              sub={personal.topListenedArtist ? `Top: ${personal.topListenedArtist}` : undefined}
              color={colors.app.apple_music}
            />
            <StatCard
              value={personal.topDiscoveryMethod ?? '—'}
              label="Via"
              sub="Fav method"
              color={colors.app.youtube_music}
            />
          </View>
        </View>

        {/* ── Platform Pulse ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Platform Pulse</Text>
            <Text style={styles.sectionSub}>{total} active</Text>
          </View>
          {liveLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.brand.default} />
            </View>
          ) : platforms.length === 0 ? (
            <EmptyCard text="No active broadcasts right now." />
          ) : (
            <View style={styles.card}>
              {platforms.map((p, i) => (
                <PlatformBar key={p.app} stat={p} last={i === platforms.length - 1} />
              ))}
            </View>
          )}
        </View>

        {/* ── Cross-Platform Hits ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Cross-Platform Hits</Text>
            <Text style={styles.sectionSub}>on 2+ apps</Text>
          </View>
          {liveLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.brand.default} />
            </View>
          ) : crossHits.length === 0 ? (
            <EmptyCard text="No tracks playing across multiple platforms right now." />
          ) : (
            <View style={styles.card}>
              {crossHits.map((hit, i) => (
                <CrossHitRow key={hit.key} hit={hit} last={i === crossHits.length - 1} />
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ value, label, sub, color }: {
  value: string; label: string; sub?: string; color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub} numberOfLines={1}>{sub}</Text>}
    </View>
  );
}

function PlatformBar({ stat, last }: { stat: PlatformStat; last: boolean }) {
  return (
    <View style={[styles.platformRow, !last && styles.rowBorder]}>
      <View style={styles.platformLeft}>
        <View style={[styles.platformDot, { backgroundColor: stat.color }]} />
        <Text style={styles.platformLabel}>{stat.label}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.max(stat.pct, 2)}%`, backgroundColor: stat.color }]} />
      </View>
      <Text style={[styles.platformPct, { color: stat.color }]}>{stat.pct}%</Text>
    </View>
  );
}

function CrossHitRow({ hit, last }: { hit: CrossHit; last: boolean }) {
  return (
    <View style={[styles.hitRow, !last && styles.rowBorder]}>
      <View style={styles.hitInfo}>
        <Text style={styles.hitTrack} numberOfLines={1}>{hit.trackName}</Text>
        <Text style={styles.hitArtist} numberOfLines={1}>{hit.artistName}</Text>
      </View>
      <View style={styles.hitDots}>
        {hit.platforms.map((app) => (
          <View
            key={app}
            style={[styles.hitPlatformDot, { backgroundColor: APP_META[app]?.color ?? colors.text.muted }]}
          />
        ))}
      </View>
      <Text style={styles.hitCount}>{hit.total}</Text>
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[10],
    gap: spacing[6],
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.black,
    color: colors.text.primary,
    letterSpacing: -0.5,
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
    width: 6, height: 6, borderRadius: radius.full,
    backgroundColor: colors.status.live,
  },
  liveText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.status.live,
    letterSpacing: 1,
  },

  section: { gap: spacing[3] },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionSub: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[4],
    gap: 2,
  },
  statValue: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.black,
  },
  statLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
  },
  statSub: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginTop: 2,
  },

  // Card wrapper
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border.subtle },

  // Platform bar
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  platformLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    width: 110,
  },
  platformDot: { width: 10, height: 10, borderRadius: radius.full },
  platformLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border.subtle,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  platformPct: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    width: 36,
    textAlign: 'right',
  },

  // Cross-platform hits
  hitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  hitInfo: { flex: 1, gap: 2 },
  hitTrack: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  hitArtist: { fontSize: typography.size.xs, color: colors.text.muted },
  hitDots: { flexDirection: 'row', gap: 4 },
  hitPlatformDot: { width: 8, height: 8, borderRadius: radius.full },
  hitCount: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
    minWidth: 20,
    textAlign: 'right',
  },

  // Loading / empty
  loadingWrap: { padding: spacing[6], alignItems: 'center' },
  emptyCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[6],
    alignItems: 'center',
  },
  emptyText: { fontSize: typography.size.sm, color: colors.text.muted, textAlign: 'center' },
});
