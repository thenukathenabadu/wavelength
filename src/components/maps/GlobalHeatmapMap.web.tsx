/**
 * GlobalHeatmapMap — web stub.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../../theme';
import type { GlobalHeatmapMapProps } from './GlobalHeatmapMap';

export type { GlobalHeatmapMapProps };

export default function GlobalHeatmapMap(_props: GlobalHeatmapMapProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>
        Heatmap requires the Wavelength mobile app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 100,
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  text: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    textAlign: 'center',
  },
});
