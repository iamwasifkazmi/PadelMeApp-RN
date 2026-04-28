import React from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { ConversationDto } from "../lib/types";
import { ScreenSkeleton } from "../components/Skeleton";
import { useNavigation } from "@react-navigation/native";
import { COLORS } from "../theme/colors";

const USER_EMAIL = "demo@padelme.app";

export function MessagesScreen() {
  const navigation = useNavigation<any>();
  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState<"all" | "direct" | "groups">("all");
  const [conversations, setConversations] = React.useState<ConversationDto[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get<ConversationDto[]>(`/conversations?email=${encodeURIComponent(USER_EMAIL)}`)
      .then((res) => mounted && setConversations(res))
      .catch(() => mounted && setConversations([]))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <ScreenSkeleton rows={7} topGap={12} />;
  const filtered = conversations.filter((c) => {
    if (tab === "direct" && c.type !== "direct") return false;
    if (tab === "groups" && c.type === "direct") return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (c.entityName || "conversation").toLowerCase().includes(q);
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
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#06b6d4" />
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={15} color="#7b95a6" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search conversations..."
          placeholderTextColor="#7b95a6"
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
        contentContainerStyle={{ paddingBottom: 110 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate("ConversationView", { id: item.id })}
          >
            <View style={styles.avatar}>
              <Ionicons
                name={item.type === "direct" ? "person-outline" : item.type === "match" ? "tennisball-outline" : "trophy-outline"}
                size={18}
                color="#0891b2"
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
                <Text style={styles.name}>{item.entityName || "Conversation"}</Text>
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
                <Text style={styles.typeChip}>{item.type === "direct" ? "DM" : item.type}</Text>
                <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessageText || "No messages yet"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#7b95a6" />
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
  tabBtnText: { fontSize: 12, fontWeight: "700", color: "#1a3a4a" },
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
    backgroundColor: "#d8f5fb",
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
    backgroundColor: "#f43f5e",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  unreadDotText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  nameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  timeText: { fontSize: 10, color: "#4f6b7b" },
  previewRow: { marginTop: 2, flexDirection: "row", alignItems: "center", gap: 5 },
  typeChip: {
    fontSize: 10,
    backgroundColor: "#c8e6ef",
    color: "#1a3a4a",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
    textTransform: "capitalize",
    overflow: "hidden",
  },
  preview: { flex: 1, fontSize: 12, color: "#4f6b7b" },
  empty: { marginTop: 24, alignItems: "center" },
  emptyText: { color: "#4f6b7b" },
});

