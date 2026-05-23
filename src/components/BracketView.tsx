import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { CompetitionMatchDto } from "../lib/types";
import { COLORS } from "../theme/colors";

function roundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semi Finals";
  if (fromEnd === 2) return "Quarter Finals";
  return `Round ${round}`;
}

type BracketViewProps = {
  matches: CompetitionMatchDto[];
  currentUserEmail: string;
  isHost?: boolean;
  isDoubles?: boolean;
  onSubmitScore?: (m: CompetitionMatchDto) => void;
  onValidateScore?: (m: CompetitionMatchDto) => void;
  onHostScore?: (m: CompetitionMatchDto) => void;
};

function BracketMatchCard({
  match,
  currentUserEmail,
  isHost,
  isDoubles,
  onSubmitScore,
  onValidateScore,
  onHostScore,
}: {
  match: CompetitionMatchDto;
  currentUserEmail: string;
  isHost?: boolean;
  isDoubles?: boolean;
  onSubmitScore?: (m: CompetitionMatchDto) => void;
  onValidateScore?: (m: CompetitionMatchDto) => void;
  onHostScore?: (m: CompetitionMatchDto) => void;
}) {
  const teamA = match.teamAEmails || [];
  const teamB = match.teamBEmails || [];
  const doubles = isDoubles || teamA.length > 0;
  const p1 = match.player1Name || "TBD";
  const p2 = match.player2Name || "TBD";
  const confirmed = match.status === "confirmed";
  const scoreA = confirmed ? match.scorePlayer1 : match.submittedScoreP1 || match.scorePlayer1;
  const scoreB = confirmed ? match.scorePlayer2 : match.submittedScoreP2 || match.scorePlayer2;
  const emails = doubles
    ? [...teamA, ...teamB]
    : [match.player1Email, match.player2Email].filter(Boolean) as string[];
  const isParticipant = emails.some((e) => e?.toLowerCase() === currentUserEmail.toLowerCase());
  const canValidate =
    isParticipant &&
    match.status === "pending_validation" &&
    match.submittedBy?.toLowerCase() !== currentUserEmail.toLowerCase();
  const canSubmit = isParticipant && (match.status === "scheduled" || match.status === "in_progress");
  const canHost = isHost && match.status !== "confirmed";

  return (
    <View style={styles.matchCard}>
      <PlayerRow name={p1} score={scoreA} winner={match.winnerTeam === "team_a" || match.winnerEmail === match.player1Email} />
      <View style={styles.divider} />
      <PlayerRow name={p2} score={scoreB} winner={match.winnerTeam === "team_b" || match.winnerEmail === match.player2Email} />
      <Text style={styles.statusMeta}>{match.status.replaceAll("_", " ")}</Text>
      <View style={styles.actions}>
        {canSubmit && onSubmitScore ? (
          <Pressable style={styles.actionBtn} onPress={() => onSubmitScore(match)}>
            <Text style={styles.actionText}>Submit</Text>
          </Pressable>
        ) : null}
        {canValidate && onValidateScore ? (
          <Pressable style={[styles.actionBtn, styles.actionValidate]} onPress={() => onValidateScore(match)}>
            <Text style={styles.actionValidateText}>Validate</Text>
          </Pressable>
        ) : null}
        {canHost && onHostScore ? (
          <Pressable style={styles.actionBtn} onPress={() => onHostScore(match)}>
            <Text style={styles.actionText}>Organiser</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function PlayerRow({ name, score, winner }: { name: string; score?: string | null; winner?: boolean }) {
  return (
    <View style={styles.playerRow}>
      <Text style={[styles.playerName, winner && styles.playerWinner]} numberOfLines={1}>
        {name}
      </Text>
      {score ? <Text style={styles.playerScore}>{score}</Text> : null}
    </View>
  );
}

export function BracketView({
  matches,
  currentUserEmail,
  isHost,
  isDoubles,
  onSubmitScore,
  onValidateScore,
  onHostScore,
}: BracketViewProps) {
  if (!matches.length) {
    return (
      <View style={styles.empty}>
        <Ionicons name="trophy-outline" size={28} color={COLORS.iconMuted} />
        <Text style={styles.emptyText}>Bracket will appear once the tournament starts</Text>
      </View>
    );
  }

  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  const totalRounds = rounds.length;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {rounds.map((round) => {
        const roundMatches = matches
          .filter((m) => m.round === round)
          .sort((a, b) => (a.matchOrder ?? 0) - (b.matchOrder ?? 0));
        return (
          <View key={round} style={styles.roundCol}>
            <Text style={styles.roundTitle}>{roundLabel(round, totalRounds)}</Text>
            {roundMatches.map((m) => (
              <BracketMatchCard
                key={m.id}
                match={m}
                currentUserEmail={currentUserEmail}
                isHost={isHost}
                isDoubles={isDoubles}
                onSubmitScore={onSubmitScore}
                onValidateScore={onValidateScore}
                onHostScore={onHostScore}
              />
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 12, gap: 12 },
  roundCol: { width: 220, marginRight: 10 },
  roundTitle: {
    textAlign: "center",
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.6,
  },
  matchCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    marginBottom: 10,
    overflow: "hidden",
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  playerName: { flex: 1, fontSize: 12, fontWeight: "600", color: COLORS.text },
  playerWinner: { color: COLORS.primary },
  playerScore: { fontSize: 12, fontWeight: "800", color: COLORS.text },
  divider: { height: 1, backgroundColor: COLORS.border },
  statusMeta: {
    fontSize: 9,
    color: COLORS.textMuted,
    paddingHorizontal: 10,
    paddingBottom: 6,
    textTransform: "capitalize",
  },
  actions: { flexDirection: "row", gap: 6, paddingHorizontal: 8, paddingBottom: 8 },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    alignItems: "center",
  },
  actionValidate: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  actionText: { fontSize: 10, fontWeight: "700", color: COLORS.text },
  actionValidateText: { fontSize: 10, fontWeight: "700", color: COLORS.primary },
  empty: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 12, color: COLORS.textMuted, textAlign: "center" },
});
