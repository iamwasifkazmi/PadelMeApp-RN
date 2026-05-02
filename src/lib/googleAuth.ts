import { Platform } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from "../config/googleSignIn";

export function isGoogleSignInConfigured(): boolean {
  return Boolean(GOOGLE_WEB_CLIENT_ID.trim());
}

/** Call once at startup (e.g. from `App.tsx`). */
export function configureGoogleSignIn(): void {
  const web = GOOGLE_WEB_CLIENT_ID.trim();
  if (!web) return;
  const ios = GOOGLE_IOS_CLIENT_ID.trim();
  GoogleSignin.configure({
    webClientId: web,
    ...(ios ? { iosClientId: ios } : {}),
  });
}

export async function signInWithGoogleIdToken(): Promise<string> {
  if (!isGoogleSignInConfigured()) {
    throw new Error("Google Sign-In is not configured");
  }
  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  const result = await GoogleSignin.signIn();
  if (result.type !== "success") {
    throw new Error("cancelled");
  }
  let idToken = result.data.idToken;
  if (!idToken) {
    const tokens = await GoogleSignin.getTokens();
    idToken = tokens.idToken;
  }
  if (!idToken) {
    throw new Error("No ID token from Google. Check webClientId and Google Cloud OAuth clients.");
  }
  return idToken;
}

export async function signOutGoogleSilently(): Promise<void> {
  if (!isGoogleSignInConfigured()) return;
  try {
    if (GoogleSignin.hasPreviousSignIn()) {
      await GoogleSignin.signOut();
    }
  } catch {
    // ignore
  }
}
