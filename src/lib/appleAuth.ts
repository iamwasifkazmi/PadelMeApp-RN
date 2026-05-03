import { Platform } from "react-native";
import appleAuth from "@invertase/react-native-apple-authentication";

export function isAppleAuthSupported(): boolean {
  return Platform.OS === "ios" && appleAuth.isSupported;
}

export type AppleSignInPayload = {
  identityToken: string;
  email?: string;
  fullName?: string;
};

export async function signInWithAppleForBackend(): Promise<AppleSignInPayload> {
  const res = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
  });
  const identityToken = res.identityToken;
  if (!identityToken) {
    throw new Error("No identity token from Apple.");
  }
  const parts = [res.fullName?.givenName, res.fullName?.familyName].filter(Boolean) as string[];
  const fullName = parts.join(" ").trim();
  return {
    identityToken,
    ...(res.email ? { email: res.email } : {}),
    ...(fullName.length >= 2 ? { fullName } : {}),
  };
}

export async function signOutAppleSilently(): Promise<void> {
  if (!isAppleAuthSupported()) return;
  try {
    await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGOUT,
    });
  } catch {
    // ignore — user may not have an Apple session
  }
}

export function isAppleUserCancelled(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === appleAuth.Error.CANCELED;
}
