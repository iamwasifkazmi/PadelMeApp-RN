import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { LocationSearchModal } from "../components/LocationSearchModal";
import { useSnackbar } from "../components/Snackbar";
import { SkeletonBlock } from "../components/Skeleton";
import { getCurrentUserEmail, getCurrentUserName } from "../store";
import { COLORS } from "../theme/colors";
import { hasUserGeo, userLocationLabel } from "../lib/userLocation";

type NearbyMatch = {
  id: string;
  title: string;
  locationName: string;
  playersCount: number;
  maxPlayers: number;
  timeLabel: string;
  date: string;
};

function InstantPlaySkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBlock height={30} width="55%" rounded={8} />
      <View style={{ height: 10 }} />
      <SkeletonBlock height={16} width="70%" rounded={8} />
      <View style={{ height: 16 }} />
      <View style={styles.card}>
        <SkeletonBlock height={18} width="45%" />
        <View style={{ height: 8 }} />
        <SkeletonBlock height={14} width="85%" />
        <View style={{ height: 16 }} />
        <SkeletonBlock height={44} width="100%" rounded={12} />
      </View>
    </View>
  );
}

export function InstantPlayScreen({ navigation }: { navigation: { navigate: (n: string, p?: object) => void } }) {
  const { showSnackbar } = useSnackbar();
  const USER_EMAIL = getCurrentUserEmail();
  const USER_NAME = getCurrentUserName();

  const [profileLoading, setProfileLoading] = React.useState(true);
  const [matchType, setMatchType] = React.useState<"singles" | "doubles">("doubles");
  const [skillLevel, setSkillLevel] = React.useState("intermediate");
  const [locationName, setLocationName] = React.useState("");
  const [locationLat, setLocationLat] = React.useState<number | null>(null);
  const [locationLng, setLocationLng] = React.useState<number | null>(null);
  const [locOpen, setLocOpen] = React.useState(false);

  const [requestId, setRequestId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string>("idle");
  const [nearby, setNearby] = React.useState<NearbyMatch[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [joiningId, setJoiningId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setProfileLoading(true);
        const me = await api.get<{
          location?: string | null;
          locationName?: string | null;
          locationLat?: number | null;
          locationLng?: number | null;
          skillLabel?: string | null;
          matchTypePreference?: string | null;
        }>(`/users/me?email=${encodeURIComponent(USER_EMAIL)}`);
        if (cancelled) return;
        setLocationName(userLocationLabel(me));
        setLocationLat(me.locationLat ?? null);
        setLocationLng(me.locationLng ?? null);
        if (me.skillLabel) setSkillLevel(me.skillLabel);
        if (me.matchTypePreference === "singles") setMatchType("singles");
      } catch {
        // keep defaults
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [USER_EMAIL]);

  React.useEffect(() => {
    if (!requestId) return;
    const timer = setInterval(async () => {
      try {
        const res = await api.get<{ status: string; matchId?: string }>(
          `/instant-play/status/${requestId}`,
        );
        setStatus(res.status);
        if (res.status === "matched" && res.matchId) {
          clearInterval(timer);
          navigation.navigate("MatchDetail", { id: res.matchId });
        }
      } catch {
        // silent
      }
    }, 3500);
    return () => clearInterval(timer);
  }, [requestId, navigation]);

  const join = async () => {
    if (!hasUserGeo({ locationLat, locationLng })) {
      showSnackbar("Choose a playing area with search so we have exact coordinates.", { type: "error" });
      return;
    }
    try {
      setBusy(true);
      const res = await api.post<{
        status: string;
        requestId?: string;
        matchId?: string;
        nearbyMatches?: NearbyMatch[];
      }>("/instant-play/join", {
        userEmail: USER_EMAIL,
        userName: USER_NAME,
        matchType,
        skillLevel,
        locationName: locationName.trim() || "Nearby court",
        locationLat: locationLat!,
        locationLng: locationLng!,
      });
      setStatus(res.status);
      setNearby(Array.isArray(res.nearbyMatches) ? res.nearbyMatches : []);
      if (res.matchId) {
        navigation.navigate("MatchDetail", { id: res.matchId });
        return;
      }
      if (res.requestId) setRequestId(res.requestId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start instant play";
      showSnackbar(msg, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const joinExisting = async (matchId: string) => {
    try {
      setJoiningId(matchId);
      await api.post("/instant-play/join-match", { matchId, userEmail: USER_EMAIL });
      if (requestId) {
        try {
          await api.post("/instant-play/cancel", { requestId });
        } catch {
          // ignore
        }
        setRequestId(null);
      }
      navigation.navigate("MatchDetail", { id: matchId });
    } catch {
      showSnackbar("Could not join that lobby (it may be full).", { type: "error" });
    } finally {
      setJoiningId(null);
    }
  };

  const cancel = async () => {
    if (!requestId) return;
    await api.post("/instant-play/cancel", { requestId });
    setStatus("cancelled");
    setRequestId(null);
    setNearby([]);
  };

  if (profileLoading) return <InstantPlaySkeleton />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Instant play</Text>
      <Text style={styles.subtitle}>Match in real time with players near you.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>1 · Preferences</Text>
        <Text style={styles.cardText}>Format and skill help us pool you correctly.</Text>
        <View style={styles.chipRow}>
          {(["doubles", "singles"] as const).map((m) => (
            <Pressable
              key={m}
              style={[styles.chip, matchType === m && styles.chipOn]}
              onPress={() => setMatchType(m)}
            >
              <Text style={[styles.chipText, matchType === m && styles.chipTextOn]}>{m}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.chipRow}>
          {["beginner", "intermediate", "advanced", "any"].map((s) => (
            <Pressable
              key={s}
              style={[styles.chipSm, skillLevel === s && styles.chipOn]}
              onPress={() => setSkillLevel(s)}
            >
              <Text style={[styles.chipTextSm, skillLevel === s && styles.chipTextOn]}>{s}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.fieldLabel}>Playing area</Text>
        <Pressable style={styles.locBtn} onPress={() => setLocOpen(true)}>
          <Ionicons name="location-outline" size={18} color={COLORS.primary} />
          <Text style={styles.locBtnText} numberOfLines={2}>
            {locationName.trim() || "Tap to set location"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>2 · Search</Text>
        <Text style={styles.cardText}>
          We join an open instant lobby when possible, otherwise queue you with nearby options.
        </Text>
        <Pressable style={[styles.primaryBtn, busy && { opacity: 0.65 }]} onPress={join} disabled={busy}>
          <Text style={styles.primaryBtnText}>{busy ? "Searching…" : "Find instant match"}</Text>
        </Pressable>
        {status !== "idle" && !requestId ? (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Last result: </Text>
            <Text style={styles.statusValue}>{status}</Text>
          </View>
        ) : null}
      </View>

      {nearby.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Open instant games</Text>
          <Text style={styles.cardText}>Hop into a lobby that still has space.</Text>
          {nearby.map((m) => (
            <View key={m.id} style={styles.nearRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nearTitle}>{m.title}</Text>
                <Text style={styles.nearMeta}>
                  {m.locationName} · {m.playersCount}/{m.maxPlayers} · {m.timeLabel}
                </Text>
              </View>
              <Pressable
                style={[styles.joinSmall, joiningId === m.id && { opacity: 0.6 }]}
                onPress={() => joinExisting(m.id)}
                disabled={joiningId !== null}
              >
                <Text style={styles.joinSmallText}>{joiningId === m.id ? "…" : "Join"}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {requestId ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3 · In queue</Text>
          <Text style={styles.cardText}>We will move you as soon as a lobby fills.</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status: </Text>
            <Text style={styles.statusValue}>{status}</Text>
          </View>
          <Pressable style={styles.secondaryBtn} onPress={cancel}>
            <Text style={styles.secondaryBtnText}>Cancel request</Text>
          </Pressable>
        </View>
      ) : null}

      <LocationSearchModal
        visible={locOpen}
        title="Playing area"
        initialQuery={locationName}
        onClose={() => setLocOpen(false)}
        onPick={(loc) => {
          const lat = loc.lat;
          const lon = loc.lon;
          if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon)) {
            return;
          }
          setLocationName((loc.label || loc.address || loc.city || "").trim());
          setLocationLat(lat);
          setLocationLng(lon);
          setLocOpen(false);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 2, marginBottom: 12, color: COLORS.textMuted },
  card: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  cardText: { marginTop: 6, color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  chipSm: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  chipOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  chipText: { fontWeight: "700", color: COLORS.text, textTransform: "capitalize" },
  chipTextSm: { fontWeight: "700", color: COLORS.text, fontSize: 12, textTransform: "capitalize" },
  chipTextOn: { color: COLORS.primaryDark },
  fieldLabel: { marginTop: 14, marginBottom: 6, color: COLORS.textSubtle, fontSize: 12, fontWeight: "600" },
  locBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  locBtnText: { flex: 1, color: COLORS.text, fontWeight: "600" },
  primaryBtn: { marginTop: 14, backgroundColor: COLORS.primary, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  primaryBtnText: { color: COLORS.card, fontWeight: "700" },
  statusRow: { marginTop: 12, flexDirection: "row", alignItems: "center" },
  statusLabel: { color: COLORS.textMuted, fontSize: 13 },
  statusValue: { color: COLORS.text, fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  secondaryBtn: { marginTop: 10, borderWidth: 1, borderColor: COLORS.borderMuted, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 10 },
  secondaryBtnText: { color: COLORS.text, fontWeight: "700", fontSize: 13 },
  nearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderMuted,
  },
  nearTitle: { fontWeight: "700", color: COLORS.text },
  nearMeta: { marginTop: 2, fontSize: 12, color: COLORS.textMuted },
  joinSmall: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  joinSmallText: { color: COLORS.card, fontWeight: "800", fontSize: 12 },
});
