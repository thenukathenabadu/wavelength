import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types';
import { colors, typography, spacing, radius, shadows } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const { width } = Dimensions.get('window');

// Static preview rows — simulates the Radar live feed
const PREVIEW_ROWS = [
  { name: 'Sarah',     track: 'Not Like Us',            artist: 'Kendrick Lamar', app: 'spotify',      dist: '12m',  progress: 0.62 },
  { name: 'Anonymous', track: 'JRE #2148 — Elon Musk',  artist: 'The Joe Rogan Experience', app: 'podcasts', dist: '28m', progress: 0.31 },
  { name: 'Marcus',    track: 'Blinding Lights',         artist: 'The Weeknd',     app: 'apple_music',  dist: '45m',  progress: 0.78 },
];

const APP_DOT: Record<string, string> = {
  spotify: colors.app.spotify,
  apple_music: colors.app.apple_music,
  youtube_music: colors.app.youtube_music,
  podcasts: colors.app.podcasts,
};

export default function WelcomeScreen({ navigation }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(cardAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.primary} />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.logoRow}>
          <View style={styles.logoDot} />
          <Text style={styles.logoText}>wavelength</Text>
        </View>
        <Text style={styles.headline}>
          Hear what's{'\n'}playing around you.
        </Text>
        <Text style={styles.subline}>
          Discover music, podcasts, and audiobooks from the people nearby — in real time.
        </Text>
      </Animated.View>

      {/* Live preview cards */}
      <Animated.View style={[styles.preview, { opacity: cardAnim }]}>
        <View style={styles.previewLabel}>
          <View style={styles.liveDot} />
          <Text style={styles.previewLabelText}>Nearby right now</Text>
        </View>

        {PREVIEW_ROWS.map((row, i) => (
          <View key={i} style={styles.previewCard}>
            <View style={[styles.appDot, { backgroundColor: APP_DOT[row.app] ?? colors.text.muted }]} />
            <View style={styles.previewInfo}>
              <Text style={styles.previewTrack} numberOfLines={1}>{row.track}</Text>
              <Text style={styles.previewArtist} numberOfLines={1}>{row.artist}</Text>
              <View style={styles.previewBar}>
                <View style={[styles.previewFill, { width: `${row.progress * 100}%` }]} />
              </View>
            </View>
            <View style={styles.previewRight}>
              <Text style={styles.previewDist}>{row.dist}</Text>
              <Text style={styles.previewName}>{row.name}</Text>
            </View>
          </View>
        ))}
      </Animated.View>

      {/* CTAs */}
      <Animated.View style={[styles.ctas, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.75}
        >
          <Text style={styles.secondaryButtonText}>I already have an account</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },

  // Header
  header: {
    marginBottom: spacing[8],
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.brand.default,
    ...shadows.brand,
  },
  logoText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
    letterSpacing: typography.tracking.wide,
  },
  headline: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.black,
    color: colors.text.primary,
    lineHeight: typography.size['3xl'] * typography.leading.tight,
    letterSpacing: typography.tracking.tight,
    marginBottom: spacing[3],
  },
  subline: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.regular,
    color: colors.text.secondary,
    lineHeight: typography.size.base * typography.leading.relaxed,
  },

  // Preview
  preview: {
    flex: 1,
    gap: spacing[2],
  },
  previewLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.status.live,
  },
  previewLabelText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.muted,
    letterSpacing: typography.tracking.wide,
    textTransform: 'uppercase',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[3],
    gap: spacing[3],
  },
  appDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  previewInfo: {
    flex: 1,
    gap: 3,
  },
  previewTrack: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  previewArtist: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
  previewBar: {
    height: 2,
    backgroundColor: colors.border.default,
    borderRadius: radius.full,
    marginTop: 4,
    overflow: 'hidden',
  },
  previewFill: {
    height: '100%',
    backgroundColor: colors.brand.default,
    borderRadius: radius.full,
  },
  previewRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  previewDist: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.brand.light,
  },
  previewName: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },

  // CTAs
  ctas: {
    gap: spacing[3],
    paddingTop: spacing[6],
  },
  primaryButton: {
    backgroundColor: colors.brand.default,
    borderRadius: radius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
    ...shadows.brand,
  },
  primaryButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: typography.tracking.normal,
  },
  secondaryButton: {
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
});
