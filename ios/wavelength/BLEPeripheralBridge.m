#import <React/RCTBridgeModule.h>

RCT_EXTERN_MODULE(BLEPeripheralBridge, NSObject)

RCT_EXTERN_METHOD(startAdvertising:(NSString *)trackJson)
RCT_EXTERN_METHOD(updateTrackData:(NSString *)trackJson)
RCT_EXTERN_METHOD(stopAdvertising)
