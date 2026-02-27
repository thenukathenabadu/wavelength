import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types';
import { signOut } from '../../services/firebase/authService';
import { useCurrentUser } from '../../store/authSlice';
import { colors, typography, spacing, radius } from '../../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileScreen'>;

export default function ProfileScreen({ navigation }: Props) {
  const user = useCurrentUser();
  const [signingOut, setSigningOut] = useState(false);

  const displayName = user?.displayName ?? 'Anonymous';
  const email = user?.email ?? '';
  const initial = displayName[0]?.toUpperCase() ?? '?';

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      // RootNavigator's onAuthStateChanged handles the redirect automatically
    } catch {
      Alert.alert('Error', 'Could not sign out. Try again.');
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar + identity */}
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* Stats row — Phase 9 will populate from real data */}
        <View style={styles.statsRow}>
          <StatCell value={0} label="Broadcasts" />
          <View style={styles.statDivider} />
          <StatCell value={0} label="Discovered" />
          <View style={styles.statDivider} />
          <StatCell value={0} label="Days Active" />
        </View>

        {/* Menu items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuCard}>
            <MenuItem label="Edit Display Name" onPress={() => {}} />
            <MenuItem label="Change Email" onPress={() => {}} />
            <MenuItem label="Change Password" onPress={() => {}} last />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.menuCard}>
            <MenuItem label="Settings" onPress={() => navigation.navigate('Settings')} />
            <MenuItem label="Privacy Policy" onPress={() => {}} />
            <MenuItem label="Terms of Service" onPress={() => {}} last />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.menuCard}>
            <MenuItem
              label={signingOut ? 'Signing out…' : 'Sign Out'}
              onPress={handleSignOut}
              destructive
              last
            />
          </View>
        </View>

        <Text style={styles.version}>Wavelength · Phase 1 Build</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCell({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({
  label,
  onPress,
  destructive = false,
  last = false,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, !last && styles.menuItemBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>
        {label}
      </Text>
      {!destructive && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.black,
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  settingsButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  settingsButtonText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },

  // Identity
  identity: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    gap: spacing[1],
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.brand.dim,
    borderWidth: 2,
    borderColor: colors.brand.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  avatarInitial: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.black,
    color: colors.brand.light,
  },
  displayName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  email: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  joined: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginTop: spacing[1],
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing[5],
    backgroundColor: colors.bg.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing[6],
    padding: spacing[4],
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.black,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    fontWeight: typography.weight.medium,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border.default,
    marginVertical: spacing[1],
  },

  // Menu
  section: {
    marginHorizontal: spacing[5],
    marginBottom: spacing[5],
    gap: spacing[2],
  },
  sectionTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing[1],
  },
  menuCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  menuLabel: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontWeight: typography.weight.medium,
  },
  menuLabelDestructive: {
    color: colors.status.error,
  },
  chevron: {
    fontSize: typography.size.lg,
    color: colors.text.muted,
  },

  version: {
    textAlign: 'center',
    fontSize: typography.size.xs,
    color: colors.text.muted,
    paddingVertical: spacing[6],
  },
});
