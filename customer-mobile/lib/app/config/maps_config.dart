/// Google Maps API key wiring.
///
/// Android: add to `android/local.properties`:
/// `GOOGLE_MAPS_API_KEY=your_key`
///
/// iOS: add `GMSApiKey` to `ios/Runner/Info.plist`.
///
/// The manifest reads the Android key via manifest placeholders (see AndroidManifest.xml).
abstract final class MapsConfig {
  /// Set to true once a platform Maps key is configured and maps initialize successfully.
  /// Pass `--dart-define=HAS_MAPS_KEY=false` to force list fallback UI without initializing Maps.
  static const hasApiKey = bool.fromEnvironment('HAS_MAPS_KEY', defaultValue: true);
}