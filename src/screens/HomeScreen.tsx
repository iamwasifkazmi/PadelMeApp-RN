import React from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import {
  CompetitionDto,
  ConversationDto,
  MatchDto,
  NotificationDto,
  UserDto,
} from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { getCurrentUserEmail, getCurrentUserName } from "../store";
import { COLORS } from "../theme/colors";

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

type RecentResultDto = {
  id: string;
  result: "W" | "L";
  elo: number;
  date: string;
};

function HomeSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <SkeletonBlock height={42} width={42} rounded={12} />
            <View>
              <SkeletonBlock height={20} width={120} rounded={8} />
              <View style={styles.skeletonGapXs} />
              <SkeletonBlock height={12} width={90} rounded={8} />
            </View>
          </View>
          <View style={styles.headerActions}>
            <SkeletonBlock height={36} width={36} rounded={10} />
            <SkeletonBlock height={36} width={36} rounded={10} />
          </View>
        </View>

        <View style={styles.instantCard}>
          <SkeletonBlock height={16} width="40%" rounded={8} />
          <View style={styles.skeletonGapSm} />
          <SkeletonBlock height={12} width="65%" rounded={8} />
          <View style={styles.skeletonGapMd} />
          <SkeletonBlock height={32} width={92} rounded={10} />
        </View>

        <View style={styles.quickActionsRow}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.quickAction}>
              <SkeletonBlock height={20} width={20} rounded={6} />
              <View style={styles.skeletonGapXs} />
              <SkeletonBlock height={10} width={48} rounded={6} />
            </View>
          ))}
        </View>

        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.matchCard}>
            <SkeletonBlock height={14} width="55%" rounded={8} />
            <View style={styles.skeletonGapSm} />
            <SkeletonBlock height={11} width="85%" rounded={8} />
            <View style={styles.skeletonGapXs} />
            <SkeletonBlock height={10} width="45%" rounded={8} />
          </View>
        ))}
      </View>
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {action ? (
        <Pressable onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function EmptyState({
  icon,
  message,
  action,
  onAction,
}: {
  icon: string;
  message: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyText}>{message}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction}>
          <Text style={styles.emptyAction}>{action} →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function HomeScreen() {
  const USER_EMAIL = getCurrentUserEmail();
  const navigation = useNavigation<any>();
  const [playersTab, setPlayersTab] = React.useState<"nearby" | "friends">("nearby");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [me, setMe] = React.useState<UserDto | null>(null);
  const [allUsers, setAllUsers] = React.useState<UserDto[]>([]);
  const [friendsData, setFriendsData] = React.useState<FriendsResponseDto | null>(null);
  const [openMatches, setOpenMatches] = React.useState<MatchDto[]>([]);
  const [fullMatches, setFullMatches] = React.useState<MatchDto[]>([]);
  const [inProgressMatches, setInProgressMatches] = React.useState<MatchDto[]>([]);
  const [awaitingMatches, setAwaitingMatches] = React.useState<MatchDto[]>([]);
  const [pendingValidationMatches, setPendingValidationMatches] = React.useState<MatchDto[]>([]);
  const [competitions, setCompetitions] = React.useState<CompetitionDto[]>([]);
  const [notifications, setNotifications] = React.useState<NotificationDto[]>([]);
  const [conversations, setConversations] = React.useState<ConversationDto[]>([]);
  const [recentResults, setRecentResults] = React.useState<RecentResultDto[]>([]);

  const load = React.useCallback(
    async (opts?: { refresh?: boolean }) => {
      const isRefresh = opts?.refresh === true;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [
          meRes,
          openRes,
          fullRes,
          inProgressRes,
          awaitingRes,
          pendingValidationRes,
          usersRes,
          friendsRes,
          competitionsRes,
          notificationsRes,
          conversationsRes,
          recentRes,
        ] = await Promise.allSettled([
          api.get<UserDto>(`/users/me?email=${encodeURIComponent(USER_EMAIL)}`),
          api.get<MatchDto[]>("/matches?status=open"),
          api.get<MatchDto[]>("/matches?status=full"),
          api.get<MatchDto[]>("/matches?status=in_progress"),
          api.get<MatchDto[]>("/matches?status=awaiting_score"),
          api.get<MatchDto[]>("/matches?status=pending_validation"),
          api.get<UserDto[]>("/users"),
          api.get<FriendsResponseDto>(`/friends?email=${encodeURIComponent(USER_EMAIL)}`),
          api.get<CompetitionDto[]>("/competitions"),
          api.get<NotificationDto[]>(`/notifications?email=${encodeURIComponent(USER_EMAIL)}`),
          api.get<ConversationDto[]>(`/conversations?email=${encodeURIComponent(USER_EMAIL)}`),
          api.get<RecentResultDto[]>(`/users/recent-results?email=${encodeURIComponent(USER_EMAIL)}`),
        ]);

        setMe(meRes.status === "fulfilled" ? meRes.value : null);
        setOpenMatches(openRes.status === "fulfilled" ? openRes.value : []);
        setFullMatches(fullRes.status === "fulfilled" ? fullRes.value : []);
        setInProgressMatches(inProgressRes.status === "fulfilled" ? inProgressRes.value : []);
        setAwaitingMatches(awaitingRes.status === "fulfilled" ? awaitingRes.value : []);
        setPendingValidationMatches(
          pendingValidationRes.status === "fulfilled" ? pendingValidationRes.value : [],
        );
        setAllUsers(usersRes.status === "fulfilled" ? usersRes.value : []);
        setFriendsData(friendsRes.status === "fulfilled" ? friendsRes.value : null);
        setCompetitions(competitionsRes.status === "fulfilled" ? competitionsRes.value : []);
        setNotifications(notificationsRes.status === "fulfilled" ? notificationsRes.value : []);
        setConversations(conversationsRes.status === "fulfilled" ? conversationsRes.value : []);
        setRecentResults(recentRes.status === "fulfilled" ? recentRes.value : []);
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

  if (loading) return <HomeSkeleton />;

  const meName = me?.fullName || getCurrentUserName();
  const firstName = meName.split(" ")[0] || "Player";
  const meLocation = me?.location || "";
  const meAvatarInitial = meName.slice(0, 1).toUpperCase() || "P";

  const activeMatches = [...inProgressMatches, ...awaitingMatches, ...pendingValidationMatches]
    .filter((m) => m.players.includes(USER_EMAIL))
    .slice(0, 4);

  const myUpcomingMatches = [...openMatches, ...fullMatches]
    .filter((m) => m.players.includes(USER_EMAIL))
    .slice(0, 5);

  const joinableOpenMatches = openMatches
    .filter((m) => !m.players.includes(USER_EMAIL))
    .slice(0, 4);

  const friendEmails = new Set((friendsData?.friends || []).map((f) => f.email));
  const otherUsers = allUsers.filter((u) => u.email !== USER_EMAIL);
  const nearbyUsers = otherUsers
    .filter((u) => !friendEmails.has(u.email) && (u.profileVisibility || "public") !== "private")
    .slice(0, 10);
  const friends = (friendsData?.friends || []).slice(0, 12);
  const displayedPlayers = playersTab === "friends" ? friends : nearbyUsers;

  const registrationCompetitions = competitions
    .filter((c) => c.status === "registration")
    .slice(0, 3);

  const unreadNotifications = notifications.filter((n) => !n.isRead).length;
  const unreadMessages = conversations.reduce((sum, c) => {
    const unread = c.unreadCounts?.[USER_EMAIL] || 0;
    return sum + unread;
  }, 0);

  const played = me?.matchesPlayed || 0;
  const wins = (me as any)?.wins || 0;
  const winRate = played > 0 ? `${Math.round((wins / played) * 100)}%` : "—";
  const eloSum = recentResults.reduce((sum, r) => sum + r.elo, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => {
              const parent = navigation.getParent?.();
              if (parent?.navigate) parent.navigate("ProfileTab");
            }}
          >
            {me?.photoUrl ? (
              <Image source={{ uri: me.photoUrl }} style={styles.userAvatarImage} />
            ) : (
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{meAvatarInitial}</Text>
              </View>
            )}
          </Pressable>
          <View>
            <Text style={styles.greeting}>Hi {firstName} 👋</Text>
            {meLocation ? (
              <Text style={styles.greetingSub}>📍 {meLocation}</Text>
            ) : (
              <Pressable onPress={() => navigation.navigate("EditProfile")}>
                <Text style={styles.greetingAction}>📍 Set your location →</Text>
              </Pressable>
            )}
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => {
              const parent = navigation.getParent?.();
              if (parent?.navigate) parent.navigate("MessagesTab");
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.text} />
            {unreadMessages > 0 ? (
              <View style={styles.badgeDot}>
                <Text style={styles.badgeDotText}>{unreadMessages > 9 ? "9+" : unreadMessages}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable style={styles.headerIconBtn} onPress={() => navigation.navigate("Notifications")}>
            <Ionicons name="notifications-outline" size={18} color={COLORS.text} />
            {unreadNotifications > 0 ? (
              <View style={styles.badgeDot}>
                <Text style={styles.badgeDotText}>{unreadNotifications > 9 ? "9+" : unreadNotifications}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      {activeMatches.length > 0 ? (
        <>
          <SectionHeader title="🔴 In Progress" subtitle="Action required" />
          {activeMatches.map((m) => (
            <Pressable key={m.id} style={styles.matchCard} onPress={() => navigation.navigate("MatchDetail", { id: m.id })}>
              <Text style={styles.matchTitle}>{m.title}</Text>
              <Text style={styles.matchMeta}>
                {new Date(m.date).toLocaleDateString()} · {m.timeLabel} · {m.locationName}
              </Text>
              <Text style={styles.matchMetaSmall}>{m.status.replace("_", " ")}</Text>
            </Pressable>
          ))}
        </>
      ) : null}

      <View style={styles.instantCard}>
        <Text style={styles.instantTitle}>⚡ Instant Play</Text>
        <Text style={styles.instantSubtitle}>Find players near you right now</Text>
        <Pressable style={styles.instantBtn} onPress={() => navigation.navigate("InstantPlay")}>
          <Text style={styles.instantBtnText}>Start now</Text>
        </Pressable>
      </View>

      <View style={styles.quickActionsRow}>
        <QuickAction icon="search" label="Find Game" onPress={() => {
          const parent = navigation.getParent?.();
          if (parent?.navigate) parent.navigate("DiscoverTab");
        }} />
        <QuickAction icon="add" label="Create" accent onPress={() => navigation.navigate("CreateMatch")} />
        <QuickAction icon="trophy-outline" label="Compete" onPress={() => navigation.navigate("Competitions")} />
        <QuickAction icon="people-outline" label="Players" onPress={() => navigation.navigate("Players")} />
      </View>

      <SectionHeader title="📅 Your Matches" subtitle="Matches you're in" action="See all →" onAction={() => {
        const parent = navigation.getParent?.();
        if (parent?.navigate) parent.navigate("DiscoverTab");
      }} />
      {myUpcomingMatches.length > 0 ? (
        myUpcomingMatches.map((m) => (
          <Pressable key={m.id} style={styles.matchCard} onPress={() => navigation.navigate("MatchDetail", { id: m.id })}>
            <Text style={styles.matchTitle}>{m.title}</Text>
            <Text style={styles.matchMeta}>
              {new Date(m.date).toLocaleDateString()} · {m.timeLabel} · {m.locationName}
            </Text>
            <Text style={styles.matchMetaSmall}>
              {m.players.length}/{m.maxPlayers} players
            </Text>
          </Pressable>
        ))
      ) : (
        <EmptyState
          icon="📅"
          message="You're not in any upcoming matches"
          action="Find a match to join"
          onAction={() => {
            const parent = navigation.getParent?.();
            if (parent?.navigate) parent.navigate("DiscoverTab");
          }}
        />
      )}

      {activeMatches.length === 0 ? (
        <>
          <SectionHeader title="🔴 In Progress" subtitle="Active matches" />
          <EmptyState icon="🟢" message="No active matches right now" />
        </>
      ) : null}

      <SectionHeader
        title="👥 Players"
        subtitle={playersTab === "friends" ? `${friends.length} friends` : "Suggested for you"}
        action="All →"
        onAction={() => navigation.navigate("Players")}
      />
      <View style={styles.playersSwitch}>
        <Pressable
          style={[styles.switchBtn, playersTab === "nearby" && styles.switchBtnActive]}
          onPress={() => setPlayersTab("nearby")}
        >
          <Text style={[styles.switchBtnText, playersTab === "nearby" && styles.switchBtnTextActive]}>Nearby</Text>
        </Pressable>
        <Pressable
          style={[styles.switchBtn, playersTab === "friends" && styles.switchBtnActive]}
          onPress={() => setPlayersTab("friends")}
        >
          <Text style={[styles.switchBtnText, playersTab === "friends" && styles.switchBtnTextActive]}>
            Friends{friends.length > 0 ? ` (${friends.length})` : ""}
          </Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playersRow}>
        {displayedPlayers.length > 0 ? (
          displayedPlayers.map((p) => (
            <Pressable key={p.id} style={styles.playerMini} onPress={() => navigation.navigate("PlayerProfile", { id: p.id })}>
              {p.photoUrl ? (
                <Image source={{ uri: p.photoUrl }} style={styles.playerAvatarImage} />
              ) : (
                <View style={styles.playerAvatar}>
                  <Text style={styles.playerAvatarText}>
                    {(p.fullName || p.email).slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.playerName} numberOfLines={1}>
                {p.fullName || p.email.split("@")[0]}
              </Text>
              <Text style={styles.playerLevel}>{p.skillLabel || "intermediate"}</Text>
            </Pressable>
          ))
        ) : (
          <View style={styles.playersEmptyWrap}>
            <Text style={styles.playersEmptyText}>
              {playersTab === "friends"
                ? "No friends yet — browse players to connect."
                : "No nearby players found."}
            </Text>
          </View>
        )}
      </ScrollView>

      {friends.length > 0 ? (
        <>
          <SectionHeader title="🤝 Friends" subtitle="Your network" action="All →" onAction={() => navigation.navigate("Friends")} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playersRow}>
            {friends.map((f) => (
              <Pressable key={f.id} style={styles.playerMini} onPress={() => navigation.navigate("PlayerProfile", { id: f.id })}>
                {f.photoUrl ? (
                  <Image source={{ uri: f.photoUrl }} style={styles.playerAvatarImage} />
                ) : (
                  <View style={styles.playerAvatar}>
                    <Text style={styles.playerAvatarText}>
                      {(f.fullName || f.email).slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.playerName} numberOfLines={1}>
                  {f.fullName || f.email.split("@")[0]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      <SectionHeader title="🔍 Open Matches" subtitle="Find a game to join" action="See all →" onAction={() => {
        const parent = navigation.getParent?.();
        if (parent?.navigate) parent.navigate("DiscoverTab");
      }} />
      {joinableOpenMatches.length > 0 ? (
        joinableOpenMatches.map((m) => (
          <Pressable key={m.id} style={styles.matchCard} onPress={() => navigation.navigate("MatchDetail", { id: m.id })}>
            <Text style={styles.matchTitle}>{m.title}</Text>
            <Text style={styles.matchMeta}>
              {new Date(m.date).toLocaleDateString()} · {m.timeLabel} · {m.locationName}
            </Text>
            <Text style={styles.matchMetaSmall}>
              {m.players.length}/{m.maxPlayers} players
            </Text>
          </Pressable>
        ))
      ) : (
        <EmptyState icon="🔍" message="No open matches nearby" action="Create the first one" onAction={() => navigation.navigate("CreateMatch")} />
      )}

      <SectionHeader title="🏆 Competitions" subtitle="Tournaments & leagues" action="See all →" onAction={() => navigation.navigate("Competitions")} />
      {registrationCompetitions.length > 0 ? (
        registrationCompetitions.map((c) => (
          <Pressable key={c.id} style={styles.competitionCard} onPress={() => navigation.navigate("CompetitionDetail", { id: c.id })}>
            <View style={styles.competitionIconWrap}>
              <Ionicons name="trophy-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.competitionName}>{c.name}</Text>
              <Text style={styles.competitionMeta}>
                {c.type} · {c.participants.length}/{c.maxPlayers || 16}
              </Text>
            </View>
          </Pressable>
        ))
      ) : (
        <EmptyState icon="🏆" message="No competitions open right now" action="Browse competitions" onAction={() => navigation.navigate("Competitions")} />
      )}

      {recentResults.length > 0 ? (
        <>
          <SectionHeader title="Recent Results" subtitle={`ELO ${eloSum >= 0 ? `+${eloSum}` : eloSum}`} action="All History →" onAction={() => navigation.navigate("PastEvents")} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.resultsRow}>
            {recentResults.map((r) => (
              <View key={r.id} style={styles.resultDotWrap}>
                <View style={[styles.resultDot, r.result === "W" ? styles.resultDotWin : styles.resultDotLoss]}>
                  <Text style={[styles.resultDotText, r.result === "W" ? styles.resultDotTextWin : styles.resultDotTextLoss]}>
                    {r.result}
                  </Text>
                </View>
                <Text style={styles.resultElo}>{r.elo > 0 ? `+${r.elo}` : r.elo}</Text>
                <Text style={styles.resultDate}>
                  {new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </Text>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      {played > 0 ? (
        <View style={styles.statsCard}>
          <View style={styles.statsHead}>
            <Text style={styles.statsHeadTitle}>Your Stats</Text>
            <Pressable onPress={() => navigation.navigate("PastEvents")}>
              <Text style={styles.statsHeadAction}>Past Events →</Text>
            </Pressable>
          </View>
          <View style={styles.statsGrid}>
            <StatItem label="Matches" value={String(played)} />
            <StatItem label="Wins" value={String(wins)} />
            <StatItem label="Win Rate" value={winRate} />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function QuickAction({
  icon,
  label,
  accent,
  onPress,
}: {
  icon: string;
  label: string;
  accent?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.quickAction, accent && styles.quickActionAccent]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={accent ? COLORS.card : COLORS.text} />
      <Text style={[styles.quickActionText, accent && styles.quickActionTextAccent]}>{label}</Text>
    </Pressable>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  userAvatar: { width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.text, alignItems: "center", justifyContent: "center" },
  userAvatarImage: { width: 42, height: 42, borderRadius: 12 },
  userAvatarText: { color: COLORS.card, fontWeight: "700" },
  greeting: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  greetingSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  greetingAction: { fontSize: 11, color: COLORS.primary, marginTop: 2, fontWeight: "600" },
  headerActions: { flexDirection: "row", gap: 8 },
  headerIconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  badgeDot: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  badgeDotText: { color: COLORS.card, fontSize: 9, fontWeight: "800" },
  instantCard: { backgroundColor: COLORS.text, borderRadius: 16, padding: 16, marginBottom: 12 },
  instantTitle: { color: COLORS.card, fontWeight: "800", fontSize: 16 },
  instantSubtitle: { color: COLORS.borderMuted, marginTop: 4, fontSize: 12 },
  instantBtn: { marginTop: 10, alignSelf: "flex-start", backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  instantBtnText: { color: COLORS.card, fontWeight: "700", fontSize: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8, marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  sectionSubtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  sectionAction: { fontSize: 12, color: COLORS.primary, fontWeight: "600" },
  quickActionsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  quickAction: { flex: 1, borderRadius: 14, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", paddingVertical: 10, gap: 4 },
  quickActionAccent: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  quickActionText: { fontSize: 11, fontWeight: "700", color: COLORS.text },
  quickActionTextAccent: { color: COLORS.card },
  matchCard: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 8 },
  matchTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 2 },
  matchMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  matchMetaSmall: { fontSize: 10, color: COLORS.textSubtle, marginTop: 3, textTransform: "capitalize" },
  emptyCard: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", padding: 14, alignItems: "center", marginBottom: 8 },
  emptyIcon: { fontSize: 22, marginBottom: 2 },
  emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: "center" },
  emptyAction: { marginTop: 4, color: COLORS.primary, fontSize: 11, fontWeight: "700" },
  playersSwitch: { flexDirection: "row", backgroundColor: COLORS.border, borderRadius: 12, padding: 3, alignSelf: "flex-start", marginBottom: 10 },
  switchBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9 },
  switchBtnActive: { backgroundColor: COLORS.card },
  switchBtnText: { fontSize: 11, color: COLORS.textSoft, fontWeight: "600" },
  switchBtnTextActive: { color: COLORS.text },
  playersRow: { marginBottom: 14 },
  playersEmptyWrap: { paddingVertical: 10, paddingHorizontal: 2 },
  playersEmptyText: { fontSize: 12, color: COLORS.textMuted },
  playerMini: { width: 90, alignItems: "center", marginRight: 10 },
  playerAvatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.primarySoftAlt, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  playerAvatarImage: { width: 52, height: 52, borderRadius: 14, marginBottom: 6 },
  playerAvatarText: { color: COLORS.primaryDark, fontWeight: "800" },
  playerName: { fontSize: 12, fontWeight: "700", color: COLORS.text, maxWidth: 80 },
  playerLevel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, textTransform: "capitalize" },
  competitionCard: { flexDirection: "row", gap: 10, alignItems: "center", borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, padding: 12, marginBottom: 8 },
  competitionIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primarySoftAlt, alignItems: "center", justifyContent: "center" },
  competitionName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  competitionMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  resultsRow: { marginBottom: 10 },
  resultDotWrap: { width: 56, alignItems: "center", marginRight: 8 },
  resultDot: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  resultDotWin: { backgroundColor: COLORS.successSoft },
  resultDotLoss: { backgroundColor: COLORS.dangerSoft },
  resultDotText: { fontWeight: "800", fontSize: 12 },
  resultDotTextWin: { color: COLORS.successText },
  resultDotTextLoss: { color: COLORS.dangerText },
  resultElo: { fontSize: 10, marginTop: 4, color: COLORS.textSubtle, fontWeight: "700" },
  resultDate: { fontSize: 9, marginTop: 2, color: COLORS.textMuted },
  statsCard: { marginTop: 8, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12 },
  statsHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  statsHeadTitle: { fontSize: 11, color: COLORS.textMuted, fontWeight: "700", textTransform: "uppercase" },
  statsHeadAction: { fontSize: 11, color: COLORS.primary, fontWeight: "700" },
  statsGrid: { flexDirection: "row", gap: 6 },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { color: COLORS.text, fontSize: 18, fontWeight: "800" },
  statLabel: { marginTop: 2, color: COLORS.textMuted, fontSize: 11 },
  skeletonGapXs: { height: 6 },
  skeletonGapSm: { height: 8 },
  skeletonGapMd: { height: 10 },
});
