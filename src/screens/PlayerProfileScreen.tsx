import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { UserDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { useSnackbar } from "../components/Snackbar";
import { getCurrentUserEmail, getCurrentUserId } from "../store";
import { COLORS } from "../theme/colors";
import { androidChipText } from "../theme/chipAndroid";
import { PadelLevelRow } from "../components/PadelLevelRow";
import { UserAvatar } from "../components/UserAvatar";
import { formatDistanceAway } from "../lib/padelSkill";
import { userLocationLabel } from "../lib/userLocation";
import { isDirectDmBetween, normEmail } from "../lib/emailNorm";

type FriendRequestDto = {
  id: string;
  requesterEmail: string;
  recipientEmail: string;
  status: string;
};

type FriendsResponseDto = {
  friends: UserDto[];
  requests: FriendRequestDto[];
};

function PlayerProfileSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingHorizontal: 16, paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.topBar}>
        <SkeletonBlock height={34} width={34} rounded={17} />
        <SkeletonBlock height={16} width="38%" rounded={8} />
      </View>
      <View style={styles.hero}>
        <SkeletonBlock height={84} width={84} rounded={42} />
        <View style={{ height: 12 }} />
        <SkeletonBlock height={22} width="45%" rounded={8} />
        <View style={{ height: 8 }} />
        <SkeletonBlock height={14} width="35%" rounded={8} />
      </View>
      <View style={styles.statsRow}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={styles.statCard}>
            <SkeletonBlock height={10} width="55%" rounded={6} />
            <View style={{ height: 8 }} />
            <SkeletonBlock height={18} width="45%" rounded={8} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function PlayerProfileScreen({
  route,
}: {
  route: { params: { id: string } };
}) {
  const navigation = useNavigation<any>();
  const { showSnackbar } = useSnackbar();
  const USER_EMAIL = getCurrentUserEmail();
  const MY_USER_ID = getCurrentUserId();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [user, setUser] = React.useState<UserDto | null>(null);
  const [friendData, setFriendData] = React.useState<FriendsResponseDto | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [userRes, friendRes] = await Promise.all([
        api.get<UserDto>(
          `/users/${route.params.id}?viewerEmail=${encodeURIComponent(USER_EMAIL)}`,
        ),
        api.get<FriendsResponseDto>(`/friends?email=${encodeURIComponent(USER_EMAIL)}`),
      ]);
      setUser(userRes);
      setFriendData(friendRes);
    } catch {
      setUser(null);
      setFriendData(null);
    } finally {
      setLoading(false);
    }
  }, [route.params.id, USER_EMAIL]);

  React.useEffect(() => {
    load();
  }, [load]);

  const sendFriendRequest = async () => {
    if (!user) return;
    try {
      setActionLoading(true);
      await api.post("/friends/requests", {
        requesterEmail: USER_EMAIL,
        recipientEmail: user.email,
      });
      showSnackbar("Friend request sent", { type: "success" });
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("already exists")) {
        showSnackbar("Friend request already exists", { type: "info" });
      } else {
        showSnackbar("Could not send request", { type: "error" });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      setActionLoading(true);
      await api.patch(`/friends/requests/${requestId}`, { status: "accepted" });
      showSnackbar("Friend request accepted", { type: "success" });
      await load();
    } catch {
      showSnackbar("Could not accept request", { type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const openDirectChat = async () => {
    if (!user || user.email === USER_EMAIL) return;
    const isFriendChat =
      friendData?.friends?.some(
        (f) => f.email.trim().toLowerCase() === user.email.trim().toLowerCase(),
      ) ?? false;
    if (!isFriendChat) {
      showSnackbar("Add this player as a friend first to send messages.", { type: "info" });
      return;
    }
    try {
      setActionLoading(true);
      const conversations = await api.get<any[]>(
        `/conversations?email=${encodeURIComponent(USER_EMAIL)}`,
      );
      const existing = conversations.find((c) => isDirectDmBetween(c, USER_EMAIL, user.email));
      let conversationId = existing?.id as string | undefined;
      if (!conversationId) {
        const created = await api.post<any>("/conversations", {
          type: "direct",
          participantEmails: [normEmail(USER_EMAIL), normEmail(user.email)].sort(),
          entityName: user.fullName || user.email.split("@")[0],
        });
        conversationId = created.id;
      }
      navigation.navigate("ConversationView", { id: conversationId });
    } catch {
      showSnackbar("Could not open chat right now", { type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <PlayerProfileSkeleton />;
  if (!user)
    return (
      <View style={[styles.container, { paddingHorizontal: 16, paddingTop: Math.max(insets.top, 12) }]}>
        <Text style={styles.empty}>Player not found.</Text>
      </View>
    );

  const profile = user as UserDto & {
    tags?: string[];
    availabilityDays?: string[];
    matchTypePreference?: string | null;
    profileVisibility?: "public" | "private";
    idVerified?: boolean;
    photoVerified?: boolean;
  };

  const requests = friendData?.requests || [];
  const acceptedRequest = requests.find(
    (r) =>
      r.status === "accepted" &&
      ((r.requesterEmail === USER_EMAIL && r.recipientEmail === user.email) ||
        (r.recipientEmail === USER_EMAIL && r.requesterEmail === user.email)),
  );
  const incomingPending = requests.find(
    (r) => r.status === "pending" && r.requesterEmail === user.email && r.recipientEmail === USER_EMAIL,
  );
  const outgoingPending = requests.find(
    (r) => r.status === "pending" && r.requesterEmail === USER_EMAIL && r.recipientEmail === user.email,
  );

  /** Prefer ids (route + session); email-only fallback for legacy sessions missing `user.id` in storage. */
  const isOwn =
    Boolean(MY_USER_ID && route.params.id === MY_USER_ID) ||
    (!MY_USER_ID && normEmail(user.email) === normEmail(USER_EMAIL));
  const isConnected = Boolean(acceptedRequest);
  const isFriend =
    friendData?.friends?.some(
      (f) => f.email.trim().toLowerCase() === user.email.trim().toLowerCase(),
    ) ?? false;
  const isPrivateBlocked = profile.profileVisibility === "private" && !isOwn && !isConnected;

  const matchesPlayed = user.matchesPlayed ?? 0;
  const wins = user.wins ?? user.matchesWon ?? 0;
  const losses = user.matchesLost ?? 0;
  const winRate =
    user.winRatePct != null
      ? `${user.winRatePct}%`
      : matchesPlayed > 0
        ? `${Math.round((wins / matchesPlayed) * 100)}%`
        : "—";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 12) }]}
    >
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={16} color={COLORS.text} />
        </Pressable>
        <Text style={styles.topTitle}>Player Profile</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <UserAvatar
            photoUrl={profile.photoUrl}
            label={user.fullName || user.email}
            size={72}
            shape="rounded"
            borderRadius={16}
            variant="solid"
          />
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{user.fullName || user.email.split("@")[0]}</Text>
              {profile.idVerified ? (
                <Ionicons name="shield-checkmark" size={14} color="#3B82F6" />
              ) : profile.photoVerified ? (
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              ) : null}
            </View>
            {userLocationLabel(user) ? (
              <Text style={styles.location}>📍 {userLocationLabel(user)}</Text>
            ) : null}
            {(() => {
              const profileUser = user as UserDto & { distanceKm?: number | null };
              const dist = !isOwn ? formatDistanceAway(profileUser.distanceKm) : null;
              return dist ? <Text style={styles.distanceAway}>{dist}</Text> : null;
            })()}
            <View style={styles.badgesRow}>
              <View style={styles.levelWrap}>
                <PadelLevelRow skillLevel={user.skillLevel} fallbackLabel={user.skillLabel} />
              </View>
              <Badge label={`ELO ${user.eloRating || 1000}`} variant="primary" />
              <Badge
                label={`⭐ ${typeof user.averageRating === "number" && user.averageRating > 0 ? user.averageRating.toFixed(1) : "—"}`}
              />
            </View>
          </View>
        </View>

        {isPrivateBlocked ? (
          <View style={styles.privateBox}>
            <Text style={styles.privateTitle}>🔒 This profile is private</Text>
            <Text style={styles.privateMeta}>Connect first to see full profile details.</Text>
          </View>
        ) : null}

        {!isOwn ? (
          <View style={styles.actionRow}>
            {incomingPending ? (
              <Pressable
                style={[styles.primaryBtn, actionLoading && styles.disabled]}
                onPress={() => acceptFriendRequest(incomingPending.id)}
                disabled={actionLoading}
              >
                <Text style={styles.primaryBtnText}>
                  {actionLoading ? "Please wait..." : "Accept Request"}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.primaryBtn, (outgoingPending || isConnected || actionLoading) && styles.disabled]}
                onPress={sendFriendRequest}
                disabled={Boolean(outgoingPending || isConnected || actionLoading)}
              >
                <Text style={styles.primaryBtnText}>
                  {isConnected
                    ? "Friends"
                    : outgoingPending
                      ? "Request Sent"
                      : actionLoading
                        ? "Sending..."
                        : "Send Friend Request"}
                </Text>
              </Pressable>
            )}
            {isFriend ? (
              <Pressable
                style={styles.secondaryBtn}
                onPress={openDirectChat}
                disabled={actionLoading}
              >
                <Text style={styles.secondaryBtnText}>Message</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Pressable
            style={[styles.secondaryBtn, styles.heroEditBtn]}
            onPress={() => navigation.navigate("EditProfile")}
          >
            <Text style={styles.secondaryBtnText}>Edit Profile</Text>
          </Pressable>
        )}
      </View>

      {!isPrivateBlocked ? (
        <>
          <View style={styles.statsRow}>
            <Stat title="Matches" value={String(matchesPlayed)} />
            <Stat title="Wins" value={String(wins)} />
            <Stat title="Losses" value={String(losses)} />
            <Stat title="Win %" value={winRate} />
          </View>

          {user.recentMatchResults && user.recentMatchResults.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📊 Recent match results</Text>
              <Text style={styles.cardHint}>Tap a row to open the match and see full scores.</Text>
              {user.recentMatchResults.map((r) => {
                const won = /^w/i.test(String(r.result || ""));
                return (
                  <Pressable
                    key={`${r.matchId}-${r.date}`}
                    style={styles.resultRow}
                    onPress={() => navigation.navigate("MatchDetail", { id: r.matchId })}
                  >
                    <View style={styles.resultRowTop}>
                      <Text style={styles.resultTitle} numberOfLines={1}>
                        {r.title || "Match"}
                      </Text>
                      <View style={[styles.resultBadge, won ? styles.resultBadgeWin : styles.resultBadgeLoss]}>
                        <Text style={[styles.resultBadgeText, won ? styles.resultBadgeTextWin : styles.resultBadgeTextLoss]}>
                          {won ? "W" : "L"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.resultMeta}>
                      {new Date(r.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {r.scoreSummary ? ` · ${r.scoreSummary}` : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {user.bio ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>💬 About</Text>
              <Text style={styles.cardText}>{user.bio}</Text>
            </View>
          ) : null}

          {(profile.matchTypePreference || profile.availabilityDays?.length || profile.tags?.length) ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🎾 Play Style</Text>
              {profile.matchTypePreference ? (
                <Text style={styles.cardText}>Prefers: {profile.matchTypePreference}</Text>
              ) : null}
              {profile.availabilityDays?.length ? (
                <Text style={styles.cardText}>
                  Available: {profile.availabilityDays.map((d) => d.slice(0, 3)).join(", ")}
                </Text>
              ) : null}
              {profile.tags?.length ? (
                <View style={styles.tagsRow}>
                  {profile.tags.map((tag) => (
                    <View key={tag} style={styles.tagChip}>
                      <Text style={styles.tagChipText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function Badge({ label, variant }: { label: string; variant?: "default" | "primary" }) {
  const isPrimary = variant === "primary";
  return (
    <View style={[styles.badge, isPrimary && styles.badgePrimary]}>
      <Text style={[styles.badgeText, isPrimary && styles.badgeTextPrimary]}>{label}</Text>
    </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { color: COLORS.text, fontSize: 19, fontWeight: "800" },
  hero: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  name: { color: COLORS.text, fontSize: 22, fontWeight: "800", lineHeight: 25 },
  location: { marginTop: 2, color: COLORS.textMuted, fontSize: 12 },
  distanceAway: { marginTop: 2, color: COLORS.textSoft, fontSize: 11, fontWeight: "600" },
  badgesRow: {
    marginTop: 8,
    marginBottom: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  levelWrap: { width: "100%", marginBottom: 2 },
  badge: { borderRadius: 999, backgroundColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 5 },
  badgePrimary: { backgroundColor: COLORS.primarySoftAlt },
  badgeText: { color: COLORS.textSubtle, fontSize: 11, fontWeight: "700", textTransform: "capitalize", ...androidChipText(11) },
  badgeTextPrimary: { color: COLORS.primary, textTransform: "none" },
  privateBox: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    padding: 10,
  },
  privateTitle: { color: COLORS.text, fontSize: 13, fontWeight: "700" },
  privateMeta: { marginTop: 2, color: COLORS.textMuted, fontSize: 11 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 20 },
  heroEditBtn: { marginTop: 20, alignSelf: "stretch" },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  primaryBtnText: { color: COLORS.card, fontWeight: "700", fontSize: 12 },
  secondaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryBtnText: { color: COLORS.text, fontWeight: "700", fontSize: 12 },
  disabled: { opacity: 0.65 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 12,
  },
  statTitle: { color: COLORS.textMuted, fontSize: 10, fontWeight: "700" },
  statValue: { marginTop: 4, color: COLORS.text, fontSize: 14, fontWeight: "800" },
  card: {
    marginTop: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
  },
  cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: "700", marginBottom: 6 },
  cardHint: { color: COLORS.textMuted, fontSize: 11, marginBottom: 10, lineHeight: 15 },
  resultRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  resultRowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  resultTitle: { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: "700" },
  resultMeta: { marginTop: 4, color: COLORS.textMuted, fontSize: 11 },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  resultBadgeText: { fontSize: 11, fontWeight: "800", ...androidChipText(11) },
  resultBadgeTextWin: { color: COLORS.successText },
  resultBadgeTextLoss: { color: COLORS.textMuted },
  resultBadgeWin: { backgroundColor: COLORS.successSoft },
  resultBadgeLoss: { backgroundColor: COLORS.bg },
  cardText: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 2, textTransform: "capitalize" },
  tagsRow: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tagChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  tagChipText: { color: COLORS.text, fontSize: 11, fontWeight: "600", ...androidChipText(11) },
  empty: { marginTop: 24, textAlign: "center", color: COLORS.textMuted },
});
