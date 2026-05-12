import React from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { useSnackbar } from "../components/Snackbar";
import { MatchResultPanel } from "../components/MatchResultPanel";
import { UserAvatar } from "../components/UserAvatar";
import { MatchDto, PlayerRecentFormDto, UserDto } from "../lib/types";
import { ScreenSkeleton } from "../components/Skeleton";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";
import { userLocationLabel } from "../lib/userLocation";
import { displayMatchTitle } from "../lib/matchDisplay";
import { validateMatchRosterForUi } from "../lib/matchEligibilityUi";
import { isDoublesFormat } from "../lib/matchFormat";
import { parseEvidenceBlob, serializeEvidenceBlob } from "../lib/matchEvidence";
import {
  viewerCanValidatePendingScore,
  shouldShowConfirmScoreCta,
} from "../lib/matchPendingScore";
import { ConfirmMatchResultModal, SubmitMatchScoreModal } from "../components/MatchScoreFlowModals";
import { scheduledNonInstantJoinAllowed } from "../lib/matchSchedule";

const MAX_EVIDENCE_PHOTOS = 8;
const MAX_EVIDENCE_PER_IMAGE_CHARS = 130_000;
const MAX_EVIDENCE_TOTAL_CHARS = 900_000;

const evidencePreviewStyles = StyleSheet.create({
  previewWrap: { marginTop: 8, gap: 6 },
  previewLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted },
  previewRow: { flexDirection: "row", gap: 8, alignItems: "center", paddingVertical: 4 },
  previewThumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: COLORS.borderMuted },
});

function EvidenceAttachmentsPreview({ blob }: { blob: string }) {
  const items = parseEvidenceBlob(blob);
  const imgs = items.filter((x) => x.startsWith("data:image/"));
  if (!imgs.length) return null;

  return (
    <View style={evidencePreviewStyles.previewWrap}>
      <Text style={evidencePreviewStyles.previewLabel}>Evidence photos</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={evidencePreviewStyles.previewRow}
      >
        {imgs.map((uri, i) => (
          <Image key={`evpv-${i}`} source={{ uri }} style={evidencePreviewStyles.previewThumb} />
        ))}
      </ScrollView>
    </View>
  );
}

type MatchStatusValue =
  | "open"
  | "full"
  | "in_progress"
  | "awaiting_score"
  | "pending_validation"
  | "completed"
  | "cancelled"
  | "disputed"
  | string;

