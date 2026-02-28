// ─── Core domain types ───────────────────────────────────────────────────────

export interface NowPlayingTrack {
  trackName: string;
  artistName: string;
  albumName?: string;
  albumArtUrl?: string;
  totalDuration: number; // seconds
  sourceApp: 'spotify' | 'apple_music' | 'youtube_music' | 'podcasts' | 'unknown';
  deepLinkUri?: string; // e.g. "spotify:track:4iV5W9uYEdYUVa79Axb7Rh"
  spotifyTrackId?: string;
}

export interface PlaybackSyncPacket {
  startedAt: number;      // Unix ms — when the current position was snapshotted
  positionAtStart: number; // seconds — track position at startedAt
  isPlaying: boolean;
}

export interface Broadcaster {
  id: string;
  displayName: string;
  isAnonymous: boolean;
  track: NowPlayingTrack;
  sync: PlaybackSyncPacket;
  source: 'ble' | 'mdns' | 'gps';
  distanceMeters?: number;
  lat?: number; // only populated for GPS-sourced broadcasters
  lon?: number;
  lastSeen: number; // Unix ms
}

// ─── Social types ─────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
}

export interface Friend {
  friendUid: string;
  displayName: string;
  username: string;
  addedAt: number; // Unix ms
}

export interface FriendRequest {
  fromUid: string;
  fromDisplayName: string;
  fromUsername: string;
  createdAt: number; // Unix ms
}

// ─── Navigation param lists ───────────────────────────────────────────────────

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Radar: undefined;
  Broadcasting: undefined;
  Global: undefined;
  Friends: undefined;
  Insights: undefined;
  Profile: undefined;
};

export type RadarStackParamList = {
  RadarScreen: undefined;
  NearbyList: undefined;
};

export type ProfileStackParamList = {
  ProfileScreen: undefined;
  Settings: undefined;
  PrivacyPolicy: undefined;
};

export type FriendsStackParamList = {
  FriendsHome: undefined;
  SearchUsers: { prefillUsername?: string };
};
