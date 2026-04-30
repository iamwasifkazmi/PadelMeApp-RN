import React from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { api } from "../lib/api";
import { UserDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { COLORS } from "../theme/colors";

function PlayersSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBlock height={28} width="38%" rounded={8} />
      <View style={{ height: 10 }} />
      <SkeletonBlock height={42} width="100%" rounded={12} />
      <View style={{ height: 12 }} />
      {Array.from({ length: 7 }).map((_, i) => (
        <View key={i} style={styles.row}>
          <SkeletonBlock height={44} width={44} rounded={22} />
          <View style={{ flex: 1 }}>
            <SkeletonBlock height={14} width="45%" />
            <View style={{ height: 6 }} />
            <SkeletonBlock height={12} width="65%" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function PlayersScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [players, setPlayers] = React.useState<UserDto[]>([]);

  const load = React.useCallback(async (opts?: { refresh?: boolean }) => {
    const isRefresh = opts?.refresh === true;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get<UserDto[]>(`/users${query ? `?search=${encodeURIComponent(query)}` : ""}`);
      setPlayers(res);
    } catch {
      setPlayers([]);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [query]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = React.useCallback(() => {
    load({ refresh: true });
  }, [load]);

  if (loading) return <PlayersSkeleton />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Players</Text>
      <Text style={styles.subtitle}>Recommended players around your level</Text>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search players"
        placeholderTextColor={COLORS.iconMuted}
      />

      <FlatList
        data={players}
        keyExtractor={(i) => i.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate("PlayerProfile", { id: item.id })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.fullName || item.email).slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.fullName || item.email.split("@")[0]}</Text>
              <Text style={styles.meta}>
                {item.skillLabel || "intermediate"} · ELO {item.eloRating}
              </Text>
              <View style={styles.rowActions}>
                <Pressable
                  style={styles.messageBtn}
                  onPress={() => {
                    const parent = navigation.getParent?.();
                    if (parent?.navigate) parent.navigate("MessagesTab");
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={13} color={COLORS.primaryDark} />
                  <Text style={styles.messageBtnText}>Message</Text>
                </Pressable>
                <Pressable
                  style={styles.profileBtn}
                  onPress={() => navigation.navigate("PlayerProfile", { id: item.id })}
                >
                  <Text style={styles.profileBtnText}>View Profile</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No players found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text, marginBottom: 10 },
  subtitle: { marginTop: -6, marginBottom: 10, color: COLORS.textMuted, fontSize: 12 },
  search: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    marginBottom: 10,
    color: COLORS.text,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.text, alignItems: "center", justifyContent: "center" },
  avatarText: { color: COLORS.card, fontWeight: "800" },
  name: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  meta: { marginTop: 3, fontSize: 12, color: COLORS.textMuted, textTransform: "capitalize" },
  rowActions: { marginTop: 8, flexDirection: "row", gap: 6 },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  messageBtnText: { color: COLORS.primaryDark, fontWeight: "700", fontSize: 11 },
  profileBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  profileBtnText: { color: COLORS.text, fontWeight: "700", fontSize: 11 },
  empty: { textAlign: "center", marginTop: 24, color: COLORS.textMuted },
});

