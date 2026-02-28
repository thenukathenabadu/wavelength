import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNearbyStore, useBroadcasterList } from '../../store/nearbySlice';
import BroadcasterCard from '../../components/ui/BroadcasterCard';
import { colors, typography, spacing, radius } from '../../theme';
import type { Broadcaster } from '../../types';

// Evict broadcasters not seen for 30 seconds
const STALE_TTL_MS = 30_000;

interface Props {
  onSelectBroadcaster?: (broadcaster: Broadcaster) => void;
}

export default function RadarScreen({ onSelectBroadcaster }: Props) {
  const evictStale = useNearbyStore((s) => s.evictStale);
  const broadcasters = useBroadcasterList();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Stale eviction
  useEffect(() => {
    const timer = setInterval(() => evictStale(STALE_TTL_MS), 10_000);
    return () => clearInterval(timer);
  }, [evictStale]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Radar</Text>
          <View style={styles.liveRow}>
            <Animated.View style={[styles.livePulse, { transform: [{ scale: pulseAnim }] }]} />
            <View style={styles.liveDot} />
            <Text style={styles.liveCount}>
              {broadcasters.length} nearby
            </Text>
          </View>
        </View>
        {/* TODO Phase 10: map/list toggle button */}
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Source legend */}
      <View style={styles.legend}>
        {[
          { label: 'BLE', color: colors.source.ble, desc: 'Bluetooth' },
          { label: 'WiFi', color: colors.source.mdns, desc: 'Same network' },
          { label: 'GPS', color: colors.source.gps, desc: 'Cloud' },
        ].map((s) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.desc}</Text>
          </View>
        ))}
      </View>

      <FlatList
        data={broadcasters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BroadcasterCard
            broadcaster={item}
            onPress={() => onSelectBroadcaster?.(item)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState />}
      />
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>All quiet here</Text>
      <Text style={styles.emptyBody}>
        No one broadcasting nearby. Start broadcasting to let others tune in.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  headerLeft: {
    gap: spacing[1],
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.black,
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  livePulse: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: `${colors.status.live}55`,
    left: -1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.status.live,
    marginLeft: 1,
  },
  liveCount: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginLeft: spacing[1],
  },
  filterButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginTop: spacing[1],
  },
  filterButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },

  // Legend
  legend: {
    flexDirection: 'row',
    gap: spacing[4],
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  legendText: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },

  // List
  list: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    flexGrow: 1,
  },

  // Empty
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing[20],
    paddingHorizontal: spacing[8],
  },
  emptyTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: typography.size.base,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: typography.size.base * 1.5,
  },
});
