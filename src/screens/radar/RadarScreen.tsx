/**
 * RadarScreen — Phase 10 update.
 *
 * List/map toggle. Map view in RadarMapView (native) / RadarMapView.web (stub).
 * react-native-maps is never imported directly here — keeps web bundle clean.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useNearbyStore, useBroadcasterList } from '../../store/nearbySlice';
import BroadcasterCard from '../../components/ui/BroadcasterCard';
import RadarMapView from '../../components/maps/RadarMapView';
import { colors, typography, spacing, radius } from '../../theme';
import type { Broadcaster } from '../../types';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { requestNotificationPermission } from '../../services/notifications/notificationsService';
import {
  startDiscoveryService,
  stopForegroundService,
} from '../../modules/foregroundService/ForegroundServiceModule';
import * as BLE from '../../modules/ble/BLEDiscovery';

// ─── Constants ────────────────────────────────────────────────────────────────


// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onSelectBroadcaster?: (broadcaster: Broadcaster) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RadarScreen({ onSelectBroadcaster }: Props) {
  const evictStale   = useNearbyStore((s) => s.evictStale);
  const broadcasters = useBroadcasterList();

  const [viewMode, setViewMode]   = useState<'list' | 'map'>('list');
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const { isOnline } = useNetworkStatus();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for live dot
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Stale eviction
  useEffect(() => {
    const timer = setInterval(() => evictStale(), 10_000);
    return () => clearInterval(timer);
  }, [evictStale]);

  // Request notification permission once on mount
  useEffect(() => {
    requestNotificationPermission().catch(() => {});
  }, []);

  // Keep BLE scanning alive when backgrounded via foreground service
  useEffect(() => {
    startDiscoveryService();

    const handleAppState = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        BLE.setBackgroundMode(true);
      } else if (next === 'active') {
        BLE.setBackgroundMode(false);
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      stopForegroundService();
      BLE.setBackgroundMode(false);
      sub.remove();
    };
  }, []);

  // Fetch last-known location for map centering (uses cached fix, no extra prompt)
  useEffect(() => {
    Location.getLastKnownPositionAsync()
      .then((pos) => {
        if (pos) setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      })
      .catch(() => {});
  }, []);

  const handleMarkerPress = useCallback(
    (b: Broadcaster) => onSelectBroadcaster?.(b),
    [onSelectBroadcaster],
  );

  // Only GPS-sourced broadcasters have real coordinates for the map
  const mappable = broadcasters.filter((b) => b.lat != null && b.lon != null);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Radar</Text>
          <View style={styles.liveRow}>
            <Animated.View style={[styles.livePulse, { transform: [{ scale: pulseAnim }] }]} />
            <View style={styles.liveDot} />
            <Text style={styles.liveCount}>{broadcasters.length} nearby</Text>
          </View>
        </View>

        {/* List / Map toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.75}
          >
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
              List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
            onPress={() => setViewMode('map')}
            activeOpacity={0.75}
          >
            <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>
              Map
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            Offline — showing Bluetooth & WiFi only
          </Text>
        </View>
      )}

      {/* Source legend */}
      <View style={styles.legend}>
        {[
          { color: colors.source.ble,  desc: 'Bluetooth' },
          { color: colors.source.mdns, desc: 'Same network' },
          { color: colors.source.gps,  desc: 'Cloud' },
        ].map((s) => (
          <View key={s.desc} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.desc}</Text>
          </View>
        ))}
      </View>

      {/* Content */}
      {viewMode === 'list' ? (
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
      ) : (
        <RadarMapView
          broadcasters={mappable}
          userCoords={userCoords}
          onMarkerPress={handleMarkerPress}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
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
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 3,
    marginTop: spacing[1],
  },
  toggleBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.brand.dim,
  },
  toggleText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
  },
  toggleTextActive: {
    color: colors.brand.light,
  },
  offlineBanner: {
    marginHorizontal: spacing[5],
    marginBottom: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: '#78350F22',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D9770655',
  },
  offlineBannerText: {
    fontSize: typography.size.xs,
    color: '#FBBF24',
    fontWeight: typography.weight.semibold,
    textAlign: 'center',
  },
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
  list: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
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
