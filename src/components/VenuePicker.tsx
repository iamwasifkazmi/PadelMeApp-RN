import React from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  source: "internal" | "map";
};

type Props = {
  visible: boolean;
  sport?: string;
  onClose: () => void;
  onPick: (venue: VenuePick) => void;
};

export function VenuePicker({ visible, sport = "padel", onClose, onPick }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [venues, setVenues] = React.useState<VenueResult[] | null>(null);
  const [expanded, setExpanded] = React.useState(false);
  const [manualMode, setManualMode] = React.useState(false);
  const [manualName, setManualName] = React.useState("");
  const [manualCity, setManualCity] = React.useState("");
  const [manualAddress, setManualAddress] = React.useState("");

  React.useEffect(() => {
    if (!visible) {
      setQuery("");
      setVenues(null);
      setExpanded(false);
      setManualMode(false);
    }
  }, [visible]);

  const search = async (useExpanded = false) => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setVenues(null);
    setManualMode(false);
    try {
      const res = await api.get<VenueResult[]>(
        `/venues/search?q=${encodeURIComponent(q)}&sport=${encodeURIComponent(sport)}${useExpanded ? "&expanded=1" : ""}`,
      );
      setVenues(res);
      setExpanded(useExpanded);
    } catch {
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  const selectVenue = async (v: VenueResult) => {
    if (v.source === "map" && v.lat != null && v.lng != null) {
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
            source: "map",
          },
        });
      } catch {
        // non-blocking
      }
    }
    onPick({
      name: v.name,
      address: v.address,
      lat: v.lat,
      lng: v.lng,
    });
    onClose();
  };

  const saveManual = async () => {
    if (!manualName.trim() || !manualCity.trim()) return;
    const address = [manualAddress, manualCity].filter(Boolean).join(", ");
    try {
      await api.post("/venues", {
        name: manualName.trim(),
        sport,
        address: manualAddress || undefined,
        city: manualCity.trim(),
        addedBy: getCurrentUserEmail(),
      });
    } catch {
      // non-blocking
    }
    onPick({ name: manualName.trim(), address, lat: null, lng: null });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 12, maxHeight: "88%" }]}>
            <View style={styles.header}>
              <Text style={styles.title}>Search padel courts</Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.hint}>Clubs from our directory and OpenStreetMap padel courts.</Text>

            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={17} color={COLORS.iconMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Club, city, or postcode"
                placeholderTextColor={COLORS.iconMuted}
                style={styles.searchInput}
                returnKeyType="search"
                onSubmitEditing={() => search(false)}
              />
              <Pressable style={styles.searchGo} onPress={() => search(false)} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={styles.searchGoText}>Go</Text>
                )}
              </Pressable>
            </View>

            {manualMode ? (
              <View style={styles.manualBox}>
                <Text style={styles.fieldLabel}>Venue name *</Text>
                <TextInput style={styles.input} value={manualName} onChangeText={setManualName} />
                <Text style={styles.fieldLabel}>City *</Text>
                <TextInput style={styles.input} value={manualCity} onChangeText={setManualCity} />
                <Text style={styles.fieldLabel}>Address</Text>
                <TextInput style={styles.input} value={manualAddress} onChangeText={setManualAddress} />
                <Pressable style={styles.primaryBtn} onPress={saveManual}>
                  <Text style={styles.primaryBtnText}>Save venue</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <FlatList
                  data={venues || []}
                  keyExtractor={(item, i) => `${item.source}-${item.name}-${i}`}
                  keyboardShouldPersistTaps="handled"
                  style={styles.list}
                  ListEmptyComponent={
                    venues && !loading ? (
                      <Text style={styles.empty}>
                        {expanded
                          ? "No courts found. Try manual entry."
                          : "No results yet. Search or widen radius."}
                      </Text>
                    ) : null
                  }
                  renderItem={({ item }) => (
                    <Pressable style={styles.resultItem} onPress={() => selectVenue(item)}>
                      <Ionicons
                        name={item.source === "map" ? "map-outline" : "business-outline"}
                        size={16}
                        color={COLORS.primaryDark}
                      />
                      <View style={styles.resultText}>
                        <Text style={styles.resultTitle}>{item.name}</Text>
                        <Text style={styles.resultSub} numberOfLines={2}>
                          {item.address}
                          {item.source === "map" ? " · Map" : ""}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={COLORS.iconMuted} />
                    </Pressable>
                  )}
                />
                {venues && venues.length === 0 && !expanded && !loading ? (
                  <Pressable style={styles.linkBtn} onPress={() => search(true)}>
                    <Text style={styles.linkBtnText}>Search wider area (40 km)</Text>
                  </Pressable>
                ) : null}
                <Pressable style={styles.linkBtn} onPress={() => setManualMode(true)}>
                  <Text style={styles.linkBtnText}>Add venue manually</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  searchGo: { paddingHorizontal: 4, paddingVertical: 6 },
  searchGoText: { color: COLORS.primary, fontWeight: "700", fontSize: 13 },
  list: { maxHeight: 320, marginBottom: 6 },
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
  empty: { textAlign: "center", color: COLORS.textMuted, fontSize: 12, paddingVertical: 16 },
  linkBtn: { alignItems: "center", paddingVertical: 10 },
  linkBtnText: { color: COLORS.primary, fontWeight: "700", fontSize: 12 },
  manualBox: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 11,
    marginTop: 8,
  },
  primaryBtnText: { color: COLORS.card, fontWeight: "700", fontSize: 13 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 8,
  },
  secondaryBtnText: { color: COLORS.text, fontWeight: "700", fontSize: 12 },
  selectedRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 12 },
  selectedText: { flex: 1 },
  selectedName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  selectedSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
