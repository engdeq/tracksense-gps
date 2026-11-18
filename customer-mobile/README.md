# TrackSense Customer Mobile

Flutter customer app for TrackSense fleet tracking.

## API

- Android emulator: `http://10.0.2.2:4000/api`
- iOS simulator: `http://localhost:4000/api`

Seed login: `customer1` / `Customer@123`

Customer scope is enforced by the backend JWT — the app never sends `customerId` for authorization.

## Google Maps

1. Create a Maps SDK key (Android + iOS) in Google Cloud Console.
2. **Android**: add to `android/local.properties`:
   ```
   GOOGLE_MAPS_API_KEY=your_key_here
   ```
3. **iOS**: set `GMSApiKey` in `ios/Runner/Info.plist`.
4. Optional: run with `--dart-define=HAS_MAPS_KEY=false` to use the list fallback UI on Live Map / Playback without initializing Maps.

## Run

```bash
flutter pub get
flutter run
```

## Architecture

Feature-first layout under `lib/` with Riverpod, go_router, and Dio.