import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../../theme';

const RADIUS_OPTIONS = [
  { label: '100m', value: 100, desc: 'Immediate surroundings' },
  { label: '250m', value: 250, desc: 'City block' },
  { label: '500m', value: 500, desc: 'Neighbourhood' },
  { label: '1km', value: 1000, desc: 'Wide area' },
];

export default function SettingsScreen() {
  const [radiusIndex, setRadiusIndex] = useState(0);
  const [bleEnabled, setBleEnabled] = useState(true);
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [showDistance, setShowDistance] = useState(true);

  const selected = RADIUS_OPTIONS[radiusIndex]!;

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Discovery Radius */}
        <View style={styles.section}>
          <SectionHeader
            title="Discovery Radius"
            desc="How far to search for nearby listeners in GPS mode."
          />
          <View style={styles.segmentCard}>
            <View style={styles.segmentRow}>
              {RADIUS_OPTIONS.map((opt, i) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.segment, i === radiusIndex && styles.segmentActive]}
                  onPress={() => setRadiusIndex(i)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.segmentText, i === radiusIndex && styles.segmentTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.radiusDesc}>{selected.desc}</Text>
          </View>
        </View>

        {/* Discovery Layers */}
        <View style={styles.section}>
          <SectionHeader
            title="Discovery Layers"
            desc="Choose which signals Wavelength uses to find nearby listeners."
          />
          <View style={styles.menuCard}>
            <ToggleRow
              label="Bluetooth (BLE)"
              sublabel="~30–50m · no pairing · cross-platform"
              accentColor={colors.source.ble}
              value={bleEnabled}
              onValueChange={setBleEnabled}
            />
            <ToggleRow
              label="Same WiFi Network"
              sublabel="Office, café on shared router"
              accentColor={colors.source.mdns}
              value={wifiEnabled}
              onValueChange={setWifiEnabled}
            />
            <ToggleRow
              label="GPS + Cloud"
              sublabel={`Up to ${selected.label} · requires location access`}
              accentColor={colors.source.gps}
              value={gpsEnabled}
              onValueChange={setGpsEnabled}
              last
            />
          </View>
        </View>

        {/* Display */}
        <View style={styles.section}>
          <SectionHeader title="Display" />
          <View style={styles.menuCard}>
            <ToggleRow
              label="Show distance"
              sublabel="Display metres/km on broadcaster cards"
              value={showDistance}
              onValueChange={setShowDistance}
              last
            />
          </View>
        </View>

        {/* Active layers summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Active discovery</Text>
          <View style={styles.summaryBadges}>
            {bleEnabled && <LayerBadge label="BLE" color={colors.source.ble} />}
            {wifiEnabled && <LayerBadge label="WiFi" color={colors.source.mdns} />}
            {gpsEnabled && (
              <LayerBadge label={`GPS · ${selected.label}`} color={colors.source.gps} />
            )}
            {!bleEnabled && !wifiEnabled && !gpsEnabled && (
              <Text style={styles.summaryNone}>All layers off — discovery disabled</Text>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {desc && <Text style={styles.sectionDesc}>{desc}</Text>}
    </View>
  );
}

function ToggleRow({
  label,
  sublabel,
  value,
  onValueChange,
  accentColor,
  last = false,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  accentColor?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, !last && styles.toggleRowBorder]}>
      {accentColor && (
        <View style={[styles.toggleAccent, { backgroundColor: accentColor }]} />
      )}
      <View style={styles.toggleLabels}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {sublabel && <Text style={styles.toggleSublabel}>{sublabel}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border.strong, true: colors.brand.default }}
        thumbColor={colors.text.primary}
        ios_backgroundColor={colors.border.strong}
      />
    </View>
  );
}

function LayerBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.layerBadge, { borderColor: `${color}55` }]}>
      <View style={[styles.layerDot, { backgroundColor: color }]} />
      <Text style={[styles.layerLabel, { color }]}>{label}</Text>
    </View>
  );
}

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

  // Sections
  section: {
    gap: spacing[3],
  },
  sectionHeader: {
    gap: spacing[1],
  },
  sectionTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  sectionDesc: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    lineHeight: typography.size.sm * 1.5,
  },

  // Segment control
  segmentCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[3],
    gap: spacing[3],
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  segment: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.bg.cardElevated,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentActive: {
    backgroundColor: colors.brand.dim,
    borderColor: colors.brand.default,
  },
  segmentText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
  },
  segmentTextActive: {
    color: colors.brand.light,
  },
  radiusDesc: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    textAlign: 'center',
  },

  // Menu card
  menuCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  toggleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  toggleAccent: {
    width: 4,
    height: 36,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  toggleLabels: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  toggleSublabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },

  // Summary
  summaryCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[4],
    gap: spacing[3],
  },
  summaryTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  summaryNone: {
    fontSize: typography.size.sm,
    color: colors.status.error,
  },
  layerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
  },
  layerDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  layerLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
});
