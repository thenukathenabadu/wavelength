import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomSheet from '@gorhom/bottom-sheet';
import type { FriendsStackParamList, Broadcaster } from '../types';
import FriendsScreen from '../screens/friends/FriendsScreen';
import SearchUsersScreen from '../screens/friends/SearchUsersScreen';
import TrackDetailSheet from '../components/ui/TrackDetailSheet';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<FriendsStackParamList>();

export default function FriendsNavigator() {
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
        <Stack.Screen name="FriendsHome" options={{ headerShown: false }}>
          {(props) => <FriendsScreen {...props} onSelectBroadcaster={handleSelect} />}
        </Stack.Screen>
        <Stack.Screen
          name="SearchUsers"
          component={SearchUsersScreen}
          options={{ title: 'Find Friends' }}
        />
      </Stack.Navigator>

      <TrackDetailSheet
        broadcaster={selected}
        onClose={handleClose}
        sheetRef={sheetRef}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
});
