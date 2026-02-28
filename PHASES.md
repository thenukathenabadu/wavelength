# Wavelength — Phased Delivery Plan

Each phase ends with a working, reviewable build. Features are documented as they're built.
Push to GitHub at the end of every feature with a descriptive commit.

---

## Phase 0 — Foundation ✅ COMPLETE
*Expo bare, TypeScript, navigation skeleton, Zustand store stubs, GitHub repo*

---

## Phase 1 — UI Shell ✅ COMPLETE
*Goal: tap through the entire app. No real data. Everything uses static mocks.*

| Feature | Description |
|---|---|
| 1.1 Design System | Theme constants — colors, typography, spacing, shadows |
| 1.2 Welcome / Onboarding | Polished landing screen, value prop copy |
| 1.3 Auth Screens | Login + Register layouts (forms, no Firebase yet) |
| 1.4 Radar Screen | List of mock BroadcasterCards with live fake progress bars |
| 1.5 Track Detail Sheet | Bottom sheet — full track info, DeepLink button |
| 1.6 Broadcast Screen | ON/OFF toggle, named/anonymous switch, mock current track |
| 1.7 Profile Screen | User info card, sign out button |
| 1.8 Settings Screen | Radius slider, discovery mode toggles |

**Deliverable:** Full visual walkthrough. Asiri reviews UX/design before any backend work.

---

## Phase 2 — Authentication
*Goal: real users, real sessions.*

| Feature | Description |
|---|---|
| 2.1 Firebase Project | Create Firebase project, download config files |
| 2.2 Email/Password Auth | signIn + createUser, error handling, session persistence |
| 2.3 Google OAuth | One-tap Google sign-in |
| 2.4 Auth Guard | RootNavigator switches on onAuthStateChanged |
| 2.5 User Profile | Write user doc to Firestore /users/{uid} on register |

**Deliverable:** Sign up, sign in, sign out works. Session persists on app restart.

---

## Phase 3 — Now Playing: Android ✅ COMPLETE
*Goal: read any app's playback on Android automatically.*

| Feature | Description |
|---|---|
| 3.1 MediaSession Native Module | Kotlin module — MediaSessionManager.getActiveSessions() |
| 3.2 Notification Access Onboarding | Prompt + direct Settings deep link, graceful fallback |
| 3.3 JS Bridge Wiring | NowPlayingModule.ts connected to Kotlin module |
| 3.4 Live Broadcast Screen | BroadcastScreen shows real current track from any app |
| 3.5 Deep Link Builder | Construct deepLinkUri from MediaSession metadata |

**Deliverable:** Android user plays Spotify / YouTube Music / Podcasts → Wavelength detects it automatically → BroadcastScreen shows correct track.

---

## Phase 4 — Now Playing: iOS ✅ COMPLETE
*Goal: read Apple Music and Spotify on iOS.*

| Feature | Description |
|---|---|
| 4.1 Apple Music Bridge | Swift module — MPMusicPlayerController + notification observers |
| 4.2 Spotify Remote SDK | react-native-spotify-remote integration |
| 4.3 Fallback: Lock Screen | MPNowPlayingInfoCenter for other apps (best-effort) |
| 4.4 Manual Entry Fallback | Prompt user to enter track if auto-detect fails |

**Deliverable:** iOS user playing Apple Music or Spotify → detected automatically. Other apps → graceful fallback.

---

## Phase 5 — BLE Discovery ✅ COMPLETE
*Goal: two phones see each other over Bluetooth without pairing.*

| Feature | Description |
|---|---|
| 5.1 BLE Setup | react-native-ble-plx install, permissions, manager init |
| 5.2 Advertising | Broadcast custom service UUID + manufacturer data packet |
| 5.3 Scanning | Scan for service UUID, parse manufacturer data preview |
| 5.4 GATT Full Data | On tap: connect → read full track JSON → disconnect |
| 5.5 Nearby Store Wiring | BLE results feed into nearbySlice |
| 5.6 Stale Eviction | Remove broadcasters not seen for 30s |

