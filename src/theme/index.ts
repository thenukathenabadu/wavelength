// ─── Wavelength Design System ─────────────────────────────────────────────────
// Single source of truth for all visual tokens.
// Import from here — never hardcode values in component files.

// ─── Colors ───────────────────────────────────────────────────────────────────

export const colors = {
  // Backgrounds — layered dark surfaces
  bg: {
    primary: '#080808',      // screen background
    secondary: '#111111',    // tab bar, sheet backgrounds
    card: '#161616',         // cards
    cardElevated: '#1E1E1E', // pressed / elevated cards
    overlay: 'rgba(0,0,0,0.7)',
    input: '#141414',
  },

  // Brand — violet purple
  brand: {
    default: '#7C3AED',
    light: '#9F6FF4',
    lighter: '#C4B5FD',
    dim: 'rgba(124, 58, 237, 0.18)',
    muted: 'rgba(124, 58, 237, 0.08)',
    glow: 'rgba(124, 58, 237, 0.35)',
  },

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0A0',
    muted: '#5C5C5C',
    inverse: '#080808',
    brand: '#9F6FF4',
  },

  // Borders
  border: {
    default: '#242424',
    subtle: '#1A1A1A',
    strong: '#333333',
    brand: 'rgba(124, 58, 237, 0.45)',
  },

  // Status
  status: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    live: '#EF4444', // pulsing red dot for "now playing"
  },

  // Discovery source badges
  source: {
    ble: '#60A5FA',   // blue — Bluetooth
    mdns: '#34D399',  // green — WiFi
    gps: '#FB923C',   // orange — GPS / Cloud
  },

  // Music app accent colors
  app: {
    spotify: '#1DB954',
    apple_music: '#FA3552',
    youtube_music: '#FF0033',
    podcasts: '#9333EA',
    audible: '#FF9900',
    unknown: '#6B7280',
  },
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────

export const typography = {
  // Font sizes
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 42,
  },

  // Font weights (React Native uses string literals)
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
  },

  // Line heights
  leading: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
  },

  // Letter spacing
  tracking: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    widest: 1.5,
  },
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────
// 4pt grid

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 999,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  brand: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ─── Animation durations ──────────────────────────────────────────────────────

export const duration = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

// ─── Convenience re-export ────────────────────────────────────────────────────

const theme = { colors, typography, spacing, radius, shadows, duration } as const;
export default theme;
