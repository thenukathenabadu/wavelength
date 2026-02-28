import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { subscribeToAuthState } from '../services/firebase/authService';
import { useAuthStore, useAuthLoading, useIsAuthenticated } from '../store/authSlice';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import { colors } from '../theme';
import type { MainTabParamList } from '../types';

function parseFriendUsername(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'wavelength:' && parsed.hostname === 'add') {
      const username = parsed.pathname.replace(/^\//, '');
      return username || null;
    }
  } catch {}
  return null;
}

export default function RootNavigator() {
  const setUser = useAuthStore((s) => s.setUser);
  const loading = useAuthLoading();
  const isAuthenticated = useIsAuthenticated();
  const navRef = useRef<NavigationContainerRef<MainTabParamList>>(null);
  const pendingUsername = useRef<string | null>(null);

  useEffect(() => {
    // Subscribe to Firebase auth state — fires immediately with the current user
    const unsubscribe = subscribeToAuthState((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, [setUser]);

  // Handle deep links: wavelength://add/{username}
  useEffect(() => {
    function navigate(username: string) {
      if (navRef.current?.isReady()) {
        navRef.current.navigate('Friends', undefined);
        // Small delay to let tab render before pushing SearchUsers
        setTimeout(() => {
          (navRef.current as unknown as { navigate: (name: string, params: unknown) => void })
            ?.navigate('SearchUsers', { prefillUsername: username });
        }, 300);
      } else {
        pendingUsername.current = username;
      }
    }

    // Cold start
    Linking.getInitialURL().then((url) => {
      if (url) {
        const u = parseFriendUsername(url);
        if (u) navigate(u);
      }
    });

    // Warm open
    const sub = Linking.addEventListener('url', ({ url }) => {
      const u = parseFriendUsername(url);
      if (u) navigate(u);
    });

    return () => sub.remove();
  }, []);

  // Splash-style loading state while Firebase resolves the session
  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.brand.default} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navRef}>
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
