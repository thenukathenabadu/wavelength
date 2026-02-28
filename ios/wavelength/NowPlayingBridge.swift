import Foundation
import MediaPlayer
import React

/**
 * NowPlayingBridge — reads the iOS system "now playing" info centre.
 *
 * MPNowPlayingInfoCenter.default().nowPlayingInfo is populated by any app that
 * registers for audio session and sets now-playing metadata (Spotify, Apple Music,
 * Podcasts, YouTube Music, etc.). It is the same data shown on the lock screen.
 *
 * Limitations:
 *   - Position is the value the source app last wrote — not real-time.
 *     We compensate in JS via startedAt / positionAtStart.
 *   - iOS does NOT allow reading album art from third-party apps via this API.
 *   - Background polling is unreliable; the JS side should call getCurrentTrack()
 *     when the app foregrounds.
 *
 * Emits "onNowPlayingChange" events to JS whenever the playing info changes.
 */
@objc(NowPlayingBridge)
class NowPlayingBridge: RCTEventEmitter {

  private var pollTimer: Timer?
  private var lastTrackName: String?
  private var lastIsPlaying: Bool?

  // MARK: - RCTEventEmitter

  override func supportedEvents() -> [String]! {
    ["onNowPlayingChange"]
  }

  override static func requiresMainQueueSetup() -> Bool { false }

  // MARK: - Public methods (exposed to JS)

  @objc func getCurrentTrack(_ resolve: RCTPromiseResolveBlock,
                             rejecter reject: RCTPromiseRejectBlock) {
    guard let info = MPNowPlayingInfoCenter.default().nowPlayingInfo,
          let trackName = info[MPMediaItemPropertyTitle] as? String else {
      resolve(nil)
      return
    }
    resolve(buildMap(info: info, trackName: trackName))
  }

  @objc func startListening() {
    guard pollTimer == nil else { return }
    // Emit current state immediately
    emitCurrentIfChanged()
    // Poll every 2 seconds — sufficient for track change detection
    DispatchQueue.main.async { [weak self] in
      self?.pollTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
        self?.emitCurrentIfChanged()
      }
    }
  }

  @objc func stopListening() {
    pollTimer?.invalidate()
    pollTimer = nil
    lastTrackName = nil
    lastIsPlaying = nil
  }

  // MARK: - Internal

  private func emitCurrentIfChanged() {
    guard let info = MPNowPlayingInfoCenter.default().nowPlayingInfo,
          let trackName = info[MPMediaItemPropertyTitle] as? String else {
      return
    }
    let rate = info[MPNowPlayingInfoPropertyPlaybackRate] as? Double ?? 0
    let isPlaying = rate > 0

    // Only emit if something changed
    if trackName == lastTrackName && isPlaying == lastIsPlaying { return }
    lastTrackName = trackName
    lastIsPlaying = isPlaying

    if let map = buildMap(info: info, trackName: trackName) {
      sendEvent(withName: "onNowPlayingChange", body: map)
    }
  }

  private func buildMap(info: [String: Any], trackName: String) -> [String: Any]? {
    let artist = info[MPMediaItemPropertyArtist] as? String
        ?? info[MPMediaItemPropertyAlbumArtist] as? String
        ?? ""
    let album  = info[MPMediaItemPropertyAlbumTitle] as? String
    let duration = info[MPMediaItemPropertyPlaybackDuration] as? Double ?? 0
    let position = info[MPNowPlayingInfoPropertyElapsedPlaybackTime] as? Double ?? 0
    let rate     = info[MPNowPlayingInfoPropertyPlaybackRate] as? Double ?? 0
    let isPlaying = rate > 0

    return [
      "trackName":       trackName,
      "artistName":      artist,
      "albumName":       album as Any,
      "albumArtUrl":     NSNull(),   // iOS prevents reading art from other apps
      "totalDuration":   duration,
      "currentPosition": position,
      "isPlaying":       isPlaying,
      "sourceApp":       resolveSourceApp(),
    ]
  }

  /// Best-effort detection of the active app from the queue player name.
  private func resolveSourceApp() -> String {
    let info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
    // The MPNowPlayingInfoPropertyExternalContentIdentifier sometimes contains
    // a Spotify track URI or Apple Music catalog ID.
    if let contentId = info["MPNowPlayingInfoPropertyExternalContentIdentifier"] as? String {
      if contentId.hasPrefix("spotify:") { return "spotify" }
      if contentId.contains("apple.com") || contentId.contains("music.apple") {
        return "apple_music"
      }
    }
    // Fallback — JS side normalises anyway
    return "unknown"
  }
}
