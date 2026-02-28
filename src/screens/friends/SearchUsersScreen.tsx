import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FriendsStackParamList, UserProfile } from '../../types';
import {
  searchUsersByUsername,
  sendFriendRequest,
} from '../../services/firebase/friendsService';
import { useCurrentUser } from '../../store/authSlice';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';
import { colors, typography, spacing, radius } from '../../theme';

type Props = NativeStackScreenProps<FriendsStackParamList, 'SearchUsers'>;

export default function SearchUsersScreen({ route }: Props) {
  const user = useCurrentUser();
  const uid = user?.uid ?? '';
  const prefill = route.params?.prefillUsername ?? '';

  const [query, setQuery] = useState(prefill);
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [myUsername, setMyUsername] = useState('');
  // Track sent requests for instant UI feedback
  const sentRequests = useRef(new Set<string>()).current;
  const [sentState, setSentState] = useState(0); // bump to re-render

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load own username for request attribution
  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, 'users', uid)).then((snap) => {
      if (snap.exists()) setMyUsername(snap.data().username ?? '');
    }).catch(() => {});
  }, [uid]);

  const runSearch = useCallback(async (text: string) => {
    if (text.length < 1) { setResults([]); return; }
    setSearching(true);
    try {
      const found = await searchUsersByUsername(text.toLowerCase(), uid);
      setResults(found);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [uid]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  // Auto-search on mount if prefill provided
  useEffect(() => {
    if (prefill) runSearch(prefill);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(result: UserProfile) {
    if (!uid || sentRequests.has(result.uid)) return;
    sentRequests.add(result.uid);
    setSentState((s) => s + 1);
    await sendFriendRequest(uid, user?.displayName ?? '', myUsername, result.uid).catch(() => {
      sentRequests.delete(result.uid);
      setSentState((s) => s + 1);
    });
  }

  return (
    <View style={styles.root}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search by @username"
          placeholderTextColor={colors.text.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          selectionColor={colors.brand.default}
        />
        {searching && <ActivityIndicator color={colors.brand.default} size="small" />}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          query.length > 0 && !searching ? (
            <Text style={styles.noResults}>No users found for "@{query}"</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const sent = sentRequests.has(item.uid);
          return (
            <View style={styles.resultRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.displayName[0]?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{item.displayName}</Text>
                <Text style={styles.resultUsername}>@{item.username}</Text>
              </View>
              <TouchableOpacity
                style={[styles.addButton, sent && styles.addButtonSent]}
                onPress={() => handleAdd(item)}
                disabled={sent}
              >
                <Text style={[styles.addButtonText, sent && styles.addButtonTextSent]}>
                  {sent ? 'Sent' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[5],
    marginVertical: spacing[4],
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  input: {
    flex: 1,
    paddingVertical: spacing[3],
    fontSize: typography.size.base,
    color: colors.text.primary,
  },

  list: { paddingHorizontal: spacing[5], gap: spacing[2] },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  avatar: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.brand.dim,
    borderWidth: 1, borderColor: colors.brand.default,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: typography.size.base, fontWeight: typography.weight.bold, color: colors.brand.light },

  resultInfo: { flex: 1, gap: 2 },
  resultName: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.text.primary },
  resultUsername: { fontSize: typography.size.sm, color: colors.text.muted },

  addButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    backgroundColor: colors.brand.dim,
    borderWidth: 1,
    borderColor: colors.brand.default,
  },
  addButtonSent: {
    backgroundColor: 'transparent',
    borderColor: colors.border.default,
  },
  addButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.brand.light,
  },
  addButtonTextSent: { color: colors.text.muted },

  noResults: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    textAlign: 'center',
    paddingTop: spacing[6],
  },
});
