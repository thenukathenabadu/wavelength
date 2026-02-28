/**
 * MDNSDiscovery — same-WiFi discovery via Zeroconf/mDNS — Phase 8.
 *
 * Publishes a _wavelength._tcp service when broadcasting.
 * Browses for other _wavelength._tcp services when discovery is active.
 *
 * Full broadcast JSON is chunked across TXT record keys (d0, d1, d2…)
 * to stay within the 255-byte per-entry DNS-SD limit.
 * Chunks are base64-encoded to handle arbitrary Unicode in track names.
 *
 * No HTTP server required — all data lives in TXT records.
 */

import Zeroconf from 'react-native-zeroconf';

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_TYPE     = 'wavelength';
const SERVICE_PROTOCOL = 'tcp';
const SERVICE_DOMAIN   = 'local.';
const SERVICE_PORT     = 5354; // arbitrary — we don't bind a real socket
const CHUNK_SIZE       = 150;  // chars of base64 per TXT key (d0, d1, …)

// ─── State ────────────────────────────────────────────────────────────────────

let zc: Zeroconf | null = null;
let currentServiceName: string | null = null;
let onFoundCallback: ((deviceId: string, packetJson: string) => void) | null = null;
let browsing = false;

function getZC(): Zeroconf {
  if (!zc) zc = new Zeroconf();
  return zc;
}

// ─── Publish ─────────────────────────────────────────────────────────────────

/**
 * Advertise on the local network. serviceName should be the user's ID
 * (or any stable unique string) so other devices can deduplicate.
 */
export function publishService(serviceName: string, trackJson: string): void {
  try {
    unpublishService(); // replace any existing service
    currentServiceName = serviceName;

    const b64 = encodeBase64(trackJson);
    const chunks: Record<string, string> = {};
    for (let i = 0; i * CHUNK_SIZE < b64.length; i++) {
      chunks[`d${i}`] = b64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    }

    getZC().publishService(
      SERVICE_TYPE,
      SERVICE_PROTOCOL,
      SERVICE_DOMAIN,
      serviceName,
      SERVICE_PORT,
      chunks,
    );
  } catch {
    // mDNS not supported / permission denied — non-fatal
  }
}

/** Update TXT records with fresh track JSON (re-publish). */
export function updateService(trackJson: string): void {
  if (currentServiceName) {
    publishService(currentServiceName, trackJson);
  }
}

export function unpublishService(): void {
  try {
    if (currentServiceName) {
      getZC().unpublishService(currentServiceName);
      currentServiceName = null;
    }
  } catch {}
}

// ─── Browse ──────────────────────────────────────────────────────────────────

export function startBrowsing(
  onFound: (deviceId: string, packetJson: string) => void,
): void {
  if (browsing) return;
  try {
    browsing = true;
    onFoundCallback = onFound;

    const z = getZC();
    z.scan(SERVICE_TYPE, SERVICE_PROTOCOL, SERVICE_DOMAIN);

    z.on('resolved', (service: ZeroconfService) => {
      try {
        const json = reassembleTxt(service.txt);
        if (json && onFoundCallback) {
          onFoundCallback(service.name, json);
        }
      } catch {
        // malformed TXT records — ignore
      }
    });
  } catch {
    browsing = false;
  }
}

export function stopBrowsing(): void {
  try {
    if (browsing) {
      getZC().stop();
      getZC().removeDeviceListeners();
    }
  } catch {}
  browsing = false;
  onFoundCallback = null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ZeroconfService {
  name: string;
  host?: string;
  port?: number;
  txt?: Record<string, string>;
  [key: string]: unknown;
}

/** Reassemble chunked base64 TXT records into the original JSON string. */
function reassembleTxt(txt: Record<string, string> | undefined): string | null {
  if (!txt) return null;

  const keys = Object.keys(txt)
    .filter((k) => /^d\d+$/.test(k))
    .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10));

  if (keys.length === 0) return null;

  const b64 = keys.map((k) => txt[k]).join('');
  return decodeBase64(b64);
}

/** Base64-encode a string, handling multi-byte Unicode safely. */
function encodeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const binStr = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binStr);
}

/** Decode a base64 string back to UTF-8. */
function decodeBase64(b64: string): string {
  const binStr = atob(b64);
  const bytes = Uint8Array.from(binStr, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
