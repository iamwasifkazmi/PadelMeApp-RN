import React from "react";
import {
  ActivityIndicator,
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
import { api } from "../lib/api";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";

export type VenuePick = {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

type VenueResult = {
  id?: string;
  name: string;
  address: string;
  city?: string;
  lat: number | null;
  lng: number | null;
  source: "internal" | "map" | "lta";
  bookingUrl?: string;
  ltaRegistered?: boolean;
};

type Props = {
  sport?: string;
  value: VenuePick | null;
  onChange: (venue: VenuePick | null) => void;
};

/** Inline venue search + manual entry — matches Base44 Create Match flow. */
export function VenuePicker({ sport = "padel", value, onChange }: Props) {
  const [query, setQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [venues, setVenues] = React.useState<VenueResult[] | null>(null);
  const [expandedRadius, setExpandedRadius] = React.useState(false);
  const [manualMode, setManualMode] = React.useState(false);
  const [manualName, setManualName] = React.useState("");
  const [manualCity, setManualCity] = React.useState("");
  const [manualPostcode, setManualPostcode] = React.useState("");
  const [manualAddress, setManualAddress] = React.useState("");

  const searchVenues = async (useExpandedRadius = false) => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setVenues(null);
    setManualMode(false);
    try {
      const res = await api.get<VenueResult[]>(
        `/venues/search?q=${encodeURIComponent(q)}&sport=${encodeURIComponent(sport)}${useExpandedRadius ? "&expanded=1" : ""}`,
      );
      setVenues(res);
      setExpandedRadius(useExpandedRadius);
    } catch {
      setVenues([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectVenue = async (v: VenueResult) => {
    if ((v.source === "map" || v.source === "lta") && v.lat != null && v.lng != null) {
      try {
        await api.post("/venues", {
          fromMap: true,
          sport,
          addedBy: getCurrentUserEmail(),
          pick: {
            name: v.name,
            address: v.address,
            city: v.city,
            lat: v.lat,
            lng: v.lng,
            source: v.source,
          },
        });
      } catch {
        // non-blocking — same as Base44
      }
    } else if (v.source === "lta") {
      try {
        await api.post("/venues", {
          name: v.name,
          sport,
          address: v.address,
          city: v.city,
          addedBy: getCurrentUserEmail(),
        });
      } catch {
        // non-blocking
      }
    }
    onChange({ name: v.name, address: v.address, lat: v.lat, lng: v.lng });
    setVenues(null);
    setQuery("");
    setManualMode(false);
  };

  const handleManualSave = async () => {
    if (!manualName.trim() || !manualCity.trim()) return;
    const address = [manualAddress, manualCity, manualPostcode].filter(Boolean).join(", ");
    try {
      await api.post("/venues", {
        name: manualName.trim(),
        sport,
        address: manualAddress || undefined,
        city: manualCity.trim(),
        postcode: manualPostcode || undefined,
        addedBy: getCurrentUserEmail(),
      });
    } catch {
      // non-blocking
    }
    onChange({ name: manualName.trim(), address, lat: null, lng: null });
    setManualMode(false);
    setManualName("");
    setManualCity("");
    setManualPostcode("");
    setManualAddress("");
    setVenues(null);
    setQuery("");
  };

  const handleClear = () => {
    onChange(null);
    setVenues(null);
    setQuery("");
    setManualMode(false);
    setManualName("");
    setManualCity("");
    setManualPostcode("");
    setManualAddress("");
    setExpandedRadius(false);
  };

  if (value) {
    return (
      <View style={styles.selectedCard}>
        <View style={styles.selectedRow}>
          <Ionicons name="location" size={18} color={COLORS.primary} />
          <View style={styles.selectedText}>
            <Text style={styles.selectedName} numberOfLines={1}>
              {value.name}
            </Text>
            {value.address ? (
              <Text style={styles.selectedSub} numberOfLines={2}>
                {value.address}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={handleClear} hitSlop={10}>
            <Ionicons name="close-circle" size={22} color={COLORS.textMuted} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {!manualMode ? (
        <>
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                setVenues(null);
              }}
              placeholder="Town, city, postcode or venue name..."
              placeholderTextColor={COLORS.iconMuted}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={() => searchVenues(false)}
            />
            <Pressable
              style={[styles.searchBtn, (!query.trim() || searching) && styles.searchBtnDisabled]}
              onPress={() => searchVenues(false)}
              disabled={searching || !query.trim()}
            >
              {searching ? (
                <ActivityIndicator size="small" color={COLORS.card} />
              ) : (
                <Ionicons name="search" size={18} color={COLORS.card} />
              )}
            </Pressable>
          </View>

          {venues !== null ? (
            <View style={styles.resultsBox}>
              {venues.length > 0 ? (
                <>
                  <Text style={styles.resultsHint}>
                    {venues.length} venue{venues.length !== 1 ? "s" : ""} found — tap to select
                  </Text>
                  <ScrollView style={styles.resultsList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                    {venues.map((v, i) => (
                      <Pressable key={`${v.source}-${v.name}-${i}`} style={styles.resultItem} onPress={() => handleSelectVenue(v)}>
                        <Ionicons
                          name={
                            v.source === "map"
                              ? "map-outline"
                              : v.source === "lta"
                                ? "shield-checkmark-outline"
                                : "business-outline"
                          }
                          size={16}
                          color={COLORS.primaryDark}
                        />
                        <View style={styles.resultText}>
                          <Text style={styles.resultTitle}>{v.name}</Text>
                          {v.address ? (
                            <Text style={styles.resultSub} numberOfLines={2}>
                              {v.address}
                              {v.source === "map" ? " · Map" : v.source === "lta" ? " · LTA" : ""}
                            </Text>
                          ) : null}
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={COLORS.iconMuted} />
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Pressable style={styles.linkCenter} onPress={() => setManualMode(true)}>
                    <Text style={styles.linkText}>Can't find your venue? Add it manually</Text>
                  </Pressable>
                </>
              ) : (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>
                    No {sport} venues found near "{query.trim()}"
                  </Text>
                  <Pressable style={styles.primaryBtn} onPress={() => setManualMode(true)}>
                    <Ionicons name="add" size={16} color={COLORS.card} />
                    <Text style={styles.primaryBtnText}>Add Venue Manually</Text>
                  </Pressable>
                  {!expandedRadius ? (
                    <Pressable style={styles.outlineBtn} onPress={() => searchVenues(true)}>
                      <Ionicons name="search-outline" size={16} color={COLORS.text} />
                      <Text style={styles.outlineBtnText}>Expand Search Radius</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={styles.linkCenter}
                    onPress={() => {
                      setVenues(null);
                      setQuery("");
                    }}
                  >
                    <Text style={styles.linkMuted}>Try a different area</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : null}

          {venues === null && !searching ? (
            <Pressable style={styles.linkLeft} onPress={() => setManualMode(true)}>
              <Ionicons name="create-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.linkMuted}>Enter venue manually instead</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <View style={styles.manualBox}>
          <View style={styles.manualHeader}>
            <Text style={styles.manualTitle}>Add Venue Manually</Text>
            <Pressable onPress={() => setManualMode(false)}>
              <Text style={styles.linkText}>← Search instead</Text>
            </Pressable>
          </View>
          <Text style={styles.fieldLabel}>Venue / court name *</Text>
          <TextInput
            style={styles.input}
            value={manualName}
            onChangeText={setManualName}
            placeholder="Venue / court name *"
            placeholderTextColor={COLORS.iconMuted}
          />
          <Text style={styles.fieldLabel}>Town / city *</Text>
          <TextInput
            style={styles.input}
            value={manualCity}
            onChangeText={setManualCity}
            placeholder="Town / city *"
            placeholderTextColor={COLORS.iconMuted}
          />
          <Text style={styles.fieldLabel}>Postcode (optional)</Text>
          <TextInput
            style={styles.input}
            value={manualPostcode}
            onChangeText={setManualPostcode}
            placeholder="Postcode (optional)"
            placeholderTextColor={COLORS.iconMuted}
          />
          <Text style={styles.fieldLabel}>Street address (optional)</Text>
          <TextInput
            style={styles.input}
            value={manualAddress}
            onChangeText={setManualAddress}
            placeholder="Street address (optional)"
            placeholderTextColor={COLORS.iconMuted}
          />
          <Pressable
            style={[styles.primaryBtn, (!manualName.trim() || !manualCity.trim()) && styles.searchBtnDisabled]}
            onPress={handleManualSave}
            disabled={!manualName.trim() || !manualCity.trim()}
          >
            <Text style={styles.primaryBtnText}>Use This Venue</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  selectedCard: {
    borderWidth: 1,
    borderColor: COLORS.primary + "33",
    backgroundColor: COLORS.primaryPale,
    borderRadius: 14,
    padding: 12,
  },
  selectedRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  selectedText: { flex: 1 },
  selectedName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  selectedSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  searchRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.card,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnDisabled: { opacity: 0.55 },
  resultsBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    padding: 12,
    gap: 8,
  },
  resultsHint: { fontSize: 11, color: COLORS.textMuted },
  resultsList: { maxHeight: 220 },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultText: { flex: 1 },
  resultTitle: { fontSize: 13, fontWeight: "700", color: COLORS.text },
  resultSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  emptyBox: { gap: 10, alignItems: "stretch" },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, textAlign: "center" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  primaryBtnText: { color: COLORS.card, fontWeight: "700", fontSize: 14 },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 12,
    paddingVertical: 11,
    backgroundColor: COLORS.card,
  },
  outlineBtnText: { color: COLORS.text, fontWeight: "700", fontSize: 13 },
  linkCenter: { alignItems: "center", paddingVertical: 4 },
  linkLeft: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  linkText: { color: COLORS.primary, fontWeight: "700", fontSize: 12 },
  linkMuted: { color: COLORS.textMuted, fontSize: 12 },
  manualBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    padding: 12,
    gap: 6,
  },
  manualHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  manualTitle: { fontSize: 14, fontWeight: "800", color: COLORS.text },
  fieldLabel: { fontSize: 11, fontWeight: "600", color: COLORS.textMuted, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
  },
});

/** Sheet modal for screens that still open venue search separately (e.g. Create Competition). */
export function VenuePickerModal({
  visible,
  onClose,
  onPick,
  sport = "padel",
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (venue: VenuePick) => void;
  sport?: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={modalStyles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <View style={modalStyles.overlay}>
          <Pressable style={modalStyles.backdrop} onPress={onClose} />
          <View style={[modalStyles.sheet, { paddingBottom: insets.bottom + 12, maxHeight: "88%" }]}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Search padel courts</Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </Pressable>
            </View>
            <Text style={modalStyles.hint}>
              Search a town or postcode. Results include LTA registered clubs, your venue list, and OpenStreetMap.
            </Text>
            <VenuePicker
              sport={sport}
              value={null}
              onChange={(v) => {
                if (v) {
                  onPick(v);
                  onClose();
                }
              }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  title: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  hint: { fontSize: 11, color: COLORS.textMuted, marginBottom: 10 },
  flex: { flex: 1 },
});
