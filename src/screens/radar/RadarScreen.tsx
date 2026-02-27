import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useBroadcasterList, useNearbyStore } from '../../store/nearbySlice';
import BroadcasterCard from '../../components/ui/BroadcasterCard';

// Evict broadcasters not seen for 30 seconds
const STALE_TTL_MS = 30_000;

export default function RadarScreen() {
  const broadcasters = useBroadcasterList();
  const evictStale = useNearbyStore((s) => s.evictStale);

  // Periodic eviction of stale broadcasters
  const evictIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    evictIntervalRef.current = setInterval(() => {
      evictStale(STALE_TTL_MS);
    }, 10_000);
    return () => {
      if (evictIntervalRef.current) clearInterval(evictIntervalRef.current);
    };
  }, [evictStale]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Nearby</Text>
      <Text style={styles.subheader}>
        {broadcasters.length === 0
          ? 'No one broadcasting nearby'
          : `${broadcasters.length} broadcasting`}
      </Text>

      {/* TODO (Phase 2): Map toggle — react-native-maps */}

      <FlatList
        data={broadcasters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BroadcasterCard broadcaster={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState />}
      />
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>All quiet here</Text>
      <Text style={styles.emptyBody}>
        Start broadcasting to let others know what you're listening to.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    paddingHorizontal: 20,
  },
  subheader: {
    fontSize: 13,
    color: '#666',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
