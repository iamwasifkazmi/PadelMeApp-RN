import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../lib/api";
import type { NotificationDto } from "../lib/types";
import { navigationRef } from "./navigationRef";
import type { RootStackParamList } from "./types";

export type NotificationNavTarget =
  | { kind: "accept_invite"; inviteId: string }
  | { kind: "default" };

export function resolveNotificationNav(n: NotificationDto): NotificationNavTarget {
  const type = (n.type || "").toLowerCase();
  if (
    (type === "match_invite" || type === "competition_invite") &&
    (n.relatedEntityType || "").toLowerCase() === "invite" &&
    n.relatedEntityId?.trim()
  ) {
    return { kind: "accept_invite", inviteId: n.relatedEntityId.trim() };
  }
  return { kind: "default" };
}

export function navigateForNotification(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  n: NotificationDto,
) {
  const type = (n.type || "").toLowerCase();
  const matchId = n.matchId?.trim();
  const isConversation =
    (n.relatedEntityType || "").toLowerCase() === "conversation" && n.relatedEntityId?.trim();
  const conversationId = isConversation ? n.relatedEntityId!.trim() : "";

  if (
    type === "instant_play_nearby" ||
    type === "instant_play_matched" ||
    type === "instant_play_player_joined"
  ) {
    if (matchId) {
      navigation.navigate("MatchDetail", { id: matchId });
      return;
    }
    navigation.navigate("InstantPlay");
    return;
  }
  if (type === "match_chat_message" && matchId) {
    navigation.navigate("MatchChat", { matchId });
    return;
  }
  if (conversationId) {
    navigation.navigate("ConversationView", { id: conversationId });
    return;
  }
  const isCompetitionNotif =
    type === "competition_invite" ||
    (n.relatedEntityType || "").toLowerCase() === "competition";
  const compId =
    isCompetitionNotif && n.relatedEntityId?.trim() ? n.relatedEntityId.trim() : "";
  if (compId) {
    navigation.navigate("CompetitionDetail", { id: compId });
    return;
  }
  if (matchId) {
    navigation.navigate("MatchDetail", { id: matchId });
  }
}

async function markNotificationRead(item: NotificationDto): Promise<void> {
  if (item.id && !item.isRead) {
    try {
      await api.patch(`/notifications/${item.id}/read`);
    } catch {
      /* still navigate */
    }
  }
}

/** Mark read (if needed) and navigate — same behaviour as tapping a row in the inbox. */
export async function openNotification(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  item: NotificationDto,
): Promise<void> {
  await markNotificationRead(item);
  const nav = resolveNotificationNav(item);
  if (nav.kind === "accept_invite") {
    try {
      const rec = await api.get<{ token: string }>(`/invites/record/${nav.inviteId}`);
      navigation.navigate("AcceptInvite", { token: rec.token });
      return;
    } catch {
      /* fall through */
    }
  }
  navigateForNotification(navigation, { ...item, isRead: true });
}

/** Open from push tap using root navigation ref (cold start / background). */
export async function openNotificationFromRef(item: NotificationDto): Promise<void> {
  if (!navigationRef.isReady()) return;
  await markNotificationRead(item);
  const nav = resolveNotificationNav(item);
  if (nav.kind === "accept_invite") {
    try {
      const rec = await api.get<{ token: string }>(`/invites/record/${nav.inviteId}`);
      navigationRef.navigate("AcceptInvite", { token: rec.token });
      return;
    } catch {
      /* fall through */
    }
  }
  const type = (item.type || "").toLowerCase();
  const matchId = item.matchId?.trim();
  const isConversation =
    (item.relatedEntityType || "").toLowerCase() === "conversation" && item.relatedEntityId?.trim();
  const conversationId = isConversation ? item.relatedEntityId!.trim() : "";
  if (
    type === "instant_play_nearby" ||
    type === "instant_play_matched" ||
    type === "instant_play_player_joined"
  ) {
    if (matchId) {
      navigationRef.navigate("MatchDetail", { id: matchId });
      return;
    }
    navigationRef.navigate("InstantPlay");
    return;
  }
  if (type === "match_chat_message" && matchId) {
    navigationRef.navigate("MatchChat", { matchId });
    return;
  }
  if (conversationId) {
    navigationRef.navigate("ConversationView", { id: conversationId });
    return;
  }
  const isCompetitionNotif =
    type === "competition_invite" ||
    (item.relatedEntityType || "").toLowerCase() === "competition";
  const compId =
    isCompetitionNotif && item.relatedEntityId?.trim() ? item.relatedEntityId.trim() : "";
  if (compId) {
    navigationRef.navigate("CompetitionDetail", { id: compId });
    return;
  }
  if (matchId) {
    navigationRef.navigate("MatchDetail", { id: matchId });
  }
}

export function notificationDtoFromPushData(
  data: Record<string, string | undefined>,
): NotificationDto | null {
  const id = (data.notificationId || "").trim();
  if (!id) return null;
  return {
    id,
    type: data.type || "",
    title: data.title || "",
    body: data.body || null,
    isRead: false,
    createdAt: new Date().toISOString(),
    matchId: data.matchId || null,
    relatedEntityType: data.relatedEntityType || null,
    relatedEntityId: data.relatedEntityId || null,
  };
}
