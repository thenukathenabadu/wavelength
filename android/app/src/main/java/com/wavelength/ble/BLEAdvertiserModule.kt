package com.wavelength.ble

import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.os.ParcelUuid
import com.facebook.react.bridge.*
import java.util.UUID

/**
 * BLEAdvertiserModule — Android BLE peripheral (advertise + GATT server).
 *
 * Advertisers broadcast the Wavelength service UUID so scanners can find them.
 * A GATT characteristic serves the full track JSON on read request.
 *
 * Broadcast packet stored in GATT characteristic:
 *   { userId, displayName, isAnonymous, trackName, artistName, albumName,
 *     albumArtUrl, totalDuration, sourceApp, deepLinkUri,
 *     startedAt, positionAtStart, isPlaying }
 */
class BLEAdvertiserModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "BLEAdvertiserModule"

    companion object {
        val SERVICE_UUID: UUID = UUID.fromString("A1B2C3D4-0001-0000-0000-000000000000")
        val TRACK_CHAR_UUID: UUID = UUID.fromString("A1B2C3D4-0002-0000-0000-000000000000")
    }

    private var advertiser: BluetoothLeAdvertiser? = null
    private var gattServer: BluetoothGattServer? = null
    private var trackCharacteristic: BluetoothGattCharacteristic? = null
    private var advertiseCallback: AdvertiseCallback? = null

    // ── Public API ────────────────────────────────────────────────────────────

    @ReactMethod
    fun startAdvertising(trackJson: String) {
        try {
            val btManager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE)
                as? BluetoothManager ?: return
            val adapter = btManager.adapter
            if (adapter == null || !adapter.isEnabled) return

            setupGattServer(btManager, trackJson)

            val adv = adapter.bluetoothLeAdvertiser ?: return
            advertiser = adv

            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setConnectable(true)
                .setTimeout(0)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
                .build()

            val data = AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .addServiceUuid(ParcelUuid(SERVICE_UUID))
                .build()

            val callback = object : AdvertiseCallback() {
                override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {}
                override fun onStartFailure(errorCode: Int) {}
            }
            advertiseCallback = callback
            adv.startAdvertising(settings, data, callback)

        } catch (e: Exception) {
            // Permission not granted or BLE unsupported — degrade silently
        }
    }

    @ReactMethod
    fun updateTrackData(trackJson: String) {
        trackCharacteristic?.setValue(trackJson.toByteArray(Charsets.UTF_8))
    }

    @ReactMethod
    fun stopAdvertising() {
        try { advertiseCallback?.let { advertiser?.stopAdvertising(it) } } catch (_: Exception) {}
        advertiser = null
        advertiseCallback = null
        try { gattServer?.close() } catch (_: Exception) {}
        gattServer = null
        trackCharacteristic = null
    }

    // ── GATT server ───────────────────────────────────────────────────────────

    private fun setupGattServer(manager: BluetoothManager, trackJson: String) {
        try { gattServer?.close() } catch (_: Exception) {}

        val characteristic = BluetoothGattCharacteristic(
            TRACK_CHAR_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ,
            BluetoothGattCharacteristic.PERMISSION_READ,
        )
        characteristic.setValue(trackJson.toByteArray(Charsets.UTF_8))
        trackCharacteristic = characteristic

        val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
        service.addCharacteristic(characteristic)

        val serverCallback = object : BluetoothGattServerCallback() {
            override fun onCharacteristicReadRequest(
                device: BluetoothDevice?,
                requestId: Int,
                offset: Int,
                characteristic: BluetoothGattCharacteristic?,
            ) {
                if (characteristic?.uuid != TRACK_CHAR_UUID) {
                    gattServer?.sendResponse(
                        device, requestId, BluetoothGatt.GATT_REQUEST_NOT_SUPPORTED, 0, null)
                    return
                }
                val full = trackCharacteristic?.value ?: byteArrayOf()
                val slice = if (offset < full.size) full.copyOfRange(offset, full.size) else byteArrayOf()
                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, slice)
            }

            override fun onConnectionStateChange(
                device: BluetoothDevice?, status: Int, newState: Int) {}
        }

        gattServer = manager.openGattServer(reactContext, serverCallback)
        gattServer?.addService(service)
    }

    // Required for RN module cleanup
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
