#include <napi.h>
#import <Cocoa/Cocoa.h>

// setOverlayBehavior(windowHandle)
// windowHandle: NSView* pointer as integer (BigInt/Number) or Buffer holding the pointer.
// Gets NSWindow via [view window], then sets:
//   NSWindowCollectionBehaviorCanJoinAllSpaces (1 << 0 = 1) |
//   NSWindowCollectionBehaviorFullScreenAuxiliary (1 << 8 = 256) |
//   NSWindowCollectionBehaviorStationary (1 << 4 = 16) = 273
// (recipe proven by v1.0.0: visible over ANY fullscreen app + screenshots).
// Level is just above screen-saver level; the window never hides on deactivate.
Napi::Value SetOverlayBehavior(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "setOverlayBehavior requires 1 argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  void* ptr = nullptr;

  if (info[0].IsBuffer()) {
    // Electron's getNativeWindowHandle() returns a Buffer containing the pointer.
    // Passing the Buffer straight through avoids BigInt precision issues.
    Napi::Buffer<uint8_t> buf = info[0].As<Napi::Buffer<uint8_t>>();
    if (buf.Length() >= 8) {
      uint64_t v = 0;
      memcpy(&v, buf.Data(), sizeof(v));
      ptr = reinterpret_cast<void*>(static_cast<uintptr_t>(v));
    } else if (buf.Length() >= 4) {
      uint32_t v = 0;
      memcpy(&v, buf.Data(), sizeof(v));
      ptr = reinterpret_cast<void*>(static_cast<uintptr_t>(v));
    }
  } else if (info[0].IsBigInt()) {
    bool lossless = false;
    uint64_t v = info[0].As<Napi::BigInt>().Uint64Value(&lossless);
    (void)lossless;
    ptr = reinterpret_cast<void*>(static_cast<uintptr_t>(v));
  } else if (info[0].IsNumber()) {
    uint64_t v = static_cast<uint64_t>(info[0].As<Napi::Number>().Int64Value());
    ptr = reinterpret_cast<void*>(static_cast<uintptr_t>(v));
  } else {
    Napi::TypeError::New(env, "windowHandle must be a Buffer, BigInt, or Number").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (ptr == nullptr) {
    Napi::Error::New(env, "null window handle").ThrowAsJavaScriptException();
    return env.Null();
  }

  @autoreleasepool {
    NSView* view = (__bridge NSView*)(void*)ptr;
    if (view == nil) {
      Napi::Error::New(env, "null NSView").ThrowAsJavaScriptException();
      return env.Null();
    }
    NSWindow* win = [view window];
    if (win == nil) {
      Napi::Error::New(env, "NSView has no window").ThrowAsJavaScriptException();
      return env.Null();
    }

    // Exact assignment (not read-modify-write): the value 273 contains
    // CanJoinAllSpaces (1) but NOT MoveToActiveSpace (2), so this can never
    // produce the 1|2 combination that throws NSInternalInconsistencyException
    // in -[NSWindow _validateCollectionBehavior:]. Any ambient bits Electron
    // may have set are intentionally cleared — the JS side always calls this
    // addon LAST (see ensureOverlayOnTop in main.js).
    win.collectionBehavior = NSWindowCollectionBehaviorCanJoinAllSpaces
                           | NSWindowCollectionBehaviorFullScreenAuxiliary
                           | NSWindowCollectionBehaviorStationary;
    // = 273
    // kCGScreenSaverWindowLevel = 1000, use a value just above it
    [win setLevel:NSScreenSaverWindowLevel + 1];
    [win setHidesOnDeactivate:NO];
    [win setCanHide:NO];
  }

  return env.Undefined();
}

// getOverlayInfo(windowHandle) -> { behavior, level, hidesOnDeactivate, canHide }
// Read-only diagnostic: reports the NSWindow state without modifying it.
// Accepts the same handle forms as setOverlayBehavior.
Napi::Value GetOverlayInfo(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "getOverlayInfo requires 1 argument").ThrowAsJavaScriptException();
    return env.Null();
  }

  void* ptr = nullptr;

  if (info[0].IsBuffer()) {
    Napi::Buffer<uint8_t> buf = info[0].As<Napi::Buffer<uint8_t>>();
    if (buf.Length() >= 8) {
      uint64_t v = 0;
      memcpy(&v, buf.Data(), sizeof(v));
      ptr = reinterpret_cast<void*>(static_cast<uintptr_t>(v));
    } else if (buf.Length() >= 4) {
      uint32_t v = 0;
      memcpy(&v, buf.Data(), sizeof(v));
      ptr = reinterpret_cast<void*>(static_cast<uintptr_t>(v));
    }
  } else if (info[0].IsBigInt()) {
    bool lossless = false;
    uint64_t v = info[0].As<Napi::BigInt>().Uint64Value(&lossless);
    (void)lossless;
    ptr = reinterpret_cast<void*>(static_cast<uintptr_t>(v));
  } else if (info[0].IsNumber()) {
    uint64_t v = static_cast<uint64_t>(info[0].As<Napi::Number>().Int64Value());
    ptr = reinterpret_cast<void*>(static_cast<uintptr_t>(v));
  } else {
    Napi::TypeError::New(env, "windowHandle must be a Buffer, BigInt, or Number").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (ptr == nullptr) {
    Napi::Error::New(env, "null window handle").ThrowAsJavaScriptException();
    return env.Null();
  }

  @autoreleasepool {
    NSView* view = (__bridge NSView*)(void*)ptr;
    if (view == nil) {
      Napi::Error::New(env, "null NSView").ThrowAsJavaScriptException();
      return env.Null();
    }
    NSWindow* win = [view window];
    if (win == nil) {
      Napi::Error::New(env, "NSView has no window").ThrowAsJavaScriptException();
      return env.Null();
    }

    Napi::Object out = Napi::Object::New(env);
    out.Set("behavior", Napi::Number::New(env, (double)win.collectionBehavior));
    out.Set("level", Napi::Number::New(env, (double)[win level]));
    out.Set("hidesOnDeactivate", Napi::Boolean::New(env, [win hidesOnDeactivate]));
    out.Set("canHide", Napi::Boolean::New(env, [win canHide]));
    return out;
  }
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("setOverlayBehavior",
              Napi::Function::New(env, SetOverlayBehavior));
  exports.Set("getOverlayInfo",
              Napi::Function::New(env, GetOverlayInfo));
  return exports;
}

NODE_API_MODULE(overlay_utils, Init)
