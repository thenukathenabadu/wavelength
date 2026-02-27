import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';

/**
 * RootNavigator — switches between Auth and Main stacks based on auth state.
 *
 * TODO (Week 1–2): Replace the hardcoded `isAuthenticated` with a Firebase
 * onAuthStateChanged listener from the auth service module.
 */
export default function RootNavigator() {
  // Placeholder auth state — will be replaced by Firebase listener
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // TODO (Week 1–2): wire up Firebase Auth
    // const unsubscribe = onAuthStateChanged(auth, (user) => {
    //   setIsAuthenticated(!!user);
    // });
    // return unsubscribe;
  }, []);

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
