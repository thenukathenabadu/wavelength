/**
 * mDNS / Zeroconf discovery — Phase 2
 *
 * Discovers devices on the same WiFi network broadcasting the _wavelength._tcp service.
 * Range: same network only. Covers: office, cafe on same router.
 * Cross-platform: YES (react-native-zeroconf handles iOS Bonjour + Android NSD).
 *
 * TODO (Phase 2, Week 9–10): Implement using react-native-zeroconf
 */

// import Zeroconf from 'react-native-zeroconf';
// const zeroconf = new Zeroconf();

export const MDNS_SERVICE_TYPE = '_wavelength._tcp.';
export const MDNS_SERVICE_DOMAIN = 'local.';

let running = false;

export function startMDNSDiscovery(_onFound: (host: string, port: number) => void): void {
  if (running) return;
  running = true;

  console.log('[mDNS] startMDNSDiscovery — stub (implement in Phase 2)');

  // TODO:
  // zeroconf.scan(MDNS_SERVICE_TYPE, MDNS_SERVICE_DOMAIN);
  // zeroconf.on('resolved', (service) => {
  //   if (service.addresses[0]) {
  //     _onFound(service.addresses[0], service.port);
  //   }
  // });
}

export function stopMDNSDiscovery(): void {
  running = false;
  // zeroconf.stop();
}

export function publishMDNSService(_port: number, _userId: string): void {
  console.log('[mDNS] publishMDNSService — stub');
  // zeroconf.publishService(MDNS_SERVICE_TYPE, MDNS_SERVICE_DOMAIN, 'Wavelength', _port, { userId: _userId });
}

export function unpublishMDNSService(): void {
  // zeroconf.unpublishService('Wavelength');
}
