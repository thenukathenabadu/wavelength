import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { progressFraction } from '../../utils/playbackMath';
import type { PlaybackSyncPacket } from '../../types';

interface Props {
  sync: PlaybackSyncPacket;
  totalDuration: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
}

/**
 * Live progress bar — updates every 500ms by recalculating position from sync packet.
 * No server polling, purely local wall-clock math.
 */
export default function ProgressBar({
  sync,
  totalDuration,
  height = 3,
  trackColor = '#333',
  fillColor = '#6c47ff',
}: Props) {
  const [fraction, setFraction] = useState(() => progressFraction(sync, totalDuration));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setFraction(progressFraction(sync, totalDuration));

    if (sync.isPlaying) {
      timerRef.current = setInterval(() => {
        setFraction(progressFraction(sync, totalDuration));
      }, 500);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sync, totalDuration]);

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }]}>
      <View
        style={[
          styles.fill,
          { height, backgroundColor: fillColor, width: `${fraction * 100}%` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 99,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: 99,
  },
});
