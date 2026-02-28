import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FriendsStackParamList, Friend, FriendRequest, Broadcaster } from '../../types';
import {
  subscribeFriends,
  subscribeFriendRequests,
  subscribeFriendBroadcasts,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
} from '../../services/firebase/friendsService';
import { useCurrentUser } from '../../store/authSlice';
import { colors, typography, spacing, radius } from '../../theme';

type Props = NativeStackScreenProps<FriendsStackParamList, 'FriendsHome'> & {
  onSelectBroadcaster: (b: Broadcaster) => void;
};

const APP_COLOR: Record<string, string> = {
  spotify:       colors.app.spotify,
  apple_music:   colors.app.apple_music,
  youtube_music: colors.app.youtube_music,
  podcasts:      colors.app.podcasts,
  unknown:       colors.text.muted,
};

export default function FriendsScreen({ navigation, onSelectBroadcaster }: Props) {
  const user = useCurrentUser();
  const uid = user?.uid ?? '';

  const [tab, setTab] = useState<'now' | 'friends' | 'requests'>('now');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [broadcasts, setBroadcasts] = useState<Map<string, Broadcaster | null>>(new Map());
  const [loading, setLoading] = useState(true);

  // Subscribe to friends list
  useEffect(() => {
    if (!uid) return;
    return subscribeFriends(uid, (f) => {
      setFriends(f);
      setLoading(false);
    });
  }, [uid]);

  // Subscribe to friend requests
  useEffect(() => {
    if (!uid) return;
    return subscribeFriendRequests(uid, setRequests);
  }, [uid]);

  // Subscribe to friend broadcasts (re-subscribes when friends list changes)
  useEffect(() => {
    if (friends.length === 0) {
      setBroadcasts(new Map());
      return;
    }
    return subscribeFriendBroadcasts(friends, setBroadcasts);
  }, [friends]);

  const activeFriends = friends.filter((f) => {
    const b = broadcasts.get(f.friendUid);
    return b != null;
  });
  const offlineFriends = friends.filter((f) => {
    const b = broadcasts.get(f.friendUid);
    return b == null;
  });

  async function handleAccept(req: FriendRequest) {
    if (!uid || !user) return;
    // Need our own username — read from Firestore via the user profile
    // For now use displayName as fallback
    const myUsername = (user as unknown as { username?: string }).username ?? '';
    await acceptFriendRequest(
      uid, user.displayName ?? '', myUsername,
      req.fromUid, req.fromDisplayName, req.fromUsername,
    ).catch(() => {});
  }

  async function handleDecline(req: FriendRequest) {
    if (!uid) return;
    await declineFriendRequest(uid, req.fromUid).catch(() => {});
  }

  async function handleRemove(friend: Friend) {
    Alert.alert(
      'Remove Friend',
      `Remove ${friend.displayName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFriend(uid, friend.friendUid).catch(() => {}),
        },
      ],
    );
  }

  const requestCount = requests.length;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('SearchUsers', {})}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Tab toggle */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'now' && styles.tabActive]}
          onPress={() => setTab('now')}
        >
          <Text style={[styles.tabText, tab === 'now' && styles.tabTextActive]}>
            Listening Now
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'friends' && styles.tabActive]}
          onPress={() => setTab('friends')}
        >
          <Text style={[styles.tabText, tab === 'friends' && styles.tabTextActive]}>
            Friends {friends.length > 0 ? `(${friends.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'requests' && styles.tabActive]}
          onPress={() => setTab('requests')}
        >
          <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>
            Requests{requestCount > 0 ? ` (${requestCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Listening Now */}
        {tab === 'now' && (
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.brand.default} />
            </View>
          ) : friends.length === 0 ? (
            <EmptyState
              title="No friends yet"
              body={"Tap \"+ Add\" to find friends and see what they're listening to."}
            />
          ) : (
            <>
              {activeFriends.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>LIVE</Text>
                  <View style={styles.card}>
                    {activeFriends.map((f, i) => {
                      const b = broadcasts.get(f.friendUid)!;
                      return (
                        <ListeningRow
                          key={f.friendUid}
                          friend={f}
                          broadcaster={b}
                          last={i === activeFriends.length - 1}
                          onPress={() => onSelectBroadcaster(b)}
                        />
                      );
                    })}
                  </View>
                </View>
              )}
              {offlineFriends.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>NOT BROADCASTING</Text>
                  <View style={styles.card}>
                    {offlineFriends.map((f, i) => (
                      <OfflineRow
                        key={f.friendUid}
                        friend={f}
                        last={i === offlineFriends.length - 1}
                      />
                    ))}
                  </View>
                </View>
              )}
            </>
          )
        )}

        {/* Friends list */}
        {tab === 'friends' && (
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.brand.default} />
            </View>
          ) : friends.length === 0 ? (
            <EmptyState
              title="No friends yet"
              body={"Tap \"+ Add\" to search for people by username."}
            />
          ) : (
            <View style={styles.card}>
              {friends.map((f, i) => (
                <FriendRow
                  key={f.friendUid}
                  friend={f}
                  last={i === friends.length - 1}
                  onRemove={() => handleRemove(f)}
                />
              ))}
            </View>
          )
        )}

        {/* Requests */}
        {tab === 'requests' && (
          requests.length === 0 ? (
            <EmptyState
              title="No pending requests"
              body="Friend requests you receive will appear here."
            />
          ) : (
            <View style={styles.card}>
              {requests.map((req, i) => (
                <RequestRow
                  key={req.fromUid}
                  request={req}
                  last={i === requests.length - 1}
                  onAccept={() => handleAccept(req)}
                  onDecline={() => handleDecline(req)}
                />
              ))}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ListeningRow({ friend, broadcaster, last, onPress }: {
  friend: Friend;
  broadcaster: Broadcaster;
  last: boolean;
  onPress: () => void;
}) {
  const appColor = APP_COLOR[broadcaster.track.sourceApp] ?? colors.text.muted;
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{friend.displayName[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{friend.displayName}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {broadcaster.track.trackName} · {broadcaster.track.artistName}
        </Text>
      </View>
      <View style={[styles.liveDot, { backgroundColor: appColor }]} />
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function OfflineRow({ friend, last }: { friend: Friend; last: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder, styles.rowDimmed]}>
      <View style={[styles.avatar, styles.avatarDimmed]}>
        <Text style={styles.avatarText}>{friend.displayName[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, styles.textDimmed]}>{friend.displayName}</Text>
        <Text style={[styles.rowSub, styles.textDimmed]}>@{friend.username}</Text>
      </View>
    </View>
  );
}

function FriendRow({ friend, last, onRemove }: {
  friend: Friend; last: boolean; onRemove: () => void;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{friend.displayName[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{friend.displayName}</Text>
        <Text style={styles.rowSub}>@{friend.username}</Text>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );
}

function RequestRow({ request, last, onAccept, onDecline }: {
  request: FriendRequest;
  last: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <View style={[styles.requestRow, !last && styles.rowBorder]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{request.fromDisplayName[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{request.fromDisplayName}</Text>
        <Text style={styles.rowSub}>@{request.fromUsername}</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { paddingHorizontal: spacing[5], paddingBottom: spacing[10], gap: spacing[4], paddingTop: spacing[3] },

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
  addButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    backgroundColor: colors.brand.dim,
    borderWidth: 1,
    borderColor: colors.brand.default,
  },
  addButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.brand.light,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing[5],
    marginBottom: spacing[2],
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 3,
  },
  tab:           { flex: 1, paddingVertical: spacing[2], borderRadius: radius.sm, alignItems: 'center' },
  tabActive:     { backgroundColor: colors.brand.dim },
  tabText:       { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.text.muted },
  tabTextActive: { color: colors.brand.light },

  // Sections
  section: { gap: spacing[2] },
  sectionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
    letterSpacing: 1,
  },

  // Card + rows
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
    flexWrap: 'wrap',
  },
  rowBorder:  { borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  rowDimmed:  { opacity: 0.5 },
  rowInfo:    { flex: 1, gap: 2 },
  rowName:    { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.text.primary },
  rowSub:     { fontSize: typography.size.xs, color: colors.text.muted },
  textDimmed: { color: colors.text.muted },
  chevron:    { fontSize: typography.size.lg, color: colors.text.muted },

  // Avatar
  avatar: {
    width: 38, height: 38, borderRadius: radius.full,
    backgroundColor: colors.brand.dim,
    borderWidth: 1, borderColor: colors.brand.default,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarDimmed: { borderColor: colors.border.default, backgroundColor: colors.bg.cardElevated },
  avatarText:   { fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.brand.light },

  // Live dot
  liveDot: { width: 8, height: 8, borderRadius: radius.full },

  // Remove
  removeButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.status.error,
  },
  removeButtonText: {
    fontSize: typography.size.xs,
    color: colors.status.error,
    fontWeight: typography.weight.semibold,
  },

  // Request actions
  requestActions: { flexDirection: 'row', gap: spacing[2] },
  acceptButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.md,
    backgroundColor: colors.brand.dim,
    borderWidth: 1,
    borderColor: colors.brand.default,
  },
  acceptText:   { fontSize: typography.size.xs, color: colors.brand.light, fontWeight: typography.weight.semibold },
  declineButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  declineText:  { fontSize: typography.size.xs, color: colors.text.muted, fontWeight: typography.weight.medium },

  // Empty
  loadingWrap: { paddingTop: spacing[10], alignItems: 'center' },
  empty:       { paddingTop: spacing[10], alignItems: 'center', gap: spacing[2] },
  emptyTitle:  { fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.text.primary },
  emptyBody:   { fontSize: typography.size.sm, color: colors.text.muted, textAlign: 'center', lineHeight: typography.size.sm * 1.5 },
});
