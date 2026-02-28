/**
 * GlobalHeatmapMap — native (iOS/Android) implementation.
 * Renders a heatmap of all active global broadcasts.
 * Heatmap overlay requires Google Maps — active on Android by default.
 * On iOS, shows a placeholder until a Google Maps API key is added.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Heatmap, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors, typography, spacing, radius } from '../../theme';

export interface HeatPoint {
  latitude: number;
  longitude: number;
  weight?: number;
}

export interface GlobalHeatmapMapProps {
  heatPoints: HeatPoint[];
}

export default function GlobalHeatmapMap({ heatPoints }: GlobalHeatmapMapProps) {
  if (Platform.OS !== 'android') {
    return (
      <View style={styles.iosPlaceholder}>
        <Text style={styles.iosText}>
          Heatmap available on Android.{'\n'}
          Add a Google Maps API key to enable on iOS.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.mapCard}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude:       20,
          longitude:      0,
          latitudeDelta:  100,
          longitudeDelta: 160,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {heatPoints.length > 0 && (
          <Heatmap
            points={heatPoints}
            radius={40}
            opacity={0.75}
            gradient={{
              colors:       ['#7C3AED', '#9F6FF4', '#ffffff'],
              startPoints:  [0.2, 0.6, 1.0],
              colorMapSize: 256,
            }}
          />
        )}
      </MapView>

      {heatPoints.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>No location data yet</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
    height: 220,
  },
  map: { flex: 1 },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.card,
  },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
  },
  iosPlaceholder: {
    height: 100,
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  iosText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: typography.size.sm * 1.5,
  },
});
