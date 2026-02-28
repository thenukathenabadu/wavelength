/**
 * RadarMapView — web stub.
 * Metro picks this file on web; maps require native device APIs not available in a browser.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../../theme';
import type { RadarMapViewProps } from './RadarMapView';

export type { RadarMapViewProps };

export default function RadarMapView(_props: RadarMapViewProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Map view</Text>
      <Text style={styles.body}>
        The map requires the Wavelength mobile app.{'\n'}
        Open the app on your iOS or Android device.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
    gap: spacing[3],
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  body: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: typography.size.sm * 1.6,
  },
});
