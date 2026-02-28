#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// Exposes the Swift NowPlayingBridge class to React Native.
RCT_EXTERN_MODULE(NowPlayingBridge, RCTEventEmitter)

RCT_EXTERN_METHOD(getCurrentTrack:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(startListening)
RCT_EXTERN_METHOD(stopListening)
