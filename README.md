# Wavelength

**Discover what the world is listening to — right now.**

Wavelength is a social listening app that lets you broadcast what you're playing and tune into what others around you (or around the globe) are listening to, across any music, podcast, or audiobook app.

---

## What It Does

Most music apps are private by default — you listen alone. Wavelength flips that. It turns your listening activity into a live social signal, letting you:

- **Broadcast** what you're currently playing to people nearby
- **Discover** what strangers on your bus, in your café, or across your office are listening to
- **Tap to open** any track directly in your own music app
- **Explore globally** — see what's playing across the world, grouped by track, artist, podcast, or platform

No social graph required. No follows, no friends list. Just raw, real-time listening data from the people around you.

---

## Core Features

### Proximity Discovery

Wavelength uses three stacked discovery layers so it works in any environment:

| Layer | Range | Works Best |
|---|---|---|
| **Bluetooth (BLE)** | ~30–50m | Bus, café, street, office |
| **Same-WiFi (mDNS)** | Local network | Office, café on shared router |
| **GPS + Cloud** | Configurable (100m–1km) | Outdoors, transit, anywhere with data |

All three sources merge into a single unified nearby feed, deduplicated by user. No pairing, no accounts needed for others to appear — just proximity.

### Live Playback Sync

When you see someone's track in the Radar, you see their actual playback position updating in real time. There's no server polling — Wavelength uses a sync packet (`positionAtStart` + `startedAt` timestamp) and calculates current position locally from the wall clock. Progress bars update every 500ms.

When someone seeks, pauses, or changes tracks, a new sync packet is broadcast and all nearby listeners update instantly.

### One-Tap Deep Linking

Tap any broadcaster's card → see full track info → tap **Open in Spotify** (or Apple Music, YouTube Music, Podcasts) → the track opens at the current position in your app. If the app isn't installed, it falls back to the web version.

### Anonymous Mode

You control your identity. Broadcast as yourself (display name visible) or go fully anonymous. Either way your track data is shared — just not who you are.

---

## Global Discovery & Stats

Beyond proximity, Wavelength aggregates listening data into a live global view — a real-time picture of what the world is listening to.

### What's Trending Right Now

See listening counts for any piece of content, updated live:

```
"The Joe Rogan Experience #2147"    ████████████  4,821 listeners
"Kendrick Lamar — Not Like Us"      ██████████    3,204 listeners
"Atomic Habits (Audiobook)"         ████          1,102 listeners
```

### Group & Filter By

| Dimension | Example |
|---|---|
| **Track / Episode** | "Bohemian Rhapsody" — 3,204 listening now |
| **Artist / Author / Host** | Queen — 8,500 listeners across all tracks |
| **Album / Podcast / Audiobook** | *The Dark Side of the Moon* — 2,100 listeners |
| **Channel / Show** | Lex Fridman Podcast — 6,800 listeners |
| **Content Type** | Music · Podcasts · Audiobooks · breakdown |
| **App / Platform** | Spotify 61% · Apple Music 22% · YouTube Music 12% · Other 5% |
| **Geography** | Heatmap — where in the world is this track being played |

### Platform Intelligence

Wavelength tracks which app each user is playing their content on — surfacing data that doesn't exist anywhere else:

- **Global app market share** by listening hours, not downloads
- **Regional app preferences** — does Spotify dominate in Europe but lose to YouTube Music in Southeast Asia?
- **Content-level platform loyalty** — do podcast listeners skew toward Apple Podcasts? Do hip-hop listeners prefer Spotify?
- **Cross-platform popularity** — which tracks are platform-agnostic hits vs. app-specific breakouts

This is ground truth data, measured at the moment of playback.

### Listening Maps

A global heatmap showing where any piece of content is being consumed right now. Zoom into a city to see neighborhood-level listening clusters. Zoom out to see continents light up when a track drops.

---

## Content Types

Wavelength is app-agnostic and content-agnostic. Anything that plays audio can be broadcast:

| Type | Examples | Deep Link Target |
|---|---|---|
| **Music** | Songs, albums, playlists | Spotify, Apple Music, YouTube Music |
| **Podcasts** | Episodes, shows | Apple Podcasts, Spotify, Pocket Casts |
| **Audiobooks** | Chapters, titles | Audible, Apple Books |
| **Radio / Livestreams** | Live radio, DJ sets | Platform-dependent |

---

## How Broadcasting Works

### Android

Wavelength reads your active media session via `MediaSessionManager` — this covers **any app** playing audio: Spotify, YouTube Music, Pocket Casts, Audible, browser tabs, everything. It requires a one-time **Notification Access** grant in system settings.

### iOS

- **Spotify** — via Spotify App Remote SDK (full metadata + seek position)
- **Apple Music** — via `MPMusicPlayerController` (full metadata)
- **Everything else** — best-effort via lock screen metadata (`MPNowPlayingInfoCenter`); falls back to a manual entry prompt for apps that don't expose metadata

### What Gets Broadcast

