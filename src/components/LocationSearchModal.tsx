import React from "react";
import {
  ActivityIndicator,
  Dimensions,
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
import { COLORS } from "../theme/colors";

const NOMINATIM_UA =
  "PadelMe/1.0 (https://github.com/iamwasifkazmi/PadelMe-mono; location search)";

type SearchBias = { lat: number; lng: number; labelHint?: string };
type BiasSource = { lat: number; lng: number; labelHint?: string };

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function nominatimSearchUrl(q: string, bias: BiasSource | null): string {
  const limit = bias ? 15 : 10;
  let url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=${limit}&q=${encodeURIComponent(q)}`;
  if (bias && Number.isFinite(bias.lat) && Number.isFinite(bias.lng)) {
    const d = 2.75;
    const left = bias.lng - d;
    const top = bias.lat + d;
    const right = bias.lng + d;
    const bottom = bias.lat - d;
    url += `&viewbox=${left},${top},${right},${bottom}`;
  }
  return url;
}

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
    hamlet?: string;
    county?: string;
    state?: string;
    country?: string;
    road?: string;
    postcode?: string;
    house_number?: string;
    pedestrian?: string;
    suburb?: string;
    neighbourhood?: string;
    district?: string;
  };
};

function resultTitleLine(item: NominatimItem): string {
  return (
    item.address?.city ||
    item.address?.town ||
    item.address?.village ||
    item.address?.hamlet ||
    item.address?.county ||
    item.address?.state ||
    item.display_name.split(",")[0]?.trim() ||
    item.display_name
  );
}

function resultSubtitle(item: NominatimItem, titleLine: string): string {
  const a = item.address;
  const road =
    a?.road && a?.house_number ? `${a.house_number} ${a.road}` : a?.road || a?.pedestrian;
  const locality = a?.suburb || a?.neighbourhood || a?.district;
  const built = [road, locality, a?.postcode, a?.state, a?.country].filter(Boolean).join(", ");
  if (built.trim()) return built;
  const dn = item.display_name;
  if (dn.toLowerCase().startsWith(titleLine.toLowerCase())) {
    return dn.slice(titleLine.length).replace(/^,\s*/, "").trim() || dn;
  }
  return dn;
}

const styles = StyleSheet.create({
  keyboardRoot: { flex: 1 },
  overlay: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { color: COLORS.text, fontSize: 17, fontWeight: "800", flex: 1, paddingRight: 8 },
  geoBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  geoBtnPressed: { backgroundColor: COLORS.bg },
  geoBtnText: { color: COLORS.text, fontSize: 13, fontWeight: "700" },
  geoHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 6,
    marginBottom: 10,
  },
  searchWrap: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
    minHeight: 44,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: 10 },
  resultScroll: { marginTop: 8 },
  resultList: { paddingBottom: 8 },
  resultItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
  },
  resultItemPressed: { opacity: 0.85 },
  pinWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  resultTextWrap: { flex: 1 },
  resultTitle: { color: COLORS.text, fontSize: 15, fontWeight: "700", lineHeight: 20 },
  resultSub: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, marginTop: 3 },
  sep: { height: 1, backgroundColor: COLORS.border, marginLeft: 42 },
  emptyWrap: { paddingVertical: 20, alignItems: "center", paddingHorizontal: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", lineHeight: 18 },
});

function ResultSeparator() {
  return <View style={styles.sep} />;
}

export function LocationSearchModal({
  visible,
  title = "Select location",
  initialQuery = "",
  searchBias,
  onClose,
  onPick,
}: {
  visible: boolean;
  title?: string;
  initialQuery?: string;
  /** Prefer results near this point (e.g. profile or previously picked pin). IP fallback used when omitted. */
  searchBias?: SearchBias | null;
  onClose: () => void;
  onPick: (location: LocationPick) => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = React.useState(initialQuery);
  const [loading, setLoading] = React.useState(false);
  const [usingGeo, setUsingGeo] = React.useState(false);
  const [results, setResults] = React.useState<NominatimItem[]>([]);
  const [approxBias, setApproxBias] = React.useState<BiasSource | null>(null);

  const activeBias = React.useMemo((): BiasSource | null => {
    if (
      searchBias &&
      Number.isFinite(searchBias.lat) &&
      Number.isFinite(searchBias.lng)
    ) {
      return {
        lat: searchBias.lat,
        lng: searchBias.lng,
        labelHint: searchBias.labelHint,
      };
    }
    if (approxBias && Number.isFinite(approxBias.lat) && Number.isFinite(approxBias.lng)) {
      return approxBias;
    }
    return null;
  }, [approxBias, searchBias]);

  React.useEffect(() => {
    if (!visible) return;
    setQuery(initialQuery);
  }, [visible, initialQuery]);

  React.useEffect(() => {
    if (!visible) return;
    if (
      searchBias &&
      Number.isFinite(searchBias.lat) &&
      Number.isFinite(searchBias.lng)
    ) {
      setApproxBias(null);
      return;
    }

    let cancelled = false;
    setApproxBias(null);
    (async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = (await res.json()) as {
          city?: string;
          region?: string;
          country_name?: string;
          latitude?: number;
          longitude?: number;
        };
        const lat = data.latitude;
        const lon = data.longitude;
        if (
          cancelled ||
          typeof lat !== "number" ||
          typeof lon !== "number" ||
          !Number.isFinite(lat) ||
          !Number.isFinite(lon)
        ) {
          return;
        }
        const labelHint = [data.city, data.region, data.country_name].filter(Boolean).join(", ");
        setApproxBias({ lat, lng: lon, ...(labelHint ? { labelHint } : {}) });
      } catch {
        // search runs without regional bias
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, searchBias]);

  React.useEffect(() => {
    if (!visible) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const biasSnapshot = activeBias;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(nominatimSearchUrl(q, biasSnapshot), {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "User-Agent": NOMINATIM_UA,
          },
        });
        const data = (await res.json()) as NominatimItem[];
        let list = Array.isArray(data) ? data : [];
        if (biasSnapshot && list.length > 1) {
          list = [...list].sort((a, b) => {
            const da = distanceKm(
              biasSnapshot.lat,
              biasSnapshot.lng,
              Number(a.lat),
              Number(a.lon),
            );
            const db = distanceKm(
              biasSnapshot.lat,
              biasSnapshot.lng,
              Number(b.lat),
              Number(b.lon),
            );
            return da - db;
          });
        }
        setResults(list.slice(0, 10));
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
  }, [query, visible, activeBias]);

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
      let lat: number | undefined;
      let lon: number | undefined;
      let label = "";

      if (activeBias) {
        lat = activeBias.lat;
        lon = activeBias.lng;
        label =
          (activeBias.labelHint && activeBias.labelHint.trim()) ||
          `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
      } else {
        const res = await fetch("https://ipapi.co/json/");
        const data = (await res.json()) as {
          city?: string;
          region?: string;
          country_name?: string;
          latitude?: number;
          longitude?: number;
        };
        const labelParts = [data.city, data.region, data.country_name].filter(Boolean) as string[];
        label =
          labelParts.length > 0 ? labelParts.join(", ") : "Approximate location (network)";
        lat = data.latitude;
        lon = data.longitude;
      }
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

  const keyboardOffset = Platform.OS === "ios" ? insets.top + 12 : 0;
  const windowHeight = Dimensions.get("window").height;
  const sheetMaxHeight = windowHeight * 0.78 - insets.bottom;
  const listMaxHeight = Math.max(180, windowHeight * 0.36);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={keyboardOffset}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View style={[styles.sheet, { maxHeight: sheetMaxHeight }]}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable hitSlop={10} onPress={onClose} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.geoBtn, pressed && styles.geoBtnPressed]}
              onPress={useApproxLocation}
              disabled={usingGeo}
            >
              <Ionicons name="locate-outline" size={17} color={COLORS.primaryDark} />
              <Text style={styles.geoBtnText}>
                {usingGeo ? "Detecting…" : "Use approximate location"}
              </Text>
            </Pressable>
            <Text style={styles.geoHint}>Based on your network region. Search below for an exact venue.</Text>

            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={17} color={COLORS.iconMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Club, street, or city"
                placeholderTextColor={COLORS.iconMuted}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="search"
              />
              {loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}
            </View>

            <FlatList
              data={results}
              keyExtractor={(item) => `${item.lat}-${item.lon}-${item.display_name}`}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              style={[styles.resultScroll, { maxHeight: listMaxHeight }]}
              contentContainerStyle={styles.resultList}
              renderItem={({ item }) => {
                const titleLine = resultTitleLine(item);
                const subLine = resultSubtitle(item, titleLine);
                return (
                  <Pressable
                    style={({ pressed }) => [styles.resultItem, pressed && styles.resultItemPressed]}
                    onPress={() => pickNominatim(item)}
                  >
                    <View style={styles.pinWrap}>
                      <Ionicons name="location" size={16} color={COLORS.primary} />
                    </View>
                    <View style={styles.resultTextWrap}>
                      <Text numberOfLines={2} style={styles.resultTitle}>
                        {titleLine}
                      </Text>
                      {subLine ? (
                        <Text numberOfLines={2} style={styles.resultSub}>
                          {subLine}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={ResultSeparator}
              ListEmptyComponent={
                !loading && query.trim().length >= 2 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>No locations found. Try a nearby city or postal code.</Text>
                  </View>
                ) : null
              }
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
