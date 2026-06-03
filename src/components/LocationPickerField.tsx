import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { LocationSearchModal } from "./LocationSearchModal";
import { hasUserGeo, userLocationLabel, type UserLocationFields } from "../lib/userLocation";
import { COLORS } from "../theme/colors";

export type LocationFieldValue = {
  locationName: string;
  locationAddress: string;
  locationLat: number | null;
  locationLng: number | null;
};

type SearchBias = { lat: number; lng: number; labelHint?: string };

type Props = {
  value: LocationFieldValue;
  onChange: (next: LocationFieldValue) => void;
  label?: string;
  required?: boolean;
  hintEmpty?: string;
  modalTitle?: string;
  searchBias?: SearchBias | null;
};

/** Same UI as Edit Profile → Home location (search modal + coordinates). */
export function LocationPickerField({
  value,
  onChange,
  label = "Location",
  required = false,
  hintEmpty = "No place selected yet — use search for a map pin (exact coordinates).",
  modalTitle = "Pick your location",
  searchBias = null,
}: Props) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const locFields: UserLocationFields = value;
  const placeLabel = userLocationLabel(locFields) || hintEmpty;

  return (
    <View style={styles.wrap}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.requiredMark}> *</Text> : null}
      </Text>
      <Text style={styles.locationHint}>{placeLabel}</Text>
      {hasUserGeo(locFields) ? (
        <Text style={styles.coordsHint}>
          {value.locationLat?.toFixed(5)}, {value.locationLng?.toFixed(5)}
        </Text>
      ) : null}
      <Pressable style={styles.pickLocationBtn} onPress={() => setPickerOpen(true)}>
        <Ionicons name="location-outline" size={14} color={COLORS.primaryDark} />
        <Text style={styles.pickLocationBtnText}>Search & select location</Text>
      </Pressable>

      <LocationSearchModal
        visible={pickerOpen}
        title={modalTitle}
        initialQuery={value.locationName}
        searchBias={searchBias}
        onClose={() => setPickerOpen(false)}
        onPick={(loc) => {
          const lat = loc.lat;
          const lon = loc.lon;
          if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon)) {
            return;
          }
          const pickedLabel = (loc.label || loc.city || loc.address || "").trim();
          onChange({
            locationName: pickedLabel,
            locationAddress: (loc.address || pickedLabel).trim(),
            locationLat: lat,
            locationLng: lon,
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  fieldLabel: { marginBottom: 6, color: COLORS.textSubtle, fontSize: 11, fontWeight: "600" },
  requiredMark: { color: COLORS.dangerText, fontWeight: "700" },
  locationHint: {
    marginBottom: 6,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  coordsHint: { marginBottom: 8, color: COLORS.textMuted, fontSize: 11 },
  pickLocationBtn: {
    marginTop: -1,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  pickLocationBtnText: { color: COLORS.primaryDark, fontSize: 11, fontWeight: "700" },
});
