import React from "react";
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../lib/api";
import { LocationPickerField } from "../components/LocationPickerField";
import { CountrySearchPicker } from "../components/CountrySearchPicker";
import { TravelRadiusChips } from "../components/TravelRadiusChips";
import { useSnackbar } from "../components/Snackbar";
import { SkeletonBlock } from "../components/Skeleton";
import { getCurrentUserEmail, getCurrentUserName } from "../store";
import { COLORS } from "../theme/colors";
import { hasUserGeo, userLocationLabel } from "../lib/userLocation";
import { coerceTravelRadiusKm, DEFAULT_TRAVEL_RADIUS_KM } from "../lib/travelRadius";

type NearbyMatch = {
  id: string;
  title: string;
  locationName: string;
  playersCount: number;
  maxPlayers: number;
  timeLabel: string;
  date: string;
  distanceKm?: number;
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
  const [locationAddress, setLocationAddress] = React.useState("");
  const [locationLat, setLocationLat] = React.useState<number | null>(null);
  const [locationLng, setLocationLng] = React.useState<number | null>(null);
  const [maxDistanceKm, setMaxDistanceKm] = React.useState(DEFAULT_TRAVEL_RADIUS_KM);
  const [country, setCountry] = React.useState("");
  const [locationSearchBias, setLocationSearchBias] = React.useState<{
    lat: number;
    lng: number;
    labelHint?: string;
  } | null>(null);

  const [requestId, setRequestId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string>("idle");
  const [notifiedCount, setNotifiedCount] = React.useState(0);
  const [nearby, setNearby] = React.useState<NearbyMatch[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [joiningId, setJoiningId] = React.useState<string | null>(null);

  const clearQueue = React.useCallback(() => {
    setRequestId(null);
    setNotifiedCount(0);
    setNearby([]);
  }, []);

  const goToMatch = React.useCallback(
    (matchId: string) => {
      clearQueue();
      navigation.navigate("MatchDetail", { id: matchId });
    },
    [navigation, clearQueue],
  );

  const pollQueueStatus = React.useCallback(async () => {
    if (!requestId) return;
    try {
      const res = await api.get<{ status: string; matchId?: string | null }>(
        `/instant-play/status/${requestId}`,
      );
      setStatus(res.status);
      if (res.status === "matched" && res.matchId) {
        goToMatch(res.matchId);
        return;
      }
      if (res.status === "expired" || res.status === "cancelled") {
        clearQueue();
        setStatus("idle");
        showSnackbar(
          res.status === "expired"
            ? "No players found in time. Try a wider radius or open a game below."
            : "Search cancelled.",
          { type: "error" },
        );
      }
    } catch {
      // silent
    }
  }, [requestId, goToMatch, clearQueue, showSnackbar]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setProfileLoading(true);
        const me = await api.get<{
          location?: string | null;
          locationName?: string | null;
          locationAddress?: string | null;
          locationLat?: number | null;
          locationLng?: number | null;
          skillLabel?: string | null;
          matchTypePreference?: string | null;
          country?: string | null;
          travelRadiusKm?: number | null;
        }>(`/users/me?email=${encodeURIComponent(USER_EMAIL)}`);
        if (cancelled) return;
        const label = userLocationLabel(me);
        setLocationName(label);
        setLocationAddress((me.locationAddress || me.location || "").trim());
        setLocationLat(me.locationLat ?? null);
        setLocationLng(me.locationLng ?? null);
        setMaxDistanceKm(coerceTravelRadiusKm(me.travelRadiusKm));
        if (me.country) setCountry(me.country);
        if (me.skillLabel) setSkillLevel(me.skillLabel);
        if (me.matchTypePreference === "singles") setMatchType("singles");
        if (hasUserGeo(me)) {
          setLocationSearchBias({
            lat: me.locationLat as number,
            lng: me.locationLng as number,
            labelHint: label || undefined,
          });
        }
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
    void pollQueueStatus();
    const timer = setInterval(() => void pollQueueStatus(), 3500);
    return () => clearInterval(timer);
  }, [requestId, pollQueueStatus]);

  useFocusEffect(
    React.useCallback(() => {
      if (requestId) void pollQueueStatus();
    }, [requestId, pollQueueStatus]),
  );

  React.useEffect(() => {
    if (!requestId) return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void pollQueueStatus();
    });
    return () => sub.remove();
  }, [requestId, pollQueueStatus]);

  const applyLocation = React.useCallback(
    (loc: {
      locationName: string;
      locationAddress: string;
      locationLat: number | null;
      locationLng: number | null;
    }) => {
      setLocationName(loc.locationName);
      setLocationAddress(loc.locationAddress);
      setLocationLat(loc.locationLat);
      setLocationLng(loc.locationLng);
    },
    [],
  );

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
        notifiedCount?: number;
      }>("/instant-play/join", {
        userEmail: USER_EMAIL,
        userName: USER_NAME,
        matchType,
        skillLevel,
        locationName: locationName.trim() || "Nearby court",
        locationLat: locationLat!,
        locationLng: locationLng!,
        maxDistanceKm,
        country: country || undefined,
      });
      setStatus(res.status);
      setNearby(Array.isArray(res.nearbyMatches) ? res.nearbyMatches : []);
      setNotifiedCount(typeof res.notifiedCount === "number" ? res.notifiedCount : 0);
      if (res.matchId) {
        goToMatch(res.matchId);
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
      goToMatch(matchId);
    } catch {
      showSnackbar("Could not join that lobby (it may be full).", { type: "error" });
    } finally {
      setJoiningId(null);
    }
  };

  const cancel = async () => {
    if (!requestId) return;
    await api.post("/instant-play/cancel", { requestId });
    setStatus("idle");
    clearQueue();
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

        <LocationPickerField
          value={{
            locationName,
            locationAddress,
            locationLat,
            locationLng,
          }}
          onChange={applyLocation}
          label="Playing area"
          required
          modalTitle="Pick your location"
          searchBias={locationSearchBias}
          hintEmpty="Search for where you can play right now (exact map pin)."
        />

        <TravelRadiusChips
          value={maxDistanceKm}
          onChange={setMaxDistanceKm}
          label="Search radius"
          hint={`Open instant games within ${maxDistanceKm} km of your playing area. Uses the same options as Edit Profile → Availability.`}
        />

        <Text style={styles.fieldLabel}>Country (optional)</Text>
        <CountrySearchPicker
          value={country}
          onChange={setCountry}
          hint="Helps players find you in the right region."
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>2 · Search</Text>
        <Text style={styles.cardText}>
          We join an open instant lobby within {maxDistanceKm} km when possible, otherwise queue you with nearby
          options.
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
          <Text style={styles.cardText}>Within {maxDistanceKm} km — hop into a lobby that still has space.</Text>
          {nearby.map((m) => (
            <View key={m.id} style={styles.nearRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nearTitle}>{m.title}</Text>
                <Text style={styles.nearMeta}>
                  {m.locationName}
                  {typeof m.distanceKm === "number" ? ` · ${m.distanceKm} km away` : ""} · {m.playersCount}/
                  {m.maxPlayers} · {m.timeLabel}
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
          <Text style={styles.cardText}>
            Looking for players within {maxDistanceKm} km. When a lobby fills, we open the match automatically and
            send you a notification if you leave this screen.
          </Text>
          {notifiedCount > 0 ? (
            <Text style={styles.queueHint}>
              We pinged {notifiedCount} nearby player{notifiedCount === 1 ? "" : "s"} (with nearby alerts on).
            </Text>
          ) : null}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status: </Text>
            <Text style={styles.statusValue}>{status}</Text>
          </View>
          <Pressable style={styles.secondaryBtn} onPress={cancel}>
            <Text style={styles.secondaryBtnText}>Cancel request</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 2, marginBottom: 12, color: COLORS.textMuted },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
  },
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
  primaryBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  primaryBtnText: { color: COLORS.card, fontWeight: "700" },
  statusRow: { marginTop: 12, flexDirection: "row", alignItems: "center" },
  statusLabel: { color: COLORS.textMuted, fontSize: 13 },
  statusValue: { color: COLORS.text, fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  queueHint: { marginTop: 8, color: COLORS.infoText, fontSize: 12, lineHeight: 17 },
  secondaryBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
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