function emailsMatch(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function emailListed(list: string[] | undefined, e: string) {
  return (list || []).some((x) => emailsMatch(x, e));
}

function doublesNeedsLock(m: MatchDto) {
  return isDoublesFormat(m) && m.maxPlayers >= 4 && m.players.length >= 4;
}

function matchDtoDateIso(m: MatchDto): string {
  const raw = m.date as unknown;
  if (typeof raw === "string") return raw;
  if (raw instanceof Date) return raw.toISOString();
  return "";
}

function matchEligibilitySummary(m: MatchDto): string | null {
  const parts: string[] = [];
  const g = (m.genderRequirement || "any").toLowerCase();
  if (g && g !== "any") parts.push(`Gender: ${g}`);
  if (m.ageMin != null || m.ageMax != null) {
    parts.push(`Age: ${m.ageMin ?? "—"}–${m.ageMax ?? "—"}`);
  }
  if (m.skillRangeMin != null || m.skillRangeMax != null) {
    parts.push(`Skill (1–10): ${m.skillRangeMin ?? "—"}–${m.skillRangeMax ?? "—"}`);
  }
  if (m.minRatingThreshold != null) {
    parts.push(`Min avg rating: ${m.minRatingThreshold}`);
  }
  const v = (m.verificationRequirement || "none").toLowerCase();
  if (v && v !== "none") parts.push(`Verification: ${v}`);
  if (!parts.length) return null;
  return `Requirements: ${parts.join(" · ")}`;
}

function teamsPartitionPlayers(teamA: string[], teamB: string[], players: string[]): boolean {
  if (!players.length) return false;
  const u = new Set([...teamA, ...teamB]);
  if (u.size !== teamA.length + teamB.length) return false;
  for (const p of [...teamA, ...teamB]) {
    if (!players.some((x) => emailsMatch(x, p))) return false;
  }
  if (u.size !== players.length) return false;
  return true;
}

/** Extra copy so organisers see what to tap next (Start is disabled until these steps are done). */
function organizerStartBlockHelp(reason: string): string | null {
  if (!reason) return null;
  if (reason.includes("Lock line-ups")) {
    return 'Saving teams (Apply or Auto-balance) is not enough for doubles: tap "Lock line-ups" next, then Start Match.';
  }
  if (reason.includes("Team A needs") || reason.includes("Team B needs")) {
    return "Put 2 players on each team, then tap Apply line-ups — or use Auto-balance. Unsaved picks in this screen do not count.";
  }
  if (reason.includes("every player once")) {
    return "Each roster player must be on exactly one team. Adjust picks and Apply line-ups again.";
  }
  return null;
}

/** Base44-style start validation (structure + roster eligibility). */
function validateMatchStartForUi(m: MatchDto, usersMap: Record<string, UserDto>): { valid: boolean; reason: string } {
  const players = m.players || [];
  const maxP = m.maxPlayers;
  if (maxP > 0 && players.length < maxP) {
    return {
      valid: false,
      reason: `Fill the roster before starting (${players.length}/${maxP} players)`,
    };
  }
  const teamA = m.teamA || [];
  const teamB = m.teamB || [];
  const doublesStyle = isDoublesFormat(m);
  let effA = [...teamA];
  let effB = [...teamB];
  if (players.length === 2 && !doublesStyle && (effA.length === 0 || effB.length === 0)) {
    effA = [players[0]];
    effB = [players[1]];
  }

  const minRequired = doublesStyle ? 4 : 2;
  if (players.length < minRequired) {
    const missing = minRequired - players.length;
    if (doublesStyle) {
      if (effA.length < 2) {
        return { valid: false, reason: `Team A needs ${2 - effA.length} more player(s)` };
      }
      if (effB.length < 2) {
        return { valid: false, reason: `Team B needs ${2 - effB.length} more player(s)` };
      }
      return { valid: false, reason: `Waiting for ${missing} more player(s)` };
    }
    return { valid: false, reason: `Waiting for ${missing} more player(s)` };
  }

  if (doublesStyle && players.length >= 4) {
    if (effA.length < 2) {
      return { valid: false, reason: `Team A needs ${2 - effA.length} more player(s)` };
    }
    if (effB.length < 2) {
      return { valid: false, reason: `Team B needs ${2 - effB.length} more player(s)` };
    }
    if (!m.teamsLocked) {
      return { valid: false, reason: "Lock line-ups before starting this doubles match." };
    }
    if (!teamsPartitionPlayers(effA, effB, players)) {
      return { valid: false, reason: "Teams must include every player once." };
    }
    if (effA.length !== 2 || effB.length !== 2) {
      return { valid: false, reason: "Doubles needs two players on each team." };
    }
  }

  const all = [...effA, ...effB];
  if (new Set(all.map((e) => e.trim().toLowerCase())).size !== all.length) {
    return { valid: false, reason: "A player cannot be on both teams." };
  }

  if (!doublesStyle && (effA.length > 0 || effB.length > 0)) {
    if (effA.length !== 1 || effB.length !== 1) {
      return { valid: false, reason: "Teams misconfigured for singles." };
    }
  }

  const roster = validateMatchRosterForUi(m, usersMap);
  if (!roster.valid) return roster;

  return { valid: true, reason: "" };
}

export function MatchDetailScreen({
  route,
  navigation,
}: {
  route: { params: { id: string; openConfirmScore?: boolean } };
  navigation: any;
}) {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useSnackbar();
  const USER_EMAIL = getCurrentUserEmail();
  const id = route.params.id;
  const [match, setMatch] = React.useState<MatchDto | null>(null);
  const [usersMap, setUsersMap] = React.useState<Record<string, UserDto>>({});
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [scoreA, setScoreA] = React.useState("");
  const [scoreB, setScoreB] = React.useState("");
  const [evidencePhotoUris, setEvidencePhotoUris] = React.useState<string[]>([]);
  const [winnerPick, setWinnerPick] = React.useState<"team_a" | "team_b" | "">("");
  const [teamDraft, setTeamDraft] = React.useState<Record<string, "a" | "b" | null>>({});
  const [recentForm, setRecentForm] = React.useState<PlayerRecentFormDto | null>(null);
  const [disputeReason, setDisputeReason] = React.useState("");
  const pendingScoreDraftSyncKey = React.useRef("");
  const [submitScoreModalOpen, setSubmitScoreModalOpen] = React.useState(false);
  const [confirmScoreModalOpen, setConfirmScoreModalOpen] = React.useState(false);

  React.useEffect(() => {
    setScoreA("");
    setScoreB("");
    setEvidencePhotoUris([]);
    setWinnerPick("");
    setDisputeReason("");
    pendingScoreDraftSyncKey.current = "";
  }, [id]);

  const teamsSyncKey = match
    ? `${match.id}:${match.teamsLocked}:${match.players.join("|")}:${(match.teamA || []).join(",")}:${(match.teamB || []).join(",")}`
    : "";

  React.useEffect(() => {
    if (!match) return;
    const d: Record<string, "a" | "b" | null> = {};
    for (const p of match.players) d[p] = null;
    for (const e of match.teamA || [])
      if (match.players.some((pl) => emailsMatch(pl, e))) {
        const key = match.players.find((pl) => emailsMatch(pl, e))!;
        d[key] = "a";
      }
    for (const e of match.teamB || [])
      if (match.players.some((pl) => emailsMatch(pl, e))) {
        const key = match.players.find((pl) => emailsMatch(pl, e))!;
        d[key] = "b";
      }
    setTeamDraft(d);
    // teamsSyncKey already reflects match.players + teamA + teamB + teamsLocked.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only when that snapshot changes
  }, [teamsSyncKey]);

  const load = React.useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const m = await api.get<MatchDto>(`/matches/${id}`);
        setMatch(m);
        const emailSet = new Set<string>([
          ...m.players,
          ...(m.teamA || []),
          ...(m.teamB || []),
        ]);
        if (m.hostEmail) emailSet.add(m.hostEmail);
        if (emailSet.size > 0) {
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
    },
    [id],
  );

  React.useEffect(() => {
    load(false);
  }, [load]);

  React.useEffect(() => {
    if (!match) return;
    if (match.status !== "pending_validation") {
      pendingScoreDraftSyncKey.current = "";
      return;
    }
    if (!match.scoreSubmittedBy || !emailsMatch(match.scoreSubmittedBy, USER_EMAIL)) return;
    if (!match.pendingScoreTeamA?.trim() || !match.pendingScoreTeamB?.trim()) return;
    const key = `${match.id}:${match.pendingScoreTeamA}:${match.pendingScoreTeamB}:${match.pendingWinnerTeam || ""}`;
    if (pendingScoreDraftSyncKey.current === key) return;
    pendingScoreDraftSyncKey.current = key;
    setScoreA(match.pendingScoreTeamA);
    setScoreB(match.pendingScoreTeamB);
    setWinnerPick(
      match.pendingWinnerTeam === "team_a" || match.pendingWinnerTeam === "team_b"
        ? match.pendingWinnerTeam
        : "",
    );
  }, [
    match?.id,
    match?.status,
    match?.scoreSubmittedBy,
    match?.pendingScoreTeamA,
    match?.pendingScoreTeamB,
    match?.pendingWinnerTeam,
    USER_EMAIL,
  ]);

  React.useEffect(() => {
    if (!route.params.openConfirmScore) return;
    if (!match?.pendingScoreTeamA?.trim()) return;
    setConfirmScoreModalOpen(true);
    navigation.setParams({ id: match.id, openConfirmScore: false });
  }, [route.params.openConfirmScore, match?.id, match?.pendingScoreTeamA, navigation]);

  React.useEffect(() => {
    if (!match || match.status !== "completed" || !USER_EMAIL) {
      setRecentForm(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const row = await api.get<PlayerRecentFormDto | null>(
          `/matches/${match.id}/recent-form?email=${encodeURIComponent(USER_EMAIL)}`,
        );
        if (!cancelled) setRecentForm(row);
      } catch {
        if (!cancelled) setRecentForm(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- match identity + completed gate only
  }, [match?.id, match?.status, USER_EMAIL]);

  const postJson = async (path: string, body: Record<string, unknown>, okMsg: string) => {
    if (!match) return;
    try {
      setBusy(true);
      await api.post<MatchDto>(path, body);
      await load(true);
      showSnackbar(okMsg, { type: "success" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      showSnackbar(msg, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onJoin = () => {
    if (!match || busy) return;
    if (match.players.some((p) => emailsMatch(p, USER_EMAIL))) return;
    postJson(`/matches/${match.id}/join`, { email: USER_EMAIL }, "You're in! 🎉");
  };

  const onJoinTeam = (team: "a" | "b") => {
    if (!match || busy) return;
    if (match.players.some((p) => emailsMatch(p, USER_EMAIL))) return;
    postJson(`/matches/${match.id}/join`, { email: USER_EMAIL, team }, "You're in! 🎉");
  };

  const onLeave = () => {
    const m = match;
    if (!m) return;
    try {
      const startDt = new Date(m.date);
      const parts = m.timeLabel.split(":");
      const h = Number.parseInt(parts[0] || "0", 10);
      const mi = Number.parseInt(parts[1] || "0", 10);
      startDt.setHours(h, mi, 0, 0);
      const diffMs = startDt.getTime() - Date.now();
      if (diffMs > 0 && diffMs < 2 * 60 * 60 * 1000) {
        showSnackbar(
          "This match starts within 2 hours — leaving may reduce your reliability score.",
          { type: "error" },
        );
      }
    } catch {
      /* noop */
    }
    postJson(`/matches/${m.id}/leave`, { email: USER_EMAIL }, "You left the match.");
  };

  const onCancelMatch = () =>
    postJson(`/matches/${match!.id}/cancel`, { email: USER_EMAIL }, "Match cancelled.");

  const onConfirmRsvp = () =>
    postJson(`/matches/${match!.id}/confirm`, { email: USER_EMAIL }, "You're confirmed ✓");

  const onBalanceTeams = () =>
    postJson(`/matches/${match!.id}/balance-teams`, { email: USER_EMAIL }, "Teams balanced by Elo.");

  const onLockTeams = () =>
    postJson(`/matches/${match!.id}/lock-teams`, { email: USER_EMAIL }, "Teams locked.");

  const onUnlockTeams = () =>
    postJson(`/matches/${match!.id}/unlock-teams`, { email: USER_EMAIL }, "Teams unlocked.");

  const onStart = () =>
    postJson(`/matches/${match!.id}/start`, { email: USER_EMAIL }, "Match started ▶");

  const onAwaitingScore = () =>
    postJson(`/matches/${match!.id}/awaiting-score`, { email: USER_EMAIL }, "Marked as awaiting score — players can submit.");

  const onSubmitScore = (overrideA?: string, overrideB?: string) => {
    if (!match) return;
    const a = (overrideA ?? scoreA).trim();
    const b = (overrideB ?? scoreB).trim();
    if (!a || !b) {
      showSnackbar("Enter scores for both teams", { type: "error" });
      return;
    }
    const body: Record<string, string> = {
      scoreTeamA: a,
      scoreTeamB: b,
      submittedBy: USER_EMAIL,
    };
    if (winnerPick) body.winnerTeam = winnerPick;
    const evCombined = serializeEvidenceBlob(evidencePhotoUris);
    if (evCombined.length > MAX_EVIDENCE_TOTAL_CHARS) {
      showSnackbar("Evidence is too large. Remove a photo or pick smaller images.", { type: "error" });
      return;
    }
    if (evCombined) body.evidenceUrl = evCombined;
    return (async () => {
      if (!match) return;
      try {
        setBusy(true);
        const updated = await api.post<MatchDto>(`/matches/${match.id}/submit-score`, body);
        await load(true);
        setSubmitScoreModalOpen(false);
        const msg =
          updated.status === "pending_validation"
            ? "Score proposed — waiting for captain or organiser to confirm."
            : "Match completed — Elo updated.";
        showSnackbar(msg, { type: "success" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Request failed";
        showSnackbar(msg, { type: "error" });
      } finally {
        setBusy(false);
      }
    })();
  };

  const onConfirmPendingScore = async () => {
    if (!match) return;
    try {
      setBusy(true);
      await api.post<MatchDto>(`/matches/${match.id}/confirm-score`, { email: USER_EMAIL });
      setConfirmScoreModalOpen(false);
      await load(true);
      showSnackbar("Final score confirmed", { type: "success" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      showSnackbar(msg, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onRejectPendingScore = async () => {
    if (!match) return;
    try {
      setBusy(true);
      await api.post<MatchDto>(`/matches/${match.id}/reject-score`, { email: USER_EMAIL });
      setConfirmScoreModalOpen(false);
      await load(true);
      showSnackbar("Proposed score rejected", { type: "success" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      showSnackbar(msg, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onReopenDispute = () =>
    postJson(`/matches/${match!.id}/reopen-dispute`, { email: USER_EMAIL }, "Match reopened — you can enter a new score.");

  const onDisputeScore = async () => {
    if (!match) return;
    const reason = disputeReason.trim();
    if (!reason) {
      showSnackbar("Add a short reason for the dispute", { type: "error" });
      return;
    }
    try {
      setBusy(true);
      await api.post<MatchDto>(`/matches/${match.id}/dispute-score`, {
        email: USER_EMAIL,
        reason,
      });
      setDisputeReason("");
      setConfirmScoreModalOpen(false);
      await load(true);
      showSnackbar("Score disputed. The organiser can reopen when ready.", { type: "success" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      showSnackbar(msg, { type: "error" });
    } finally {
      setBusy(false);
    }
  };


  if (!match) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16 }]}>
        <Text style={styles.emptyText}>Match not found.</Text>
      </View>
    );
  }

  const joined = match.players.some((p) => emailsMatch(p, USER_EMAIL));
  const isFull = match.players.length >= match.maxPlayers;
  const spotsLeft = Math.max(0, match.maxPlayers - match.players.length);
  const status = match.status as MatchStatusValue;
  const hostEmail = match.hostEmail ?? null;
  const isOrganizer = Boolean(hostEmail && emailsMatch(hostEmail, USER_EMAIL));
  const teamAEmails = match.teamA || [];
  const teamBEmails = match.teamB || [];
  const hasTeams = teamAEmails.length > 0 || teamBEmails.length > 0;
  const confirmed = match.confirmedPlayerEmails || [];
  const isConfirmed = confirmed.some((e) => emailsMatch(e, USER_EMAIL));
  const lockRequired = doublesNeedsLock(match);
  const teamsLocked = match.teamsLocked === true;

  const scheduleAllowsJoin = scheduledNonInstantJoinAllowed({
    date: matchDtoDateIso(match),
    timeLabel: match.timeLabel ?? "00:00",
    isInstant: Boolean(match.isInstant),
  });
  const canJoin = !joined && status === "open" && !isFull && scheduleAllowsJoin;
  const slotPastNoJoin =
    !joined && status === "open" && !isFull && !match.isInstant && !scheduleAllowsJoin;
  const joinNeedsTeamPick =
    canJoin && isDoublesFormat(match) && !teamsLocked && match.maxPlayers >= 4;
  const canLeave = joined && ["open", "full"].includes(status);
  const startValidation = validateMatchStartForUi(match, usersMap);
  const showOrganizerStart =
    isOrganizer && ["open", "full"].includes(status);
  const organizerStartHint =
    showOrganizerStart && !startValidation.valid ? organizerStartBlockHelp(startValidation.reason) : null;
  const showOrganizerAwaitingScore = isOrganizer && status === "in_progress";
  const isPendingScoreSubmitter =
    status === "pending_validation" &&
    Boolean(match.scoreSubmittedBy && emailsMatch(match.scoreSubmittedBy, USER_EMAIL));
  const showScoreForm =
    (joined || isOrganizer) &&
    (status === "in_progress" || status === "awaiting_score" || isPendingScoreSubmitter);
  const showConfirmScoreDetailCta = shouldShowConfirmScoreCta(match, USER_EMAIL);
  const viewerMayValidatePending = viewerCanValidatePendingScore(
    match,
    USER_EMAIL,
    hostEmail,
    match.scoreSubmittedBy,
  );

  const draftTeamA = match.players.filter((p) => teamDraft[p] === "a");
  const draftTeamB = match.players.filter((p) => teamDraft[p] === "b");
  const draftUnassignedCount = match.players.filter(
    (p) => teamDraft[p] !== "a" && teamDraft[p] !== "b",
  ).length;
  const allDraftAssigned =
    match.players.length > 0 && match.players.every((p) => teamDraft[p] === "a" || teamDraft[p] === "b");
  const draftFourValid =
    !lockRequired || match.players.length < 4 || (draftTeamA.length === 2 && draftTeamB.length === 2);
  const showManualTeams =
    isOrganizer && ["open", "full"].includes(status) && !teamsLocked && match.players.length >= 2;
  const applyLineupsReady = allDraftAssigned && draftFourValid;

  const pickTeamForPlayer = (playerEmail: string, side: "a" | "b") => {
    setTeamDraft((prev) => ({ ...prev, [playerEmail]: side }));
  };

  const applyLineups = async () => {
    if (!applyLineupsReady) {
      showSnackbar(
        lockRequired && match.players.length >= 4
          ? "For this match, put exactly 2 players on Team A and 2 on Team B."
          : "Tap Team A or Team B for every player.",
        { type: "error" },
      );
      return;
    }
    await postJson(
      `/matches/${match.id}/teams`,
      { email: USER_EMAIL, teamA: draftTeamA, teamB: draftTeamB },
      "Line-ups saved",
    );
  };

  const showDraftPreview =
    showManualTeams && !teamsLocked && (draftTeamA.length > 0 || draftTeamB.length > 0);
  const displayTeamA = showDraftPreview ? draftTeamA : teamAEmails;
  const displayTeamB = showDraftPreview ? draftTeamB : teamBEmails;
  const showTeamsBlock = displayTeamA.length > 0 || displayTeamB.length > 0;

  if (
    match.visibility === "invite_only" &&
    !isOrganizer &&
    !joined &&
    !emailListed(match.invitedEmails, USER_EMAIL)
  ) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 10), paddingHorizontal: 16 }]}>
        <View style={styles.topRow}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={16} color={COLORS.textMuted} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.topTitle}>Match Detail</Text>
        </View>
        <View style={styles.heroCard}>
          <Text style={styles.inviteLockEmoji}>🔒</Text>
          <Text style={styles.title}>Invite only</Text>
          <Text style={styles.flowHint}>You need an invite to view this match.</Text>
        </View>
      </View>
    );
  }

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 8, 16) }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />
      }
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
        <Text style={styles.title}>{displayMatchTitle(match)}</Text>
        <InfoRow icon="calendar-outline" value={new Date(match.date).toLocaleDateString()} />
        <InfoRow icon="time-outline" value={`${match.timeLabel} · ${match.durationMinutes || 90} min`} />
        <InfoRow
          icon="location-outline"
          value={`${
            match.locationAddress ? `${match.locationName} · ${match.locationAddress}` : match.locationName
          }${match.country?.trim() ? ` · ${match.country.trim()}` : ""}`}
        />
        <InfoRow
          icon="people-outline"
          value={`${match.players.length}/${match.maxPlayers} players${spotsLeft > 0 ? ` · ${spotsLeft} spots left` : ""}`}
        />
        {hostEmail ? (
          <Text style={styles.flowHint}>
            Organiser: {usersMap[hostEmail]?.fullName || hostEmail.split("@")[0]}
          </Text>
        ) : null}
        {lockRequired ? (
          <Text style={styles.flowHint}>
            Doubles: organiser balances/sets teams, then locks lineups before start.
            {teamsLocked ? " 🔒 Teams locked." : ""}
          </Text>
        ) : null}
        {matchEligibilitySummary(match) ? (
          <Text style={styles.requirementsHint}>{matchEligibilitySummary(match)}</Text>
        ) : null}
        {match.tags?.length ? (
          <View style={styles.tagsRow}>
            {match.tags.map((tag) => (
              <Text key={tag} style={styles.tagChip}>
                {tag}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      {status === "cancelled" ? (
        <View style={styles.cancelBanner}>
          <Text style={styles.cancelBannerTitle}>Match cancelled</Text>
          <Text style={styles.cancelBannerText}>
            No stats or Elo changes were recorded for this match.
          </Text>
        </View>
      ) : null}

      {status === "disputed" ? (
        <View style={styles.disputeBanner}>
          <Text style={styles.disputeBannerTitle}>Score disputed</Text>
          {match.scoreDisputeReason ? (
            <Text style={styles.disputeBannerText}>Reason: {match.scoreDisputeReason}</Text>
          ) : null}
          {match.disputedBy ? (
            <Text style={styles.disputeBannerMeta}>
              Raised by {usersMap[match.disputedBy]?.fullName || match.disputedBy.split("@")[0]}
            </Text>
          ) : null}
          <Text style={styles.disputeBannerHint}>
            No new scores can be entered until the organiser reopens this match.
          </Text>
          {isOrganizer ? (
            <Pressable
              style={[styles.primaryBtn, styles.disputeReopenBtn, busy && styles.disabled]}
              disabled={busy}
              onPress={() => onReopenDispute()}
            >
              <Text style={styles.primaryBtnText}>{busy ? "…" : "Reopen match"}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {isOrganizer && match.replacementNeeded && ["open", "full"].includes(status) ? (
        <View style={styles.replaceBanner}>
          <Text style={styles.replaceBannerTitle}>Replacement needed</Text>
          <Text style={styles.replaceBannerText}>
            A player left — share the match or invite someone to fill the open spot.
          </Text>
        </View>
      ) : null}

      {(status === "awaiting_score" || status === "pending_validation") && match.pendingScoreTeamA ? (
        <View style={styles.pendingCard}>
          <Text style={styles.sectionTitle}>Proposed score</Text>
          <Text style={styles.pendingLine}>
            Team A: {match.pendingScoreTeamA} · Team B: {match.pendingScoreTeamB}
          </Text>
          <Text style={styles.pendingMeta}>
            Submitted by {match.scoreSubmittedBy || "—"}. Use{" "}
            <Text style={{ fontWeight: "800" }}>Confirm Score</Text> below (Base44-style).
          </Text>
          {match.evidenceUrl ? (
            <EvidenceAttachmentsPreview blob={match.evidenceUrl} />
          ) : null}
        </View>
      ) : null}

      {status === "pending_validation" &&
      match.scoreSubmittedBy &&
      emailsMatch(match.scoreSubmittedBy, USER_EMAIL) ? (
        <View style={styles.waitingScoreBanner}>
          <Text style={styles.waitingScoreText}>
            You proposed this score — you can edit it below until a team captain or the organiser confirms (same as
            Base44).
          </Text>
        </View>
      ) : null}

      {showTeamsBlock ? (
        <View style={styles.teamsCard}>
          <Text style={styles.sectionTitle}>
            Teams & score{showDraftPreview ? " (preview)" : ""}
          </Text>
          {showDraftPreview ? (
            <Text style={styles.teamDraftHint}>
              {draftUnassignedCount > 0
                ? `You're splitting players into sides (draft only — not saved yet). ${draftUnassignedCount} player${draftUnassignedCount === 1 ? " still needs" : "s still need"} a team. "Confirmed RSVP" counts who said they're coming — it's separate from Team A/B.`
                : `Draft line-up is complete for everyone — tap Save line-ups below to apply it. "Confirmed RSVP" only tracks attendance, not teams.`}
            </Text>
          ) : null}
          <View style={styles.teamsColumns}>
            <View style={styles.teamCol}>
              <Text style={styles.teamColLabel}>Team A</Text>
              {displayTeamA.map((email) => {
                const user = usersMap[email];
                return (
                  <Text key={email} style={styles.teamPlayerLine}>
                    {user?.fullName || email.split("@")[0]}
                    {emailsMatch(email, USER_EMAIL) ? " (you)" : ""}
                  </Text>
                );
              })}
              {displayTeamA.length === 0 ? <Text style={styles.teamPlayerMuted}>—</Text> : null}
            </View>
            <View style={styles.teamCol}>
              <Text style={styles.teamColLabel}>Team B</Text>
              {displayTeamB.map((email) => {
                const user = usersMap[email];
                return (
                  <Text key={email} style={styles.teamPlayerLine}>
                    {user?.fullName || email.split("@")[0]}
                    {emailsMatch(email, USER_EMAIL) ? " (you)" : ""}
                  </Text>
                );
              })}
              {displayTeamB.length === 0 ? <Text style={styles.teamPlayerMuted}>—</Text> : null}
            </View>
          </View>
          {status === "completed" && (match.scoreTeamA || match.scoreTeamB || match.winnerTeam) ? (
            <MatchResultPanel
              match={match}
              viewerEmail={USER_EMAIL}
              usersMap={usersMap}
              recentForm={recentForm}
              omitRoster
            />
          ) : status !== "completed" ? (
            <Text style={styles.teamPendingText}>Scores appear here once the match is completed.</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.playersCard}>
        <Text style={styles.sectionTitle}>Players</Text>
        <Text style={styles.rsvpMeta}>
          Confirmed RSVP: {confirmed.length}/{match.players.length}
        </Text>
        {match.players.map((email) => {
          const user = usersMap[email];
          const tick = emailListed(confirmed, email);
          return (
            <View key={email} style={styles.playerRow}>
              <UserAvatar
                photoUrl={user?.photoUrl}
                label={user?.fullName || email}
                size={36}
                shape="rounded"
                variant="soft"
                style={{ marginRight: 10 }}
              />
              <View style={styles.playerTextWrap}>
                <Text style={styles.playerName}>
                  {user?.fullName || email.split("@")[0]}
                  {tick ? " ✓" : ""}
                </Text>
                <Text style={styles.playerMeta}>
                  {emailsMatch(email, USER_EMAIL)
                    ? "You"
                    : userLocationLabel(user ?? {}) || user?.location || "Player"}
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

      {isOrganizer && ["open", "full"].includes(status) ? (
        <View style={styles.orgCard}>
          <Text style={styles.sectionTitle}>Organiser · teams</Text>
          {lockRequired && showOrganizerStart ? (
            <Text style={styles.orgWorkflowHint}>
              Doubles: set teams (Apply line-ups or Auto-balance) → tap Lock line-ups → then Start Match.
            </Text>
          ) : null}
          {showManualTeams ? (
            <View style={styles.manualTeamsBlock}>
              <Text style={styles.teamPickHint}>
                Manual line-ups · Team A: {draftTeamA.length}
                {lockRequired && match.players.length >= 4 ? "/2" : ""} · Team B: {draftTeamB.length}
                {lockRequired && match.players.length >= 4 ? "/2" : ""}
              </Text>
              {match.players.map((email) => {
                const user = usersMap[email];
                const label = user?.fullName || email.split("@")[0];
                const side = teamDraft[email];
                return (
                  <View key={email} style={styles.teamPickRow}>
                    <Text style={styles.teamPickName} numberOfLines={1}>
                      {label}
                    </Text>
                    <View style={styles.teamPickBtns}>
                      <Pressable
                        style={[styles.teamPickBtn, side === "a" && styles.teamPickBtnOn]}
                        onPress={() => pickTeamForPlayer(email, "a")}
                      >
                        <Text style={[styles.teamPickBtnText, side === "a" && styles.teamPickBtnTextOn]}>A</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.teamPickBtn, side === "b" && styles.teamPickBtnOn]}
                        onPress={() => pickTeamForPlayer(email, "b")}
                      >
                        <Text style={[styles.teamPickBtnText, side === "b" && styles.teamPickBtnTextOn]}>B</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
              <Pressable
                style={[styles.primaryOutlineBtn, (busy || !applyLineupsReady) && styles.disabled]}
                disabled={busy || !applyLineupsReady}
                onPress={() => applyLineups().catch(() => undefined)}
              >
                <Text style={styles.primaryOutlineBtnText}>Apply line-ups</Text>
              </Pressable>
            </View>
          ) : null}
          <Pressable
            style={[styles.secondaryBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={() => onBalanceTeams()}
          >
            <Text style={styles.secondaryBtnText}>Auto-balance teams (Elo)</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, busy && styles.disabled]}
            disabled={busy || teamsLocked}
            onPress={() => onLockTeams()}
          >
            <Text style={styles.secondaryBtnText}>
              {teamsLocked ? "Teams locked" : "Lock line-ups"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, busy && styles.disabled]}
            disabled={busy || !teamsLocked}
            onPress={() => onUnlockTeams()}
          >
            <Text style={styles.secondaryBtnText}>Unlock to edit teams</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.actions}>
        {(joined || isOrganizer) && status !== "cancelled" ? (
          <Pressable style={[styles.chatBtn]} onPress={() => navigation.navigate("MatchChat", { matchId: match.id })}>
            <Ionicons name="chatbubble-ellipses-outline" size={17} color={COLORS.primaryDark} />
            <Text style={styles.chatBtnText}>Match Chat</Text>
          </Pressable>
        ) : null}

        {showConfirmScoreDetailCta ? (
          <Pressable
            style={[styles.confirmScoreBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={() => setConfirmScoreModalOpen(true)}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.confirmScoreBtnText}>Confirm Score</Text>
          </Pressable>
        ) : null}

        {showScoreForm ? (
          <Pressable
            style={[styles.secondaryBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={() => setSubmitScoreModalOpen(true)}
          >
            <Ionicons name="add-circle-outline" size={18} color={COLORS.primaryDark} />
            <Text style={[styles.secondaryBtnText, { marginLeft: 6 }]}>Submit match score</Text>
          </Pressable>
        ) : null}

        {(joined || isOrganizer) && status !== "completed" && status !== "cancelled" && status !== "disputed" ? (
          <Pressable
            style={[styles.secondaryBtn, (busy || isFull) && styles.disabled]}
            disabled={busy || isFull}
            onPress={() =>
              navigation.navigate("InvitePlayers", {
                eventId: match.id,
                eventKind: "match",
                eventTitle: displayMatchTitle(match),
                eventSubtitle: `${match.locationName} · ${match.timeLabel}`,
              })
            }
          >
            <Ionicons name="person-add-outline" size={17} color={COLORS.primaryDark} />
            <Text style={[styles.secondaryBtnText, { marginLeft: 6 }]}>Invite Players</Text>
          </Pressable>
        ) : null}

        {(joined || isOrganizer) && status !== "cancelled" ? (
          <Pressable style={[styles.chatBtn]} onPress={() => navigation.navigate("Community")}>
            <Ionicons name="people-outline" size={17} color={COLORS.primaryDark} />
            <Text style={styles.chatBtnText}>Community — feedback & ideas</Text>
          </Pressable>
        ) : null}

        {slotPastNoJoin ? (
          <Text style={styles.flowHint}>
            This match's scheduled time has passed — you can't join anymore.
          </Text>
        ) : null}

        {joinNeedsTeamPick ? (
        <>
          <Pressable
            style={[styles.primaryBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={() => onJoinTeam("a")}
          >
            <Text style={styles.primaryBtnText}>{busy ? "Joining..." : "Join Team A 🎾"}</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={() => onJoinTeam("b")}
          >
            <Text style={styles.primaryBtnText}>{busy ? "Joining..." : "Join Team B 🎾"}</Text>
          </Pressable>
        </>
      ) : canJoin ? (
        <Pressable style={[styles.primaryBtn, busy && styles.disabled]} disabled={busy} onPress={() => onJoin()}>
          <Text style={styles.primaryBtnText}>{busy ? "Joining..." : "Join Match 🎾"}</Text>
        </Pressable>
      ) : null}

        {joined && !isConfirmed && ["open", "full"].includes(status) ? (
          <Pressable
            style={[styles.primaryBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={() => onConfirmRsvp()}
          >
            <Text style={styles.primaryBtnText}>Confirm you’re playing</Text>
          </Pressable>
        ) : null}

        {canLeave ? (
          <Pressable style={[styles.secondaryBtn, busy && styles.disabled]} disabled={busy} onPress={() => onLeave()}>
            <Text style={styles.secondaryBtnText}>{busy ? "Leaving..." : "Leave Match"}</Text>
          </Pressable>
        ) : null}

        {showOrganizerStart ? (
          <>
            <Pressable
              style={[
                styles.primaryBtn,
                (busy || !startValidation.valid) && styles.primaryBtnDisabled,
              ]}
              disabled={busy || !startValidation.valid}
              onPress={() => onStart()}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  (busy || !startValidation.valid) && styles.primaryBtnTextDisabled,
                ]}
              >
                {busy ? "Starting..." : "Start Match ▶"}
              </Text>
            </Pressable>
            {!startValidation.valid ? (
              <>
                <Text style={styles.warnText}>{startValidation.reason}</Text>
                {organizerStartHint ? (
                  <Text style={styles.startFixHint}>{organizerStartHint}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.flowHint}>
                After you start, stay on this screen and scroll down to enter scores when play finishes — or use “Match
                played — awaiting score” first, then submit.
              </Text>
            )}
          </>
        ) : null}

        {showOrganizerAwaitingScore ? (
          <Pressable
            style={[styles.secondaryBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={() => onAwaitingScore()}
          >
            <Text style={styles.secondaryBtnText}>
              {busy ? "…" : "Match played — awaiting score 🎾"}
            </Text>
          </Pressable>
        ) : null}

        {isOrganizer && ["open", "full"].includes(status) ? (
          <Pressable
            style={[styles.secondaryBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={() => onCancelMatch()}
          >
            <Text style={[styles.secondaryBtnText, styles.destructiveText]}>Cancel match</Text>
          </Pressable>
        ) : null}

        {joined && status === "completed" && match.players.filter((e) => !emailsMatch(e, USER_EMAIL)).length > 0 ? (
          <Pressable
            style={[styles.secondaryBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={() => navigation.navigate("MatchRatePlayers", { matchId: match.id })}
          >
            <Text style={styles.secondaryBtnText}>Rate players ⭐</Text>
          </Pressable>
        ) : null}

        {status === "completed" && (match.scoreTeamA || match.scoreTeamB) && !hasTeams ? (
          <MatchResultPanel
            match={match}
            viewerEmail={USER_EMAIL}
            usersMap={usersMap}
            recentForm={recentForm}
          />
        ) : null}
      </View>
    </ScrollView>
    <SubmitMatchScoreModal
      visible={submitScoreModalOpen}
      onClose={() => setSubmitScoreModalOpen(false)}
      match={match}
      scoreA={scoreA}
      scoreB={scoreB}
      setScoreA={setScoreA}
      setScoreB={setScoreB}
      winnerPick={winnerPick}
      setWinnerPick={setWinnerPick}
      evidencePhotoUris={evidencePhotoUris}
      setEvidencePhotoUris={setEvidencePhotoUris}
      busy={busy}
      onSubmit={(a, b) => void onSubmitScore(a, b)}
    />
    <ConfirmMatchResultModal
      visible={confirmScoreModalOpen}
      onClose={() => setConfirmScoreModalOpen(false)}
      match={match}
      viewerEmail={USER_EMAIL}
      hostEmail={hostEmail}
      canValidate={viewerMayValidatePending}
      busy={busy}
      disputeReason={disputeReason}
      setDisputeReason={setDisputeReason}
      onConfirm={() => void onConfirmPendingScore()}
      onReject={() => void onRejectPendingScore()}
      onDispute={() => void onDisputeScore()}
    />
    </>
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
  if (status === "cancelled") return "Cancelled";
  if (status === "disputed") return "Disputed";
  if (status === "full") return "Full";
  return "Open";
}

function getStatusStyle(status: MatchStatusValue) {
  if (status === "completed") return styles.statusCompleted;
  if (status === "in_progress") return styles.statusProgress;
  if (status === "awaiting_score" || status === "pending_validation") return styles.statusProgress;
  if (status === "cancelled") return styles.statusCancelled;
  if (status === "disputed") return styles.statusDisputed;
  if (status === "full") return styles.statusFull;
  return styles.statusOpen;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingBottom: 110 },
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
  flowHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, lineHeight: 15 },
  pendingCard: {
    backgroundColor: COLORS.infoSoft,
    borderWidth: 1,
    borderColor: COLORS.infoBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  pendingLine: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginTop: 6 },
  pendingMeta: { fontSize: 11, color: COLORS.textSubtle, marginTop: 6 },
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
  statusDisputed: { backgroundColor: COLORS.warningSoft, color: COLORS.warningText },
  statusCancelled: { backgroundColor: COLORS.dangerSoft, color: COLORS.dangerText },
  inviteLockEmoji: { fontSize: 40, textAlign: "center", marginBottom: 8 },
  cancelBanner: {
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerText,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  cancelBannerTitle: { fontSize: 15, fontWeight: "800", color: COLORS.dangerText },
  cancelBannerText: { fontSize: 12, color: COLORS.textSubtle, marginTop: 4 },
  disputeBanner: {
    backgroundColor: COLORS.warningSoft,
    borderWidth: 1,
    borderColor: COLORS.warningText,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  disputeBannerTitle: { fontSize: 15, fontWeight: "800", color: COLORS.warningText },
  disputeBannerText: { fontSize: 13, color: COLORS.text, marginTop: 2 },
  disputeBannerMeta: { fontSize: 11, color: COLORS.textMuted },
  disputeBannerHint: { fontSize: 11, color: COLORS.textSubtle, marginTop: 4, lineHeight: 15 },
  disputeReopenBtn: { marginTop: 8 },
  waitingScoreBanner: {
    backgroundColor: COLORS.infoSoft,
    borderWidth: 1,
    borderColor: COLORS.infoText,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  waitingScoreText: { fontSize: 12, color: COLORS.text, lineHeight: 17 },
  replaceBanner: {
    backgroundColor: COLORS.warningSoft,
    borderWidth: 1,
    borderColor: COLORS.warningText,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  replaceBannerTitle: { fontSize: 14, fontWeight: "800", color: COLORS.warningText },
  replaceBannerText: { fontSize: 12, color: COLORS.textSubtle, marginTop: 4 },
  requirementsHint: { fontSize: 11, color: COLORS.textSubtle, marginTop: 6, lineHeight: 15 },
  destructiveText: { color: COLORS.dangerText },
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
  teamsCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  teamsColumns: { flexDirection: "row", gap: 12 },
  teamCol: { flex: 1 },
  teamColLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  teamDraftHint: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17, marginBottom: 8 },
  teamPlayerLine: { fontSize: 13, fontWeight: "600", color: COLORS.text, marginBottom: 4 },
  teamPlayerMuted: { fontSize: 13, color: COLORS.textSoft },
  teamPendingText: { marginTop: 10, fontSize: 12, color: COLORS.textMuted, fontStyle: "italic" },
  playersCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  rsvpMeta: { fontSize: 11, color: COLORS.textMuted, marginBottom: 8, fontWeight: "600" },
  orgCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  manualTeamsBlock: { gap: 10, marginBottom: 4 },
  teamPickHint: { fontSize: 11, color: COLORS.textMuted, fontWeight: "600", marginBottom: 2 },
  teamPickRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  teamPickName: { flex: 1, fontSize: 13, fontWeight: "600", color: COLORS.text },
  teamPickBtns: { flexDirection: "row", gap: 6 },
  teamPickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  teamPickBtnOn: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.borderStrong },
  teamPickBtnText: { fontWeight: "800", color: COLORS.textMuted, fontSize: 13 },
  teamPickBtnTextOn: { color: COLORS.primaryDark },
  primaryOutlineBtn: {
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: COLORS.card,
  },
  primaryOutlineBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: "800" },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: "800", marginBottom: 8 },
  orgWorkflowHint: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17, marginBottom: 10 },
  playerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
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
  scoreForm: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 12,
    gap: 8,
  },
  scoreHelp: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  scoreEvidenceHint: { fontSize: 10, color: COLORS.textSoft, marginTop: -2, marginBottom: 6, lineHeight: 14 },
  evidenceDraftRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  evidenceDraftThumbWrap: { position: "relative", marginRight: 6 },
  evidenceDraftThumb: { width: 76, height: 76, borderRadius: 10, backgroundColor: COLORS.borderMuted },
  evidenceDraftRemove: { position: "absolute", top: -6, right: -6, backgroundColor: COLORS.card, borderRadius: 14 },
  inputLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
  },
  winnerRow: { flexDirection: "row", gap: 8 },
  winnerChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  winnerChipOn: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.borderStrong },
  winnerChipText: { fontWeight: "700", color: COLORS.text, fontSize: 13 },
  warnText: { fontSize: 12, color: COLORS.warningText, fontWeight: "600" },
  startFixHint: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17, marginTop: 4 },
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
  primaryBtnDisabled: {
    backgroundColor: COLORS.borderMuted,
  },
  primaryBtnText: { color: COLORS.card, fontSize: 14, fontWeight: "800" },
  primaryBtnTextDisabled: { color: COLORS.textMuted },
  secondaryBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingVertical: 11,
  },
  confirmScoreBtn: {
    borderRadius: 14,
    backgroundColor: "#15803d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
  },
  confirmScoreBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  secondaryBtnText: { color: COLORS.text, fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.65 },
  emptyText: { marginTop: 24, color: COLORS.textMuted, textAlign: "center" },
  pendingActions: { gap: 8, marginTop: 10 },
});
