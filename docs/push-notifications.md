# Push notifications setup

MiPadel uses **@react-native-firebase/messaging** for push. In-app inbox behaviour is unchanged; push duplicates the alert on the device lock screen / notification tray.

## One-time setup

1. **Firebase project** — [Firebase console](https://console.firebase.google.com/) → Add project (or use existing).
2. **iOS** — Download `GoogleService-Info.plist` from Firebase → save as `ios/PadelMeApp/GoogleService-Info.plist` (this file is **gitignored**; copy from `GoogleService-Info.plist.example` layout if needed).
3. **Android** — Download `google-services.json` → `android/app/google-services.json` (**gitignored**; see `google-services.json.example`).

Do **not** commit Firebase plist/json or files in `assets-to-copy-from/` — they contain API keys.
4. **APNs** — Firebase → Project settings → Cloud Messaging → Apple app → upload APNs key (.p8) from Apple Developer.
5. **Xcode** — Target → Signing & Capabilities → **+ Push Notifications** (entitlements already include `aps-environment`).
6. **Backend** — Set `FIREBASE_SERVICE_ACCOUNT_JSON` on the API (see `Backend/docs/PUSH_NOTIFICATIONS.md`).

## Install native deps

```bash
cd PadelMeApp
npm install
cd ios && pod install && cd ..
npx react-native run-ios   # or run-android
```

## Behaviour

- After login, the app requests notification permission and registers the FCM token.
- Tapping a push opens the same screen as tapping the row in **Notifications** and marks it read.
- Logout unregisters the device token.

## Troubleshooting

| Issue | Check |
|-------|--------|
| No push on device | `FIREBASE_SERVICE_ACCOUNT_JSON` on backend; token in `PushDevice` table |
| iOS simulator | Push does not work on simulator; use a physical device |
| OAuth plist only | Replace with full Firebase `GoogleService-Info.plist` |
| Release build | Entitlements `aps-environment` → `production` |
