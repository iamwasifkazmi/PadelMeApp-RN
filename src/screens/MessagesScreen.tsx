import React from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { ConversationDto } from "../lib/types";
import { ScreenSkeleton } from "../components/Skeleton";
import { useNavigation } from "@react-navigation/native";
import { getCurrentUserEmail } from "../store";
import { conversationTitleForViewer } from "../lib/conversationDisplay";
import { COLORS } from "../theme/colors";
import { androidChipText, chipPillShellSm } from "../theme/chipAndroid";

export function MessagesScreen() {
  const USER_EMAIL = getCurrentUserEmail();
  const navigation = useNavigation<any>();
  const navigateRoot = React.useCallback(
    (route: string, params?: Record<string, unknown>) => {
      const parent = navigation.getParent?.();
      if (parent?.navigate) parent.navigate(route, params);
      else navigation.navigate(route, params);
    },
    [navigation],
  );
  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState<"all" | "direct" | "groups">("all");
  const [conversations, setConversations] = React.useState<ConversationDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(
    async (opts?: { refresh?: boolean }) => {
      const isRefresh = opts?.refresh === true;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await api.get<ConversationDto[]>(
          `/conversations?email=${encodeURIComponent(USER_EMAIL)}`,
        );
        setConversations(res);
      } catch {
        setConversations([]);
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [USER_EMAIL],
  );

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const socket = getSocket(USER_EMAIL);
    if (!socket) return;
    const onConversationChanged = () => {
      load({ refresh: true }).catch(() => undefined);
    };
    socket.on("conversation:message", onConversationChanged);
    socket.on("conversation:updated", onConversationChanged);
    return () => {
      socket.off("conversation:message", onConversationChanged);
      socket.off("conversation:updated", onConversationChanged);
    };
  }, [USER_EMAIL, load]);

  const onRefresh = React.useCallback(() => {
    load({ refresh: true });
  }, [load]);

  if (loading) return <ScreenSkeleton rows={7} topGap={12} />;
  const filtered = conversations.filter((c) => {
    if (tab === "direct" && c.type !== "direct") return false;
    if (tab === "groups" && c.type === "direct") return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return conversationTitleForViewer(c, USER_EMAIL).toLowerCase().includes(q);
  });
  const unreadCount = filtered.reduce(
    (sum, c) => sum + (c.unreadCounts?.[USER_EMAIL] || 0),
    0,
  );

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>{unreadCount} active conversations</Text>
        </View>
        <View style={styles.iconBubble}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.primary} />
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={15} color={COLORS.iconMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search conversations..."
          placeholderTextColor={COLORS.iconMuted}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.tabs}>
        <TabBtn label="All" active={tab === "all"} onPress={() => setTab("all")} />
        <TabBtn label="Direct" active={tab === "direct"} onPress={() => setTab("direct")} />
        <TabBtn label="Match/Comp" active={tab === "groups"} onPress={() => setTab("groups")} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 110 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => {
              if (item.type === "match" && item.entityId) {
                navigateRoot("MatchChat", { matchId: item.entityId });
              } else {
                navigation.navigate("ConversationView", { id: item.id });
              }
            }}
          >
            <View style={styles.avatar}>
              <Ionicons
                name={item.type === "direct" ? "person-outline" : item.type === "match" ? "tennisball-outline" : "trophy-outline"}
                size={18}
                color={COLORS.primaryDark}
              />
              {(item.unreadCounts?.[USER_EMAIL] || 0) > 0 && (
                <View style={styles.unreadDot}>
                  <Text style={styles.unreadDotText}>
                    {(item.unreadCounts?.[USER_EMAIL] || 0) > 9 ? "9+" : item.unreadCounts?.[USER_EMAIL]}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{conversationTitleForViewer(item, USER_EMAIL)}</Text>
                {!!item.lastMessageAt && (
                  <Text style={styles.timeText}>
                    {new Date(item.lastMessageAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                )}
              </View>
              <View style={styles.previewRow}>
                <View style={styles.typeChip}>
                  <Text style={styles.typeChipText}>{item.type === "direct" ? "DM" : item.type}</Text>
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessageText || "No messages yet"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.iconMuted} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No conversations yet.</Text>
          </View>
        }
      />
    </View>
  );
}

function TabBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 2, marginBottom: 12, color: COLORS.textMuted },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, paddingVertical: 10, color: COLORS.text, fontSize: 13 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tabBtn: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  tabBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabBtnText: { fontSize: 12, fontWeight: "700", color: COLORS.textSubtle },
  tabBtnTextActive: { color: COLORS.card },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoftAlt,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.badge,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  unreadDotText: { color: COLORS.card, fontSize: 9, fontWeight: "800" },
  nameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  timeText: { fontSize: 10, color: COLORS.textMuted },
  previewRow: { marginTop: 2, flexDirection: "row", alignItems: "center", gap: 5 },
  typeChip: {
    ...chipPillShellSm,
    backgroundColor: COLORS.border,
    paddingHorizontal: 5,
  },
  typeChipText: {
    fontSize: 10,
    color: COLORS.textSubtle,
    textTransform: "capitalize",
    ...androidChipText(10),
  },
  preview: { flex: 1, fontSize: 12, color: COLORS.textMuted },
  empty: { marginTop: 24, alignItems: "center" },
  emptyText: { color: COLORS.textMuted },
});

