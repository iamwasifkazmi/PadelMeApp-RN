import React from "react";
import { Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { api } from "../lib/api";
import { ProfileSummaryDto, UserDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { clearPersistedSession, getCurrentUserEmail, getCurrentUserName } from "../store";
import { COLORS } from "../theme/colors";

const TAG_EMOJI: Record<string, string> = {
  Competitive: "🎯",
  Casual: "😎",
  "Beginner-friendly": "🌱",
  Social: "🤝",
  "Training partner": "💪",
};

function ProfileSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <SkeletonBlock height={28} width={140} rounded={8} />
        <View style={styles.profileSkeletonActions}>
          <SkeletonBlock height={34} width={34} rounded={10} />
          <SkeletonBlock height={34} width={34} rounded={10} />
          <SkeletonBlock height={34} width={34} rounded={10} />
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroHeaderRow}>
          <SkeletonBlock height={72} width={72} rounded={18} />
          <View style={{ flex: 1 }}>
            <SkeletonBlock height={20} width="65%" rounded={8} />
            <View style={styles.profileSkeletonGapSm} />
            <SkeletonBlock height={12} width="45%" rounded={8} />
            <View style={styles.profileSkeletonGapSm} />
            <SkeletonBlock height={12} width="55%" rounded={8} />
            <View style={styles.profileSkeletonGapSm} />
            <View style={styles.profileSkeletonBadgeRow}>
              <SkeletonBlock height={24} width={72} rounded={999} />
              <SkeletonBlock height={24} width={64} rounded={999} />
            </View>
          </View>
        </View>
        <View style={styles.profileSkeletonGapMd} />
        <View style={styles.heroButtons}>
          <SkeletonBlock height={38} width="48%" rounded={12} />
          <SkeletonBlock height={38} width="48%" rounded={12} />
        </View>
      </View>

      <View style={styles.switchTabs}>
        <SkeletonBlock height={34} width="49%" rounded={9} />
        <SkeletonBlock height={34} width="49%" rounded={9} />
      </View>

      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={styles.sectionCard}>
          <SkeletonBlock height={16} width="45%" rounded={8} />
          <View style={styles.profileSkeletonGapMd} />
          <SkeletonBlock height={12} width="90%" rounded={8} />
          <View style={styles.profileSkeletonGapSm} />
          <SkeletonBlock height={12} width="80%" rounded={8} />
          <View style={styles.profileSkeletonGapSm} />
          <SkeletonBlock height={12} width="70%" rounded={8} />
        </View>
      ))}
    </View>
  );
}