```
Track name · Artist / Host / Author · Album / Show / Book
Album art · Total duration · Current position · Is playing
Source app · Deep link URI
```

Nothing else. Wavelength does not access your library, history, playlists, or any other data.

---

## Privacy

- **You control broadcast.** The toggle is off by default. Nothing is shared until you turn it on.
- **Anonymous mode** hides your name. Your track is still shared; your identity isn't.
- **Proximity data is ephemeral.** BLE and mDNS data never touches a server — it lives only on nearby devices.
- **Cloud data has a TTL.** GPS-mode broadcasts expire after 5 minutes if not refreshed. There is no permanent listening history stored server-side.
- **No tracking between sessions.** Wavelength does not build a profile of your listening history.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo bare workflow (SDK 55, New Architecture) |
| Language | TypeScript |
| Navigation | React Navigation v7 |
| State | Zustand |
| Backend | Firebase Auth + Firestore |
| BLE | react-native-ble-plx v3 |
| Same-WiFi discovery | react-native-zeroconf |
| Maps | react-native-maps |
| Spotify integration | react-native-spotify-remote |
| UI / Sheets | @gorhom/bottom-sheet + react-native-reanimated |

---

## Project Structure

```
wavelength/
├── src/
│   ├── types/                     Core domain types
│   ├── store/
│   │   ├── nearbySlice.ts         Nearby broadcasters (all sources merged)
│   │   └── broadcastSlice.ts      Your own broadcast state
│   ├── modules/
│   │   ├── nowPlaying/            Platform media session bridge (Android + iOS)
│   │   ├── ble/                   Bluetooth discovery + advertising
│   │   ├── mdns/                  Same-WiFi discovery
│   │   └── deepLink/              Open tracks in music apps
│   ├── services/
│   │   ├── firebase/              Firestore geo-broadcast (GPS layer)
│   │   └── proximity/             Unified 3-layer discovery orchestrator
│   ├── navigation/                All navigators (Root, Auth, Tab, stacks)
│   ├── screens/
│   │   ├── auth/                  Welcome, Login, Register
│   │   ├── radar/                 Radar + NearbyList
│   │   ├── broadcast/             Broadcast control
│   │   └── profile/               Profile + Settings
│   ├── components/ui/
│   │   ├── BroadcasterCard.tsx    Track card with live progress
│   │   ├── ProgressBar.tsx        500ms live-updating progress bar
│   │   └── DeepLinkButton.tsx     Open in music app
│   └── utils/
│       ├── playbackMath.ts        Serverless position calculation
│       └── geohash.ts             Geohash encoder for geo-queries
└── android/app/src/main/java/com/wavelength/mediasession/   (Week 2–3)
    ios/Wavelength/NowPlayingBridge/                          (Week 3–4)
```

---

## Build Roadmap

### Phase 1 — MVP: BLE Proximity (Weeks 1–8)
- [x] Project setup: Expo bare, TypeScript, navigation, Zustand, GitHub
- [ ] Firebase Auth: email/password + Google OAuth
- [ ] Android MediaSession native module (any app, any content)
- [ ] iOS Now Playing native module (Apple Music + Spotify)
- [ ] BLE advertising + scanning + GATT full-data fetch
- [ ] Radar screen with live BroadcasterCards + progress bars
- [ ] Broadcast control screen (on/off, named/anonymous)
- [ ] Deep link to music app on tap

**MVP milestone:** Two phones discover each other via Bluetooth, see each other's track with a live seek bar, tap to open in their app.

### Phase 2 — GPS + WiFi + Global View (Weeks 9–14)
- [ ] Firestore geo-broadcast with geohash queries
- [ ] mDNS same-WiFi discovery
- [ ] Map view with broadcaster pins
- [ ] Global stats view: trending tracks, artists, podcasts
- [ ] Platform breakdown charts
- [ ] Listening heatmap

### Phase 3 — Intelligence & Polish (Weeks 15+)
- [ ] YouTube Music + Audible + Pocket Casts support
- [ ] Android BLE foreground service (background scanning)
- [ ] Push notifications ("3 people nearby are listening to X")
- [ ] Discovery history (local, no server)
- [ ] Content-type filters (music only, podcasts only)
- [ ] Regional trending charts
- [ ] Battery optimization (adaptive BLE scan intervals, GPS significant-change mode)

---

## Getting Started

### Prerequisites
- Node.js 20+
- Android Studio (for Android builds) or Xcode 15+ (for iOS builds, macOS only)
- Expo CLI: `npm install -g expo`
- Physical devices recommended — BLE doesn't run in emulators

### Install

```bash
git clone https://github.com/thenukathenabadu/wavelength.git
cd wavelength
npm install
```

### Run

```bash
# Android
npm run android

# iOS (macOS only)
npm run ios
```

### Environment Setup

Firebase config files are required (not committed to this repo):

- `android/app/google-services.json` — download from Firebase Console
- `ios/GoogleService-Info.plist` — download from Firebase Console

---

## License

MIT
