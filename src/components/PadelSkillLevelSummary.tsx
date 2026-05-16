import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  PADEL_SKILL_LABELS,
  PADEL_SKILL_SUMMARY_BG,
  PADEL_SKILL_SUMMARY_MUTED,
  padelSkillAccentForNumeric,
  padelSkillCategoryLabel,
} from "../lib/padelSkill";

/** Base44 EditProfile summary row: tier label in accent colour + long label in muted. */
export function PadelSkillLevelSummary({ skillLevel }: { skillLevel: number }) {
  const category = padelSkillCategoryLabel(skillLevel);
  const longLabel = PADEL_SKILL_LABELS[skillLevel] || "Intermediate";
  const accent = padelSkillAccentForNumeric(skillLevel);

  return (
    <View style={styles.wrap}>
      <Text style={styles.row}>
        <Text style={[styles.category, { color: accent }]}>{category}</Text>
        <Text style={styles.longLabel}> {longLabel}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: PADEL_SKILL_SUMMARY_BG,
    marginBottom: 10,
  },
  row: { textAlign: "center" },
  category: { fontSize: 14, fontWeight: "800" },
  longLabel: { fontSize: 12, fontWeight: "400", color: PADEL_SKILL_SUMMARY_MUTED },
});
