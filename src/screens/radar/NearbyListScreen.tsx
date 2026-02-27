import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useBroadcasterList } from '../../store/nearbySlice';
import BroadcasterCard from '../../components/ui/BroadcasterCard';

export default function NearbyListScreen() {
  const broadcasters = useBroadcasterList();

  return (
    <View style={styles.container}>
      <FlatList
        data={broadcasters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BroadcasterCard broadcaster={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No one broadcasting nearby.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  empty: {
    color: '#666',
    textAlign: 'center',
    marginTop: 48,
    fontSize: 14,
  },
});
