import React from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { launchImageLibrary } from "react-native-image-picker";
import { MatchDto } from "../lib/types";
import { COLORS } from "../theme/colors";
import { androidChipText } from "../theme/chipAndroid";
import {
  formatSubmittedScoreDisplay,
  emailsMatch,
  matchUsesSetBasedScoring,
  matchScoringSubtitle,
  scoringGridRowsForNumSets,
} from "../lib/matchPendingScore";
import { isDoublesFormat } from "../lib/matchFormat";

const MAX_EVIDENCE_PHOTOS = 8;
const MAX_EVIDENCE_PER_IMAGE_CHARS = 130_000;

type SetRow = { a: string; b: string };

function parseCommaScores(scoreA: string, scoreB: string, numSets: number): SetRow[] {
  const as = (scoreA || "").split(",").map((s) => s.trim());
  const bs = (scoreB || "").split(",").map((s) => s.trim());
  return Array.from({ length: numSets }, (_, i) => ({
    a: as[i] ?? "",
    b: bs[i] ?? "",
  }));
}

function rowsToTeamArrays(rows: SetRow[]): { colA: string[]; colB: string[] } {
  return {
    colA: rows.map((r) => r.a),
    colB: rows.map((r) => r.b),
  };
}

/** Base44-style submit score sheet (sets grid or simple two totals). */
export function SubmitMatchScoreModal(props: {
  visible: boolean;
  onClose: () => void;
  match: MatchDto;
  scoreA: string;
  scoreB: string;
  setScoreA: (s: string) => void;
  setScoreB: (s: string) => void;
  winnerPick: "team_a" | "team_b" | "";
  setWinnerPick: (w: "team_a" | "team_b" | "") => void;
  evidencePhotoUris: string[];
  setEvidencePhotoUris: React.Dispatch<React.SetStateAction<string[]>>;
  busy: boolean;
  onSubmit: (scoreTeamA: string, scoreTeamB: string) => void | Promise<void>;
  maxEvidencePhotos?: number;
}) {
  const {
    visible,
    onClose,
    match,
    scoreA,
    scoreB,
    setScoreA,
    setScoreB,
    winnerPick,
    setWinnerPick,
    evidencePhotoUris,
    setEvidencePhotoUris,
    busy,
    onSubmit,
    maxEvidencePhotos = MAX_EVIDENCE_PHOTOS,
  } = props;

  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  React.useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  const isDoubles = isDoublesFormat(match);
  const teamALabel = isDoubles ? "Team A" : "You / side A";
  const teamBLabel = isDoubles ? "Team B" : "Opponent";
  const useSets = matchUsesSetBasedScoring(match);
  const configuredNumSets = match.numSets;
  const rowCount = React.useMemo(
    () => (useSets ? scoringGridRowsForNumSets(configuredNumSets) : 1),
    [useSets, configuredNumSets],
  );

  const [colA, setColA] = React.useState<string[]>(() => []);
  const [colB, setColB] = React.useState<string[]>(() => []);

  React.useEffect(() => {
    if (!visible) return;
    const rows = parseCommaScores(scoreA, scoreB, rowCount);
    const { colA: ca, colB: cb } = rowsToTeamArrays(rows);
    setColA(ca);
    setColB(cb);
  }, [visible, match.id, rowCount, scoreA, scoreB]);

  const setCell = (team: "a" | "b", setIdx: number, val: string) => {
    if (team === "a") {
      setColA((prev) => prev.map((c, i) => (i === setIdx ? val : c)));
    } else {
      setColB((prev) => prev.map((c, i) => (i === setIdx ? val : c)));
    }
  };

  const handleSubmit = async () => {
    let a = scoreA.trim();
    let b = scoreB.trim();
    if (useSets) {
      a = colA.map((s) => s.trim()).join(",");
      b = colB.map((s) => s.trim()).join(",");
      setScoreA(a);
      setScoreB(b);
    }
    await onSubmit(a, b);
  };

  const setsValid =
    useSets &&
    colA.length === rowCount &&
    colB.length === rowCount &&
    colA.every((c) => c.trim() !== "") &&
    colB.every((c) => c.trim() !== "");
  const simpleValid = scoreA.trim() !== "" && scoreB.trim() !== "";
  const canSubmit = useSets ? setsValid : simpleValid;

  const addPhotos = () => {
    if (evidencePhotoUris.length >= maxEvidencePhotos) return;
    const remaining = maxEvidencePhotos - evidencePhotoUris.length;
    void launchImageLibrary({
      mediaType: "photo",
      selectionLimit: remaining,
      includeBase64: true,
      quality: 0.4,
      maxWidth: 1600,
      maxHeight: 1600,
    }).then((result) => {
      if (result.didCancel || !result.assets?.length) return;
      const added: string[] = [];
      for (const asset of result.assets) {
        if (added.length >= remaining) break;
        if (!asset.base64) continue;
        const mime = asset.type || "image/jpeg";
        const dataUrl = `data:${mime};base64,${asset.base64}`;
        if (dataUrl.length > MAX_EVIDENCE_PER_IMAGE_CHARS) continue;
        added.push(dataUrl);
      }
      if (added.length) {
        setEvidencePhotoUris((prev) => [...prev, ...added].slice(0, maxEvidencePhotos));
      }
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mStyles.overlay}>
        <Pressable style={mStyles.backdrop} onPress={onClose} />
        <View style={mStyles.kav}>
          <View
            style={[
              mStyles.sheet,
              { marginBottom: keyboardHeight, paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            <View style={mStyles.sheetHeader}>
              <Text style={mStyles.sheetTitle}>Submit Match Score</Text>
              <Pressable hitSlop={12} onPress={onClose} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </Pressable>
            </View>

            {useSets && matchScoringSubtitle(match) ? (
              <Text style={mStyles.sheetHint}>{matchScoringSubtitle(match)}</Text>
            ) : null}

            <ScrollView
              style={mStyles.sheetBody}
              contentContainerStyle={mStyles.sheetBodyContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator
            >
            {useSets ? (
              <View style={mStyles.setTable}>
                <View style={mStyles.setHeadRow}>
                  <Text style={mStyles.setHeadIdx}>Set</Text>
                  <Text style={mStyles.setHeadCell}>{teamALabel}</Text>
                  <Text style={mStyles.setHeadCell}>{teamBLabel}</Text>
                </View>
                {Array.from({ length: rowCount }, (_, i) => (
                  <View key={i} style={mStyles.setRow}>
                    <Text style={mStyles.setIdx}>Set {i + 1}</Text>
                    <TextInput
                      style={mStyles.setInput}
                      value={colA[i] ?? ""}
                      onChangeText={(t) => setCell("a", i, t)}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={COLORS.iconMuted}
                    />
                    <TextInput
                      style={mStyles.setInput}
                      value={colB[i] ?? ""}
                      onChangeText={(t) => setCell("b", i, t)}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={COLORS.iconMuted}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={mStyles.simpleRow}>
                <View style={mStyles.simpleCol}>
                  <Text style={mStyles.inputLabel}>{teamALabel}</Text>
                  <TextInput
                    style={mStyles.simpleInput}
                    value={scoreA}
                    onChangeText={setScoreA}
                    keyboardType="number-pad"
                    placeholder="e.g. 6"
                    placeholderTextColor={COLORS.iconMuted}
                  />
                </View>
                <View style={mStyles.simpleCol}>
                  <Text style={mStyles.inputLabel}>{teamBLabel}</Text>
                  <TextInput
                    style={mStyles.simpleInput}
                    value={scoreB}
                    onChangeText={setScoreB}
                    keyboardType="number-pad"
                    placeholder="e.g. 4"
                    placeholderTextColor={COLORS.iconMuted}
                  />
                </View>
              </View>
            )}

            <Pressable style={mStyles.uploadRow} onPress={addPhotos}>
              <Ionicons name="image-outline" size={18} color={COLORS.textMuted} />
              <Text style={mStyles.uploadText}>
                {evidencePhotoUris.length
                  ? `${evidencePhotoUris.length} photo(s) attached`
                  : "Upload screenshot (optional)"}
              </Text>
            </Pressable>

            <Text style={mStyles.disclaimer}>
              The opposing captain will need to confirm this result before the match is completed.
            </Text>

            <Text style={[mStyles.inputLabel, { marginTop: 6 }]}>Winner if scores are tied (optional)</Text>
            <View style={mStyles.winnerRow}>
              <Pressable
                style={[mStyles.winnerChip, winnerPick === "team_a" && mStyles.winnerChipOn]}
                onPress={() => setWinnerPick("team_a")}
              >
                <Text style={mStyles.winnerChipText}>{teamALabel}</Text>
              </Pressable>
              <Pressable
                style={[mStyles.winnerChip, winnerPick === "team_b" && mStyles.winnerChipOn]}
                onPress={() => setWinnerPick("team_b")}
              >
                <Text style={mStyles.winnerChipText}>{teamBLabel}</Text>
              </Pressable>
            </View>
          </ScrollView>

            <View style={mStyles.sheetFooter}>
              <Pressable
                style={[mStyles.primaryFull, (!canSubmit || busy) && mStyles.primaryFullDisabled]}
                disabled={!canSubmit || busy}
                onPress={() => void handleSubmit()}
              >
                <Text style={mStyles.primaryFullText}>{busy ? "Submitting…" : "Submit Score"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Base44-style confirm / dispute sheet for pending scores. */
export function ConfirmMatchResultModal(props: {
  visible: boolean;
  onClose: () => void;
  match: MatchDto;
  viewerEmail: string;
  hostEmail: string | null;
  canValidate: boolean;
  busy: boolean;
  disputeReason: string;
  setDisputeReason: (s: string) => void;
  onConfirm: () => void | Promise<void>;
  onReject: () => void | Promise<void>;
  onDispute: () => void | Promise<void>;
}) {
  const {
    visible,
    onClose,
    match,
    viewerEmail,
    hostEmail,
    canValidate,
    busy,
    disputeReason,
    setDisputeReason,
    onConfirm,
    onReject,
    onDispute,
  } = props;

  const insets = useSafeAreaInsets();

  const [rejecting, setRejecting] = React.useState(false);

  React.useEffect(() => {
    if (!visible) {
      setRejecting(false);
      setDisputeReason("");
    }
  }, [visible, setDisputeReason]);

  const isDoubles = isDoublesFormat(match);
  const capA = (match.teamACaptainEmail || match.teamA?.[0] || "").trim();
  const capB = (match.teamBCaptainEmail || match.teamB?.[0] || "").trim();
  const isCaptainA = Boolean(capA && emailsMatch(capA, viewerEmail));
  const isCaptainB = Boolean(capB && emailsMatch(capB, viewerEmail));
  const isOrganizer = Boolean(hostEmail && emailsMatch(hostEmail, viewerEmail));

  const scoreDisplay = formatSubmittedScoreDisplay(
    match.pendingScoreTeamA || "",
    match.pendingScoreTeamB || "",
  );

  const contextLine = (() => {
    if (canValidate) {
      if (isCaptainA) return "As Team A representative, confirm or dispute this result.";
      if (isCaptainB) return "As Team B representative, confirm or dispute this result.";
      if (!isDoubles && isOrganizer) return "As match organiser, confirm or dispute this result.";
      if (isOrganizer) return "As match organiser, confirm or dispute this result.";
      return "Confirm or dispute this proposed result.";
    }
    return "Your opponent submitted this result.";
  })();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mStyles.overlay}>
        <Pressable style={mStyles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={mStyles.kav}
          keyboardVerticalOffset={Platform.OS === "ios" ? Math.max(insets.top, 12) : 0}
        >
          <View style={mStyles.sheet}>
            <View style={mStyles.sheetHeader}>
              <Text style={mStyles.sheetTitle}>Confirm Match Result</Text>
              <Pressable hitSlop={12} onPress={onClose} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={mStyles.sheetBody}
              contentContainerStyle={mStyles.sheetBodyContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
            {!canValidate ? (
              <View style={mStyles.warnBox}>
                <Text style={mStyles.warnText}>
                  ⚠️ Only team representatives can validate scores.
                </Text>
              </View>
            ) : null}

            <Text style={mStyles.contextText}>{contextLine}</Text>

            <View style={mStyles.scoreCard}>
              <Text style={mStyles.scoreCardLabel}>SUBMITTED SCORE</Text>
              <Text style={mStyles.scoreCardValue}>{scoreDisplay}</Text>
              <View style={mStyles.scoreFootRow}>
                <Text style={mStyles.scoreFoot}>{isDoubles ? "Team A" : "Player 1"}</Text>
                <Text style={mStyles.scoreFoot}>{isDoubles ? "Team B" : "Player 2"}</Text>
              </View>
            </View>

            <View style={mStyles.infoBox}>
              <Ionicons name="trending-up" size={16} color={COLORS.primaryDark} />
              <Text style={mStyles.infoText}>
                Confirming will update both players' skill ratings automatically.
              </Text>
            </View>

            {rejecting && canValidate ? (
              <View style={mStyles.disputeBlock}>
                <Text style={mStyles.inputLabel}>Reason for dispute</Text>
                <TextInput
                  style={mStyles.disputeInput}
                  value={disputeReason}
                  onChangeText={setDisputeReason}
                  placeholder="Describe the disagreement…"
                  placeholderTextColor={COLORS.iconMuted}
                  multiline
                />
              </View>
            ) : null}
          </ScrollView>

          {canValidate ? (
            <View style={mStyles.modalActions}>
              {!rejecting ? (
                <>
                  <Pressable
                    style={mStyles.outlineDanger}
                    onPress={() => setRejecting(true)}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={COLORS.dangerText} />
                    <Text style={mStyles.outlineDangerText}>Dispute</Text>
                  </Pressable>
                  <Pressable
                    style={mStyles.primaryConfirm}
                    disabled={busy}
                    onPress={() => void onConfirm()}
                  >
                    {busy ? (
                      <Text style={mStyles.primaryConfirmText}>…</Text>
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={mStyles.primaryConfirmText}>Confirm</Text>
                      </>
                    )}
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable style={mStyles.ghostBtn} onPress={() => setRejecting(false)}>
                    <Text style={mStyles.ghostBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[mStyles.btnDestructive, (!disputeReason.trim() || busy) && mStyles.primaryFullDisabled]}
                    disabled={!disputeReason.trim() || busy}
                    onPress={() => void onDispute()}
                  >
                    <Text style={mStyles.btnDestructiveText}>{busy ? "…" : "Send dispute"}</Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : (
            <Pressable style={mStyles.outlineFull} onPress={onClose}>
              <Text style={mStyles.outlineFullText}>Close</Text>
            </Pressable>
          )}

          {canValidate && !rejecting ? (
            <Pressable
              style={mStyles.rejectLink}
              disabled={busy}
              onPress={() => void onReject()}
            >
              <Text style={mStyles.rejectLinkText}>Reject — keep playing</Text>
            </Pressable>
          ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.45)" },
  kav: { width: "100%", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 14,
    maxHeight: "92%",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  sheetHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    backgroundColor: COLORS.highlightSoft,
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  sheetBody: { flexShrink: 1, flexGrow: 0, maxHeight: 420 },
  sheetBodyContent: { flexGrow: 1 },
  sheetFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    backgroundColor: COLORS.card,
  },
  setTable: { marginBottom: 12 },
  setHeadRow: { flexDirection: "row", marginBottom: 8, alignItems: "center", gap: 8 },
  setHeadIdx: {
    width: 52,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  setHeadCell: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  setRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  setIdx: { width: 52, fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    backgroundColor: COLORS.bg,
  },
  simpleRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  simpleCol: { flex: 1 },
  inputLabel: { fontSize: 12, fontWeight: "600", color: COLORS.text, marginBottom: 6 },
  simpleInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    backgroundColor: COLORS.bg,
  },
  uploadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.border,
    borderRadius: 14,
    marginBottom: 10,
  },
  uploadText: { fontSize: 13, color: COLORS.textMuted, flex: 1 },
  disclaimer: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16, marginBottom: 8 },
  primaryFull: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryFullDisabled: { opacity: 0.45 },
  primaryFullText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  winnerRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  winnerChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    backgroundColor: COLORS.card,
  },
  winnerChipOn: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  winnerChipText: { fontSize: 13, fontWeight: "700", color: COLORS.text, ...androidChipText(13) },
  warnBox: {
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.45)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  warnText: { fontSize: 13, color: COLORS.dangerText, fontWeight: "600" },
  contextText: { fontSize: 13, color: COLORS.textMuted, marginBottom: 12, lineHeight: 18 },
  scoreCard: {
    backgroundColor: COLORS.infoSoft,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  scoreCardLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  scoreCardValue: { fontSize: 22, fontWeight: "800", color: COLORS.text, textAlign: "center" },
  scoreFootRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
    paddingHorizontal: 12,
  },
  scoreFoot: { fontSize: 11, color: COLORS.textMuted },
  infoBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.infoBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  infoText: { flex: 1, fontSize: 12, color: COLORS.text, lineHeight: 17 },
  disputeBlock: { marginBottom: 8 },
  disputeInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 88,
    textAlignVertical: "top",
    color: COLORS.text,
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  outlineDanger: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.45)",
    backgroundColor: COLORS.card,
  },
  outlineDangerText: { fontSize: 14, fontWeight: "700", color: COLORS.dangerText },
  primaryConfirm: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#15803d",
  },
  primaryConfirmText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  ghostBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: COLORS.borderMuted,
  },
  ghostBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  btnDestructive: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: COLORS.dangerText,
  },
  btnDestructiveText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  outlineFull: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  outlineFullText: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  rejectLink: { marginTop: 10, alignItems: "center", paddingVertical: 8 },
  rejectLinkText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
});
