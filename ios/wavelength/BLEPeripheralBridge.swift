import Foundation
import CoreBluetooth
import React

/**
 * BLEPeripheralBridge — iOS BLE peripheral (advertise + GATT server).
 *
 * Advertises the Wavelength service UUID via CBPeripheralManager.
 * Serves the full track JSON from a readable GATT characteristic when a
 * central (scanner) connects and reads it.
 */
@objc(BLEPeripheralBridge)
class BLEPeripheralBridge: NSObject, CBPeripheralManagerDelegate {

  static let serviceUUID  = CBUUID(string: "A1B2C3D4-0001-0000-0000-000000000000")
  static let trackCharUUID = CBUUID(string: "A1B2C3D4-0002-0000-0000-000000000000")

  private var peripheralManager: CBPeripheralManager?
  private var trackCharacteristic: CBMutableCharacteristic?
  private var pendingTrackJson: String?

  // MARK: - Public API

  @objc func startAdvertising(_ trackJson: String) {
    pendingTrackJson = trackJson
    if peripheralManager == nil {
      peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
    } else if peripheralManager?.state == .poweredOn {
      setupAndAdvertise(trackJson)
    }
  }

  @objc func updateTrackData(_ trackJson: String) {
    pendingTrackJson = trackJson
    if let char = trackCharacteristic {
      char.value = trackJson.data(using: .utf8)
    }
  }

  @objc func stopAdvertising() {
    peripheralManager?.stopAdvertising()
    peripheralManager?.removeAllServices()
    trackCharacteristic = nil
  }

  // MARK: - CBPeripheralManagerDelegate

  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    if peripheral.state == .poweredOn, let json = pendingTrackJson {
      setupAndAdvertise(json)
    }
  }

  func peripheralManager(_ peripheral: CBPeripheralManager,
                         didReceiveRead request: CBATTRequest) {
    guard request.characteristic.uuid == BLEPeripheralBridge.trackCharUUID,
          let data = trackCharacteristic?.value else {
      peripheral.respond(to: request, withResult: .attributeNotFound)
      return
    }
    // Honour the offset (required for long reads)
    if request.offset > data.count {
      peripheral.respond(to: request, withResult: .invalidOffset)
      return
    }
    request.value = data.subdata(in: request.offset ..< data.count)
    peripheral.respond(to: request, withResult: .success)
  }

  // MARK: - Private

  private func setupAndAdvertise(_ trackJson: String) {
    let char = CBMutableCharacteristic(
      type: BLEPeripheralBridge.trackCharUUID,
      properties: .read,
      value: nil,           // nil = dynamic value (read requests come to delegate)
      permissions: .readable
    )
    char.value = trackJson.data(using: .utf8)
    trackCharacteristic = char

    let service = CBMutableService(type: BLEPeripheralBridge.serviceUUID, primary: true)
    service.characteristics = [char]

    peripheralManager?.removeAllServices()
    peripheralManager?.add(service)

    let adData: [String: Any] = [
      CBAdvertisementDataServiceUUIDsKey: [BLEPeripheralBridge.serviceUUID],
      CBAdvertisementDataLocalNameKey: "Wavelength",
    ]
    peripheralManager?.startAdvertising(adData)
  }
}
