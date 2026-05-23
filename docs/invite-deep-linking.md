# Invite deep linking (MiPadel)

This app opens **Accept invite** from:

1. **Custom URL scheme:** `mipadel://invite/<token>` (works as soon as the app is installed). Legacy **`padelme://invite/<token>`** links are still parsed if users have old messages.
2. **HTTPS links:** `https://<your-domain>/invite/<token>` (needs server + platform setup for Universal Links / App Links).

Share messages from **Invite players** include both the **HTTPS** URL and the **custom scheme** link, plus the raw token.

---

## 1. Configure your domain (one place in code)

Production domain is **`PadelMeApp/src/config/domain.ts`** (`APP_ORIGIN` → `https://mipadel.co.uk`).  
`deepLinks.ts` re-exports that origin for invite URLs.

Use a **stable origin** (no trailing slash).

Keep the **same host** in:

- `android/app/src/main/AndroidManifest.xml` — `android:host` on the `https` / `http` intent-filters.
- `ios/PadelMeApp/PadelMeApp.entitlements` — each `applinks:` entry (e.g. `applinks:your-domain.com`).

---

## 2. Android (App Links)

### 2a. Manifest (already wired)

`MainActivity` declares `VIEW` intent-filters for:

- `mipadel` + host `invite`
- `https` and `http` with host **`mipadel.co.uk`** and `pathPrefix` **`/invite`**

When you change production host, update **`android:host`** for both `https` and `http` filters to match `INVITE_WEB_ORIGIN`.

### 2b. Verify the app (optional but recommended)

To avoid the system always asking “Open with Chrome or MiPadel?”:

1. Host **Digital Asset Links** at:

   `https://<your-host>/.well-known/assetlinks.json`

2. Include your app’s **signing certificate SHA-256** and **package name** (see [Android App Links](https://developer.android.com/training/app-links)).

3. Add **`android:autoVerify="true"`** on the `https` intent-filter **after** `assetlinks.json` is live and correct.

---

## 3. iOS (Universal Links)

### 3a. Associated Domains (already wired)

`ios/PadelMeApp/PadelMeApp.entitlements` lists:

`applinks:mipadel.co.uk`

Change this to **`applinks:<your-host>`** when you switch domains (no `https://` prefix in the entitlement string).

The Xcode target sets **`CODE_SIGN_ENTITLEMENTS`** to `PadelMeApp/PadelMeApp.entitlements`.

### 3b. Apple App Site Association file

1. Serve **AASA** at **either**:

   - `https://<your-host>/.well-known/apple-app-site-association`  
   - or `https://<your-host>/apple-app-site-association`

2. Use **HTTPS**, **`application/json`** (or correct `Content-Type`), **no** `.json` extension in the first URL path.

3. Include paths that match invites, e.g. `/invite/*`, and your **Team ID + bundle ID** (`com.mipadel` in this repo — confirm in Xcode).

See [Supporting associated domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains).

### 3c. Xcode checklist

- **Signing & Capabilities** → **Associated Domains** should show the same entries as the entitlements file.
- Enable the **Associated Domains** capability if Xcode did not pick it up automatically.

---

## 4. Server behaviour for HTTPS links

You have two common options:

### A. Smart App Banner / redirect (simplest)

- **`GET /invite/:token`** returns an HTML page with:
  - a **Universal Link** / App Link URL (same path the app claims), and  
  - a **“Open in app”** button using `mipadel://invite/<token>` for users where the link did not open the app.

### B. Redirect to custom scheme

- Redirect `https://.../invite/TOKEN` → `mipadel://invite/TOKEN`  
  Works on many devices but is **less ideal** than verified Universal Links (extra hop, in-app browser quirks).

The app parses **`https://<configured-host>/invite/<token>`** in `src/navigation/inviteDeepLink.ts` using the hostname from **`INVITE_WEB_ORIGIN`**.

---

## 5. In-app behaviour (summary)

| Piece | Role |
|--------|------|
| `App.tsx` | `NavigationContainer` **ref**, `Linking.getInitialURL` + URL events, navigates to **`AcceptInvite`** with `{ token }`. |
| `src/navigation/inviteDeepLink.ts` | Parses **`mipadel://`** (and legacy **`padelme://`**), **https** (configured host only), **`?token=`**, **`/invite/`** paths. |
| `src/navigation/pendingPostAuthInvite.ts` | If the user opens an invite **logged out**, taps **Sign in**, then logs in, the invite token is reopened on the **authenticated** stack. |
| `RootNavigator.tsx` | **`AcceptInvite`** is on both **guest** and **auth** stacks. |
| `InvitePlayersScreen.tsx` | Share text includes **web URL** + **`mipadel://`** + token. |

---

## 6. Local testing

### iOS Simulator

```bash
xcrun simctl openurl booted "mipadel://invite/YOUR_TOKEN_HERE"
```

Optional (after HTTPS + AASA are set up for a real host):

```bash
xcrun simctl openurl booted "https://mipadel.co.uk/invite/YOUR_TOKEN_HERE"
```

### Android Emulator / device

```bash
adb shell am start -W -a android.intent.action.VIEW -d "mipadel://invite/YOUR_TOKEN_HERE" com.mipadel
```

Replace **`com.mipadel`** with your **`applicationId`** from `android/app/build.gradle` if different.

HTTPS test (host must match manifest):

```bash
adb shell am start -W -a android.intent.action.VIEW -d "https://mipadel.co.uk/invite/YOUR_TOKEN_HERE" com.mipadel
```

---

## 7. Production checklist

- [ ] Set **`INVITE_WEB_ORIGIN`** to production origin.
- [ ] Update **Android** `android:host` for `https` / `http` invite filters.
- [ ] Update **iOS** `applinks:` entries to your production host(s).
- [ ] Publish **`apple-app-site-association`** (iOS).
- [ ] Publish **`assetlinks.json`** (Android), then consider **`android:autoVerify="true"`**.
- [ ] Implement **`GET /invite/:token`** (or redirect) on the web host.
- [ ] Smoke-test cold start: tap HTTPS link from Mail / Messages with app installed and not running.

---

## 8. Troubleshooting

| Symptom | Things to check |
|--------|-------------------|
| HTTPS opens Safari only | AASA / assetlinks missing or wrong; path not `/invite/...`; host mismatch. |
| iOS opens app but wrong screen | AASA paths; confirm URL reaches the app (`Linking` initial URL). |
| Android chooser every time | Incomplete **assetlinks** or **`autoVerify`** not set / failed verification. |
| Custom scheme never opens app | **CFBundleURLTypes** (iOS) / **intent-filter** (Android) for **`mipadel`** + host **`invite`**. |

Token values are opaque strings from the API (e.g. `inv_…`). They must be **URL-encoded** in paths when they contain reserved characters.
