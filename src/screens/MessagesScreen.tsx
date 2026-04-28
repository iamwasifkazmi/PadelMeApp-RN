import React from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { ConversationDto } from "../lib/types";
import { ScreenSkeleton } from "../components/Skeleton";
import { useNavigation } from "@react-navigation/native";

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
  const unreadCount = filtered.filter((c) => !!c.lastMessageAt).length;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>{unreadCount} active conversations</Text>
        </View>
        <View style={styles.iconBubble}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#2563eb" />
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={15} color="#94a3b8" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search conversations..."
          placeholderTextColor="#94a3b8"
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
              <Ionicons name="chatbubble-ellipses" size={18} color="#1d4ed8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.entityName || "Conversation"}</Text>
              <View style={styles.previewRow}>
                <Text style={styles.typeChip}>{item.type === "direct" ? "DM" : item.type}</Text>
                <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessageText || "No messages yet"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
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
  container: { flex: 1, backgroundColor: "#f8fafc", paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800", color: "#0f172a" },
  subtitle: { marginTop: 2, marginBottom: 12, color: "#64748b" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, paddingVertical: 10, color: "#0f172a", fontSize: 13 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tabBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  tabBtnActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  tabBtnText: { fontSize: 12, fontWeight: "700", color: "#334155" },
  tabBtnTextActive: { color: "#fff" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  previewRow: { marginTop: 2, flexDirection: "row", alignItems: "center", gap: 5 },
  typeChip: {
    fontSize: 10,
    backgroundColor: "#e2e8f0",
    color: "#334155",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
    textTransform: "capitalize",
    overflow: "hidden",
  },
  preview: { flex: 1, fontSize: 12, color: "#64748b" },
  empty: { marginTop: 24, alignItems: "center" },
  emptyText: { color: "#64748b" },
});

