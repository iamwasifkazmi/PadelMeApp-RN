import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../lib/api";
import { NotificationDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

function navigateForNotification(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  n: NotificationDto,
) {
  const type = (n.type || "").toLowerCase();
  const matchId = n.matchId?.trim();
  const isConversation =
    (n.relatedEntityType || "").toLowerCase() === "conversation" && n.relatedEntityId?.trim();
  const conversationId = isConversation ? n.relatedEntityId!.trim() : "";

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

function NotificationsSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBlock height={28} width="48%" rounded={8} />
      <View style={{ height: 12 }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <SkeletonBlock height={36} width={36} rounded={18} />
            <View style={{ flex: 1 }}>
              <SkeletonBlock height={14} width="60%" />
              <View style={{ height: 6 }} />
              <SkeletonBlock height={12} width="85%" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function NotificationsScreen() {
  const USER_EMAIL = getCurrentUserEmail();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [items, setItems] = React.useState<NotificationDto[]>([]);

  const load = React.useCallback(async (opts?: { refresh?: boolean }) => {
    const isRefresh = opts?.refresh === true;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await api.get<NotificationDto[]>(
        `/notifications?email=${encodeURIComponent(USER_EMAIL)}`,
      );
      setItems(res);
    } catch {
      setItems([]);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [USER_EMAIL]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onNotificationPress = async (item: NotificationDto) => {
    try {
      if (!item.isRead) {
        await api.patch(`/notifications/${item.id}/read`);
        setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, isRead: true } : x)));
      }
    } catch {
      /* still try to navigate */
    }
    navigateForNotification(navigation, { ...item, isRead: true });
  };
  const markAllRead = async () => {
    await api.patch("/notifications/read-all", { email: USER_EMAIL });
    await load();
  };

  const onRefresh = React.useCallback(() => {
    load({ refresh: true });
  }, [load]);

  if (loading) return <NotificationsSkeleton />;
  const unreadCount = items.filter((i) => !i.isRead).length;
  const grouped = groupByDate(items);

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>{unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up 🎉"}</Text>
      {unreadCount > 0 && (
        <View style={styles.headRow}>
          <Pressable style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={grouped}
        keyExtractor={(section) => section.label}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: section }) => (
          <View style={styles.groupWrap}>
            <Text style={styles.groupLabel}>{section.label}</Text>
            {section.items.map((item) => (
              <Pressable key={item.id} style={styles.card} onPress={() => void onNotificationPress(item)}>
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={item.isRead ? "notifications-outline" : "notifications"}
                    size={18}
                    color={item.isRead ? COLORS.textMuted : COLORS.primary}
                  />
                </View>
                <View style={styles.cardMain}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    {!item.isRead ? <View style={styles.newPill}><Text style={styles.newPillText}>NEW</Text></View> : null}
                  </View>
                  {!!item.body && (
                    <Text style={styles.cardBody} numberOfLines={2}>
                      {item.body}
                    </Text>
                  )}
                  <Text style={styles.cardTime}>{fromNow(item.createdAt)}</Text>
                </View>
                <View style={styles.trailingWrap}>
                  {!item.isRead ? <View style={styles.unreadDot} /> : null}
                  <Ionicons name="chevron-forward" size={14} color={COLORS.iconMuted} />
                </View>
              </Pressable>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="notifications-outline" size={24} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              Friend requests, match invites, scores, and more will appear here
            </Text>
          </View>
        }
        ListFooterComponent={items.length > 0 ? <Text style={styles.footerText}>Showing last {items.length} notifications</Text> : null}
      />
    </View>
  );
}

function groupByDate(items: NotificationDto[]) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const map = new Map<string, NotificationDto[]>();

  for (const n of items) {
    const d = new Date(n.createdAt).toDateString();
    const label =
      d === today
        ? "Today"
        : d === yesterday
          ? "Yesterday"
          : new Date(n.createdAt).toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" });
    const list = map.get(label) || [];
    list.push(n);
    map.set(label, list);
  }

  return Array.from(map.entries()).map(([label, grouped]) => ({ label, items: grouped }));
}

function fromNow(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 14, paddingTop: 8 },
  headRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginBottom: 8 },
  subtitle: { marginTop: 2, marginBottom: 8, color: COLORS.textMuted, fontSize: 12 },
  markAllBtn: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  markAllText: { color: COLORS.primaryDark, fontWeight: "700", fontSize: 11 },
  listContent: { paddingBottom: 110 },
  groupWrap: { marginBottom: 10 },
  groupLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    marginBottom: 5,
    paddingHorizontal: 2,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 11,
    marginBottom: 6,
    flexDirection: "row",
    gap: 9,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMain: { flex: 1 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 1 },
  cardTitle: { fontSize: 13, color: COLORS.text, fontWeight: "700", flexShrink: 1 },
  newPill: {
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryPale,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  newPillText: { color: COLORS.primaryDark, fontWeight: "800", fontSize: 9 },
  cardBody: { marginTop: 2, fontSize: 11, color: COLORS.textMuted },
  cardTime: { marginTop: 4, fontSize: 10, color: COLORS.textMuted },
  trailingWrap: { alignItems: "center", justifyContent: "space-between", minHeight: 34 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary },
  emptyWrap: { alignItems: "center", justifyContent: "center", paddingHorizontal: 26, marginTop: 70 },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.borderMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
  emptySubtitle: { textAlign: "center", color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
  footerText: { textAlign: "center", fontSize: 10, color: COLORS.textMuted, marginTop: 6 },
});

