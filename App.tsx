import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme';
import * as ProximityManager from './src/services/proximity/ProximityManager';

export default function App() {
  useEffect(() => {
    // Start passive BLE scanning for nearby broadcasters.
    // Scanning runs continuously; advertising is controlled by BroadcastScreen toggle.
    ProximityManager.startDiscovery();
    return () => ProximityManager.stopDiscovery();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <StatusBar style="light" backgroundColor={colors.bg.primary} />
      <RootNavigator />
    </GestureHandlerRootView>
  );
}
