import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { CompetitionDto, MatchDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { getCurrentUserEmail } from "../store";
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
  const USER_EMAIL = getCurrentUserEmail();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [items, setItems] = React.useState<Array<
    | { kind: "match"; id: string; title: string; date: string; subtitle: string; status: string; score?: string }
    | { kind: "competition"; id: string; title: string; date: string; subtitle: string; status: string }
  >>([]);

  const load = React.useCallback(async (opts?: { refresh?: boolean }) => {
    const isRefresh = opts?.refresh === true;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [a, b, c, comps] = await Promise.all([
        api.get<MatchDto[]>("/matches?status=completed"),
        api.get<MatchDto[]>("/matches?status=cancelled"),
        api.get<MatchDto[]>("/matches?status=abandoned"),
        api.get<CompetitionDto[]>("/competitions"),
      ]);

      const myMatches = [...a, ...b, ...c]
        .filter((m) => m.players.includes(USER_EMAIL) || (m as any).createdByEmail === USER_EMAIL)
        .map((m) => ({
          kind: "match" as const,
          id: m.id,
          title: m.title,
          date: m.date,
          subtitle: `${new Date(m.date).toLocaleDateString()} · ${m.timeLabel}`,
          status: m.status,
          score: m.scoreTeamA || m.scoreTeamB ? `${m.scoreTeamA || "-"} / ${m.scoreTeamB || "-"}` : undefined,
        }));

      const myCompetitions = comps
        .filter((c) => c.status === "completed" || c.status === "cancelled")
        .filter((c) => c.hostEmail === USER_EMAIL || c.participants.includes(USER_EMAIL))
        .map((c) => ({
          kind: "competition" as const,
          id: c.id,
          title: c.name,
          date: c.endDate || c.startDate || c.createdAt,
          subtitle: `${c.type === "league" ? "League" : "Tournament"} · ${c.locationName || "—"}`,
          status: c.status,
        }));

      const all = [...myMatches, ...myCompetitions].sort(
        (x, y) => new Date(y.date).getTime() - new Date(x.date).getTime(),
      );
      setItems(all);
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

  const onRefresh = React.useCallback(() => {
    load({ refresh: true });
  }, [load]);

  if (loading) return <PastEventsSkeleton />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Past Events</Text>
      <Text style={styles.subtitle}>Completed and archived matches</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>{item.subtitle}</Text>
            <Text style={styles.meta}>
              Type: {item.kind === "match" ? "Match" : "Competition"} · Status: {item.status}
            </Text>
            {"score" in item && item.score ? <Text style={styles.meta}>Score: {item.score}</Text> : null}
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

