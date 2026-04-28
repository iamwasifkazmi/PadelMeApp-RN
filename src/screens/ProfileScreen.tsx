import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { api } from "../lib/api";
import { UserDto } from "../lib/types";
import { ScreenSkeleton } from "../components/Skeleton";
import { COLORS } from "../theme/colors";

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
  const achievements = [
    { icon: "flame-outline", label: "10 Matches", earned: true },
    { icon: "trophy-outline", label: "5 Wins", earned: true },
    { icon: "star-outline", label: "Top Rated", earned: rating >= 4.5 },
    { icon: "shield-checkmark-outline", label: "Verified", earned: false },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>My Profile</Text>
        <View style={styles.topActions}>
          <Pressable style={styles.iconBtn} onPress={() => navigation.navigate("EditProfile")}>
            <Ionicons name="create-outline" size={16} color={COLORS.text} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => navigation.navigate("Notifications")}>
            <Ionicons name="notifications-outline" size={16} color={COLORS.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.heroGradient}>
        <View style={styles.heroGlow} />
      </View>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{fullName.slice(0, 1)}</Text>
        </View>
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.location}>{user?.location || "Set your location"}</Text>
        <Text style={styles.statusLine}>🎾 Looking for games</Text>
        <View style={styles.heroBadges}>
          <Badge label={skill} />
          <Badge label={`⭐ ${rating.toFixed(1)}`} />
          <Badge label={`ELO ${elo}`} />
        </View>
        <View style={styles.heroButtons}>
          <Pressable style={styles.heroCta} onPress={() => navigation.navigate("InstantPlay")}>
            <Ionicons name="flash-outline" size={14} color={COLORS.card} />
            <Text style={styles.heroCtaText}>Play Now</Text>
          </Pressable>
          <Pressable style={styles.heroGhost} onPress={() => navigation.navigate("AcceptInvite")}>
            <Text style={styles.heroGhostText}>Accept Invite</Text>
          </Pressable>
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
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Trust & Badges</Text>
            <View style={styles.badgeRow}>
              <TrustChip label="ID Verified" active={false} />
              <TrustChip label="Photo Verified" active={false} />
              <TrustChip label="Top Rated" active={rating >= 4.5} />
              <TrustChip label="Reliable" active={true} />
            </View>
            <Pressable style={styles.rowBtn} onPress={() => navigation.navigate("Verification")}>
              <View>
                <Text style={styles.rowTitle}>Complete verification</Text>
                <Text style={styles.rowMeta}>Improve trust and profile visibility</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.iconMuted} />
            </Pressable>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            {achievements.map((a) => (
              <View key={a.label} style={[styles.achievementRow, !a.earned && { opacity: 0.55 }]}>
                <Ionicons name={a.icon as any} size={16} color={a.earned ? COLORS.primary : COLORS.iconMuted} />
                <Text style={styles.achievementText}>{a.label}</Text>
                <Text style={[styles.achievementTag, a.earned ? styles.achievementTagOn : styles.achievementTagOff]}>
                  {a.earned ? "EARNED" : "LOCKED"}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.quickRow}>
            <Pressable style={styles.quickCard} onPress={() => navigation.navigate("InstantPlay")}>
              <Ionicons name="flash-outline" size={18} color={COLORS.warning} />
              <Text style={styles.quickTitle}>Play Now</Text>
              <Text style={styles.quickMeta}>Instant matching</Text>
            </Pressable>
            <Pressable style={styles.quickCard} onPress={() => navigation.navigate("PastEvents")}>
              <Ionicons name="time-outline" size={18} color={COLORS.primary} />
              <Text style={styles.quickTitle}>History</Text>
              <Text style={styles.quickMeta}>Past matches</Text>
            </Pressable>
          </View>
          <View style={styles.quickRow}>
            <Pressable style={styles.quickCard} onPress={() => navigation.navigate("Onboarding")}>
              <Ionicons name="person-add-outline" size={18} color={COLORS.primaryDark} />
              <Text style={styles.quickTitle}>Complete Setup</Text>
              <Text style={styles.quickMeta}>Open onboarding flow</Text>
            </Pressable>
            <Pressable style={styles.quickCard} onPress={() => navigation.navigate("AcceptInvite")}>
              <Ionicons name="mail-open-outline" size={18} color={COLORS.primary} />
              <Text style={styles.quickTitle}>Accept Invite</Text>
              <Text style={styles.quickMeta}>Join via invite token</Text>
            </Pressable>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            <Pressable style={styles.rowBtn} onPress={() => navigation.navigate("DiscoverTab")}>
              <View>
                <Text style={styles.rowTitle}>Evening Padel Doubles</Text>
                <Text style={styles.rowMeta}>Fri 2 May · 19:30 · Padel Club Downtown</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.iconMuted} />
            </Pressable>
            <Pressable style={styles.rowBtn} onPress={() => navigation.navigate("PastEvents")}>
              <View>
                <Text style={styles.rowTitle}>Recent History</Text>
                <Text style={styles.rowMeta}>See all your past events and results</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.iconMuted} />
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

