import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch, useSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import { clearSession, setHydrated, setSession, type AuthUser } from "./authSlice";
import type { AppDispatch, RootState } from "./store";
import { store } from "./store";

const SESSION_KEY = "mipadel.auth.session.v1";

type SessionPayload = {
  token: string;
  user: AuthUser;
};

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useAuth = () => {
  const auth = useAppSelector((s) => s.auth);
  return {
    token: auth.token,
    user: auth.user,
    hydrated: auth.hydrated,
    isAuthenticated: Boolean(auth.token && auth.user?.email),
  };
};

export function getCurrentUserEmail() {
  return store.getState().auth.user?.email || "";
}

export function getCurrentUserId() {
  return store.getState().auth.user?.id || "";
}

export function getCurrentUserName() {
  const user = store.getState().auth.user;
  if (user?.fullName?.trim()) return user.fullName.trim();
  if (user?.email) return user.email.split("@")[0];
  return "Player";
}

export async function bootstrapSession() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const payload = JSON.parse(raw) as SessionPayload;
    if (payload?.token && payload?.user?.email) {
      store.dispatch(setSession(payload));
    }
  } catch {
    // no-op
  } finally {
    store.dispatch(setHydrated(true));
  }
}

export async function persistSession(payload: SessionPayload) {
  store.dispatch(setSession(payload));
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  const { registerPushAfterLogin } = await import("../lib/pushNotifications");
  void registerPushAfterLogin();
}

export async function clearPersistedSession() {
  const { unregisterPushToken } = await import("../lib/pushNotifications");
  await unregisterPushToken().catch(() => undefined);
  store.dispatch(clearSession());
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function mergeAuthUser(patch: Partial<AuthUser>) {
  const { token, user } = store.getState().auth;
  if (!token || !user?.email) return;
  const next = { ...user, ...patch };
  store.dispatch(setSession({ token, user: next }));
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ token, user: next }));
}
