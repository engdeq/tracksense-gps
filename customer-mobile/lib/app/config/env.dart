import 'dart:io';

import 'package:flutter/foundation.dart';

/// API base URL for emulators / simulators.
class AppEnv {
  AppEnv._();

  static String get apiBaseUrl {
    if (kIsWeb) return 'http://localhost:4000/api';
    if (Platform.isAndroid) return 'http://10.0.2.2:4000/api';
    return 'http://localhost:4000/api';
  }

  static const appName = 'TrackSense';
}