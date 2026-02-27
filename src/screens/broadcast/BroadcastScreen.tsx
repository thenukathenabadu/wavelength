import React from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity } from 'react-native';
import { useBroadcastStore, useIsBroadcasting } from '../../store/broadcastSlice';

export default function BroadcastScreen() {
  const { mode, currentTrack, setMode } = useBroadcastStore();
  const isBroadcasting = useIsBroadcasting();

  function toggleBroadcast(value: boolean) {
    if (!value) {
      setMode('off');
    } else {
      setMode('named');
    }
  }

  function toggleAnonymous() {
    setMode(mode === 'named' ? 'anonymous' : 'named');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Broadcast</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Broadcasting</Text>
            <Text style={styles.sublabel}>
              {isBroadcasting ? 'Others can see your track' : 'You are invisible'}
            </Text>
          </View>
          <Switch
            value={isBroadcasting}
            onValueChange={toggleBroadcast}
            trackColor={{ false: '#333', true: '#6c47ff' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {isBroadcasting && (
        <View style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Anonymous mode</Text>
              <Text style={styles.sublabel}>
                {mode === 'anonymous' ? 'Name hidden from others' : 'Showing your name'}
              </Text>
            </View>
            <Switch
              value={mode === 'anonymous'}
              onValueChange={toggleAnonymous}
              trackColor={{ false: '#333', true: '#6c47ff' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>Now Playing</Text>
        {currentTrack ? (
          <View style={styles.trackInfo}>
            <Text style={styles.trackName}>{currentTrack.trackName}</Text>
            <Text style={styles.artistName}>{currentTrack.artistName}</Text>
            <Text style={styles.sourceApp}>{currentTrack.sourceApp}</Text>
          </View>
        ) : (
          <Text style={styles.sublabel}>
            {/* TODO (Week 2–4): NowPlayingModule will populate this automatically */}
            No track detected. Play music on your device.
          </Text>
        )}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  sublabel: {
    fontSize: 13,
    color: '#666',
    maxWidth: '80%',
  },
  trackInfo: {
    marginTop: 12,
  },
  trackName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  artistName: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
  },
  sourceApp: {
    fontSize: 12,
    color: '#6c47ff',
    textTransform: 'capitalize',
  },
});
