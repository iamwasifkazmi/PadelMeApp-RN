import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { SkeletonBlock } from "../components/Skeleton";

const USER_EMAIL = "demo@padelme.app";

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

export function InstantPlayScreen({ navigation }: { navigation: any }) {
  const [loading] = React.useState(false);
  const [requestId, setRequestId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string>("idle");
  const [busy, setBusy] = React.useState(false);

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
    try {
      setBusy(true);
      const res = await api.post<{ status: string; requestId?: string; matchId?: string }>(
        "/instant-play/join",
        {
          userEmail: USER_EMAIL,
          userName: "Demo Player",
          matchType: "doubles",
          skillLevel: "intermediate",
          locationName: "Dubai",
        },
      );
      setStatus(res.status);
      if (res.matchId) navigation.navigate("MatchDetail", { id: res.matchId });
      if (res.requestId) setRequestId(res.requestId);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!requestId) return;
    await api.post("/instant-play/cancel", { requestId });
    setStatus("cancelled");
    setRequestId(null);
  };

  if (loading) return <InstantPlaySkeleton />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Instant Play</Text>
      <Text style={styles.subtitle}>Find and match players in real time</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚡ Start instant search</Text>
        <Text style={styles.cardText}>
          We will match you with nearby players and create a match automatically.
        </Text>

        <Pressable style={[styles.primaryBtn, busy && { opacity: 0.65 }]} onPress={join} disabled={busy}>
          <Text style={styles.primaryBtnText}>{busy ? "Searching..." : "Find Instant Match"}</Text>
        </Pressable>

        {status !== "idle" && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status: </Text>
            <Text style={styles.statusValue}>{status}</Text>
          </View>
        )}

        {requestId && (
          <Pressable style={styles.secondaryBtn} onPress={cancel}>
            <Text style={styles.secondaryBtnText}>Cancel Request</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800", color: "#0f172a" },
  subtitle: { marginTop: 2, marginBottom: 12, color: "#64748b" },
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  cardText: { marginTop: 6, color: "#64748b", fontSize: 13, lineHeight: 18 },
  primaryBtn: { marginTop: 14, backgroundColor: "#2563eb", borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  statusRow: { marginTop: 12, flexDirection: "row", alignItems: "center" },
  statusLabel: { color: "#64748b", fontSize: 13 },
  statusValue: { color: "#0f172a", fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  secondaryBtn: { marginTop: 10, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 10 },
  secondaryBtnText: { color: "#0f172a", fontWeight: "700", fontSize: 13 },
});

