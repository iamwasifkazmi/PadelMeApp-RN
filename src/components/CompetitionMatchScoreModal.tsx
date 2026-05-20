import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { CompetitionDetailDto } from "../lib/types";
import { useSnackbar } from "./Snackbar";
import { COLORS } from "../theme/colors";

type Cm = CompetitionDetailDto["matches"][number];

type Mode = "submit" | "validate" | "host";

type Props = {
  visible: boolean;
  mode: Mode;
  competitionId: string;
  match: Cm | null;
  userEmail: string;
  isDoubles?: boolean;
  onClose: () => void;
  onDone: () => void;
};

export function CompetitionMatchScoreModal({
  visible,
  mode,
  competitionId,
  match,
  userEmail,
  isDoubles,
  onClose,
  onDone,
}: Props) {
  const { showSnackbar } = useSnackbar();
  const [score1, setScore1] = React.useState("");
  const [score2, setScore2] = React.useState("");
  const [rejecting, setRejecting] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!match) return;
    if (mode === "validate") {
      setScore1(match.submittedScoreP1 || "");
      setScore2(match.submittedScoreP2 || "");
    } else {
      setScore1(match.scorePlayer1 || match.submittedScoreP1 || "");
      setScore2(match.scorePlayer2 || match.submittedScoreP2 || "");
    }
    setRejecting(false);
    setReason("");
  }, [match, mode, visible]);

  if (!match) return null;

  const teamALabel = isDoubles ? "Team A" : match.player1Name || "Player 1";
  const teamBLabel = isDoubles ? "Team B" : match.player2Name || "Player 2";

  const run = async () => {
    if (!match) return;
    setBusy(true);
    try {
      if (mode === "submit") {
        await api.post(`/competitions/${competitionId}/matches/${match.id}/submit-score`, {
          email: userEmail,
          scoreP1: score1,
          scoreP2: score2,
        });
        showSnackbar("Score submitted", { type: "success" });
      } else if (mode === "host") {
        await api.post(`/competitions/${competitionId}/matches/${match.id}/host-score`, {
          email: userEmail,
          scoreP1: score1,
          scoreP2: score2,
        });
        showSnackbar("Score confirmed — bracket updated", { type: "success" });
      } else if (rejecting) {
        await api.post(`/competitions/${competitionId}/matches/${match.id}/reject-score`, {
          email: userEmail,
          reason,
        });
        showSnackbar("Score disputed", { type: "info" });
      } else {
        await api.post(`/competitions/${competitionId}/matches/${match.id}/confirm-score`, {
          email: userEmail,
        });
        showSnackbar("Score confirmed", { type: "success" });
      }
      onDone();
      onClose();
    } catch {
      showSnackbar("Could not save score", { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.titleRow}>
            <Ionicons
              name={mode === "host" ? "shield-outline" : mode === "validate" ? "checkmark-circle-outline" : "send-outline"}
              size={18}
              color={COLORS.primaryDark}
            />
            <Text style={styles.title}>
              {mode === "host"
                ? "Enter score (organiser)"
                : mode === "validate"
                  ? rejecting
                    ? "Dispute result"
                    : "Validate result"
                  : "Submit score"}
            </Text>
          </View>

          {mode === "validate" && !rejecting ? (
            <Text style={styles.hint}>Confirm or dispute the submitted result.</Text>
          ) : mode === "host" ? (
            <Text style={styles.hint}>As organiser, this confirms the result and advances the bracket.</Text>
          ) : null}

          {mode !== "validate" || rejecting ? (
            <View style={styles.scoreRow}>
              <View style={styles.scoreCol}>
                <Text style={styles.scoreLabel}>{teamALabel}</Text>
                <TextInput
                  style={styles.scoreInput}
                  value={score1}
                  onChangeText={setScore1}
                  keyboardType="number-pad"
                  editable={mode !== "validate" || rejecting}
                  placeholder="0"
                  placeholderTextColor={COLORS.iconMuted}
                />
              </View>
              <Text style={styles.dash}>–</Text>
              <View style={styles.scoreCol}>
                <Text style={styles.scoreLabel}>{teamBLabel}</Text>
                <TextInput
                  style={styles.scoreInput}
                  value={score2}
                  onChangeText={setScore2}
                  keyboardType="number-pad"
                  editable={mode !== "validate" || rejecting}
                  placeholder="0"
                  placeholderTextColor={COLORS.iconMuted}
                />
              </View>
            </View>
          ) : (
            <View style={styles.submittedBox}>
              <Text style={styles.submittedScore}>
                {match.submittedScoreP1} – {match.submittedScoreP2}
              </Text>
              <Text style={styles.submittedNames}>
                {match.player1Name} vs {match.player2Name}
              </Text>
            </View>
          )}

          {mode === "validate" && rejecting ? (
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder="Reason for dispute..."
              placeholderTextColor={COLORS.iconMuted}
              multiline
            />
          ) : null}

          <View style={styles.actions}>
            {mode === "validate" && !rejecting ? (
              <>
                <Pressable style={styles.outlineBtn} onPress={() => setRejecting(true)}>
                  <Text style={styles.dangerText}>Dispute</Text>
                </Pressable>
                <Pressable style={[styles.primaryBtn, busy && styles.disabled]} onPress={run} disabled={busy}>
                  {busy ? <ActivityIndicator color={COLORS.card} /> : <Text style={styles.primaryBtnText}>Confirm</Text>}
                </Pressable>
              </>
            ) : (
              <>
                <Pressable style={styles.outlineBtn} onPress={onClose}>
                  <Text style={styles.outlineBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryBtn, (busy || (mode === "validate" && rejecting && !reason.trim())) && styles.disabled]}
                  onPress={run}
                  disabled={busy || (mode !== "validate" && (!score1 || !score2))}
                >
                  {busy ? (
                    <ActivityIndicator color={COLORS.card} />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {mode === "host" ? "Confirm & advance" : mode === "validate" && rejecting ? "Send dispute" : "Save"}
                    </Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  title: { fontSize: 15, fontWeight: "800", color: COLORS.text, flex: 1 },
  hint: { fontSize: 11, color: COLORS.textMuted, marginBottom: 10, lineHeight: 16 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  scoreCol: { flex: 1 },
  scoreLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, marginBottom: 4 },
  scoreInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    paddingVertical: 10,
    color: COLORS.text,
  },
  dash: { fontSize: 18, fontWeight: "800", color: COLORS.textMuted, marginTop: 18 },
  submittedBox: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  submittedScore: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  submittedNames: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  reasonInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
    minHeight: 72,
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 10,
    textAlignVertical: "top",
  },
  actions: { flexDirection: "row", gap: 8 },
  outlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: COLORS.bg,
  },
  outlineBtnText: { color: COLORS.text, fontWeight: "700", fontSize: 12 },
  dangerText: { color: COLORS.dangerText, fontWeight: "700", fontSize: 12 },
  primaryBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 10,
  },
  primaryBtnText: { color: COLORS.card, fontWeight: "700", fontSize: 12 },
  disabled: { opacity: 0.6 },
});
