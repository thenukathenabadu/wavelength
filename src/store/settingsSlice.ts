import { create } from 'zustand';

// Radius options in km
export const RADIUS_OPTIONS = [
  { label: '100m', value: 0.1,  desc: 'Immediate surroundings' },
  { label: '250m', value: 0.25, desc: 'City block' },
  { label: '500m', value: 0.5,  desc: 'Neighbourhood' },
  { label: '1km',  value: 1.0,  desc: 'Wide area' },
] as const;

interface SettingsState {
  radiusKm:     number;   // 0.1 | 0.25 | 0.5 | 1.0
  bleEnabled:   boolean;
  gpsEnabled:   boolean;
  wifiEnabled:  boolean;
  showDistance: boolean;

  setRadiusKm:     (v: number) => void;
  setBleEnabled:   (v: boolean) => void;
  setGpsEnabled:   (v: boolean) => void;
  setWifiEnabled:  (v: boolean) => void;
  setShowDistance: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  radiusKm:     0.25,
  bleEnabled:   true,
  gpsEnabled:   true,
  wifiEnabled:  true,
  showDistance: true,

  setRadiusKm:     (radiusKm)     => set({ radiusKm }),
  setBleEnabled:   (bleEnabled)   => set({ bleEnabled }),
  setGpsEnabled:   (gpsEnabled)   => set({ gpsEnabled }),
  setWifiEnabled:  (wifiEnabled)  => set({ wifiEnabled }),
  setShowDistance: (showDistance) => set({ showDistance }),
}));
