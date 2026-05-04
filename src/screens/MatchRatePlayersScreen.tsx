import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { MatchDto, UserDto } from "../lib/types";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";
import { useSnackbar } from "../components/Snackbar";

const STARS = [1, 2, 3, 4, 5] as const;

function emailsMatch(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function MatchRatePlayersScreen({
  route,
  navigation,
}: {
  route: { params: { matchId: string } };
  navigation: { goBack: () => void };
}) {
  const { showSnackbar } = useSnackbar();
  const USER_EMAIL = getCurrentUserEmail();
  const { matchId } = route.params;
  const [match, setMatch] = React.useState<MatchDto | null>(null);
  const [usersMap, setUsersMap] = React.useState<Record<string, UserDto>>({});
  const [scores, setScores] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const m = await api.get<MatchDto>(`/matches/${matchId}`);
      setMatch(m);
      const others = m.players.filter((e) => !emailsMatch(e, USER_EMAIL));
      const users = await api.get<UserDto[]>("/users");
      const map: Record<string, UserDto> = {};
      users.forEach((u) => {
        map[u.email] = u;
      });
      setUsersMap(map);

      const existing = await api.get<{ ratedEmail: string; overall: number }[]>(
        `/ratings/match/${matchId}?raterEmail=${encodeURIComponent(USER_EMAIL)}`,
      );
      const initial: Record<string, number> = {};
      for (const e of existing) {
        initial[e.ratedEmail] = e.overall;
      }
      for (const e of others) {
        if (initial[e] == null) initial[e] = 5;
      }
      setScores(initial);
    } catch {
      setMatch(null);
    } finally {
      setLoading(false);
    }
  }, [USER_EMAIL, matchId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const others = React.useMemo(
    () => (match ? match.players.filter((e) => !emailsMatch(e, USER_EMAIL)) : []),
    [match, USER_EMAIL],
  );

  const onSubmit = async () => {
    if (!match || others.length === 0) return;
    const ratings = others.map((email) => ({
      ratedEmail: email,
      overall: scores[email] ?? 5,
    }));
    if (ratings.some((r) => r.overall < 1 || r.overall > 5)) {
      showSnackbar("Pick 1–5 stars for each player", { type: "error" });
      return;
    }
    try {
      setSaving(true);
      await api.post("/ratings/match", { matchId: match.id, raterEmail: USER_EMAIL, ratings });
      showSnackbar("Thanks — ratings saved!", { type: "success" });
      navigation.goBack();
    } catch {
      showSnackbar("Could not save ratings", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !match) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  if (match.status !== "completed") {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Ratings unlock after the match is completed.</Text>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Pressable style={styles.backIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>Rate players</Text>
      </View>
      <Text style={styles.subtitle}>Uber-style stars (1–5) for everyone you played with.</Text>

      {others.map((email) => {
        const u = usersMap[email];
        const name = u?.fullName || email.split("@")[0];
        const v = scores[email] ?? 5;
        return (
          <View key={email} style={styles.card}>
            <Text style={styles.playerName}>{name}</Text>
            <View style={styles.starRow}>
              {STARS.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setScores((s) => ({ ...s, [email]: n }))}
                  style={styles.starHit}
                >
                  <Ionicons
                    name={n <= v ? "star" : "star-outline"}
                    size={26}
                    color={n <= v ? "#F59E0B" : COLORS.borderStrong}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}

      <Pressable
        style={[styles.primaryBtn, saving && styles.disabled]}
        disabled={saving || others.length === 0}
        onPress={() => onSubmit().catch(() => undefined)}
      >
        <Text style={styles.primaryBtnText}>{saving ? "Saving…" : "Submit ratings"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  muted: { color: COLORS.textMuted },
  topRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  backIcon: { padding: 4 },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text, flex: 1 },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 18 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  playerName: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 10 },
  starRow: { flexDirection: "row", gap: 6, justifyContent: "center" },
  starHit: { padding: 4 },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: COLORS.card, fontWeight: "800", fontSize: 15 },
  disabled: { opacity: 0.65 },
  backBtn: { marginTop: 16, paddingVertical: 10 },
  backBtnText: { color: COLORS.primary, fontWeight: "700" },
});
