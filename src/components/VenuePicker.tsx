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
import { resolveVenueCoordinates } from "../lib/venueGeocode";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";
import { useSnackbar } from "./Snackbar";

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
  postcode?: string;
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

/** Venue search (map / LTA / internal). Resolves coordinates when missing. */
export function VenuePicker({ sport = "padel", value, onChange }: Props) {
  const { showSnackbar } = useSnackbar();
  const [query, setQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [resolving, setResolving] = React.useState(false);
  const [venues, setVenues] = React.useState<VenueResult[] | null>(null);
  const [expandedRadius, setExpandedRadius] = React.useState(false);

  const searchVenues = async (useExpandedRadius = false) => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setVenues(null);
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
    setResolving(true);
    try {
      let lat = v.lat;
      let lng = v.lng;
      if (
        lat == null ||
        lng == null ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        const coords = await resolveVenueCoordinates({
          name: v.name,
          address: v.address,
          city: v.city,
          postcode: v.postcode,
        });
        if (!coords) {
          showSnackbar("Could not save map coordinates for this place. Try another search result.", {
            type: "error",
          });
          return;
        }
        lat = coords.lat;
        lng = coords.lng;
      }

      if (v.source === "map" || v.source === "lta") {
        try {
          await api.post("/venues", {
            fromMap: true,
            sport,
            addedBy: getCurrentUserEmail(),
            pick: {
              name: v.name,
              address: v.address,
              city: v.city,
              lat,
              lng,
              source: v.source === "lta" ? "lta" : "map",
            },
          });
        } catch {
          // non-blocking
        }
      } else {
        try {
          await api.post("/venues", {
            name: v.name,
            sport,
            address: v.address || undefined,
            city: v.city,
            lat,
            lng,
            addedBy: getCurrentUserEmail(),
          });
        } catch {
          // non-blocking
        }
      }

      onChange({ name: v.name, address: v.address, lat, lng });
      setVenues(null);
      setQuery("");
    } finally {
      setResolving(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setVenues(null);
    setQuery("");
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
      {resolving ? (
        <View style={styles.resolvingRow}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.resolvingText}>Saving map location…</Text>
        </View>
      ) : null}
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
                  <Pressable
                    key={`${v.source}-${v.name}-${i}`}
                    style={styles.resultItem}
                    onPress={() => handleSelectVenue(v)}
                  >
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
            </>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                No {sport} venues found near "{query.trim()}"
              </Text>
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
                <Text style={styles.linkMuted}>Try a different search</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  resolvingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  resolvingText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
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
  linkMuted: { color: COLORS.textMuted, fontSize: 12 },
});

/** Sheet modal for competitions (venue search only). */
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
        <Pressable style={modalStyles.backdrop} onPress={onClose}>
          <Pressable style={modalStyles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={modalStyles.title}>Search padel courts</Text>
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
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 28,
    maxHeight: "85%",
  },
  title: { fontSize: 17, fontWeight: "800", color: COLORS.text, marginBottom: 12 },
});
