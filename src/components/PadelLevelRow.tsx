import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  clampPadelSkillLevel,
  formatPadelSkillLine,
  padelSkillAccentForNumeric,
} from "../lib/padelSkill";
import { COLORS } from "../theme/colors";
import { androidChipText } from "../theme/chipAndroid";

type Props = {
  skillLevel?: number | null;
  /** When no numeric 1–10, show this (e.g. legacy skillLabel). */
  fallbackLabel?: string | null;
  compact?: boolean;
  /** With `compact`, align stacked chip + tier ("center" for narrow carousel cards, "start" for lists). */
  compactAlign?: "center" | "start";
};

/**
 * Orange level chip; tier line uses Base44 category accent colour.
 */
export function PadelLevelRow({ skillLevel, fallbackLabel, compact, compactAlign = "start" }: Props) {
  const n = clampPadelSkillLevel(skillLevel);
  const line = formatPadelSkillLine(n);
  const accent = padelSkillAccentForNumeric(n);
  const isCenter = compactAlign === "center";

  if (!line) {
    const label = (fallbackLabel || "—").trim();
    return (
      <View
        style={
          compact
            ? [styles.compactCol, isCenter ? styles.compactColCenter : styles.compactColStart]
            : styles.row
        }
      >
        <Text
          style={[styles.fallback, compact && styles.fallbackCompact, isCenter && styles.fallbackCompactCenter]}
          numberOfLines={compact ? 2 : 1}
        >
          Level: <Text style={styles.fallbackStrong}>{label}</Text>
        </Text>
      </View>
    );
  }

  if (compact) {
    return (
      <View style={[styles.compactCol, isCenter ? styles.compactColCenter : styles.compactColStart]}>
        <View style={styles.levelChipCompact}>
          <Text style={styles.levelChipTextCompact}>{n}</Text>
        </View>
        <Text
          style={[
            styles.tierLineCompact,
            { color: accent },
            isCenter ? styles.tierLineCompactCenter : styles.tierLineCompactStart,
          ]}
          numberOfLines={2}
        >
          {line}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
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
  compactCol: {
    width: "100%",
    gap: 5,
  },
  compactColCenter: {
    alignItems: "center",
  },
  compactColStart: {
    alignItems: "flex-start",
  },
  levelChip: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  levelChipCompact: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 9,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  levelChipText: { color: COLORS.card, fontSize: 12, fontWeight: "800", ...androidChipText(12) },
  levelChipTextCompact: { color: COLORS.card, fontSize: 13, fontWeight: "800", ...androidChipText(13) },
  tierLine: { fontSize: 12, fontWeight: "700", flexShrink: 1 },
  tierLineCompact: {
    fontSize: 11,
    lineHeight: 14,
    width: "100%",
  },
  tierLineCompactCenter: {
    textAlign: "center",
  },
  tierLineCompactStart: {
    textAlign: "left",
  },
  fallback: { fontSize: 12, color: COLORS.textMuted },
  fallbackCompact: { width: "100%" },
  fallbackCompactCenter: { textAlign: "center" },
  fallbackStrong: { fontWeight: "700", color: COLORS.text, textTransform: "capitalize" },
});
