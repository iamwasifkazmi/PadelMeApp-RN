import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme/colors";

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** 1–10 level grid — selected state uses app brand orange. */
export function PadelSkillLevelGrid({
  value,
  onChange,
}: {
  value: number;
  onChange: (level: number) => void;
}) {
  return (
    <View style={styles.grid}>
      {LEVELS.map((n) => {
        const active = value === n;
        return (
          <Pressable
            key={n}
            style={[styles.btn, active && styles.btnActive]}
            onPress={() => onChange(n)}
          >
            <Text style={[styles.btnText, active && styles.btnTextActive]}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  btn: {
    width: "18%",
    minWidth: 48,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
  },
  btnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  btnText: { color: COLORS.text, fontWeight: "800", fontSize: 14 },
  btnTextActive: { color: COLORS.card },
});
