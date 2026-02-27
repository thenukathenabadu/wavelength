import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomSheet from '@gorhom/bottom-sheet';
import type { RadarStackParamList, Broadcaster } from '../types';
import RadarScreen from '../screens/radar/RadarScreen';
import NearbyListScreen from '../screens/radar/NearbyListScreen';
import TrackDetailSheet from '../components/ui/TrackDetailSheet';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<RadarStackParamList>();

export default function RadarNavigator() {
  const sheetRef = useRef<BottomSheet>(null);
  const [selected, setSelected] = useState<Broadcaster | null>(null);

  const handleSelect = useCallback((broadcaster: Broadcaster) => {
    setSelected(broadcaster);
    sheetRef.current?.expand();
  }, []);

  const handleClose = useCallback(() => {
    sheetRef.current?.close();
  }, []);

  return (
    <View style={styles.root}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg.primary },
          headerTintColor: colors.text.primary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg.primary },
        }}
      >
        <Stack.Screen name="RadarScreen" options={{ headerShown: false }}>
          {() => <RadarScreen onSelectBroadcaster={handleSelect} />}
        </Stack.Screen>
        <Stack.Screen
          name="NearbyList"
          component={NearbyListScreen}
          options={{ title: 'Nearby' }}
        />
      </Stack.Navigator>

      {/* Sheet lives outside the stack so it overlays everything */}
      <TrackDetailSheet
        broadcaster={selected}
        onClose={handleClose}
        sheetRef={sheetRef}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
});
