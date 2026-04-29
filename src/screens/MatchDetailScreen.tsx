import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { useSnackbar } from "../components/Snackbar";
import { MatchDto } from "../lib/types";
import { ScreenSkeleton } from "../components/Skeleton";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";

export function MatchDetailScreen({
  route,
  navigation,
}: {
  route: { params: { id: string } };
  navigation: any;
}) {
  const { showSnackbar } = useSnackbar();
  const USER_EMAIL = getCurrentUserEmail();
  const id = route.params.id;
  const [match, setMatch] = React.useState<MatchDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const m = await api.get<MatchDto>(`/matches/${id}`);
      setMatch(m);
    } catch {
      setMatch(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onJoin = async () => {
    if (!match) return;
    try {
      setBusy(true);
      await api.post<MatchDto>(`/matches/${match.id}/join`, { email: USER_EMAIL });
      await load();
    } catch {
      showSnackbar("Could not join match", { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onSubmitDemoScore = async () => {
    if (!match) return;
    try {
      setBusy(true);
      await api.post<MatchDto>(`/matches/${match.id}/submit-score`, {
        scoreTeamA: "6-4 6-3",
        scoreTeamB: "4-6 3-6",
        winnerTeam: "team_a",
      });
      await load();
    } catch {
      showSnackbar("Could not submit score", { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <ScreenSkeleton rows={4} topGap={12} />;

  if (!match) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Match not found.</Text>
      </View>
    );
  }

  const joined = match.players.includes(USER_EMAIL);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{match.title}</Text>
        <Text style={styles.meta}>
          {new Date(match.date).toLocaleDateString()} · {match.timeLabel}
        </Text>
        <Text style={styles.meta}>{match.locationName}</Text>
        <Text style={styles.meta}>
          {match.players.length}/{match.maxPlayers} players · {match.status}
        </Text>
      </View>

      <View style={styles.row}>
        <Pressable
          style={[styles.action, busy && { opacity: 0.65 }]}
          onPress={onJoin}
          disabled={busy || joined}
        >
          <Text style={styles.actionText}>{joined ? "Joined" : "Join Match"}</Text>
        </Pressable>
        <Pressable
          style={[styles.actionSecondary, busy && { opacity: 0.65 }]}
          onPress={onSubmitDemoScore}
          disabled={busy}
        >
          <Text style={styles.actionSecondaryText}>Submit Demo Score</Text>
        </Pressable>
      </View>
      <Pressable
        style={styles.chatBtn}
        onPress={() => navigation.navigate("MatchChat", { matchId: match.id })}
      >
        <Text style={styles.chatBtnText}>Open Match Chat</Text>
      </Pressable>

      {(match.scoreTeamA || match.scoreTeamB) && (
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>Score</Text>
          <Text style={styles.scoreText}>Team A: {match.scoreTeamA || "-"}</Text>
          <Text style={styles.scoreText}>Team B: {match.scoreTeamB || "-"}</Text>
          <Text style={styles.scoreText}>Winner: {match.winnerTeam || "-"}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  meta: { marginTop: 4, color: COLORS.textMuted, fontSize: 13 },
  row: { flexDirection: "row", gap: 8, marginBottom: 12 },
  action: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
  },
  actionText: { color: COLORS.card, fontWeight: "700" },
  actionSecondary: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
  },
  actionSecondaryText: { color: COLORS.text, fontWeight: "700" },
  chatBtn: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginBottom: 12,
  },
  chatBtnText: { color: COLORS.primaryDark, fontWeight: "700" },
  scoreCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
  },
  scoreTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  scoreText: { fontSize: 13, color: COLORS.textSoft, marginBottom: 2 },
  empty: { marginTop: 24, color: COLORS.textMuted, textAlign: "center" },
});

