import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { api } from "../lib/api";
import { UserDto } from "../lib/types";
import { ScreenSkeleton } from "../components/Skeleton";

const USER_EMAIL = "demo@padelme.app";

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [user, setUser] = React.useState<UserDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<"overview" | "performance">("overview");

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get<UserDto>(`/users/me?email=${encodeURIComponent(USER_EMAIL)}`)
      .then((res) => mounted && setUser(res))
      .catch(() => mounted && setUser(null))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <ScreenSkeleton rows={3} topGap={12} />;

  const fullName = user?.fullName || "Demo Player";
  const elo = user?.eloRating ?? 1000;
  const skill = user?.skillLabel || "intermediate";
  const rating = user?.averageRating ?? 4.5;
  const eloPercent = Math.max(6, Math.min(100, ((elo - 700) / 600) * 100));

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>My Profile</Text>
        <View style={styles.topActions}>
          <Pressable style={styles.iconBtn} onPress={() => navigation.navigate("EditProfile")}>
            <Ionicons name="create-outline" size={16} color="#0f172a" />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => navigation.navigate("Notifications")}>
            <Ionicons name="notifications-outline" size={16} color="#0f172a" />
          </Pressable>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{fullName.slice(0, 1)}</Text>
        </View>
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.location}>{user?.location || "Set your location"}</Text>
        <View style={styles.heroBadges}>
          <Badge label={skill} />
          <Badge label={`⭐ ${rating.toFixed(1)}`} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat title="ELO" value={String(elo)} />
        <Stat title="Skill" value={skill} />
        <Stat title="Rating" value={rating.toFixed(1)} />
      </View>
      <View style={styles.switchTabs}>
        <Pressable style={[styles.switchBtn, tab === "overview" && styles.switchBtnActive]} onPress={() => setTab("overview")}>
          <Text style={[styles.switchText, tab === "overview" && styles.switchTextActive]}>Overview</Text>
        </Pressable>
        <Pressable style={[styles.switchBtn, tab === "performance" && styles.switchBtnActive]} onPress={() => setTab("performance")}>
          <Text style={[styles.switchText, tab === "performance" && styles.switchTextActive]}>Performance</Text>
        </Pressable>
      </View>

      {tab === "overview" ? (
        <>
          <View style={styles.quickRow}>
            <Pressable style={styles.quickCard} onPress={() => navigation.navigate("InstantPlay")}>
              <Ionicons name="flash-outline" size={18} color="#f59e0b" />
              <Text style={styles.quickTitle}>Play Now</Text>
              <Text style={styles.quickMeta}>Instant matching</Text>
            </Pressable>
            <Pressable style={styles.quickCard} onPress={() => navigation.navigate("PastEvents")}>
              <Ionicons name="time-outline" size={18} color="#2563eb" />
              <Text style={styles.quickTitle}>History</Text>
              <Text style={styles.quickMeta}>Past matches</Text>
            </Pressable>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Trust & Verification</Text>
            <Pressable style={styles.rowBtn} onPress={() => navigation.navigate("Verification")}>
              <View>
                <Text style={styles.rowTitle}>ID Verification</Text>
                <Text style={styles.rowMeta}>Verify your profile for trust badge</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Skill Rating (ELO)</Text>
          <Text style={styles.eloBig}>{elo}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${eloPercent}%` }]} />
          </View>
          <View style={styles.scaleRow}>
            <Text style={styles.scaleText}>Beginner</Text>
            <Text style={styles.scaleText}>Intermediate</Text>
            <Text style={styles.scaleText}>Advanced</Text>
          </View>
          <View style={styles.performanceGrid}>
            <Perf label="Matches" value="24" />
            <Perf label="Win Rate" value="62%" />
            <Perf label="Streak" value="W3" />
            <Perf label="Peak ELO" value={String(Math.max(elo, 1080))} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function Perf({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.perfCard}>
      <Text style={styles.perfValue}>{value}</Text>
      <Text style={styles.perfLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingHorizontal: 16, paddingTop: 12 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  topTitle: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  topActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  name: { marginTop: 12, fontSize: 22, fontWeight: "800", color: "#0f172a" },
  location: { marginTop: 4, color: "#64748b", fontSize: 13 },
  heroBadges: { flexDirection: "row", gap: 6, marginTop: 10 },
  badge: { backgroundColor: "#e2e8f0", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#334155", textTransform: "capitalize" },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 12,
    alignItems: "center",
  },
  statTitle: { color: "#64748b", fontSize: 11, fontWeight: "600" },
  statValue: { marginTop: 5, color: "#0f172a", fontSize: 16, fontWeight: "800", textTransform: "capitalize" },
  switchTabs: {
    flexDirection: "row",
    marginTop: 10,
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    padding: 3,
  },
  switchBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 8,
  },
  switchBtnActive: { backgroundColor: "#fff" },
  switchText: { fontSize: 12, color: "#475569", fontWeight: "700" },
  switchTextActive: { color: "#0f172a" },
  quickRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  quickCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
  },
  quickTitle: { marginTop: 6, fontSize: 13, fontWeight: "700", color: "#0f172a" },
  quickMeta: { marginTop: 2, fontSize: 11, color: "#64748b" },
  sectionCard: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  rowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 10,
  },
  rowTitle: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  rowMeta: { marginTop: 2, fontSize: 11, color: "#64748b" },
  eloBig: { fontSize: 32, fontWeight: "800", color: "#2563eb", marginBottom: 8 },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: "#e2e8f0", overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: "#2563eb" },
  scaleRow: { marginTop: 6, flexDirection: "row", justifyContent: "space-between" },
  scaleText: { fontSize: 10, color: "#64748b" },
  performanceGrid: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  perfCard: {
    width: "48%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  perfValue: { fontSize: 16, color: "#0f172a", fontWeight: "800" },
  perfLabel: { marginTop: 2, fontSize: 11, color: "#64748b" },
});

