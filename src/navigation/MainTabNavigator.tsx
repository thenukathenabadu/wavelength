import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../types';
import RadarNavigator from './RadarNavigator';
import BroadcastScreen from '../screens/broadcast/BroadcastScreen';
import GlobalScreen from '../screens/global/GlobalScreen';
import InsightsScreen from '../screens/insights/InsightsScreen';
import FriendsNavigator from './FriendsNavigator';
import ProfileNavigator from './ProfileNavigator';
import { colors, typography, spacing, radius } from '../theme';
import { useFriendDiscovery } from '../hooks/useFriendDiscovery';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabIconProps {
  focused: boolean;
  icon: string;
  label: string;
}

function TabIcon({ focused, icon, label }: TabIconProps) {
  return (
    <View style={styles.tabItem}>
      <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function MainTabNavigator() {
  useFriendDiscovery();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Radar"
        component={RadarNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="📡" label="Radar" />
          ),
        }}
      />
      <Tab.Screen
        name="Broadcasting"
        component={BroadcastScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="🎵" label="Cast" />
          ),
        }}
      />
      <Tab.Screen
        name="Global"
        component={GlobalScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="🌍" label="Global" />
          ),
        }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="👥" label="Friends" />
          ),
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="📊" label="Insights" />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="👤" label="Profile" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bg.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    height: 72,
    paddingBottom: 0,
    paddingTop: 0,
  },
  tabItem: {
    alignItems: 'center',
    gap: 3,
    paddingTop: 4,
  },
  iconWrap: {
    width: 44,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.brand.dim,
  },
  icon: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.text.muted,
  },
  tabLabelActive: {
    color: colors.brand.light,
    fontWeight: typography.weight.semibold,
  },
});
