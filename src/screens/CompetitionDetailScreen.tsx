import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { CompetitionDetailDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { getCurrentUserEmail } from "../store";
import { useSnackbar } from "../components/Snackbar";
import { COLORS } from "../theme/colors";

export function CompetitionDetailScreen({
  route,
  navigation,
}: {
  route: { params: { id: string } };
  navigation: any;
}) {
  const { showSnackbar } = useSnackbar();
  const USER_EMAIL = getCurrentUserEmail();
  const id = route.params.id;
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [item, setItem] = React.useState<CompetitionDetailDto | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [joining, setJoining] = React.useState(false);
  const [showPaySheet, setShowPaySheet] = React.useState(false);
  const [tab, setTab] = React.useState<"bracket" | "standings" | "players">("bracket");

  const load = React.useCallback(async (opts?: { refresh?: boolean; silent?: boolean }) => {
    const silent = opts?.silent === true;
    const refresh = opts?.refresh === true;
    try {
      if (!silent && !refresh) setLoading(true);
      if (refresh) setRefreshing(true);
      const res = await api.get<CompetitionDetailDto>(`/competitions/${id}`);
      setItem(res);
    } catch {
      setItem(null);
    } finally {
      if (!silent && !refresh) setLoading(false);
      if (refresh) setRefreshing(false);
    }
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!item) return;
    const showBracket = item.type === "tournament" && item.format === "knockout";
    setTab(showBracket ? "bracket" : "standings");
  }, [item]);

  const advanceBracket = async () => {
    try {
      setBusy(true);
      await api.post(`/competitions/${id}/advance-bracket`);
      showSnackbar("Bracket advance queued", { type: "success" });
      await load({ silent: true });
    } catch {
      showSnackbar("Could not advance bracket", { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const joinCompetition = async (opts?: { paid?: boolean }) => {
    try {
      setJoining(true);
      await api.post(`/competitions/${id}/join`, { email: USER_EMAIL });
      const paid = opts?.paid;
      showSnackbar(paid ? "Payment complete. Joined competition! 🏆" : "Joined competition! 🏆", {
        type: "success",
      });
      setShowPaySheet(false);
      await load({ silent: true });
    } catch {
      showSnackbar("Could not join competition", { type: "error" });
    } finally {
      setJoining(false);
    }
  };

  const openCompetitionChat = async () => {
    if (!item) return;
    try {
      const conversations = await api.get<Array<{ id: string; type: string; entityId?: string }>>(
        `/conversations?email=${encodeURIComponent(USER_EMAIL)}`,
      );
      const existing = conversations.find((c) => c.type === "competition" && c.entityId === item.id);
      if (existing) {
        navigation.navigate("ConversationView", { id: existing.id });
        return;
      }

      const participants = Array.from(
        new Set([USER_EMAIL, ...item.participants, item.hostEmail || ""].filter(Boolean)),
      );
      const created = await api.post<{ id: string }>("/conversations", {
        type: "competition",
        participantEmails: participants,
        entityId: item.id,
        entityName: item.name,
      });
      navigation.navigate("ConversationView", { id: created.id });
    } catch {
      showSnackbar("Could not open competition chat", { type: "error" });
    }
  };

  if (loading) return <CompetitionDetailSkeleton />;
  if (!item)
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Competition not found.</Text>
      </View>
    );

  const maxPlayers = item.maxPlayers ?? 16;
  const playerCount = item.participants.length;
  const spotsLeft = Math.max(0, maxPlayers - playerCount);
  const isParticipant = item.participants.includes(USER_EMAIL);
  const isHost = item.hostEmail === USER_EMAIL;
  const registrationOpen = item.status === "registration";
  const isFull = playerCount >= maxPlayers;
  const entryFee = item.entryFee ?? 0;
  const computedPool = entryFee > 0 ? entryFee * playerCount * 0.975 : 0;
  const showBracketTab = item.type === "tournament" && item.format === "knockout";
  const standings = buildStandings(item.participants, item.matches);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ refresh: true })} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <View style={styles.badgeRow}>
            <Text style={styles.statusBadge}>{item.status.replaceAll("_", " ")}</Text>
            <Text style={styles.metaBadge}>{item.type === "league" ? "League" : "Tournament"}</Text>
            <Text style={styles.metaBadge}>{item.format.replaceAll("_", " ")}</Text>
          </View>
          <Text style={styles.title}>{item.name}</Text>
          {!!item.description && <Text style={styles.description}>{item.description}</Text>}

          <View style={styles.metaRow}>
            {!!item.locationName && (
              <Text style={styles.metaLine}>
                <Ionicons name="location-outline" size={12} color={COLORS.textMuted} /> {item.locationName}
              </Text>
            )}
            {!!item.startDate && (
              <Text style={styles.metaLine}>
                <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />{" "}
                {formatDateRange(item.startDate, item.endDate)}
              </Text>
            )}
            <Text style={styles.metaLine}>
              <Ionicons name="people-outline" size={12} color={COLORS.textMuted} /> {playerCount}/{maxPlayers} players
              {spotsLeft > 0 && registrationOpen ? ` · ${spotsLeft} spots left` : ""}
            </Text>
          </View>
        </View>

        {(entryFee > 0 || (item.prizePool ?? 0) > 0) && (
          <View style={styles.prizeCard}>
            <View style={styles.prizeTitleRow}>
              <Ionicons name="trophy-outline" size={15} color={COLORS.primaryDark} />
              <Text style={styles.prizeTitle}>Prize Info</Text>
            </View>
            {entryFee > 0 && (
              <>
                <Text style={styles.prizeLine}>Entry fee: £{entryFee.toFixed(2)}</Text>
                <Text style={styles.prizeLine}>
                  Current pool: £{(item.prizePool ?? computedPool).toFixed(2)}
                </Text>
                <Text style={styles.prizeSub}>Platform fee (2.5%) deducted</Text>
              </>
            )}
          </View>
        )}

        <View style={styles.actionsWrap}>
          {!isParticipant && registrationOpen && !isFull && (
            <Pressable
              style={[styles.primaryAction, joining && styles.actionDisabled]}
              disabled={joining}
              onPress={() => {
                if (entryFee > 0) setShowPaySheet(true);
                else joinCompetition();
              }}
            >
              {joining ? (
                <ActivityIndicator color={COLORS.card} />
              ) : (
                <>
                  <Ionicons name={entryFee > 0 ? "card-outline" : "person-add-outline"} size={15} color={COLORS.card} />
                  <Text style={styles.primaryActionText}>
                    {entryFee > 0 ? `Join — Pay £${entryFee.toFixed(2)}` : "Join for Free 🏆"}
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {isHost && registrationOpen && (
            <Pressable style={[styles.secondaryAction, busy && styles.actionDisabled]} onPress={advanceBracket} disabled={busy}>
              <Ionicons name="git-branch-outline" size={15} color={COLORS.text} />
              <Text style={styles.secondaryActionText}>Start Tournament & Generate Bracket</Text>
            </Pressable>
          )}

          {(isParticipant || isHost) && (
            <Pressable style={styles.secondaryAction} onPress={openCompetitionChat}>
              <Ionicons name="chatbubble-ellipses-outline" size={15} color={COLORS.text} />
              <Text style={styles.secondaryActionText}>Competition Chat</Text>
            </Pressable>
          )}

          {(isParticipant || isHost) && (
            <Pressable
              style={styles.secondaryAction}
              onPress={() =>
                navigation.navigate("InvitePlayers", {
                  eventId: item.id,
                  eventKind: "competition",
                  eventTitle: item.name,
                  eventSubtitle: item.locationName || undefined,
                })
              }
            >
              <Ionicons name="mail-outline" size={15} color={COLORS.text} />
              <Text style={styles.secondaryActionText}>Invite Players</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.tabWrap}>
          {showBracketTab && (
            <Pressable style={[styles.tabBtn, tab === "bracket" && styles.tabBtnActive]} onPress={() => setTab("bracket")}>
              <Text style={[styles.tabBtnText, tab === "bracket" && styles.tabBtnTextActive]}>Bracket</Text>
            </Pressable>
          )}
          <Pressable style={[styles.tabBtn, tab === "standings" && styles.tabBtnActive]} onPress={() => setTab("standings")}>
            <Text style={[styles.tabBtnText, tab === "standings" && styles.tabBtnTextActive]}>Standings</Text>
          </Pressable>
          <Pressable style={[styles.tabBtn, tab === "players" && styles.tabBtnActive]} onPress={() => setTab("players")}>
            <Text style={[styles.tabBtnText, tab === "players" && styles.tabBtnTextActive]}>
              Players ({playerCount})
            </Text>
          </Pressable>
        </View>

        {tab === "bracket" && (
          <View style={styles.section}>
            {groupByRound(item.matches).length === 0 ? (
              <Text style={styles.emptyText}>No bracket matches yet.</Text>
            ) : (
              groupByRound(item.matches).map((round) => (
                <View key={round.round} style={styles.roundGroup}>
                  <Text style={styles.roundTitle}>Round {round.round}</Text>
                  {round.matches.map((m) => (
                    <View key={m.id} style={styles.matchCard}>
                      <Text style={styles.matchTitle}>
                        {m.player1Name || "TBD"} vs {m.player2Name || "TBD"}
                      </Text>
                      <Text style={styles.matchMeta}>{m.status.replaceAll("_", " ")}</Text>
                      {(m.scorePlayer1 || m.scorePlayer2) && (
                        <Text style={styles.matchScore}>
                          {m.scorePlayer1 || "0"} - {m.scorePlayer2 || "0"}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        )}

        {tab === "standings" && (
          <View style={styles.section}>
            {standings.length === 0 ? (
              <Text style={styles.emptyText}>Standings will appear after completed matches.</Text>
            ) : (
              standings.map((row, index) => (
                <View key={row.email} style={styles.standingRow}>
                  <Text style={styles.standingPos}>{index + 1}</Text>
                  <View style={styles.standingMain}>
                    <Text style={styles.standingName}>{displayName(row.email)}</Text>
                    <Text style={styles.standingMeta}>
                      W {row.wins} · L {row.losses} · D {row.draws}
                    </Text>
                  </View>
                  <Text style={styles.standingPoints}>{row.points} pts</Text>
                </View>
              ))
            )}
          </View>
        )}

        {tab === "players" && (
          <View style={styles.section}>
            {item.participants.length === 0 ? (
              <Text style={styles.emptyText}>No players yet.</Text>
            ) : (
              item.participants.map((email) => (
                <View key={email} style={styles.playerCard}>
                  <View style={styles.playerAvatar}>
                    <Text style={styles.playerAvatarText}>{displayName(email).slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={styles.playerMain}>
                    <Text style={styles.playerName}>{displayName(email)}</Text>
                    <Text style={styles.playerEmail}>{email}</Text>
                  </View>
                  {entryFee > 0 ? <Text style={styles.playerFee}>£{entryFee.toFixed(0)}</Text> : <Text style={styles.playerFeeFree}>Free</Text>}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={showPaySheet} transparent animationType="fade" onRequestClose={() => setShowPaySheet(false)}>
        <View style={styles.payOverlay}>
          <Pressable style={styles.payBackdrop} onPress={() => setShowPaySheet(false)} />
          <View style={styles.paySheet}>
            <Text style={styles.payTitle}>Confirm Payment</Text>
            <Text style={styles.payText}>
              Pay £{entryFee.toFixed(2)} to join `{item.name}`?
            </Text>
            <View style={styles.payActions}>
              <Pressable style={styles.payCancel} onPress={() => setShowPaySheet(false)}>
                <Text style={styles.payCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.payConfirm, joining && styles.actionDisabled]} onPress={() => joinCompetition({ paid: true })}>
                <Text style={styles.payConfirmText}>{joining ? "Processing..." : "Pay & Join"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start) return "";
  const s = new Date(start).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  if (!end) return s;
  const e = new Date(end).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  return s === e ? s : `${s} - ${e}`;
}

function displayName(email: string) {
  return email.split("@")[0].replaceAll(".", " ");
}

function groupByRound(matches: CompetitionDetailDto["matches"]) {
  const roundMap = new Map<number, CompetitionDetailDto["matches"]>();
  for (const m of matches) {
    const list = roundMap.get(m.round) || [];
    list.push(m);
    roundMap.set(m.round, list);
  }
  return Array.from(roundMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([round, grouped]) => ({ round, matches: grouped }));
}

function buildStandings(participants: string[], matches: CompetitionDetailDto["matches"]) {
  const table = new Map<string, { email: string; points: number; wins: number; losses: number; draws: number }>();
  for (const p of participants) {
    table.set(p, { email: p, points: 0, wins: 0, losses: 0, draws: 0 });
  }
  for (const m of matches) {
    if (m.status !== "completed") continue;
    if (!m.player1Email || !m.player2Email) continue;
    if (!table.has(m.player1Email)) table.set(m.player1Email, { email: m.player1Email, points: 0, wins: 0, losses: 0, draws: 0 });
    if (!table.has(m.player2Email)) table.set(m.player2Email, { email: m.player2Email, points: 0, wins: 0, losses: 0, draws: 0 });

    const p1 = table.get(m.player1Email)!;
    const p2 = table.get(m.player2Email)!;
    if (m.winnerEmail === m.player1Email) {
      p1.wins += 1;
      p1.points += 3;
      p2.losses += 1;
      continue;
    }
    if (m.winnerEmail === m.player2Email) {
      p2.wins += 1;
      p2.points += 3;
      p1.losses += 1;
      continue;
    }

    const s1 = Number(m.scorePlayer1);
    const s2 = Number(m.scorePlayer2);
    if (!Number.isNaN(s1) && !Number.isNaN(s2)) {
      if (s1 > s2) {
        p1.wins += 1;
        p1.points += 3;
        p2.losses += 1;
      } else if (s2 > s1) {
        p2.wins += 1;
        p2.points += 3;
        p1.losses += 1;
      } else {
        p1.draws += 1;
        p2.draws += 1;
        p1.points += 1;
        p2.points += 1;
      }
    }
  }

  return Array.from(table.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.losses - b.losses;
  });
}

function CompetitionDetailSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <SkeletonBlock width="72%" height={20} rounded={8} />
        <View style={styles.skeletonGap} />
        <SkeletonBlock width="90%" height={11} rounded={8} />
        <View style={styles.skeletonGap} />
        <SkeletonBlock width="64%" height={11} rounded={8} />
      </View>
      <View style={styles.prizeCard}>
        <SkeletonBlock width="36%" height={12} rounded={8} />
        <View style={styles.skeletonGap} />
        <SkeletonBlock width="48%" height={10} rounded={8} />
      </View>
      <SkeletonBlock width="100%" height={42} rounded={10} />
      <View style={styles.skeletonGapLg} />
      <SkeletonBlock width="100%" height={36} rounded={11} />
      <View style={styles.skeletonGapLg} />
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={styles.matchCard}>
          <SkeletonBlock width="68%" height={11} rounded={8} />
          <View style={styles.skeletonGap} />
          <SkeletonBlock width="38%" height={10} rounded={8} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 14, paddingTop: 10 },
  content: { paddingBottom: 110 },
  hero: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 11,
    marginBottom: 8,
  },
  badgeRow: { flexDirection: "row", gap: 5, flexWrap: "wrap", marginBottom: 7 },
  statusBadge: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "capitalize",
    color: COLORS.primaryDark,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: "hidden",
  },
  metaBadge: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "capitalize",
    color: COLORS.textMuted,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: "hidden",
  },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  description: { marginTop: 4, fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },
  metaRow: { marginTop: 8, gap: 4 },
  metaLine: { fontSize: 11, color: COLORS.textMuted },
  prizeCard: {
    borderWidth: 1,
    borderColor: COLORS.primaryPale,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  prizeTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  prizeTitle: { color: COLORS.primaryDark, fontSize: 12, fontWeight: "700" },
  prizeLine: { color: COLORS.text, fontSize: 11, marginBottom: 2 },
  prizeSub: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  actionsWrap: { gap: 7, marginBottom: 9 },
  primaryAction: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },
  primaryActionText: { color: COLORS.card, fontSize: 12, fontWeight: "700" },
  secondaryAction: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
  },
  secondaryActionText: { color: COLORS.text, fontWeight: "700", fontSize: 12 },
  actionDisabled: { opacity: 0.65 },
  tabWrap: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    padding: 4,
    marginBottom: 8,
  },
  tabBtn: { flex: 1, borderRadius: 9, paddingVertical: 7, alignItems: "center", justifyContent: "center" },
  tabBtnActive: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  tabBtnText: { color: COLORS.textMuted, fontWeight: "700", fontSize: 11 },
  tabBtnTextActive: { color: COLORS.text },
  section: { marginBottom: 8 },
  roundGroup: { marginBottom: 8 },
  roundTitle: { fontSize: 12, color: COLORS.text, fontWeight: "700", marginBottom: 5 },
  matchCard: {
    backgroundColor: COLORS.card,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    marginBottom: 8,
  },
  matchTitle: { fontSize: 12, color: COLORS.text, fontWeight: "700" },
  matchMeta: { marginTop: 2, fontSize: 10, color: COLORS.textMuted, textTransform: "capitalize" },
  matchScore: { marginTop: 2, fontSize: 11, color: COLORS.primaryDark, fontWeight: "700" },
  standingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    padding: 10,
    marginBottom: 7,
  },
  standingPos: { color: COLORS.textMuted, width: 18, fontWeight: "700", fontSize: 11, textAlign: "center" },
  standingMain: { flex: 1 },
  standingName: { color: COLORS.text, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  standingMeta: { color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  standingPoints: { color: COLORS.primaryDark, fontSize: 11, fontWeight: "800" },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    padding: 9,
    marginBottom: 7,
  },
  playerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoftAlt,
  },
  playerAvatarText: { color: COLORS.primaryDark, fontSize: 12, fontWeight: "700" },
  playerMain: { flex: 1 },
  playerName: { color: COLORS.text, fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  playerEmail: { color: COLORS.textMuted, fontSize: 10 },
  playerFee: { color: COLORS.primaryDark, fontSize: 10, fontWeight: "700" },
  playerFeeFree: { color: COLORS.successText, fontSize: 10, fontWeight: "700" },
  emptyText: { textAlign: "center", color: COLORS.textMuted, marginTop: 14, fontSize: 11 },
  payOverlay: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
  payBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  paySheet: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  payTitle: { color: COLORS.text, fontSize: 15, fontWeight: "800", marginBottom: 5 },
  payText: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
  payActions: { marginTop: 12, flexDirection: "row", gap: 8 },
  payCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    backgroundColor: COLORS.bg,
  },
  payCancelText: { color: COLORS.text, fontSize: 12, fontWeight: "700" },
  payConfirm: {
    flex: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    backgroundColor: COLORS.primary,
  },
  payConfirmText: { color: COLORS.card, fontSize: 12, fontWeight: "700" },
  skeletonGap: { height: 7 },
  skeletonGapLg: { height: 10 },
});

