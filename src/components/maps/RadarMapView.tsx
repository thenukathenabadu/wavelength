/**
 * RadarMapView — native (iOS/Android) implementation.
 * Metro resolves this file on iOS/Android; RadarMapView.web.tsx on web.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import ClusterMapView from 'react-native-map-clustering';
import { colors, typography, spacing, radius } from '../../theme';
import type { Broadcaster } from '../../types';

const DEFAULT_DELTA = 0.01;

const SOURCE_COLORS: Record<Broadcaster['source'], string> = {
  ble:  colors.source.ble,
  mdns: colors.source.mdns,
  gps:  colors.source.gps,
};

export interface RadarMapViewProps {
  broadcasters: Broadcaster[];
  userCoords: { lat: number; lon: number } | null;
  onMarkerPress: (b: Broadcaster) => void;
  mapRef?: React.RefObject<MapView>;
}

export default function RadarMapView({
  broadcasters,
  userCoords,
  onMarkerPress,
  mapRef,
}: RadarMapViewProps) {
  const center = userCoords ?? { lat: 0, lon: 0 };

  return (
    <View style={styles.wrap}>
      <ClusterMapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={{
          latitude:       center.lat,
          longitude:      center.lon,
          latitudeDelta:  DEFAULT_DELTA,
          longitudeDelta: DEFAULT_DELTA,
        }}
        clusterColor={colors.brand.default}
        clusterTextColor={colors.text.primary}
        clusterFontFamily={undefined}
      >
        {broadcasters.map((b) => (
          <Marker
            key={b.id}
            coordinate={{ latitude: b.lat!, longitude: b.lon! }}
            onPress={() => onMarkerPress(b)}
          >
            <View style={[styles.pin, { borderColor: SOURCE_COLORS[b.source] }]}>
              <View style={[styles.pinDot, { backgroundColor: SOURCE_COLORS[b.source] }]} />
            </View>

            <Callout tooltip onPress={() => onMarkerPress(b)}>
              <View style={styles.callout}>
                <Text style={styles.calloutTrack} numberOfLines={1}>
                  {b.track.trackName}
                </Text>
                <Text style={styles.calloutArtist} numberOfLines={1}>
                  {b.track.artistName}
                </Text>
                <Text style={styles.calloutTap}>Tap to open</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </ClusterMapView>

      {broadcasters.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No GPS broadcasts nearby.{'\n'}BLE and WiFi listeners appear in list view.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  map:  { flex: 1 },
  empty: {
    position: 'absolute',
    bottom: spacing[8],
    left: spacing[5],
    right: spacing[5],
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[4],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: typography.size.sm * 1.5,
  },
  pin: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    backgroundColor: colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  callout: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[3],
    minWidth: 160,
    maxWidth: 240,
    gap: 2,
  },
  calloutTrack: {
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.text.primary,
  },
  calloutArtist: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
  calloutTap: {
    fontSize: typography.size.xs,
    color: colors.brand.light,
    marginTop: spacing[1],
  },
});
