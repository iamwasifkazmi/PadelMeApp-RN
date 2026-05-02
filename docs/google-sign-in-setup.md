# Google Sign-In (MiPadel)

End-to-end flow: the app obtains a Google **ID token** with `@react-native-google-signin/google-signin`, sends it to `POST /api/auth/google`, and the backend verifies it with `google-auth-library` before issuing your normal JWT.

## 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Configure the **OAuth consent screen** (External is fine for testing; add test users if in Testing).
3. Create OAuth client IDs:
   - **Web application** — copy the client ID. This is your primary `GOOGLE_WEB_CLIENT_ID` in the app and must be listed on the backend.
   - **iOS** — bundle ID must match your Xcode app (e.g. `com.yourcompany.PadelMeApp`).
   - **Android** — package name + SHA-1 (debug and release keystores as needed).

## 2. App (`PadelMeApp`)

1. Edit `src/config/googleSignIn.ts`:
   - Set `GOOGLE_WEB_CLIENT_ID` to the **Web** client ID (required for `idToken` on Android and for verification).
   - Optionally set `GOOGLE_IOS_CLIENT_ID` to the **iOS** OAuth client ID if you are not using `GoogleService-Info.plist`.

2. **iOS — URL scheme**  
   In Xcode → Target → **Info** → **URL Types**, add a URL scheme equal to the **reversed iOS client ID** from Google (format `com.googleusercontent.apps.NUMBER-XXXX`).  
   Alternatively add the `GoogleService-Info.plist` from Firebase / Google and use the `REVERSED_CLIENT_ID` value there (same string).

3. Reinstall pods after dependency changes: `cd ios && pod install`.

4. **Android**  
   Use the same package name and signing SHA-1 as registered in the Google Cloud **Android** OAuth client.

## 3. Backend

Set one of these in `.env` (comma-separated list is recommended so tokens minted for Web, iOS, or Android clients all verify):

```bash
# Preferred: all client IDs that may appear as `aud` on the ID token
GOOGLE_OAUTH_CLIENT_IDS="WEB_CLIENT_ID.apps.googleusercontent.com,IOS_CLIENT_ID.apps.googleusercontent.com,ANDROID_CLIENT_ID.apps.googleusercontent.com"

# Or a single ID (e.g. only the Web client)
GOOGLE_WEB_CLIENT_ID="WEB_CLIENT_ID.apps.googleusercontent.com"
```

Restart the API after changing env.

## 4. Smoke test

- With backend running and env set, open Login → **Continue with Google** → pick an account → you should land in the app with a session.
- If the server returns `503`, `GOOGLE_OAUTH_CLIENT_IDS` / `GOOGLE_WEB_CLIENT_ID` is missing.
- If verification fails with `401`, the token’s `aud` is not in your backend allowlist (add the matching client ID).