**Deliverable:** Two physical devices (any platform combo) detect each other via BLE and see each other's track + live progress.

---

## Phase 6 — Live Radar (MVP Complete) ✅ COMPLETE
*Goal: full end-to-end loop — discover, view, open in app.*

| Feature | Description |
|---|---|
| 6.1 Radar with Real Data | BroadcasterCards fed from live nearbySlice |
| 6.2 Track Detail Sheet | Bottom sheet with full info + DeepLink button |
| 6.3 Deep Link → Music App | Opens correct track in Spotify / Apple Music / YouTube Music |
| 6.4 Broadcast Toggle | ON → start advertising + detecting. OFF → stop, disappear from others |
| 6.5 Anonymous Mode | Hides display name in BLE packet and detail sheet |

**Deliverable:** MVP. Two phones, different songs, see each other, live progress, tap to open. This is the core product working end-to-end.

---

## Phase 7 — GPS + Cloud Layer ✅ COMPLETE
*Goal: discovery that works outdoors, in background, across any distance.*

| Feature | Description |
|---|---|
| 7.1 Firebase Geo-Broadcast | Write /broadcasts/{uid} with geohash + TTL |
| 7.2 Nearby Query | Subscribe to Firestore geo-queries via geohash range |
| 7.3 Broadcast Heartbeat | Refresh TTL every 60s while broadcasting |
| 7.4 Radius Control | Settings slider (100m / 250m / 500m / 1km) wired to queries |
| 7.5 ProximityManager Full | BLE + GPS unified, same nearbySlice |
| 7.6 Location Permissions | react-native-permissions, onboarding prompt |

**Deliverable:** BLE off → still discover people via GPS within set radius. Walk out of range → card disappears.

---

## Phase 8 — WiFi / mDNS Layer ✅ COMPLETE
*Goal: fast same-network discovery (office, home, café on same router).*

| Feature | Description |
|---|---|
| 8.1 Zeroconf Setup | react-native-zeroconf installed, _wavelength._tcp service type |
| 8.2 Service Publishing | publishService() → chunked base64 TXT records, no HTTP server needed |
| 8.3 Service Discovery | startBrowsing() → on 'resolved' → reassemble TXT chunks → nearbySlice |
| 8.4 ProximityManager Wired | BLE + mDNS + GPS all feeding nearbySlice via mdnsParseToBroadcaster |

**Deliverable:** All 3 discovery layers working. Best source wins per-device.

---

## Phase 9 — Global Stats ✅ COMPLETE
*Goal: see what the world is listening to right now.*

| Feature | Description |
|---|---|
| 9.1 Firestore Aggregation | Client-side onSnapshot of /broadcasts — TTL-filtered + aggregated |
| 9.2 Global Screen | New "Global" tab with live listener count hero stat |
| 9.3 Group By Track | Top 10 tracks by live listener count with rank + count badge |
| 9.4 Platform Breakdown | Spotify / Apple Music / YouTube Music / Other — count + % split |

**Deliverable:** Global view tab showing live listening counts grouped by track and platform. Updates in real time via Firestore onSnapshot.

---

## Phase 10 — Maps & Heatmap ✅ COMPLETE
*Goal: see where in the world content is being consumed.*

| Feature | Description |
|---|---|
| 10.1 Radar Map View | react-native-maps + react-native-map-clustering, list/map toggle in Radar header |
| 10.2 Broadcaster Pins | Custom coloured pins for GPS broadcasters; callout preview → tap → TrackDetailSheet |
| 10.3 Global Heatmap | Heatmap overlay on GlobalScreen (Android/Google Maps); iOS placeholder until API key added |
| 10.4 City Drill-Down | react-native-map-clustering auto-clusters pins; tap cluster expands to neighbourhood level |

**Notes:**
- Android needs a Google Maps API key in AndroidManifest `com.google.android.geo.API_KEY`
- iOS uses Apple Maps (PROVIDER_DEFAULT) for Radar pins — works without a key
- Heatmap requires Google Maps on iOS — add API key and switch provider to unlock

