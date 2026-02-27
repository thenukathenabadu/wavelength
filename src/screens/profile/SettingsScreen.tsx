import React, { useState } from 'react';
import { View, Text, StyleSheet, Slider } from 'react-native';

const RADIUS_OPTIONS = [100, 250, 500, 1000]; // metres

export default function SettingsScreen() {
  const [radiusIndex, setRadiusIndex] = useState(0); // default 100m

  const radiusMeters = RADIUS_OPTIONS[radiusIndex] ?? 100;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Discovery Radius</Text>
        <Text style={styles.value}>
          {radiusMeters >= 1000 ? `${radiusMeters / 1000} km` : `${radiusMeters} m`}
        </Text>
        {/* TODO: replace with a proper slider component */}
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={RADIUS_OPTIONS.length - 1}
          step={1}
          value={radiusIndex}
          onValueChange={(v) => setRadiusIndex(Math.round(v))}
          minimumTrackTintColor="#6c47ff"
          maximumTrackTintColor="#333"
          thumbTintColor="#6c47ff"
        />
        <View style={styles.sliderLabels}>
          {RADIUS_OPTIONS.map((r) => (
            <Text key={r} style={styles.sliderLabel}>
              {r >= 1000 ? `${r / 1000}km` : `${r}m`}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Discovery Mode</Text>
        {/* TODO (Phase 2): toggle BLE / mDNS / GPS individually */}
        <Text style={styles.sublabel}>BLE + GPS (default)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 24,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  sublabel: {
    fontSize: 13,
    color: '#666',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6c47ff',
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderLabel: {
    fontSize: 11,
    color: '#555',
  },
});
