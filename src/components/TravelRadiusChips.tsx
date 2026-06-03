import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TRAVEL_RADIUS_OPTIONS_KM, travelRadiusMilesLabel } from "../lib/travelRadius";
import { COLORS } from "../theme/colors";

type Props = {
  value: number;
  onChange: (km: number) => void;
  label?: string;
  hint?: string;
};

export function TravelRadiusChips({
  value,
  onChange,
  label = "Search radius",
  hint = "How far we look for open instant games and players to match with you.",
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.row}>
        {TRAVEL_RADIUS_OPTIONS_KM.map((km) => {
          const active = value === km;
          return (
            <Pressable
              key={km}
              style={[styles.btn, active && styles.btnActive]}
              onPress={() => onChange(km)}
            >
              <Text style={[styles.btnKm, active && styles.btnTextActive]}>{km} km</Text>
              <Text style={[styles.btnMi, active && styles.btnMiActive]}>{travelRadiusMilesLabel(km)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  fieldLabel: { marginTop: 14, marginBottom: 4, color: COLORS.textSubtle, fontSize: 12, fontWeight: "600" },
  hint: { marginBottom: 8, color: COLORS.textMuted, fontSize: 11, lineHeight: 16 },
  row: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  btnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  btnKm: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },
  btnTextActive: { color: COLORS.primaryDark },
  btnMi: { marginTop: 2, color: COLORS.textSubtle, fontSize: 9, fontWeight: "600" },
  btnMiActive: { color: COLORS.primaryDark },
});