**Deliverable:** Radar has List/Map toggle with clustered GPS broadcaster pins. Global screen has a live heatmap of all active broadcasts worldwide.

---

## Phase 11 — Platform Intelligence
*Goal: data insights that don't exist anywhere else.*

| Feature | Description |
|---|---|
| 11.1 App Market Share | Which apps are people actually using to listen, by region |
| 11.2 Content-Platform Affinity | Does hip-hop skew Spotify? Do podcasts skew Apple? |
| 11.3 Cross-Platform Hits | Tracks that are platform-agnostic vs. app-specific breakouts |
| 11.4 Regional Trends | What's trending in Tokyo vs. London vs. São Paulo |
| 11.5 Historical Snapshots | How a track's listener count changed over its release week |

**Deliverable:** Intelligence layer — stats and insights no platform publishes publicly.

---

## Phase 13 — Social / Friends
*Goal: find friends globally and see what they're listening to in real-time.*

| Feature | Description |
|---|---|
| 13.1 Username System | Unique @username, /usernames/{username} lookup, enforced via Firestore transaction on register |
| 13.2 Auth + Register | signUp() accepts username; RegisterScreen adds username field with validation |
| 13.3 friendsService.ts | All friend ops — search, send/accept/decline request, remove, live subscriptions |
| 13.4 Friends Tab | New Friends bottom tab with FriendsNavigator (mirrors RadarNavigator pattern) |
| 13.5 FriendsScreen | Three-tab hub: Listening Now / Friends / Requests |
| 13.6 SearchUsersScreen | Username prefix search + Add Friend / Sent / Friends state |
| 13.7 Friends Live Feed | Per-friend /broadcasts listeners; active friends show track card → TrackDetailSheet |
| 13.8 Stop Notification Action | Android notification "Stop Broadcasting" button via BroadcastReceiver + DeviceEventEmitter |
| 13.9 Invite via Share | Native Share API with wavelength://add/{username} deep link + RootNavigator handler |

**Deliverable:** Full social layer — find friends by @username, send/accept requests, see what friends are listening to globally in real-time, stop broadcasting from the notification, invite friends via any messaging app.

**Deferred (Phase 14):**
- Facebook / Instagram OAuth (requires App Review)
- Phone contacts matching (requires phone number field)
- Push notifications for friend requests (Phase 12)

---

## Phase 12 — Polish & Launch Prep
*Goal: production-ready, battery-efficient, store-ready.*

| Feature | Description |
|---|---|
| 12.1 BLE Foreground Service | Android background scanning without throttling |
| 12.2 Battery Optimization | Adaptive BLE scan intervals, GPS significant-change only |
| 12.3 Push Notifications | "3 people nearby are listening to X" via FCM |
| 12.4 Discovery History | Local AsyncStorage log of what you've discovered |
| 12.5 Offline Graceful | No internet → BLE/mDNS still work, cloud silently disabled |
| 12.6 App Store Prep | Icons, splash, privacy policy, store copy, screenshots |

**Deliverable:** Ready to ship to TestFlight / Play Store internal track.

---

## Current Status

| Phase | Status |
|---|---|
| Phase 0 — Foundation | ✅ Complete |
| Phase 1 — UI Shell | ✅ Complete |
| Phase 2 — Authentication | ✅ Complete |
| Phase 3 — Now Playing: Android | ✅ Complete |
| Phase 4 — Now Playing: iOS     | ✅ Complete |
| Phase 4 — Now Playing: iOS     | ✅ Complete |
| Phase 5 — BLE Discovery        | ✅ Complete |
| Phase 6 — Live Radar (MVP)     | ✅ Complete |
| Phase 7 — GPS + Cloud Layer    | ✅ Complete |
| Phase 8 — WiFi / mDNS Layer   | ✅ Complete |
| Phase 9 — Global Stats         | ✅ Complete |
| Phase 10 — Maps & Heatmap      | ✅ Complete |
| Phase 11 — Platform Intelligence | ✅ Complete |
| Phase 13 — Social / Friends      | ✅ Complete |
| Phase 12 — Polish & Launch Prep  | ✅ Complete |
