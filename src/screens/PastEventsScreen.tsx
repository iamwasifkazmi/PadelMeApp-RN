import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { api } from "../lib/api";
import { CompetitionDto, MatchDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";

type MatchOutcome = "win" | "loss" | "draw" | "unknown";

function normalizeEmail(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase();
}

function normalizeWinnerTeam(raw: string | null | undefined): "team_a" | "team_b" | null {
  const t = (raw || "").toLowerCase().replace(/[^a-z]/g, "");
  if (t === "teama" || t === "a") return "team_a";
  if (t === "teamb" || t === "b") return "team_b";
  return null;
}

function matchOutcomeForViewer(m: MatchDto, viewerEmail: string): MatchOutcome {
  const me = normalizeEmail(viewerEmail);
  const onA = (m.teamA || []).some((e) => normalizeEmail(e) === me);
  const onB = (m.teamB || []).some((e) => normalizeEmail(e) === me);
  const myTeam: "team_a" | "team_b" | null = onA ? "team_a" : onB ? "team_b" : null;
  const winner = normalizeWinnerTeam(m.winnerTeam);
  if (winner && myTeam) return winner === myTeam ? "win" : "loss";
  const a = (m.scoreTeamA || "").trim();
  const b = (m.scoreTeamB || "").trim();
  if (a && b && a === b) return "draw";
  return "unknown";
}

function outcomeColor(o: MatchOutcome): string {
  if (o === "win") return COLORS.successText;
  if (o === "loss") return COLORS.dangerText;
  if (o === "draw") return COLORS.warningText;
  return COLORS.textSubtle;
}

function outcomeLabel(o: MatchOutcome): string {
  if (o === "win") return "Won";
  if (o === "loss") return "Lost";
  if (o === "draw") return "Drawn";
  return "—";
}

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
  const navigation = useNavigation<any>();
  const USER_EMAIL = getCurrentUserEmail();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [items, setItems] = React.useState<Array<
    | {
        kind: "match";
        id: string;
        title: string;
        date: string;
        subtitle: string;
        status: string;
        score?: string;
        outcome: MatchOutcome;
      }
    | { kind: "competition"; id: string; title: string; date: string; subtitle: string; status: string }
  >>([]);

  const load = React.useCallback(async (opts?: { refresh?: boolean }) => {
    const isRefresh = opts?.refresh === true;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [completedMatches, comps] = await Promise.all([
        api.get<MatchDto[]>("/matches?status=completed"),
        api.get<CompetitionDto[]>("/competitions"),
      ]);

      /** Cancelled / abandoned matches stay in the DB for notifications and detail screens, but are omitted from this "results" timeline. */
      const myMatches = completedMatches
        .filter((m) => m.players.includes(USER_EMAIL) || (m as any).createdByEmail === USER_EMAIL)
        .map((m) => ({
          kind: "match" as const,
          id: m.id,
          title: m.title,
          date: m.date,
          subtitle: `${new Date(m.date).toLocaleDateString()} · ${m.timeLabel}`,
          status: m.status,
          score: m.scoreTeamA || m.scoreTeamB ? `${m.scoreTeamA || "-"} / ${m.scoreTeamB || "-"}` : undefined,
          outcome: matchOutcomeForViewer(m, USER_EMAIL),
        }));

      const myCompetitions = comps
        .filter((c) => c.status === "completed")
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
      <Text style={styles.subtitle}>Completed matches and competitions</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => {
              if (item.kind === "match") {
                navigation.navigate("MatchDetail", { id: item.id });
              } else {
                navigation.navigate("CompetitionDetail", { id: item.id });
              }
            }}
          >
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.meta}>{item.subtitle}</Text>
              <Text style={styles.meta}>
                Type: {item.kind === "match" ? "Match" : "Competition"} · Status: {item.status}
              </Text>
              {"score" in item && item.score ? <Text style={styles.meta}>Score: {item.score}</Text> : null}
            </View>
            {item.kind === "match" ? (
              <View style={styles.outcomeWrap}>
                <View
                  style={[
                    styles.outcomeDot,
                    { backgroundColor: outcomeColor(item.outcome) },
                  ]}
                />
                <Text
                  style={[styles.outcomeText, { color: outcomeColor(item.outcome) }]}
                  numberOfLines={1}
                >
                  {outcomeLabel(item.outcome)}
                </Text>
              </View>
            ) : null}
          </Pressable>
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
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  meta: { marginTop: 3, fontSize: 12, color: COLORS.textMuted, textTransform: "capitalize" },
  outcomeWrap: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 56,
    paddingTop: 2,
    gap: 4,
  },
  outcomeDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  outcomeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  empty: { textAlign: "center", marginTop: 24, color: COLORS.textMuted },
});

