{
  "targets": [
    {
      "target_name": "overlay-utils",
      "sources": [ "overlay-utils.mm" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "CLANG_ENABLE_OBJC_ARC": "YES",
        "MACOSX_DEPLOYMENT_TARGET": "10.13",
        "OTHER_CFLAGS": [ "-ObjC++" ],
        "OTHER_CPLUSPLUSFLAGS": [ "-ObjC++", "-std=c++17" ]
      },
      "link_settings": {
        "libraries": [ "-framework Cocoa" ]
      }
    }
  ]
}
