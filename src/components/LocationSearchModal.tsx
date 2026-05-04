import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { COLORS } from "../theme/colors";

type LocationPick = {
  city: string;
  address: string;
  label: string;
  lat?: number;
  lon?: number;
};

type NominatimItem = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
    road?: string;
    postcode?: string;
  };
};

export function LocationSearchModal({
  visible,
  title = "Select location",
  initialQuery = "",
  onClose,
  onPick,
}: {
  visible: boolean;
  title?: string;
  initialQuery?: string;
  onClose: () => void;
  onPick: (location: LocationPick) => void;
}) {
  const [query, setQuery] = React.useState(initialQuery);
  const [loading, setLoading] = React.useState(false);
  const [usingGeo, setUsingGeo] = React.useState(false);
  const [results, setResults] = React.useState<NominatimItem[]>([]);

  React.useEffect(() => {
    if (!visible) return;
    setQuery(initialQuery);
  }, [visible, initialQuery]);

  React.useEffect(() => {
    if (!visible) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&q=${encodeURIComponent(q)}`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          },
        );
        const data = (await res.json()) as NominatimItem[];
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
      setLoading(false);
    };
  }, [query, visible]);

  const pickNominatim = (item: NominatimItem) => {
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const city =
      item.address?.city ||
      item.address?.town ||
      item.address?.village ||
      item.address?.county ||
      item.address?.state ||
      "";
    const country = item.address?.country || "";
    const label = [city, country].filter(Boolean).join(", ") || item.display_name;
    onPick({
      city: label,
      address: item.display_name,
      label,
      lat,
      lon,
    });
    onClose();
  };

  const useApproxLocation = async () => {
    try {
      setUsingGeo(true);
      const res = await fetch("https://ipapi.co/json/");
      const data = (await res.json()) as {
        city?: string;
        region?: string;
        country_name?: string;
        latitude?: number;
        longitude?: number;
      };
      const city = [data.city, data.region, data.country_name].filter(Boolean).join(", ");
      const label = city || "Current location";
      const lat = data.latitude;
      const lon = data.longitude;
      if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        return;
      }
      onPick({
        city: label,
        address: label,
        label,
        lat,
        lon,
      });
      onClose();
    } catch {
      // no-op: user can still search manually
    } finally {
      setUsingGeo(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </Pressable>
          </View>

          <Pressable style={styles.geoBtn} onPress={useApproxLocation} disabled={usingGeo}>
            <Ionicons name="locate-outline" size={15} color={COLORS.primaryDark} />
            <Text style={styles.geoBtnText}>
              {usingGeo ? "Detecting location..." : "Use current location"}
            </Text>
          </Pressable>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={COLORS.iconMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search city or venue"
              placeholderTextColor={COLORS.iconMuted}
              style={styles.searchInput}
            />
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : null}

          <FlatList
            data={results}
            keyExtractor={(item) => `${item.lat}-${item.lon}-${item.display_name}`}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.resultList}
            renderItem={({ item }) => (
              <Pressable style={styles.resultItem} onPress={() => pickNominatim(item)}>
                <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                <View style={styles.resultTextWrap}>
                  <Text numberOfLines={1} style={styles.resultTitle}>
                    {item.address?.city ||
                      item.address?.town ||
                      item.address?.village ||
                      item.address?.state ||
                      item.display_name}
                  </Text>
                  <Text numberOfLines={2} style={styles.resultSub}>
                    {item.display_name}
                  </Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              !loading && query.trim().length >= 2 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>No locations found.</Text>
                </View>
              ) : null
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", paddingHorizontal: 18 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: "74%",
    padding: 12,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  title: { color: COLORS.text, fontSize: 14, fontWeight: "800" },
  geoBtn: {
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  geoBtnText: { color: COLORS.primaryDark, fontSize: 11, fontWeight: "700" },
  searchWrap: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    backgroundColor: COLORS.bg,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 12, paddingVertical: 8 },
  loadingWrap: { paddingVertical: 10 },
  resultList: { paddingBottom: 4 },
  resultItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultTextWrap: { flex: 1 },
  resultTitle: { color: COLORS.text, fontSize: 12, fontWeight: "700" },
  resultSub: { color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  emptyWrap: { paddingVertical: 14, alignItems: "center" },
  emptyText: { color: COLORS.textMuted, fontSize: 11 },
});
