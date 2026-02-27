import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RadarStackParamList } from '../types';
import RadarScreen from '../screens/radar/RadarScreen';
import NearbyListScreen from '../screens/radar/NearbyListScreen';

const Stack = createNativeStackNavigator<RadarStackParamList>();

export default function RadarNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0a0a' },
        headerTintColor: '#ffffff',
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#0a0a0a' },
      }}
    >
      <Stack.Screen name="RadarScreen" component={RadarScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="NearbyList"
        component={NearbyListScreen}
        options={{ title: 'Nearby' }}
      />
    </Stack.Navigator>
  );
}
