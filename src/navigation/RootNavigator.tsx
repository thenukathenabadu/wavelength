import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { subscribeToAuthState } from '../services/firebase/authService';
import { useAuthStore, useAuthLoading, useIsAuthenticated } from '../store/authSlice';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import { colors } from '../theme';

export default function RootNavigator() {
  const setUser = useAuthStore((s) => s.setUser);
  const loading = useAuthLoading();
  const isAuthenticated = useIsAuthenticated();

  useEffect(() => {
    // Subscribe to Firebase auth state — fires immediately with the current user
    const unsubscribe = subscribeToAuthState((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, [setUser]);

  // Splash-style loading state while Firebase resolves the session
  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.brand.default} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
