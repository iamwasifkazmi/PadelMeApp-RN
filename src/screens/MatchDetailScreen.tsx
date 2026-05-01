import React from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { useSnackbar } from "../components/Snackbar";
import { MatchDto, UserDto } from "../lib/types";
import { ScreenSkeleton } from "../components/Skeleton";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";

type MatchStatusValue = "open" | "full" | "in_progress" | "awaiting_score" | "pending_validation" | "completed" | string;

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
  const [usersMap, setUsersMap] = React.useState<Record<string, UserDto>>({});
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const m = await api.get<MatchDto>(`/matches/${id}`);
      setMatch(m);
      if (m.players.length > 0) {
        const users = await api.get<UserDto[]>("/users");
        const map: Record<string, UserDto> = {};
        users.forEach((u) => {
          map[u.email] = u;
        });
        setUsersMap(map);
      }
    } catch {
      setMatch(null);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    load(false);
  }, [load]);

  const onJoin = async () => {
    if (!match) return;
    try {
      setBusy(true);
      await api.post<MatchDto>(`/matches/${match.id}/join`, { email: USER_EMAIL });
      await load(true);
      showSnackbar("You're in! 🎉", { type: "success" });
    } catch {
      showSnackbar("Could not join match", { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onLeave = async () => {
    if (!match) return;
    try {
      setBusy(true);
      await api.post<MatchDto>(`/matches/${match.id}/leave`, { email: USER_EMAIL });
      await load(true);
      showSnackbar("You left the match.", { type: "success" });
    } catch {
      showSnackbar("Could not leave match", { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onStart = async () => {
    if (!match) return;
    try {
      setBusy(true);
      await api.post<MatchDto>(`/matches/${match.id}/start`);
      await load(true);
      showSnackbar("Match started ▶", { type: "success" });
    } catch {
      showSnackbar("Could not start match", { type: "error" });
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
      await load(true);
      showSnackbar("Score submitted 🎾", { type: "success" });
    } catch {
      showSnackbar("Could not submit score", { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <ScreenSkeleton rows={6} topGap={12} />;

  if (!match) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Match not found.</Text>
      </View>
    );
  }

  const joined = match.players.includes(USER_EMAIL);
  const isFull = match.players.length >= match.maxPlayers;
  const spotsLeft = Math.max(0, match.maxPlayers - match.players.length);
  const status = match.status as MatchStatusValue;
  const canJoin = !joined && status === "open" && !isFull;
  const canLeave = joined && ["open", "full"].includes(status);
  const canStart = joined && ["open", "full"].includes(status);
  const canSubmitScore = joined && ["in_progress", "awaiting_score"].includes(status);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
    >
      <View style={styles.topRow}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={16} color={COLORS.textMuted} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.topTitle}>Match Detail</Text>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.badgeRow}>
          {match.isInstant ? <Text style={styles.instantPill}>⚡ Instant</Text> : null}
          <Text style={styles.skillPill}>{match.skillLevel || "any"}</Text>
          <Text style={[styles.statusPill, getStatusStyle(status)]}>{statusLabel(status)}</Text>
        </View>
        <Text style={styles.title}>{match.title}</Text>
        <InfoRow icon="calendar-outline" value={new Date(match.date).toLocaleDateString()} />
        <InfoRow icon="time-outline" value={`${match.timeLabel} · ${match.durationMinutes || 90} min`} />
        <InfoRow icon="location-outline" value={match.locationAddress ? `${match.locationName} · ${match.locationAddress}` : match.locationName} />
        <InfoRow icon="people-outline" value={`${match.players.length}/${match.maxPlayers} players${spotsLeft > 0 ? ` · ${spotsLeft} spots left` : ""}`} />
        {match.tags?.length ? (
          <View style={styles.tagsRow}>
            {match.tags.map((tag) => (
              <Text key={tag} style={styles.tagChip}>{tag}</Text>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.playersCard}>
        <Text style={styles.sectionTitle}>Players</Text>
        {match.players.map((email) => {
          const user = usersMap[email];
          return (
            <View key={email} style={styles.playerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(user?.fullName || email)}</Text>
              </View>
              <View style={styles.playerTextWrap}>
                <Text style={styles.playerName}>{user?.fullName || email.split("@")[0]}</Text>
                <Text style={styles.playerMeta}>
                  {email === USER_EMAIL ? "You" : user?.location || "Player"}
                </Text>
              </View>
            </View>
          );
        })}
        {spotsLeft > 0 ? (
          <View style={styles.openSlots}>
            <Text style={styles.openSlotsText}>
              {spotsLeft} open spot{spotsLeft > 1 ? "s" : ""} remaining
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.chatBtn]}
          onPress={() => navigation.navigate("MatchChat", { matchId: match.id })}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={17} color={COLORS.primaryDark} />
          <Text style={styles.chatBtnText}>Match Chat</Text>
        </Pressable>

        {canJoin ? (
          <Pressable style={[styles.primaryBtn, busy && styles.disabled]} disabled={busy} onPress={onJoin}>
            <Text style={styles.primaryBtnText}>{busy ? "Joining..." : "Join Match 🎾"}</Text>
          </Pressable>
        ) : null}

        {canLeave ? (
          <Pressable style={[styles.secondaryBtn, busy && styles.disabled]} disabled={busy} onPress={onLeave}>
            <Text style={styles.secondaryBtnText}>{busy ? "Leaving..." : "Leave Match"}</Text>
          </Pressable>
        ) : null}

        {canStart ? (
          <Pressable style={[styles.primaryBtn, busy && styles.disabled]} disabled={busy} onPress={onStart}>
            <Text style={styles.primaryBtnText}>{busy ? "Starting..." : "Start Match ▶"}</Text>
          </Pressable>
        ) : null}

        {canSubmitScore ? (
          <Pressable style={[styles.primaryBtn, busy && styles.disabled]} disabled={busy} onPress={onSubmitDemoScore}>
            <Text style={styles.primaryBtnText}>{busy ? "Submitting..." : "Submit Score 🎾"}</Text>
          </Pressable>
        ) : null}

        {joined && status !== "completed" ? (
          <Pressable
            style={[styles.secondaryBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={() => navigation.navigate("InvitePlayers", { eventId: match.id })}
          >
            <Text style={styles.secondaryBtnText}>Invite Players</Text>
          </Pressable>
        ) : null}

        {status === "completed" && (match.scoreTeamA || match.scoreTeamB) ? (
          <View style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>Result</Text>
            <Text style={styles.scoreLine}>Team A: {match.scoreTeamA || "-"}</Text>
            <Text style={styles.scoreLine}>Team B: {match.scoreTeamB || "-"}</Text>
            <Text style={styles.scoreLine}>Winner: {match.winnerTeam || "-"}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function InfoRow({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={15} color={COLORS.textMuted} />
      <Text style={styles.infoText}>{value}</Text>
    </View>
  );
}

function statusLabel(status: MatchStatusValue) {
  if (status === "in_progress") return "In Progress";
  if (status === "awaiting_score") return "Awaiting Score";
  if (status === "pending_validation") return "Pending Validation";
  if (status === "completed") return "Completed";
  if (status === "full") return "Full";
  return "Open";
}

function getStatusStyle(status: MatchStatusValue) {
  if (status === "completed") return styles.statusCompleted;
  if (status === "in_progress") return styles.statusProgress;
  if (status === "full") return styles.statusFull;
  return styles.statusOpen;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || "")
    .join("");
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 110 },
  topRow: { marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" },
  backText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },
  topTitle: { color: COLORS.text, fontSize: 14, fontWeight: "800" },
  heroCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  badgeRow: { flexDirection: "row", gap: 6, marginBottom: 8, flexWrap: "wrap" },
  instantPill: {
    borderRadius: 999,
    backgroundColor: COLORS.warningSoft,
    color: COLORS.warningText,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "800",
    overflow: "hidden",
  },
  skillPill: {
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
    color: COLORS.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "800",
    overflow: "hidden",
    textTransform: "capitalize",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "800",
    overflow: "hidden",
  },
  statusOpen: { backgroundColor: COLORS.successSoft, color: COLORS.successText },
  statusFull: { backgroundColor: COLORS.warningSoft, color: COLORS.warningText },
  statusProgress: { backgroundColor: COLORS.infoSoft, color: COLORS.infoText },
  statusCompleted: { backgroundColor: COLORS.border, color: COLORS.textSubtle },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text, marginBottom: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  infoText: { color: COLORS.textSubtle, fontSize: 13, flex: 1 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  tagChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.primarySoft,
    color: COLORS.primaryDark,
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  playersCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: "800", marginBottom: 8 },
  playerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoftAlt,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: { color: COLORS.primaryDark, fontSize: 12, fontWeight: "800" },
  playerTextWrap: { flex: 1 },
  playerName: { color: COLORS.text, fontSize: 13, fontWeight: "700" },
  playerMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  openSlots: {
    marginTop: 2,
    borderRadius: 10,
    backgroundColor: COLORS.primaryPale,
    borderWidth: 1,
    borderColor: COLORS.primarySoftAlt,
    paddingVertical: 8,
    alignItems: "center",
  },
  openSlotsText: { color: COLORS.primaryDark, fontSize: 11, fontWeight: "700" },
  actions: { gap: 8 },
  chatBtn: {
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  chatBtnText: { color: COLORS.primaryDark, fontSize: 13, fontWeight: "700" },
  primaryBtn: {
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  primaryBtnText: { color: COLORS.card, fontSize: 14, fontWeight: "800" },
  secondaryBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
  },
  secondaryBtnText: { color: COLORS.text, fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.65 },
  scoreCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 12,
    marginTop: 2,
  },
  scoreTitle: { color: COLORS.text, fontSize: 13, fontWeight: "800", marginBottom: 6 },
  scoreLine: { color: COLORS.textSubtle, fontSize: 12, marginBottom: 3 },
  emptyText: { marginTop: 24, color: COLORS.textMuted, textAlign: "center" },
});
