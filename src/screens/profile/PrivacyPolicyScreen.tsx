import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../theme';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.updated}>Last updated: February 2026</Text>

        <Section title="What Wavelength Does">
          Wavelength lets you discover what music people near you are listening to in real-time, and
          share what you're listening to with friends. Discovery works over Bluetooth, WiFi, and GPS.
        </Section>

        <Section title="Data We Collect">
          {`• Location — your approximate GPS coordinates, used to find nearby broadcasters within the radius you set. We do not store your location history.\n\n• Music metadata — track name, artist, album, and app source from your active media session. This is only published while you have Broadcasting turned ON.\n\n• Account info — display name, email, and username you choose at registration.\n\n• Usage data — broadcast history and discovery history stored in your account so you can review it in Profile.`}
        </Section>

        <Section title="How We Use It">
          {`• Your location is used only to query nearby broadcasters in real-time. It is never stored or shared.\n\n• Your broadcast (track + position) is published to our database for up to 5 minutes, then automatically deleted.\n\n• We do not sell your data to third parties.\n\n• We do not use your data for advertising.`}
        </Section>

        <Section title="Firebase & Third Parties">
          {`Wavelength uses Firebase (Google) for authentication and real-time data sync. Your data is stored in Firebase Firestore under Google's data processing terms.\n\nWe use no other third-party analytics or advertising SDKs.`}
        </Section>

        <Section title="Your Rights">
          {`• You can turn off Broadcasting at any time — your track data stops being published immediately.\n\n• You can delete your account from Settings, which removes all your data from our servers.\n\n• You can enable Anonymous mode so your name is hidden from nearby listeners.`}
        </Section>

        <Section title="Data Retention">
          {`• Broadcast docs: auto-deleted after 5 minutes of inactivity.\n\n• Broadcast/listen history: retained until you delete your account.\n\n• Friend data: retained until you remove the friendship or delete your account.`}
        </Section>

        <Section title="Contact">
          Questions? Reach us at support@wavelength.app
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing[5], gap: spacing[5], paddingBottom: spacing[10] },
  updated: { fontSize: typography.size.xs, color: colors.text.muted },
  section: { gap: spacing[2] },
  sectionTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  sectionBody: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * 1.6,
  },
});
