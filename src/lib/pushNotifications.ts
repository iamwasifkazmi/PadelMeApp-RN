import { PermissionsAndroid, Platform } from "react-native";
import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import { api } from "./api";
import {
  notificationDtoFromPushData,
  openNotificationFromRef,
} from "../navigation/notificationNavigation";
import { navigationRef } from "../navigation/navigationRef";
import type { NotificationDto } from "./types";

let registeredToken: string | null = null;
let handlersAttached = false;

const pendingPushRef: { current: NotificationDto | null } = { current: null };

export function flushPendingPushNavigation() {
  const item = pendingPushRef.current;
  if (!item || !navigationRef.isReady()) return;
  pendingPushRef.current = null;
  void openNotificationFromRef(item);
}

function queuePushNavigation(data: Record<string, string | undefined>) {
  const dto = notificationDtoFromPushData(data);
  if (!dto) return;
  pendingPushRef.current = dto;
  flushPendingPushNavigation();
}

function dataFromRemoteMessage(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): Record<string, string | undefined> {
  const raw = remoteMessage.data || {};
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = v == null ? undefined : String(v);
  }
  if (!out.notificationId && remoteMessage.messageId) {
    out.notificationId = remoteMessage.messageId;
  }
  return out;
}

export async function registerPushToken(): Promise<void> {
  try {
    const status = await messaging().requestPermission();
    const enabled =
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL;
    if (!enabled) return;

    if (Platform.OS === "android" && Platform.Version >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    if (Platform.OS === "ios") {
      await messaging().registerDeviceForRemoteMessages();
      await messaging().setForegroundNotificationPresentationOptions({
        alert: true,
        badge: true,
        sound: true,
      });
    }

    const token = await messaging().getToken();
    if (!token) return;
    if (token === registeredToken) return;

    await api.post("/notifications/push-token", {
      token,
      platform: Platform.OS === "ios" ? "ios" : "android",
    });
    registeredToken = token;
  } catch (err) {
    console.warn("[push] registerPushToken:", err);
  }
}

export async function unregisterPushToken(): Promise<void> {
  try {
    const token = registeredToken || (await messaging().getToken().catch(() => null));
    if (token) {
      await api.post("/notifications/push-token/unregister", { token });
    }
    await messaging().deleteToken().catch(() => undefined);
  } catch {
    /* ignore */
  } finally {
    registeredToken = null;
  }
}

export async function registerPushAfterLogin(): Promise<void> {
  const { PUSH_NOTIFICATIONS_ENABLED } = await import("../config/push");
  if (!PUSH_NOTIFICATIONS_ENABLED) return;
  attachPushNotificationHandlers();
  await registerPushToken();
}

export function attachPushNotificationHandlers(): void {
  if (handlersAttached) return;
  handlersAttached = true;

  messaging().onTokenRefresh((token) => {
    registeredToken = null;
    void (async () => {
      try {
        await api.post("/notifications/push-token", {
          token,
          platform: Platform.OS === "ios" ? "ios" : "android",
        });
        registeredToken = token;
      } catch {
        /* ignore */
      }
    })();
  });

  messaging().onNotificationOpenedApp((remoteMessage) => {
    queuePushNavigation(dataFromRemoteMessage(remoteMessage));
  });

  messaging().onMessage(async () => {
    /* Foreground: iOS shows banner via setForegroundNotificationPresentationOptions */
  });

  void messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        queuePushNavigation(dataFromRemoteMessage(remoteMessage));
      }
    });
}
