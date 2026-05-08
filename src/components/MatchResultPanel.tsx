import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { MatchDto, PlayerRecentFormDto, UserDto } from "../lib/types";
import { isDoublesFormat } from "../lib/matchFormat";
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

function emailOnTeam(list: string[] | undefined, viewer: string) {
  return (list || []).some((e) => e.trim().toLowerCase() === viewer.trim().toLowerCase());
}

function emailYou(e: string, viewer: string) {
  return e.trim().toLowerCase() === viewer.trim().toLowerCase();
}

function rosterDisplayName(usersMap: Record<string, UserDto>, email: string, viewerEmail: string) {
  const u = usersMap[email];
  const name = u?.fullName?.trim() || email.split("@")[0] || email;
  return `${name}${emailYou(email, viewerEmail) ? " (you)" : ""}`;
}

/** Base44-style result hero: sets, team names, Elo delta from recent-form API */
export function MatchResultPanel({
  match,
  viewerEmail,
  usersMap,
  recentForm,
  omitRoster = false,
}: {
  match: MatchDto;
  viewerEmail: string;
  usersMap: Record<string, UserDto>;
  recentForm: PlayerRecentFormDto | null;
  /** When true, team lists are already shown above (Teams & score card). */
  omitRoster?: boolean;
}) {
  const isDoubles = isDoublesFormat(match);
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
          <View style={styles.scoreGrid}>
            <View style={styles.gridHeaderRow}>
              <View style={styles.gridCorner} />
              {sets.map((_, i) => (
                <Text key={`gh-${i}`} style={styles.gridHeadCell}>
                  Set {i + 1}
                </Text>
              ))}
            </View>
            <View style={styles.gridDataRow}>
              <View style={styles.gridRowTitleCol}>
                <Text style={[styles.gridRowTitle, teamAWon && styles.gridRowTitleWin]} numberOfLines={2}>
                  {teamAName}
                </Text>
                {teamAWon ? <Text style={styles.gridWinnerTag}>Winner</Text> : null}
              </View>
              {sets.map((set, i) => (
                <Text key={`ga-${i}`} style={[styles.gridCell, teamAWon && styles.gridCellWin]}>
                  {set.a}
                </Text>
              ))}
            </View>
            <View style={styles.gridDataRow}>
              <View style={styles.gridRowTitleCol}>
                <Text style={[styles.gridRowTitle, teamBWon && styles.gridRowTitleWin]} numberOfLines={2}>
                  {teamBName}
                </Text>
                {teamBWon ? <Text style={styles.gridWinnerTag}>Winner</Text> : null}
              </View>
              {sets.map((set, i) => (
                <Text key={`gb-${i}`} style={[styles.gridCell, teamBWon && styles.gridCellWin]}>
                  {set.b}
                </Text>
              ))}
            </View>
            {sets.length > 1 ? <Text style={styles.gridFootNote}>{sets.length} sets</Text> : null}
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

        {!omitRoster && (teamAEmails.length > 0 || teamBEmails.length > 0) ? (
          <View style={styles.rosterSection}>
            <Text style={styles.rosterSectionTitle}>Who played</Text>
            <View style={styles.rosterColumns}>
              <View style={styles.rosterCol}>
                <Text style={styles.rosterColHeading}>Team A</Text>
                {teamAEmails.map((e) => (
                  <Text key={`a-${e}`} style={styles.rosterLine} numberOfLines={2}>
                    • {rosterDisplayName(usersMap, e, viewerEmail)}
                  </Text>
                ))}
              </View>
              <View style={[styles.rosterCol, styles.rosterColRight]}>
                <Text style={[styles.rosterColHeading, styles.rosterColHeadingRight]}>Team B</Text>
                {teamBEmails.map((e) => (
                  <Text
                    key={`b-${e}`}
                    style={[styles.rosterLine, styles.rosterLineRight]}
                    numberOfLines={2}
                  >
                    • {rosterDisplayName(usersMap, e, viewerEmail)}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        ) : !omitRoster && isDoubles && (match.players?.length ?? 0) >= 2 ? (
          <View style={styles.rosterSection}>
            <Text style={styles.rosterMissing}>
              Team rosters were not saved for this match, so only the score and winner side are shown.
            </Text>
          </View>
        ) : null}

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
  scoreGrid: { marginBottom: 4 },
  gridHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 6 },
  gridCorner: { width: 100, minWidth: 100 },
  gridHeadCell: {
    flex: 1,
    minWidth: 0,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  gridDataRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10, gap: 6 },
  gridRowTitleCol: { width: 100, minWidth: 100 },
  gridRowTitle: { fontSize: 13, fontWeight: "800", color: COLORS.text, lineHeight: 17 },
  gridRowTitleWin: { color: COLORS.successText },
  gridWinnerTag: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: "900",
    color: COLORS.successText,
    textTransform: "uppercase",
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    overflow: "hidden",
  },
  gridCellWin: { color: COLORS.successText, borderColor: COLORS.successText, backgroundColor: COLORS.successSoft },
  gridFootNote: { fontSize: 10, color: COLORS.textMuted, textAlign: "center", marginTop: 2 },
  teamNameMuted: { fontSize: 14, fontWeight: "700", color: COLORS.textMuted },
  teamNameWin: { color: COLORS.successText },
  noScore: { paddingVertical: 6 },
  noScoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  vsText: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },
  noScoreHint: { fontSize: 11, color: COLORS.textMuted, fontStyle: "italic", textAlign: "center", marginTop: 8 },
  rosterSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  rosterSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  rosterColumns: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  rosterCol: { flex: 1 },
  rosterColRight: { alignItems: "flex-end" },
  rosterColHeading: { fontSize: 12, fontWeight: "800", color: COLORS.text, marginBottom: 4 },
  rosterColHeadingRight: { textAlign: "right", alignSelf: "stretch" },
  rosterLine: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted, lineHeight: 18, marginBottom: 2 },
  rosterLineRight: { textAlign: "right" },
  rosterMissing: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
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
