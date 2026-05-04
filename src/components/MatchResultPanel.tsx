import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { MatchDto, PlayerRecentFormDto, UserDto } from "../lib/types";
import { COLORS } from "../theme/colors";

function parseSetScores(scoreA: string | null | undefined, scoreB: string | null | undefined) {
  if (!scoreA && !scoreB) return [];
  const setsA = (scoreA || "").toString().split(",").map((s) => s.trim());
  const setsB = (scoreB || "").toString().split(",").map((s) => s.trim());
  const count = Math.max(setsA.length, setsB.length);
  return Array.from({ length: count }, (_, i) => ({
    a: setsA[i] ?? "—",
    b: setsB[i] ?? "—",
  }));
}

function firstLabel(usersMap: Record<string, UserDto>, email: string) {
  const u = usersMap[email];
  const n = u?.fullName?.trim();
  if (n) return n.split(/\s+/)[0] || n;
  return email.split("@")[0] || "?";
}

function doublesStyleMatch(m: MatchDto) {
  return m.matchType !== "singles" && m.maxPlayers >= 4;
}

function emailOnTeam(list: string[] | undefined, viewer: string) {
  return (list || []).some((e) => e.trim().toLowerCase() === viewer.trim().toLowerCase());
}

/** Base44-style result hero: sets, team names, Elo delta from recent-form API */
export function MatchResultPanel({
  match,
  viewerEmail,
  usersMap,
  recentForm,
}: {
  match: MatchDto;
  viewerEmail: string;
  usersMap: Record<string, UserDto>;
  recentForm: PlayerRecentFormDto | null;
}) {
  const isDoubles = doublesStyleMatch(match);
  const myTeam = emailOnTeam(match.teamA, viewerEmail)
    ? "team_a"
    : emailOnTeam(match.teamB, viewerEmail)
      ? "team_b"
      : null;
  let result: "win" | "loss" | "played" = "played";
  if (match.winnerTeam && myTeam) {
    result = match.winnerTeam === myTeam ? "win" : "loss";
  }

  const scoreA = match.scoreTeamA;
  const scoreB = match.scoreTeamB;
  const sets = parseSetScores(scoreA, scoreB);

  const eloChange = recentForm?.eloChange ?? null;
  const eloAfter = recentForm?.eloAfter ?? null;
  const eloBefore =
    eloAfter !== null && eloChange !== null ? eloAfter - eloChange : null;

  const teamAEmails = isDoubles
    ? match.teamA || []
    : match.players?.[0]
      ? [match.players[0]]
      : [];
  const teamBEmails = isDoubles
    ? match.teamB || []
    : match.players?.[1]
      ? [match.players[1]]
      : [];
  const teamAName =
    teamAEmails.map((e) => firstLabel(usersMap, e)).join(" & ") || "Team A";
  const teamBName =
    teamBEmails.map((e) => firstLabel(usersMap, e)).join(" & ") || "Team B";

  const teamAWon = match.winnerTeam === "team_a";
  const teamBWon = match.winnerTeam === "team_b";

  const bannerCfg =
    result === "win"
      ? { label: "WIN", banner: styles.bannerWin }
      : result === "loss"
        ? { label: "LOSS", banner: styles.bannerLoss }
        : { label: "COMPLETED", banner: styles.bannerNeutral };

  const eloIsPos = eloChange !== null && eloChange > 0;
  const eloIsNeg = eloChange !== null && eloChange < 0;

  return (
    <View style={styles.card}>
      <View style={[styles.banner, bannerCfg.banner]}>
        <Text style={styles.bannerLabel}>{bannerCfg.label}</Text>
        {eloChange !== null ? (
          <Text style={styles.bannerElo}>
            {eloIsPos ? "+" : ""}
            {eloChange} ELO
          </Text>
        ) : null}
      </View>

      <View style={styles.body}>
        {sets.length > 0 ? (
          <View style={styles.setsRow}>
            <View style={[styles.teamCol, teamBWon && !teamAWon && styles.teamDim]}>
              <Text style={[styles.teamName, teamAWon && styles.teamNameWin]}>{teamAName}</Text>
              {teamAWon ? <Text style={styles.winnerTag}>Winner</Text> : null}
            </View>
            <View style={styles.setsMiddle}>
              {sets.map((set, i) => (
                <View key={i} style={styles.setLine}>
                  <Text style={[styles.setNum, teamAWon && styles.setNumWin]}>{set.a}</Text>
                  <Text style={styles.setDash}>—</Text>
                  <Text style={[styles.setNum, teamBWon && styles.setNumWin]}>{set.b}</Text>
                </View>
              ))}
              {sets.length > 1 ? (
                <Text style={styles.setCount}>
                  {sets.length} sets
                </Text>
              ) : null}
            </View>
            <View style={[styles.teamCol, styles.teamColRight, teamAWon && !teamBWon && styles.teamDim]}>
              <Text style={[styles.teamName, teamBWon && styles.teamNameWin]}>{teamBName}</Text>
              {teamBWon ? <Text style={[styles.winnerTag, styles.winnerTagRight]}>Winner</Text> : null}
            </View>
          </View>
        ) : (
          <View style={styles.noScore}>
            <View style={styles.noScoreRow}>
              <Text style={[styles.teamNameMuted, teamAWon && styles.teamNameWin]}>{teamAName}</Text>
              <Text style={styles.vsText}>vs</Text>
              <Text style={[styles.teamNameMuted, teamBWon && styles.teamNameWin]}>{teamBName}</Text>
            </View>
            <Text style={styles.noScoreHint}>Score not recorded</Text>
          </View>
        )}

        {eloChange !== null && eloBefore !== null && eloAfter !== null ? (
          <View style={styles.eloRow}>
            <View
              style={[
                styles.eloPill,
                eloIsPos ? styles.eloPillPos : eloIsNeg ? styles.eloPillNeg : styles.eloPillFlat,
              ]}
            >
              {eloIsPos ? (
                <Ionicons name="trending-up" size={14} color={COLORS.successText} />
              ) : eloIsNeg ? (
                <Ionicons name="trending-down" size={14} color={COLORS.dangerText} />
              ) : (
                <Ionicons name="remove" size={14} color={COLORS.textMuted} />
              )}
              <Text
                style={[
                  styles.eloPillText,
                  eloIsPos ? styles.eloTextPos : eloIsNeg ? styles.eloTextNeg : styles.eloTextFlat,
                ]}
              >
                {eloIsPos ? "+" : ""}
                {eloChange} ELO
              </Text>
              <Text style={styles.eloRange}>
                ({Math.round(eloBefore)} → {Math.round(eloAfter)})
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerWin: { backgroundColor: COLORS.successText },
  bannerLoss: { backgroundColor: COLORS.dangerText },
  bannerNeutral: { backgroundColor: COLORS.textMuted },
  bannerLabel: { fontSize: 18, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },
  bannerElo: { fontSize: 13, fontWeight: "800", color: "#fff" },
  body: { backgroundColor: COLORS.card, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  setsRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  teamCol: { flex: 1 },
  teamDim: { opacity: 0.5 },
  teamColRight: { alignItems: "flex-end" },
  teamName: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  teamNameWin: { color: COLORS.successText },
  teamNameMuted: { fontSize: 14, fontWeight: "700", color: COLORS.textMuted },
  winnerTag: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: "900",
    color: COLORS.successText,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  winnerTagRight: { textAlign: "right" },
  setsMiddle: { alignItems: "center", gap: 4, paddingHorizontal: 4 },
  setLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  setNum: { fontSize: 26, fontWeight: "900", color: COLORS.text, minWidth: 36, textAlign: "right" },
  setNumWin: { color: COLORS.successText },
  setDash: { fontSize: 14, fontWeight: "700", color: COLORS.textMuted, width: 16, textAlign: "center" },
  setCount: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  noScore: { paddingVertical: 6 },
  noScoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  vsText: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },
  noScoreHint: { fontSize: 11, color: COLORS.textMuted, fontStyle: "italic", textAlign: "center", marginTop: 8 },
  eloRow: { alignItems: "center", marginTop: 10 },
  eloPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  eloPillPos: { backgroundColor: COLORS.successSoft, borderColor: COLORS.successText },
  eloPillNeg: { backgroundColor: COLORS.dangerSoft, borderColor: COLORS.dangerText },
  eloPillFlat: { backgroundColor: COLORS.border, borderColor: COLORS.borderStrong },
  eloPillText: { fontSize: 14, fontWeight: "800" },
  eloTextPos: { color: COLORS.successText },
  eloTextNeg: { color: COLORS.dangerText },
  eloTextFlat: { color: COLORS.textMuted },
  eloRange: { fontSize: 12, color: COLORS.textSubtle, fontWeight: "500" },
});
