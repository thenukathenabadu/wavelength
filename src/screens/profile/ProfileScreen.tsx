import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types';
import { signOut } from '../../services/firebase/authService';
import {
  subscribeBroadcastHistory,
  subscribeListenHistory,
  type BroadcastHistoryEntry,
  type ListenHistoryEntry,
} from '../../services/firebase/historyService';
import { useCurrentUser } from '../../store/authSlice';
import { colors, typography, spacing, radius } from '../../theme';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';
import {
  validateUsername,
  isUsernameAvailable,
  claimUsername,
  updateUsername,
} from '../../services/firebase/friendsService';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileScreen'>;

const APP_COLOR: Record<string, string> = {
  spotify:       colors.app.spotify,
  apple_music:   colors.app.apple_music,
  youtube_music: colors.app.youtube_music,
  podcasts:      colors.app.podcasts,
  unknown:       colors.text.muted,
};

const SOURCE_LABEL: Record<string, string> = {
  ble:  'Bluetooth',
  mdns: 'WiFi',
  gps:  'Cloud',
};

export default function ProfileScreen({ navigation }: Props) {
  const user = useCurrentUser();
  const [signingOut, setSigningOut] = useState(false);
  const [historyTab, setHistoryTab] = useState<'broadcasts' | 'discovered'>('broadcasts');
  const [broadcasts, setBroadcasts] = useState<BroadcastHistoryEntry[]>([]);
  const [listens, setListens]       = useState<ListenHistoryEntry[]>([]);
  const [username, setUsername]       = useState<string | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [broadcastsVisible, setBroadcastsVisible] = useState(5);
  const [listensVisible, setListensVisible]       = useState(5);

  const displayName = user?.displayName ?? 'Anonymous';
  const email       = user?.email ?? '';
  const initial     = displayName[0]?.toUpperCase() ?? '?';

  useEffect(() => {
    if (!user?.uid) return;
    const unsubB = subscribeBroadcastHistory(user.uid, setBroadcasts);
    const unsubL = subscribeListenHistory(user.uid, setListens);
    // Load username (not on Firebase Auth object)
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) setUsername(snap.data().username ?? null);
    }).catch(() => {});
    return () => { unsubB(); unsubL(); };
  }, [user?.uid]);

  async function handleInvite() {
    const handle = username ? `@${username}` : (user?.displayName ?? 'me');
    const downloadLink = 'https://github.com/thenukathenabadu/wavelength/releases/latest';
    const deepLink = username ? `wavelength://add/${username}` : '';
    const message = deepLink
      ? `Hey! I'm using Wavelength — an app that lets you discover what people around you are listening to in real-time.\n\nDownload it here: ${downloadLink}\n\nThen add me as a friend: ${deepLink}`
      : `Hey! I'm using Wavelength — an app that lets you discover what people around you are listening to in real-time.\n\nDownload it here: ${downloadLink}`;
    await Share.share({ message }).catch(() => {});
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      Alert.alert('Error', 'Could not sign out. Try again.');
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
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
          {username && <Text style={styles.username}>@{username}</Text>}
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCell value={broadcasts.length} label="Broadcasts" />
          <View style={styles.statDivider} />
          <StatCell value={listens.length} label="Discovered" />
          <View style={styles.statDivider} />
          <StatCell
            value={broadcasts.reduce((s, b) => s + (b.durationSecs ?? 0), 0)}
            label="Secs Broadcast"
          />
        </View>

        {/* History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>

          {/* Tab toggle */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, historyTab === 'broadcasts' && styles.tabActive]}
              onPress={() => setHistoryTab('broadcasts')}
            >
              <Text style={[styles.tabText, historyTab === 'broadcasts' && styles.tabTextActive]}>
                Broadcasts
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, historyTab === 'discovered' && styles.tabActive]}
              onPress={() => setHistoryTab('discovered')}
            >
              <Text style={[styles.tabText, historyTab === 'discovered' && styles.tabTextActive]}>
                Discovered
              </Text>
            </TouchableOpacity>
          </View>

          {historyTab === 'broadcasts' ? (
            broadcasts.length === 0 ? (
              <EmptyHistory text="Nothing broadcast yet. Go play something and toggle Broadcasting ON." />
            ) : (
              <>
                <View style={styles.historyList}>
                  {broadcasts.slice(0, broadcastsVisible).map((b) => (
                    <BroadcastRow key={b.id} entry={b} />
                  ))}
                </View>
                {broadcasts.length > broadcastsVisible && (
                  <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={() => setBroadcastsVisible((v) => v + 10)}
                  >
                    <Text style={styles.showMoreText}>
                      Show more ({broadcasts.length - broadcastsVisible} remaining)
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )
          ) : (
            listens.length === 0 ? (
              <EmptyHistory text="No discoveries yet. Tap a broadcaster in Radar to log it." />
            ) : (
              <>
                <View style={styles.historyList}>
                  {listens.slice(0, listensVisible).map((l) => (
                    <ListenRow key={l.id} entry={l} />
                  ))}
                </View>
                {listens.length > listensVisible && (
                  <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={() => setListensVisible((v) => v + 10)}
                  >
                    <Text style={styles.showMoreText}>
                      Show more ({listens.length - listensVisible} remaining)
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )
          )}
        </View>

        {/* No-username prompt for legacy accounts */}
        {username === null && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.setUsernameBanner} onPress={() => setEditVisible(true)}>
              <View style={styles.setUsernameLeft}>
                <Text style={styles.setUsernameTitle}>Set your @username</Text>
                <Text style={styles.setUsernameSub}>Required to be found by friends and to invite others.</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Account menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuCard}>
            <MenuItem
              label={username ? `Edit Username  @${username}` : 'Set Username'}
              onPress={() => setEditVisible(true)}
            />
            <MenuItem label="Change Email" onPress={() => {}} />
            <MenuItem label="Change Password" onPress={() => {}} last />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.menuCard}>
            <MenuItem label="Settings" onPress={() => navigation.navigate('Settings')} />
            <MenuItem label="Invite a Friend" onPress={handleInvite} />
            <MenuItem label="Privacy Policy" onPress={() => navigation.navigate('PrivacyPolicy')} />
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

        <Text style={styles.version}>Wavelength · v1.0.0</Text>
      </ScrollView>

      <EditUsernameModal
        visible={editVisible}
        currentUsername={username}
        uid={user?.uid ?? ''}
        onDismiss={() => setEditVisible(false)}
        onSaved={(u) => { setUsername(u); setEditVisible(false); }}
      />
    </SafeAreaView>
  );
}

