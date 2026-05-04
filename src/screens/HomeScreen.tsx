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
import { PadelLevelRow } from "../components/PadelLevelRow";
import { formatDistanceAway } from "../lib/padelSkill";
import { userLocationLabel } from "../lib/userLocation";

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
  extra,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {extra ? (
        extra
      ) : action ? (
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
  const [instantTime, setInstantTime] = React.useState<"Now" | "1 hour" | "2 hours">("Now");
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
          api.get<UserDto[]>(`/users?viewerEmail=${encodeURIComponent(USER_EMAIL)}`),
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

  const navigateToTab = React.useCallback(
    (tabName: "DiscoverTab" | "MessagesTab" | "ProfileTab") => {
      const selfState = navigation.getState?.();
      if (selfState?.routeNames?.includes(tabName)) {
        navigation.navigate(tabName);
        return;
      }

      const parent = navigation.getParent?.();
      const parentState = parent?.getState?.();
      if (parent?.navigate && parentState?.routeNames?.includes(tabName)) {
        parent.navigate(tabName);
        return;
      }

      const root = parent?.getParent?.();
      const rootState = root?.getState?.();
      if (root?.navigate && rootState?.routeNames?.includes("MainTabs")) {
        root.navigate("MainTabs", { screen: tabName });
        return;
      }

      navigation.navigate("MainTabs", { screen: tabName });
    },
    [navigation],
  );

  const goDiscover = React.useCallback(() => navigateToTab("DiscoverTab"), [navigateToTab]);
  const goMessages = React.useCallback(() => navigateToTab("MessagesTab"), [navigateToTab]);
  const goProfile = React.useCallback(() => navigateToTab("ProfileTab"), [navigateToTab]);

  const sendFriendRequest = React.useCallback(
    async (recipientEmail: string) => {
      await api.post("/friends/requests", { requesterEmail: USER_EMAIL, recipientEmail });
      await load({ refresh: true });
    },
    [USER_EMAIL, load],
  );

  const acceptFriendRequest = React.useCallback(
    async (requestId: string) => {
      await api.patch(`/friends/requests/${requestId}`, { status: "accepted" });
      await load({ refresh: true });
    },
    [load],
  );

  if (loading) return <HomeSkeleton />;

  const meName = me?.fullName || getCurrentUserName();
  const firstName = meName.split(" ")[0] || "Player";
  const meLocation = userLocationLabel(me ?? {});
  const meAvatarInitial = meName.slice(0, 1).toUpperCase() || "P";

  const activeMatches = [...inProgressMatches, ...awaitingMatches, ...pendingValidationMatches]
    .filter((m) => m.players.includes(USER_EMAIL))
    .slice(0, 4);

  const myUpcomingMatches = [...openMatches, ...fullMatches]
    .filter((m) => m.players.includes(USER_EMAIL))
    .slice(0, 5);

  const joinableOpenMatches = openMatches
    .filter((m) => !m.players.includes(USER_EMAIL))
    .filter((m) => {
      if (!m.visibility || m.visibility === "public") return true;
      const invited = (m.invitedEmails || []).includes(USER_EMAIL);
      return invited;
    })
    .slice(0, 4);

  const friendEmails = new Set((friendsData?.friends || []).map((f) => f.email));
  const friendRequests = friendsData?.requests || [];
  const otherUsers = allUsers.filter((u) => u.email !== USER_EMAIL);
  const nearbyUsers = otherUsers
    .filter((u) => !friendEmails.has(u.email) && (u.profileVisibility || "public") !== "private")
    .sort((a, b) => {
      const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return (b.eloRating || 0) - (a.eloRating || 0);
    })
    .slice(0, 10);
  const friends = [...(friendsData?.friends || [])]
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    .slice(0, 12);
  const displayedPlayers = playersTab === "friends" ? friends : nearbyUsers;

  const registrationCompetitions = competitions
    .filter((c) => c.status === "registration")
    .filter((c) => {
      if (!c.visibility || c.visibility === "public") return true;
      const host = c.hostEmail === USER_EMAIL;
      const participant = c.participants.includes(USER_EMAIL);
      return host || participant;
    })
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
            onPress={goProfile}
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
            onPress={goMessages}
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

      <View style={styles.instantCard}>
        <Text style={styles.instantEyebrow}>Ready to play Padel?</Text>
        <Text style={styles.instantTitle}>Find players instantly</Text>
        <Text style={styles.instantSubtitle}>Get matched with nearby padel players now</Text>
        <View style={styles.instantTimesRow}>
          {(["Now", "1 hour", "2 hours"] as const).map((time) => (
            <Pressable
              key={time}
              style={[styles.instantTimeChip, instantTime === time && styles.instantTimeChipActive]}
              onPress={() => setInstantTime(time)}
            >
              <Text style={[styles.instantTimeChipText, instantTime === time && styles.instantTimeChipTextActive]}>
                {time}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.instantBtn} onPress={() => navigation.navigate("InstantPlay")}>
          <Ionicons name="flash" size={15} color="#4A3500" />
          <Text style={styles.instantBtnText}>Play Now</Text>
        </Pressable>
      </View>

      <View style={styles.quickActionsRow}>
        <QuickAction icon="🔍" label="Find Game" onPress={goDiscover} />
        <QuickAction icon="➕" label="Create" accent onPress={() => navigation.navigate("CreateMatch")} />
        <QuickAction icon="🏆" label="Compete" onPress={() => navigation.navigate("Competitions")} />
        <QuickAction icon="👥" label="Players" onPress={() => navigation.navigate("Players")} />
      </View>

      <SectionHeader title="📅 Your Matches" subtitle="Matches you're in" action="See all →" onAction={goDiscover} />
      {myUpcomingMatches.length > 0 ? (
        myUpcomingMatches.map((m) => (
          <UserMatchCardLike
            key={m.id}
            match={m}
            onPress={() => navigation.navigate("MatchDetail", { id: m.id })}
          />
        ))
      ) : (
        <EmptyState
          icon="📅"
          message="You're not in any upcoming matches"
          action="Find a match to join"
          onAction={goDiscover}
        />
      )}

      <SectionHeader
        title="🔴 In Progress"
        subtitle={activeMatches.length > 0 ? "Action required" : "Active matches"}
      />
      {activeMatches.length > 0 ? (
        activeMatches.map((m) => (
          <InProgressCardLike
            key={m.id}
            match={m}
            onPress={() => navigation.navigate("MatchDetail", { id: m.id })}
          />
        ))
      ) : (
        <EmptyState icon="🟢" message="No active matches right now" />
      )}

      <SectionHeader
        title="👥 Players"
        subtitle={playersTab === "friends" ? `${friends.length} friends` : "Suggested for you"}
        extra={
          <View style={styles.playersHeaderRight}>
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
            <Pressable onPress={() => navigation.navigate("Players")}>
              <Text style={styles.sectionAction}>All →</Text>
            </Pressable>
          </View>
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playersRow}>
        {displayedPlayers.length > 0 ? (
          displayedPlayers.map((p) => (
            <Pressable key={p.id} style={styles.playerMini} onPress={() => navigation.navigate("PlayerProfile", { id: p.id })}>
              <View style={styles.playerAvatarWrap}>
                {p.photoUrl ? (
                  <Image source={{ uri: p.photoUrl }} style={styles.playerAvatarImage} />
                ) : (
                  <View style={styles.playerAvatar}>
                    <Text style={styles.playerAvatarText}>
                      {(p.fullName || p.email).slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                {(p.photoVerified || p.idVerified) ? <View style={styles.playerVerifiedDot}><Text style={styles.playerVerifiedDotText}>✓</Text></View> : null}
              </View>
              <Text style={styles.playerName} numberOfLines={1}>
                {p.fullName || p.email.split("@")[0]}
              </Text>
              {!!userLocationLabel(p) && (
                <Text style={styles.playerLocation} numberOfLines={1}>
                  📍 {userLocationLabel(p)}
                </Text>
              )}
              {typeof p.distanceKm === "number" ? (
                <Text style={styles.playerDistance} numberOfLines={1}>
                  {formatDistanceAway(p.distanceKm)}
                </Text>
              ) : null}
              <View style={styles.playerSkillBlock}>
                <PadelLevelRow
                  skillLevel={p.skillLevel}
                  fallbackLabel={p.skillLabel}
                  compact
                />
              </View>
              <View style={styles.playerMetaRow}>
                <Text style={styles.playerElo}>ELO {p.eloRating ?? 1000}</Text>
                {(p.averageRating || 0) > 0 ? (
                  <Text style={styles.playerRating}>⭐ {(p.averageRating || 0).toFixed(1)}</Text>
                ) : null}
              </View>
              <View style={styles.playerCardFooter}>
                <FriendCta
                  playerEmail={p.email}
                  currentUserEmail={USER_EMAIL}
                  friendEmails={friendEmails}
                  requests={friendRequests}
                  onAdd={sendFriendRequest}
                  onAccept={acceptFriendRequest}
                />
              </View>
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
              <Pressable key={f.id} style={styles.friendMini} onPress={() => navigation.navigate("PlayerProfile", { id: f.id })}>
                <View style={styles.friendAvatarWrap}>
                  {f.photoUrl ? (
                    <Image source={{ uri: f.photoUrl }} style={styles.friendAvatarImage} />
                  ) : (
                    <View style={styles.friendAvatar}>
                      <Text style={styles.friendAvatarText}>
                        {(f.fullName || f.email).slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.friendOnlineDot} />
                </View>
                <Text style={styles.friendName} numberOfLines={1}>
                  {(f.fullName || f.email.split("@")[0]).split(" ")[0]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      <SectionHeader title="🔍 Open Matches" subtitle="Find a game to join" action="See all →" onAction={goDiscover} />
      {joinableOpenMatches.length > 0 ? (
        joinableOpenMatches.map((m) => (
          <OpenMatchCardLike
            key={m.id}
            match={m}
            onPress={() => navigation.navigate("MatchDetail", { id: m.id })}
          />
        ))
      ) : (
        <EmptyState icon="🔍" message="No open matches nearby" action="Create the first one" onAction={() => navigation.navigate("CreateMatch")} />
      )}

      <SectionHeader title="🏆 Competitions" subtitle="Tournaments & leagues" action="See all →" onAction={() => navigation.navigate("Competitions")} />
      {registrationCompetitions.length > 0 ? (
        registrationCompetitions.map((c) => (
          <CompetitionMiniCardLike
            key={c.id}
            competition={c}
            onPress={() => navigation.navigate("CompetitionDetail", { id: c.id })}
          />
        ))
      ) : (
        <EmptyState icon="🏆" message="No competitions open right now" action="Browse competitions" onAction={() => navigation.navigate("Competitions")} />
      )}

      {recentResults.length > 0 ? (
        <>
          <View style={styles.resultsCard}>
            <SectionHeader title="Recent Results" subtitle={`ELO ${eloSum >= 0 ? `+${eloSum}` : eloSum}`} action="All History →" onAction={() => navigation.navigate("PastEvents")} />
            <Text style={styles.resultsHint}>Tap a result for match details · Past Events for full history</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.resultsRow}>
              {recentResults.map((r) => (
                <Pressable
                  key={r.id}
                  style={styles.resultDotWrap}
                  onPress={() => navigation.navigate("MatchDetail", { id: r.id })}
                >
                  <View style={[styles.resultDot, r.result === "W" ? styles.resultDotWin : styles.resultDotLoss]}>
                    <Text style={[styles.resultDotText, r.result === "W" ? styles.resultDotTextWin : styles.resultDotTextLoss]}>
                      {r.result}
                    </Text>
                  </View>
                  <Text style={styles.resultElo}>{r.elo > 0 ? `+${r.elo}` : r.elo}</Text>
                  <Text style={styles.resultDate}>
                    {new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
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
      <Text style={styles.quickActionIcon}>{icon}</Text>
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

function UserMatchCardLike({ match, onPress }: { match: MatchDto; onPress: () => void }) {
  const status = match.status?.replaceAll("_", " ") || "open";
  return (
    <Pressable style={styles.matchCard} onPress={onPress}>
      <View style={styles.cardTopRow}>
        <Text style={styles.matchTitle}>{match.title}</Text>
        <View style={styles.statusTagSoft}>
          <Text style={styles.statusTagSoftText}>{status}</Text>
        </View>
      </View>
      <View style={styles.metaRows}>
        <Text style={styles.matchMeta}>📅 {new Date(match.date).toLocaleDateString()} · {match.timeLabel}</Text>
        <Text style={styles.matchMeta}>📍 {match.locationName}</Text>
        <Text style={styles.matchMetaSmall}>👥 {match.players.length}/{match.maxPlayers} players</Text>
      </View>
      <View style={styles.cardEndChevron}>
        <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
      </View>
    </Pressable>
  );
}

function OpenMatchCardLike({ match, onPress }: { match: MatchDto; onPress: () => void }) {
  const spots = Math.max(0, match.maxPlayers - match.players.length);
  return (
    <Pressable style={styles.matchCard} onPress={onPress}>
      <View style={styles.cardTopRow}>
        <View style={styles.topTagsRow}>
          <View style={styles.levelPill}>
            <Text style={styles.levelPillText}>{match.skillLevel || "any"}</Text>
          </View>
          {match.visibility === "invite_only" ? (
            <View style={styles.inviteOnlyTag}>
              <Text style={styles.inviteOnlyText}>Invite only</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.playersCountMini}>
          <Ionicons name="people-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.playersCountMiniText}>
            {match.players.length}/{match.maxPlayers}
          </Text>
        </View>
      </View>
      <Text style={styles.matchTitle}>{match.title}</Text>
      <Text style={styles.matchMeta}>📍 {match.locationName}</Text>
      <Text style={styles.matchMeta}>
        🕒 {new Date(match.date).toLocaleDateString()} · {match.timeLabel}
      </Text>
      <View style={styles.cardEndChevron}>
        <Ionicons name="chevron-forward" size={14} color={COLORS.iconMuted} />
      </View>
      <Text style={styles.openSpotsText}>{spots} spot{spots === 1 ? "" : "s"} left</Text>
    </Pressable>
  );
}

function CompetitionMiniCardLike({
  competition,
  onPress,
}: {
  competition: CompetitionDto;
  onPress: () => void;
}) {
  const joined = competition.participants.length;
  const total = competition.maxPlayers || 16;
  const pct = Math.max(0, Math.min(100, Math.round((joined / total) * 100)));
  return (
    <Pressable style={styles.competitionCard} onPress={onPress}>
      <View style={styles.competitionIconWrap}>
        <Ionicons name="trophy-outline" size={16} color={COLORS.primaryDark} />
      </View>
      <View style={styles.flexOne}>
        <Text numberOfLines={1} style={styles.competitionName}>
          {competition.name}
        </Text>
        <Text style={styles.competitionMeta}>
          {competition.type === "league" ? "League" : "Tournament"} · {competition.skillLevel || "any"}
        </Text>
        <View style={styles.compProgressRow}>
          <View style={styles.compProgressTrack}>
            <View style={[styles.compProgressBar, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.competitionMetaSmall}>
            {joined}/{total}
          </Text>
        </View>
      </View>
      <View style={styles.viewMiniBtn}>
        <Text style={styles.viewMiniBtnText}>View</Text>
      </View>
    </Pressable>
  );
}

function InProgressCardLike({ match, onPress }: { match: MatchDto; onPress: () => void }) {
  const status = match.status === "in_progress" ? "In Progress" : match.status === "awaiting_score" ? "Awaiting score" : "Pending validation";
  return (
    <Pressable style={styles.matchCard} onPress={onPress}>
      <View style={styles.cardTopRow}>
        <Text style={styles.matchTitle}>{match.title}</Text>
        <View style={styles.progressTag}>
          <Text style={styles.progressTagText}>{status}</Text>
        </View>
      </View>
      <View style={styles.metaRows}>
        <Text style={styles.matchMeta}>📍 {match.locationName}</Text>
        <Text style={styles.matchMeta}>🕒 {new Date(match.date).toLocaleDateString()} · {match.timeLabel}</Text>
        <Text style={styles.matchMetaSmall}>Tap to continue</Text>
      </View>
      <View style={styles.progressActionsRow}>
        <View style={styles.viewMiniBtn}>
          <Text style={styles.viewMiniBtnText}>View Match</Text>
        </View>
      </View>
    </Pressable>
  );
}

function FriendCta({
  playerEmail,
  currentUserEmail,
  friendEmails,
  requests,
  onAdd,
  onAccept,
}: {
  playerEmail: string;
  currentUserEmail: string;
  friendEmails: Set<string>;
  requests: FriendRequestDto[];
  onAdd: (recipientEmail: string) => Promise<void>;
  onAccept: (requestId: string) => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);

  if (friendEmails.has(playerEmail)) {
    return (
      <View style={[styles.friendCtaBtn, styles.friendCtaBtnDone]}>
        <Text style={styles.friendCtaDone}>✓ Friend</Text>
      </View>
    );
  }

  const outgoing = requests.find(
    (r) =>
      r.status === "pending" &&
      r.requesterEmail === currentUserEmail &&
      r.recipientEmail === playerEmail,
  );
  if (outgoing) {
    return (
      <View style={[styles.friendCtaBtn, styles.friendCtaBtnPending]}>
        <Text style={styles.friendCtaPending}>Requested</Text>
      </View>
    );
  }

  const incoming = requests.find(
    (r) =>
      r.status === "pending" &&
      r.recipientEmail === currentUserEmail &&
      r.requesterEmail === playerEmail,
  );
  if (incoming) {
    return (
      <Pressable
        style={styles.friendCtaBtn}
        disabled={busy}
        onPress={async () => {
          try {
            setBusy(true);
            await onAccept(incoming.id);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Text style={styles.friendCtaBtnText}>{busy ? "..." : "Accept"}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={styles.friendCtaBtn}
      disabled={busy}
      onPress={async () => {
        try {
          setBusy(true);
          await onAdd(playerEmail);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Text style={styles.friendCtaBtnText}>{busy ? "..." : "Add Friend"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  userAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.text, alignItems: "center", justifyContent: "center" },
  userAvatarImage: { width: 42, height: 42, borderRadius: 21 },
  userAvatarText: { color: COLORS.card, fontWeight: "700" },
  greeting: { fontSize: 18, fontWeight: "800", color: COLORS.text },
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
  instantCard: {
    backgroundColor: "#FFF8DB",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F6E6A7",
  },
  instantEyebrow: { color: "#7A5B00", opacity: 0.95, fontWeight: "600", fontSize: 11 },
  instantTitle: { color: "#3B2A00", fontWeight: "800", fontSize: 23, marginTop: 1 },
  instantSubtitle: { color: "#6A5200", opacity: 0.95, marginTop: 2, fontSize: 11 },
  instantTimesRow: { flexDirection: "row", gap: 6, marginTop: 11, marginBottom: 11 },
  instantTimeChip: {
    borderRadius: 999,
    backgroundColor: "#FFF3C4",
    borderWidth: 1,
    borderColor: "#EED27D",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  instantTimeChipActive: { backgroundColor: "#FFE68A", borderColor: "#DDAE2A" },
  instantTimeChipText: { color: "#6A5200", opacity: 0.9, fontSize: 10, fontWeight: "700" },
  instantTimeChipTextActive: { opacity: 1 },
  instantBtn: {
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFD66B",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E2B84D",
  },
  instantBtnText: { color: "#4A3500", fontWeight: "800", fontSize: 13 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8, marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  sectionSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  sectionAction: { fontSize: 12, color: COLORS.primary, fontWeight: "600" },
  quickActionsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  quickAction: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    gap: 3,
  },
  quickActionAccent: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  quickActionIcon: { fontSize: 19, marginBottom: 1 },
  quickActionText: { fontSize: 11, fontWeight: "700", color: COLORS.text },
  quickActionTextAccent: { color: COLORS.card },
  matchCard: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 8 },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  topTagsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusTagSoft: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.success,
    backgroundColor: COLORS.successSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusTagSoftText: { color: COLORS.successText, fontSize: 9, fontWeight: "700" },
  progressTag: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  progressTagText: { color: COLORS.primaryDark, fontSize: 9, fontWeight: "700" },
  metaRows: { marginTop: 2, gap: 1 },
  cardEndChevron: { position: "absolute", right: 10, top: 11 },
  levelPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  levelPillText: { color: COLORS.primaryDark, fontSize: 9, fontWeight: "700", textTransform: "capitalize" },
  inviteOnlyTag: {
    borderRadius: 999,
    backgroundColor: COLORS.borderMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inviteOnlyText: { color: COLORS.textMuted, fontSize: 9, fontWeight: "700" },
  playersCountMini: { flexDirection: "row", alignItems: "center", gap: 3 },
  playersCountMiniText: { fontSize: 10, color: COLORS.textMuted, fontWeight: "600" },
  matchTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 2 },
  matchMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  matchMetaSmall: { fontSize: 10, color: COLORS.textSubtle, marginTop: 3, textTransform: "capitalize" },
  openSpotsText: { marginTop: 6, color: COLORS.successText, fontSize: 11, fontWeight: "700" },
  progressActionsRow: { marginTop: 9, flexDirection: "row", justifyContent: "flex-start" },
  emptyCard: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", padding: 14, alignItems: "center", marginBottom: 8 },
  emptyIcon: { fontSize: 22, marginBottom: 2 },
  emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: "center" },
  emptyAction: { marginTop: 4, color: COLORS.primary, fontSize: 11, fontWeight: "700" },
  playersHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  playersSwitch: { flexDirection: "row", backgroundColor: COLORS.border, borderRadius: 12, padding: 3, alignSelf: "flex-start" },
  switchBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9 },
  switchBtnActive: { backgroundColor: COLORS.card },
  switchBtnText: { fontSize: 11, color: COLORS.textSoft, fontWeight: "600" },
  switchBtnTextActive: { color: COLORS.text },
  playersRow: { marginBottom: 14 },
  playersEmptyWrap: { paddingVertical: 10, paddingHorizontal: 2 },
  playersEmptyText: { fontSize: 12, color: COLORS.textMuted },
  playerMini: {
    width: 154,
    alignItems: "center",
    marginRight: 10,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  playerAvatarWrap: { position: "relative", marginBottom: 6 },
  playerAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primarySoftAlt, alignItems: "center", justifyContent: "center" },
  playerAvatarImage: { width: 52, height: 52, borderRadius: 26 },
  playerVerifiedDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  playerVerifiedDotText: { color: COLORS.card, fontSize: 9, fontWeight: "800" },
  playerAvatarText: { color: COLORS.primaryDark, fontWeight: "800" },
  playerName: { fontSize: 12, fontWeight: "700", color: COLORS.text, maxWidth: 132 },
  playerLocation: { fontSize: 10, color: COLORS.textMuted, marginTop: 1, maxWidth: 136 },
  playerDistance: { fontSize: 9, color: COLORS.textSoft, marginTop: 1, maxWidth: 136 },
  playerSkillBlock: { marginTop: 6, width: "100%", alignItems: "center" },
  playerMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  playerElo: { fontSize: 10, color: COLORS.primary, fontWeight: "700" },
  playerRating: { fontSize: 10, color: COLORS.text, fontWeight: "600" },
  playerCardFooter: { marginTop: 7, minHeight: 24, alignItems: "center", justifyContent: "center", width: "100%" },
  friendCtaBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 86,
    alignItems: "center",
  },
  friendCtaBtnDone: { backgroundColor: COLORS.successSoft, borderColor: COLORS.success },
  friendCtaBtnPending: { backgroundColor: COLORS.borderMuted, borderColor: COLORS.border },
  friendCtaBtnText: { color: COLORS.primaryDark, fontSize: 10, fontWeight: "700" },
  friendCtaDone: { color: COLORS.successText, fontSize: 10, fontWeight: "700" },
  friendCtaPending: { color: COLORS.textMuted, fontSize: 10, fontWeight: "700" },
  friendMini: { width: 62, alignItems: "center", marginRight: 10 },
  friendAvatarWrap: { position: "relative", marginBottom: 4 },
  friendAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primarySoftAlt, alignItems: "center", justifyContent: "center" },
  friendAvatarImage: { width: 44, height: 44, borderRadius: 22 },
  friendAvatarText: { color: COLORS.primaryDark, fontWeight: "800", fontSize: 14 },
  friendOnlineDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.card,
    backgroundColor: COLORS.success,
  },
  friendName: { fontSize: 10, color: COLORS.text, fontWeight: "600", textAlign: "center", width: "100%" },
  flexOne: { flex: 1 },
  competitionCard: { flexDirection: "row", gap: 10, alignItems: "center", borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, padding: 12, marginBottom: 8 },
  competitionIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.primarySoftAlt, alignItems: "center", justifyContent: "center" },
  competitionName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  competitionMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  compProgressRow: { marginTop: 5, flexDirection: "row", alignItems: "center", gap: 7 },
  compProgressTrack: { flex: 1, height: 6, borderRadius: 999, backgroundColor: COLORS.borderMuted, overflow: "hidden" },
  compProgressBar: { height: 6, borderRadius: 999, backgroundColor: COLORS.primary },
  competitionMetaSmall: { fontSize: 10, color: COLORS.textSubtle, marginTop: 2 },
  viewMiniBtn: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  viewMiniBtnText: { color: COLORS.primaryDark, fontSize: 11, fontWeight: "700" },
  resultsCard: { marginTop: 2, marginBottom: 4, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10 },
  resultsHint: { fontSize: 11, color: COLORS.textMuted, marginBottom: 8, marginTop: -4 },
  resultsRow: { marginBottom: 6 },
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
