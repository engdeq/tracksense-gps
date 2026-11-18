import 'package:shared_preferences/shared_preferences.dart';

import '../constants/storage_keys.dart';

class PrefsService {
  PrefsService(this._prefs);

  final SharedPreferences _prefs;

  bool get onboardingComplete =>
      _prefs.getBool(StorageKeys.onboardingComplete) ?? false;

  Future<void> setOnboardingComplete(bool value) =>
      _prefs.setBool(StorageKeys.onboardingComplete, value);

  String? get themeMode => _prefs.getString(StorageKeys.themeMode);

  Future<void> setThemeMode(String value) =>
      _prefs.setString(StorageKeys.themeMode, value);
}