// ─── Edit Username Modal ──────────────────────────────────────────────────────

function EditUsernameModal({ visible, currentUsername, uid, onDismiss, onSaved }: {
  visible: boolean;
  currentUsername: string | null;
  uid: string;
  onDismiss: () => void;
  onSaved: (username: string) => void;
}) {
  const [value, setValue] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill on open
  useEffect(() => {
    if (visible) {
      setValue(currentUsername ?? '');
      setAvailable(null);
      setError(null);
    }
  }, [visible, currentUsername]);

  function handleChange(text: string) {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setValue(cleaned);
    setAvailable(null);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!cleaned || cleaned === currentUsername) return;

    const validationError = validateUsername(cleaned);
    if (validationError) { setError(validationError); return; }

    setChecking(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const ok = await isUsernameAvailable(cleaned);
        setAvailable(ok);
        if (!ok) setError('That username is already taken.');
      } catch {
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 400);
  }

  async function handleSave() {
    if (!uid || saving) return;
    const validationError = validateUsername(value);
    if (validationError) { setError(validationError); return; }
    if (value === currentUsername) { onDismiss(); return; }
    if (available === false) { setError('That username is already taken.'); return; }

    setSaving(true);
    setError(null);
    try {
      if (currentUsername) {
        await updateUsername(uid, currentUsername, value);
      } else {
        await claimUsername(uid, value);
      }
      onSaved(value);
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? '';
      setError(code === 'username-taken' ? 'That username is already taken.' : 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const isUnchanged = value === currentUsername;
  const canSave = !saving && !checking && !error && value.length >= 3 && !isUnchanged && available !== false;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1} />
        <View style={modalStyles.card}>
          <Text style={modalStyles.title}>
            {currentUsername ? 'Edit Username' : 'Set Your Username'}
          </Text>
          <Text style={modalStyles.sub}>
            Others can find you by searching @{value || 'username'}
          </Text>

          <View style={modalStyles.inputRow}>
            <Text style={modalStyles.at}>@</Text>
            <TextInput
              style={modalStyles.input}
              value={value}
              onChangeText={handleChange}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              placeholder="your_username"
              placeholderTextColor={colors.text.muted}
              selectionColor={colors.brand.default}
            />
            {checking && <ActivityIndicator size="small" color={colors.brand.default} />}
            {!checking && available === true && !isUnchanged && (
              <Text style={modalStyles.tick}>✓</Text>
            )}
          </View>

          {error ? (
            <Text style={modalStyles.errorText}>{error}</Text>
          ) : (
            <Text style={modalStyles.hint}>3–20 chars · lowercase letters, numbers, underscores</Text>
          )}

          <View style={modalStyles.buttons}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onDismiss}>
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.saveBtn, !canSave && modalStyles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave}
            >
              {saving
                ? <ActivityIndicator size="small" color={colors.text.primary} />
                : <Text style={modalStyles.saveText}>{currentUsername ? 'Save' : 'Set Username'}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    padding: spacing[4],
  },
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.xl,
    padding: spacing[5],
    gap: spacing[4],
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  sub: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    marginTop: -spacing[2],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing[3],
    gap: spacing[1],
  },
  at: {
    fontSize: typography.size.base,
    color: colors.brand.light,
    fontWeight: typography.weight.bold,
  },
  input: {
    flex: 1,
    paddingVertical: spacing[3],
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  tick: {
    fontSize: typography.size.base,
    color: colors.status.live,
    fontWeight: typography.weight.bold,
  },
  hint: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginTop: -spacing[2],
  },
  errorText: {
    fontSize: typography.size.xs,
    color: colors.status.error,
    marginTop: -spacing[2],
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.brand.default,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontWeight: typography.weight.bold,
  },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCell({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BroadcastRow({ entry }: { entry: BroadcastHistoryEntry }) {
  const appColor = APP_COLOR[entry.sourceApp] ?? colors.text.muted;
  const date = entry.startedAt ? new Date(entry.startedAt).toLocaleDateString() : '—';
  const duration = entry.durationSecs
    ? entry.durationSecs < 60
      ? `${entry.durationSecs}s`
      : `${Math.round(entry.durationSecs / 60)}m`
    : null;

  return (
    <View style={styles.historyRow}>
      <View style={[styles.historyDot, { backgroundColor: appColor }]} />
      <View style={styles.historyInfo}>
        <Text style={styles.historyTrack} numberOfLines={1}>{entry.trackName}</Text>
        <Text style={styles.historyMeta} numberOfLines={1}>{entry.artistName}</Text>
      </View>
      <View style={styles.historyRight}>
        {duration && <Text style={styles.historyBadge}>{duration}</Text>}
        <Text style={styles.historyDate}>{date}</Text>
      </View>
    </View>
  );
}

function ListenRow({ entry }: { entry: ListenHistoryEntry }) {
  const appColor = APP_COLOR[entry.sourceApp] ?? colors.text.muted;
  const date = entry.listenedAt ? new Date(entry.listenedAt).toLocaleDateString() : '—';
  const via = SOURCE_LABEL[entry.discoveredVia] ?? entry.discoveredVia;

  return (
    <View style={styles.historyRow}>
      <View style={[styles.historyDot, { backgroundColor: appColor }]} />
      <View style={styles.historyInfo}>
        <Text style={styles.historyTrack} numberOfLines={1}>{entry.trackName}</Text>
        <Text style={styles.historyMeta} numberOfLines={1}>
          {entry.broadcasterName} · {via}
        </Text>
      </View>
      <Text style={styles.historyDate}>{date}</Text>
    </View>
  );
}

function EmptyHistory({ text }: { text: string }) {
  return (
    <View style={styles.emptyHistory}>
      <Text style={styles.emptyHistoryText}>{text}</Text>
    </View>
  );
}

function MenuItem({
  label, onPress, destructive = false, last = false,
}: {
  label: string; onPress: () => void; destructive?: boolean; last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, !last && styles.menuItemBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>{label}</Text>
      {!destructive && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: colors.bg.primary },

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

  identity: { alignItems: 'center', paddingVertical: spacing[6], gap: spacing[1] },
  avatar: {
    width: 72, height: 72, borderRadius: radius.full,
    backgroundColor: colors.brand.dim,
    borderWidth: 2, borderColor: colors.brand.default,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing[3],
  },
  avatarInitial: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.black,
    color: colors.brand.light,
  },
  displayName: { fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text.primary },
  username:    { fontSize: typography.size.sm, color: colors.brand.light, fontWeight: typography.weight.medium },
  email:       { fontSize: typography.size.sm, color: colors.text.secondary },

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
  statCell:    { flex: 1, alignItems: 'center', gap: 2 },
  statValue:   { fontSize: typography.size.xl, fontWeight: typography.weight.black, color: colors.text.primary },
  statLabel:   { fontSize: typography.size.xs, color: colors.text.muted, fontWeight: typography.weight.medium },
  statDivider: { width: 1, backgroundColor: colors.border.default, marginVertical: spacing[1] },

  section: { marginHorizontal: spacing[5], marginBottom: spacing[5], gap: spacing[2] },
  sectionTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing[1],
  },

  // History tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 3,
  },
  tab: {
    flex: 1, paddingVertical: spacing[2],
    borderRadius: radius.sm, alignItems: 'center',
  },
  tabActive:     { backgroundColor: colors.brand.dim },
  tabText:       { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.text.muted },
  tabTextActive: { color: colors.brand.light },

  historyList: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  historyDot:   { width: 8, height: 8, borderRadius: radius.full },
  historyInfo:  { flex: 1, gap: 2 },
  historyTrack: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.text.primary },
  historyMeta:  { fontSize: typography.size.xs, color: colors.text.muted },
  historyRight: { alignItems: 'flex-end', gap: 2 },
  historyBadge: { fontSize: typography.size.xs, color: colors.brand.light, fontWeight: typography.weight.semibold },
  historyDate:  { fontSize: typography.size.xs, color: colors.text.muted },

  showMoreButton: {
    paddingVertical: spacing[3],
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginTop: spacing[2],
  },
  showMoreText: {
    fontSize: typography.size.sm,
    color: colors.brand.light,
    fontWeight: typography.weight.semibold,
  },

  emptyHistory: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[6],
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: typography.size.sm * 1.5,
  },

  menuCard:     { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden' },
  menuItem:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[4] },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  menuLabel:    { fontSize: typography.size.base, color: colors.text.primary, fontWeight: typography.weight.medium },
  menuLabelDestructive: { color: colors.status.error },
  chevron:      { fontSize: typography.size.lg, color: colors.text.muted },

  version: { textAlign: 'center', fontSize: typography.size.xs, color: colors.text.muted, paddingVertical: spacing[6] },
});
