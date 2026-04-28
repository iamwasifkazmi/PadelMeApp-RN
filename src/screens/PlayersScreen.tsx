import React from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { api } from "../lib/api";
import { UserDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";

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
  const [query, setQuery] = React.useState("");
  const [players, setPlayers] = React.useState<UserDto[]>([]);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get<UserDto[]>(`/users${query ? `?search=${encodeURIComponent(query)}` : ""}`)
      .then((res) => mounted && setPlayers(res))
      .catch(() => mounted && setPlayers([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [query]);

  if (loading) return <PlayersSkeleton />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Players</Text>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search players"
        placeholderTextColor="#94a3b8"
      />

      <FlatList
        data={players}
        keyExtractor={(i) => i.id}
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
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No players found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800", color: "#0f172a", marginBottom: 10 },
  search: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    marginBottom: 10,
    color: "#0f172a",
  },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800" },
  name: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  meta: { marginTop: 3, fontSize: 12, color: "#64748b", textTransform: "capitalize" },
  empty: { textAlign: "center", marginTop: 24, color: "#64748b" },
});

