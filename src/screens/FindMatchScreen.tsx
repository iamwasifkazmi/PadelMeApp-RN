import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { MatchDto } from "../lib/types";
import { ScreenSkeleton } from "../components/Skeleton";
import { useNavigation } from "@react-navigation/native";

const LEVELS = ["any", "beginner", "intermediate", "advanced"] as const;

export function FindMatchScreen() {
  const navigation = useNavigation<any>();
  const [level, setLevel] = React.useState<(typeof LEVELS)[number]>("any");
  const [matches, setMatches] = React.useState<MatchDto[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get<MatchDto[]>(`/matches?status=open${level !== "any" ? `&skill=${level}` : ""}`)
      .then((res) => {
        if (mounted) setMatches(res);
      })
      .catch(() => {
        if (mounted) setMatches([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [level]);

  if (loading) return <ScreenSkeleton rows={6} topGap={12} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find Match</Text>
      <Text style={styles.subtitle}>Open games near you</Text>

      <View style={styles.filtersRow}>
        {LEVELS.map((item) => (
          <Pressable
            key={item}
            onPress={() => setLevel(item)}
            style={[styles.chip, level === item && styles.chipActive]}
          >
            <Text style={[styles.chipText, level === item && styles.chipTextActive]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("MatchDetail", { id: item.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={16} color="#64748b" />
            </View>
            <Text style={styles.cardMeta}>
              {new Date(item.date).toLocaleDateString()} · {item.timeLabel}
            </Text>
            <Text style={styles.cardMeta}>{item.locationName}</Text>
            <Text style={styles.cardMeta}>
              {item.players.length}/{item.maxPlayers} players
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No open matches right now.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800", color: "#0f172a" },
  subtitle: { marginTop: 2, marginBottom: 12, color: "#64748b" },
  filtersRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { backgroundColor: "#e2e8f0", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: "#1d4ed8" },
  chipText: { textTransform: "capitalize", color: "#334155", fontWeight: "600", fontSize: 12 },
  chipTextActive: { color: "#fff" },
  card: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0", padding: 12, marginBottom: 8 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontWeight: "700", fontSize: 14, color: "#0f172a", flex: 1, marginRight: 8 },
  cardMeta: { marginTop: 4, color: "#64748b", fontSize: 12 },
  emptyState: { marginTop: 24, alignItems: "center" },
  emptyText: { color: "#64748b" },
});

