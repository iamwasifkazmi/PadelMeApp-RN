import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { MatchDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { COLORS } from "../theme/colors";

function PastEventsSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBlock height={28} width="40%" rounded={8} />
      <View style={{ height: 10 }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.card}>
          <SkeletonBlock height={14} width="55%" />
          <View style={{ height: 7 }} />
          <SkeletonBlock height={12} width="80%" />
          <View style={{ height: 5 }} />
          <SkeletonBlock height={12} width="45%" />
        </View>
      ))}
    </View>
  );
}

export function PastEventsScreen() {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<MatchDto[]>([]);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      api.get<MatchDto[]>("/matches?status=completed"),
      api.get<MatchDto[]>("/matches?status=cancelled"),
      api.get<MatchDto[]>("/matches?status=abandoned"),
    ])
      .then(([a, b, c]) => {
        if (!mounted) return;
        const all = [...a, ...b, ...c].sort(
          (x, y) => new Date(y.date).getTime() - new Date(x.date).getTime(),
        );
        setItems(all);
      })
      .catch(() => mounted && setItems([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <PastEventsSkeleton />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Past Events</Text>
      <Text style={styles.subtitle}>Completed and archived matches</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>
              {new Date(item.date).toLocaleDateString()} · {item.timeLabel}
            </Text>
            <Text style={styles.meta}>Status: {item.status}</Text>
            {(item.scoreTeamA || item.scoreTeamB) && (
              <Text style={styles.meta}>
                Score: {item.scoreTeamA || "-"} / {item.scoreTeamB || "-"}
              </Text>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No past events yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 2, marginBottom: 12, color: COLORS.textMuted },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  meta: { marginTop: 3, fontSize: 12, color: COLORS.textMuted, textTransform: "capitalize" },
  empty: { textAlign: "center", marginTop: 24, color: COLORS.textMuted },
});

