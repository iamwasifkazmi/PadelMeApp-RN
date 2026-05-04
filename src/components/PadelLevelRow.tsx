import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  clampPadelSkillLevel,
  formatPadelSkillLine,
  padelSkillAccentForNumeric,
} from "../lib/padelSkill";
import { COLORS } from "../theme/colors";

type Props = {
  skillLevel?: number | null;
  /** When no numeric 1–10, show this (e.g. legacy skillLabel). */
  fallbackLabel?: string | null;
  compact?: boolean;
};

/**
 * Base44-style summary: orange chip with level number; tier colour for "Advanced · Advanced+".
 */
export function PadelLevelRow({ skillLevel, fallbackLabel, compact }: Props) {
  const n = clampPadelSkillLevel(skillLevel);
  const line = formatPadelSkillLine(n);
  const accent = padelSkillAccentForNumeric(n);

  if (!line) {
    const label = (fallbackLabel || "—").trim();
    return (
      <View style={[styles.row, compact && styles.rowCompact]}>
        <Text style={styles.fallback} numberOfLines={1}>
          Level: <Text style={styles.fallbackStrong}>{label}</Text>
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <View style={styles.levelChip}>
        <Text style={styles.levelChipText}>{n}</Text>
      </View>
      <Text style={[styles.tierLine, { color: accent }]} numberOfLines={1}>
        {line}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  rowCompact: { gap: 6 },
  levelChip: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  levelChipText: { color: COLORS.card, fontSize: 12, fontWeight: "800" },
  tierLine: { fontSize: 12, fontWeight: "700", flexShrink: 1 },
  fallback: { fontSize: 12, color: COLORS.textMuted },
  fallbackStrong: { fontWeight: "700", color: COLORS.text, textTransform: "capitalize" },
});