export function ProfileScreen() {
  const USER_EMAIL = getCurrentUserEmail();
  const navigation = useNavigation<any>();
  const [user, setUser] = React.useState<UserDto | null>(null);
  const [summary, setSummary] = React.useState<ProfileSummaryDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [tab, setTab] = React.useState<"overview" | "performance">("overview");
  const [logoutOpen, setLogoutOpen] = React.useState(false);

  const load = React.useCallback(
    async (opts?: { refresh?: boolean }) => {
      const isRefresh = opts?.refresh === true;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const [userRes, summaryRes] = await Promise.all([
          api.get<UserDto>(`/users/me?email=${encodeURIComponent(USER_EMAIL)}`),
          api.get<ProfileSummaryDto>(`/users/profile-summary?email=${encodeURIComponent(USER_EMAIL)}`),
        ]);
        setUser(userRes);
        setSummary(summaryRes);
      } catch {
        setUser(null);
        setSummary(null);
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [USER_EMAIL],
  );

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = React.useCallback(() => {
    load({ refresh: true });
  }, [load]);

  if (loading) return <ProfileSkeleton />;

  const fullName = summary?.user.fullName || user?.fullName || getCurrentUserName();
  const elo = summary?.stats.eloRating ?? user?.eloRating ?? 1000;
  const skill = summary?.user.skillLabel || user?.skillLabel || "intermediate";
  const rating = summary?.user.averageRating ?? user?.averageRating ?? 0;
  const eloPercent = Math.max(6, Math.min(100, ((elo - 700) / 600) * 100));
  const achievements = summary?.achievements || [];
  const earnedAchievements = achievements.filter((a) => a.earned);
  const lockedAchievements = achievements.filter((a) => !a.earned).slice(0, 3);
  const recentFormDots = summary?.recentFormDots || [];
  const userTags = summary?.user.tags || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
    >
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>My Profile</Text>
        <View style={styles.topActions}>
          <Pressable style={styles.iconBtn} onPress={() => setLogoutOpen(true)}>
            <Ionicons name="log-out-outline" size={16} color={COLORS.text} />
          </Pressable>
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
        <View style={styles.heroHeaderRow}>
          <View style={styles.avatarWrap}>
            {summary?.user.photoUrl ? (
              <Image source={{ uri: summary.user.photoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{fullName.slice(0, 1)}</Text>
              </View>
            )}
            {summary?.user.idVerified ? (
              <View style={[styles.verifyDot, styles.verifyDotBlue]}>
                <Ionicons name="shield-checkmark" size={11} color={COLORS.card} />
              </View>
            ) : summary?.user.photoVerified ? (
              <View style={[styles.verifyDot, styles.verifyDotGreen]}>
                <Ionicons name="checkmark" size={11} color={COLORS.card} />
              </View>
            ) : null}
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.location}>{summary?.user.location || user?.location || "Set your location"}</Text>
            <Text style={styles.statusLine}>{summary?.user.statusLine || "🎾 Looking for games"}</Text>
            <View style={styles.heroBadges}>
              <Badge label={skill} />
              {rating > 0 ? <Badge label={`⭐ ${rating.toFixed(1)}`} /> : null}
              <Badge label={`ELO ${elo}`} />
            </View>
          </View>
        </View>
        {!!summary?.user.bio && <Text style={styles.bioText}>{summary.user.bio}</Text>}
        {userTags.length > 0 ? (
          <View style={styles.tagRow}>
            {userTags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagChipText}>
                  {TAG_EMOJI[tag] || "🎾"} {tag}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.heroButtons}>
          <Pressable style={styles.heroCta} onPress={() => navigation.navigate("InstantPlay")}>
            <Ionicons name="flash-outline" size={14} color={COLORS.card} />
            <Text style={styles.heroCtaText}>Play Now</Text>
          </Pressable>
          <Pressable style={styles.heroGhost} onPress={() => navigation.navigate("InvitePlayers")}>
            <Text style={styles.heroGhostText}>Invite to Match</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.switchTabs}>
        <Pressable style={[styles.switchBtn, tab === "overview" && styles.switchBtnActive]} onPress={() => setTab("overview")}>
          <Text style={[styles.switchText, tab === "overview" && styles.switchTextActive]}>Overview</Text>
        </Pressable>
        <Pressable style={[styles.switchBtn, tab === "performance" && styles.switchBtnActive]} onPress={() => setTab("performance")}>
          <Text style={[styles.switchText, tab === "performance" && styles.switchTextActive]}>📊 Performance</Text>
        </Pressable>
      </View>

      {tab === "overview" ? (
        <>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>📈 Performance</Text>
              {recentFormDots.length > 0 ? (
                <View style={styles.recentFormRow}>
                  <Text style={styles.recentFormLabel}>Recent</Text>
                  {recentFormDots.map((result, index) => (
                    <View
                      key={`${result}-${index}`}
                      style={[
                        styles.formDot,
                        result === "W" ? styles.formDotWin : styles.formDotLoss,
                      ]}
                    >
                      <Text style={styles.formDotText}>{result}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
            <View style={styles.performancePills}>
              <Perf label="Matches" value={String(summary?.stats.matchesPlayed ?? 0)} />
              <Perf label="Win Rate" value={`${summary?.stats.winRate ?? 0}%`} />
              <Perf label="Wins" value={String(summary?.stats.matchesWon ?? 0)} />
              <Perf label="Losses" value={String(summary?.stats.matchesLost ?? 0)} />
            </View>
            <View style={styles.eloSection}>
              <View style={styles.eloHeadRow}>
                <Text style={styles.eloLabel}>Skill Rating (ELO)</Text>
                <Text style={styles.eloHeadValue}>{elo}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${eloPercent}%` }]} />
              </View>
              <View style={styles.scaleRow}>
                <Text style={styles.scaleText}>Beginner</Text>
                <Text style={styles.scaleText}>Intermediate</Text>
                <Text style={styles.scaleText}>Advanced</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🛡️ Trust & Badges</Text>
            <View style={styles.badgeRow}>
              <TrustChip label="ID Verified" active={Boolean(summary?.trustBadges.idVerified)} />
              <TrustChip label="Photo Verified" active={Boolean(summary?.trustBadges.photoVerified)} />
              <TrustChip label="Top Rated" active={Boolean(summary?.trustBadges.topRated)} />
              <TrustChip label="Reliable" active={Boolean(summary?.trustBadges.reliable)} />
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
            <Text style={styles.sectionTitle}>🏆 Achievements</Text>
            {earnedAchievements.map((a) => (
              <View key={a.key} style={styles.achievementRow}>
                <Text style={styles.achievementEmoji}>{a.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.achievementText}>{a.label}</Text>
                  <Text style={styles.rowMeta}>{a.desc}</Text>
                </View>
                <Text style={[styles.achievementTag, styles.achievementTagOn]}>
                  EARNED
                </Text>
              </View>
            ))}
            {lockedAchievements.map((a) => (
              <View key={a.key} style={[styles.achievementRow, { opacity: 0.52 }]}>
                <Text style={styles.achievementEmoji}>{a.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.achievementText}>{a.label}</Text>
                  <Text style={styles.rowMeta}>{a.desc}</Text>
                </View>
                <Text style={[styles.achievementTag, styles.achievementTagOff]}>
                  LOCKED
                </Text>
              </View>
            ))}
          </View>

          {(summary?.social.friends.length || summary?.social.playedWith.length) ? (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>🤝 Social</Text>
                <Pressable style={styles.socialFindBtn} onPress={() => navigation.navigate("Players")}>
                  <Ionicons name="person-add-outline" size={12} color={COLORS.text} />
                  <Text style={styles.socialFindBtnText}>Find Players</Text>
                </Pressable>
              </View>
              {!!summary?.social.friends.length && (
                <View style={styles.socialBlock}>
                  <Text style={styles.socialLabel}>Friends · {summary?.social.friendCount || 0}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.socialRow}>
                    {summary.social.friends.map((friend) => (
                      <Pressable key={friend.id} style={styles.socialAvatarWrap} onPress={() => navigation.navigate("PlayerProfile", { id: friend.id })}>
                        <View style={styles.socialAvatar}>
                          <Text style={styles.socialAvatarText}>{friend.fullName.slice(0, 1)}</Text>
                        </View>
                        <Text style={styles.socialName}>{friend.fullName.split(" ")[0]}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
              {!!summary?.social.playedWith.length && (
                <View style={styles.socialBlock}>
                  <Text style={styles.socialLabel}>Played with</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.socialRow}>
                    {summary.social.playedWith.map((player) => (
                      <Pressable key={player.id} style={styles.socialAvatarWrap} onPress={() => navigation.navigate("PlayerProfile", { id: player.id })}>
                        <View style={[styles.socialAvatar, styles.socialAvatarSmall]}>
                          <Text style={styles.socialAvatarText}>{player.fullName.slice(0, 1)}</Text>
                        </View>
                        <Text style={styles.socialName}>{player.fullName.split(" ")[0]}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          ) : null}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>📅 Upcoming</Text>
            {summary?.upcomingMatches.length ? (
              summary.upcomingMatches.map((match) => (
                <Pressable key={match.id} style={styles.rowBtn} onPress={() => navigation.navigate("MatchDetail", { id: match.id })}>
                  <View>
                    <Text style={styles.rowTitle}>{match.title}</Text>
                    <Text style={styles.rowMeta}>
                      {new Date(match.date).toLocaleDateString()} · {match.locationName}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.iconMuted} />
                </Pressable>
              ))
            ) : (
              <Text style={[styles.rowMeta, styles.emptyStateTopPad]}>No upcoming matches yet.</Text>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🕘 Recent History</Text>
            {summary?.recentHistory.length ? (
              summary.recentHistory.map((item) => (
                <Pressable key={`${item.type}-${item.id}`} style={styles.rowBtn} onPress={() => navigation.navigate("PastEvents")}>
                  <View>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowMeta}>
                      {item.type === "competition" ? "Competition" : "Match"} · {new Date(item.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.iconMuted} />
                </Pressable>
              ))
            ) : (
              <Text style={[styles.rowMeta, styles.emptyStateTopPad]}>No event history yet.</Text>
            )}
            <Pressable style={styles.rowBtn} onPress={() => navigation.navigate("PastEvents")}>
              <View>
                <Text style={styles.rowTitle}>See all history</Text>
                <Text style={styles.rowMeta}>Matches and competitions timeline</Text>
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
            <Perf label="Matches" value={String(summary?.stats.matchesPlayed ?? 0)} />
            <Perf label="Win Rate" value={`${summary?.stats.winRate ?? 0}%`} />
            <Perf label="Wins" value={String(summary?.stats.matchesWon ?? 0)} />
            <Perf label="Peak ELO" value={String(summary?.stats.eloPeak ?? Math.max(elo, 1000))} />
          </View>
        </View>
      )}
      {!summary?.user.profileComplete ? (
        <Pressable style={styles.completeProfileBtn} onPress={() => navigation.navigate("EditProfile")}>
          <Text style={styles.completeProfileBtnText}>✨ Complete Your Profile</Text>
        </Pressable>
      ) : null}
      <Modal visible={logoutOpen} transparent animationType="fade" onRequestClose={() => setLogoutOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setLogoutOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Logout?</Text>
            <Text style={styles.modalSubtitle}>You will need to login again to access your account.</Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setLogoutOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalLogout}
                onPress={async () => {
                  setLogoutOpen(false);
                  await clearPersistedSession();
                }}
              >
                <Text style={styles.modalLogoutText}>Logout</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
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
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  topTitle: { fontSize: 22, fontWeight: "800", color: COLORS.text, letterSpacing: -0.2 },
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
    alignItems: "stretch",
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  heroHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroInfo: { flex: 1 },
  avatarWrap: { position: "relative" },
  avatarImage: { width: 72, height: 72, borderRadius: 18 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: COLORS.text,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: COLORS.card, fontSize: 28, fontWeight: "800" },
  verifyDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  verifyDotBlue: { backgroundColor: "#3B82F6" },
  verifyDotGreen: { backgroundColor: COLORS.success },
  name: { fontSize: 22, fontWeight: "800", color: COLORS.text, lineHeight: 26, letterSpacing: -0.2 },
  location: { marginTop: 2, color: COLORS.textMuted, fontSize: 12 },
  statusLine: { marginTop: 4, fontSize: 12, color: COLORS.textSubtle, fontWeight: "600" },
  bioText: {
    marginTop: 10,
    marginHorizontal: 2,
    color: COLORS.textMuted,
    textAlign: "left",
    fontSize: 12,
    lineHeight: 18,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tagChip: {
    borderWidth: 1,
    borderColor: COLORS.primaryPale,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  tagChipText: { color: COLORS.primaryDark, fontSize: 12, fontWeight: "700" },
  heroBadges: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
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
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  recentFormRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  recentFormLabel: { fontSize: 10, color: COLORS.textMuted, marginRight: 4 },
  formDot: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  formDotWin: { backgroundColor: COLORS.successSoft },
  formDotLoss: { backgroundColor: COLORS.dangerSoft },
  formDotText: { fontSize: 10, fontWeight: "800", color: COLORS.text },
  performancePills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  eloSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  eloHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  eloLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },
  eloHeadValue: { fontSize: 14, fontWeight: "800", color: COLORS.primary },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 8, letterSpacing: -0.2 },
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
  emptyStateTopPad: { marginTop: 8, marginBottom: 8 },
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
  achievementEmoji: { fontSize: 18 },
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
  socialBlock: { marginTop: 2, marginBottom: 8 },
  socialFindBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: COLORS.bg,
  },
  socialFindBtnText: { color: COLORS.text, fontSize: 11, fontWeight: "700" },
  socialLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 8 },
  socialRow: { gap: 10, paddingBottom: 2 },
  socialAvatarWrap: { alignItems: "center", width: 50 },
  socialAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  socialAvatarSmall: { width: 36, height: 36, borderRadius: 18 },
  socialAvatarText: { color: COLORS.primaryDark, fontWeight: "800" },
  socialName: { marginTop: 4, fontSize: 10, color: COLORS.textMuted },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  modalSubtitle: { marginTop: 6, color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: COLORS.card,
  },
  modalCancelText: { color: COLORS.text, fontWeight: "700" },
  modalLogout: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
  },
  modalLogoutText: { color: COLORS.card, fontWeight: "700" },
  completeProfileBtn: {
    marginTop: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
  },
  completeProfileBtnText: { color: COLORS.text, fontWeight: "700", fontSize: 13 },
  profileSkeletonActions: { flexDirection: "row", gap: 8 },
  profileSkeletonBadgeRow: { flexDirection: "row", gap: 6, marginTop: 2 },
  profileSkeletonGapSm: { height: 6 },
  profileSkeletonGapMd: { height: 10 },
});