function TrustChip({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={[styles.trustChip, active ? styles.trustChipOn : styles.trustChipOff]}>
      <Text style={[styles.trustChipText, active ? styles.trustChipTextOn : styles.trustChipTextOff]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  topTitle: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  topActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  heroGradient: {
    position: "absolute",
    top: 52,
    left: 16,
    right: 16,
    height: 210,
    backgroundColor: COLORS.primaryPale,
    borderRadius: 20,
  },
  heroGlow: {
    position: "absolute",
    right: -30,
    top: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.borderStrong,
  },
  hero: {
    backgroundColor: COLORS.cardOverlay,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.text,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: COLORS.card, fontSize: 28, fontWeight: "800" },
  name: { marginTop: 12, fontSize: 22, fontWeight: "800", color: COLORS.text },
  location: { marginTop: 4, color: COLORS.textMuted, fontSize: 13 },
  statusLine: { marginTop: 6, fontSize: 12, color: COLORS.textSubtle, fontWeight: "600" },
  heroBadges: { flexDirection: "row", gap: 6, marginTop: 10 },
  badge: { backgroundColor: COLORS.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "700", color: COLORS.textSubtle, textTransform: "capitalize" },
  heroButtons: { flexDirection: "row", gap: 8, marginTop: 12 },
  heroCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  heroCtaText: { color: COLORS.card, fontWeight: "700", fontSize: 12 },
  heroGhost: {
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: COLORS.card,
  },
  heroGhostText: { color: COLORS.text, fontWeight: "700", fontSize: 12 },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  statTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: "600" },
  statValue: { marginTop: 5, color: COLORS.text, fontSize: 16, fontWeight: "800", textTransform: "capitalize" },
  switchTabs: {
    flexDirection: "row",
    marginTop: 10,
    backgroundColor: COLORS.border,
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
  switchBtnActive: { backgroundColor: COLORS.card },
  switchText: { fontSize: 12, color: COLORS.textSoft, fontWeight: "700" },
  switchTextActive: { color: COLORS.text },
  quickRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  quickCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  quickTitle: { marginTop: 6, fontSize: 13, fontWeight: "700", color: COLORS.text },
  quickMeta: { marginTop: 2, fontSize: 11, color: COLORS.textMuted },
  sectionCard: {
    marginTop: 10,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  trustChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1 },
  trustChipOn: { backgroundColor: COLORS.infoSoft, borderColor: COLORS.infoBorder },
  trustChipOff: { backgroundColor: COLORS.bg, borderColor: COLORS.border },
  trustChipText: { fontSize: 11, fontWeight: "700" },
  trustChipTextOn: { color: COLORS.infoText },
  trustChipTextOff: { color: COLORS.textMuted },
  rowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  rowTitle: { fontSize: 13, fontWeight: "700", color: COLORS.text },
  rowMeta: { marginTop: 2, fontSize: 11, color: COLORS.textMuted },
  achievementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 6,
  },
  achievementText: { flex: 1, fontSize: 12, color: COLORS.text, fontWeight: "600" },
  achievementTag: { fontSize: 10, fontWeight: "800", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
  achievementTagOn: { backgroundColor: COLORS.primarySoftAlt, color: COLORS.primaryDark },
  achievementTagOff: { backgroundColor: COLORS.border, color: COLORS.textMuted },
  eloBig: { fontSize: 32, fontWeight: "800", color: COLORS.primary, marginBottom: 8 },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: COLORS.border, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: COLORS.primary },
  scaleRow: { marginTop: 6, flexDirection: "row", justifyContent: "space-between" },
  scaleText: { fontSize: 10, color: COLORS.textMuted },
  performanceGrid: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  perfCard: {
    width: "48%",
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  perfValue: { fontSize: 16, color: COLORS.text, fontWeight: "800" },
  perfLabel: { marginTop: 2, fontSize: 11, color: COLORS.textMuted },
});

