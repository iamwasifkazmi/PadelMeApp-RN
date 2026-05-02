import React from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../lib/api";
import { FriendRequestDto, UserDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { useSnackbar } from "../components/Snackbar";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

type Tab = "friends" | "requests" | "sent" | "discover";

function FriendsSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBlock height={28} width="35%" rounded={8} />
      <View style={{ height: 12 }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.card}>
          <SkeletonBlock height={16} width="40%" />
          <View style={{ height: 6 }} />
          <SkeletonBlock height={12} width="60%" />
        </View>
      ))}
    </View>
  );
}

function normEmail(e: string) {
  return e.trim().toLowerCase();
}

function participantsKey(a: string, b: string) {
  return [normEmail(a), normEmail(b)].sort().join("|");
}

export function FriendsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showSnackbar } = useSnackbar();
  const USER_EMAIL = getCurrentUserEmail();
  const userKey = normEmail(USER_EMAIL);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [friends, setFriends] = React.useState<UserDto[]>([]);
  const [allRequests, setAllRequests] = React.useState<FriendRequestDto[]>([]);
  const [users, setUsers] = React.useState<UserDto[]>([]);
  const [tab, setTab] = React.useState<Tab>("friends");
  const [friendSearch, setFriendSearch] = React.useState("");
  const [discoverSearch, setDiscoverSearch] = React.useState("");

  const incomingPending = React.useMemo(
    () =>
      allRequests.filter(
        (r) => normEmail(r.recipientEmail) === userKey && r.status === "pending",
      ),
    [allRequests, userKey],
  );

  const outgoingPending = React.useMemo(
    () =>
      allRequests.filter(
        (r) => normEmail(r.requesterEmail) === userKey && r.status === "pending",
      ),
    [allRequests, userKey],
  );

  const load = React.useCallback(
    async (opts?: { refresh?: boolean }) => {
      const isRefresh = opts?.refresh === true;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        const data = await api.get<{ friends: UserDto[]; requests: FriendRequestDto[] }>(
          `/friends?email=${encodeURIComponent(USER_EMAIL)}`,
        );
        const allUsers = await api.get<UserDto[]>("/users");
        setFriends(data.friends);
        setAllRequests(data.requests);
        setUsers(
          allUsers.filter(
            (u) => normEmail(u.email) !== userKey && !data.friends.some((f) => normEmail(f.email) === normEmail(u.email)),
          ),
        );
      } catch {
        setFriends([]);
        setAllRequests([]);
        setUsers([]);
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [USER_EMAIL, userKey],
  );

  React.useEffect(() => {
    load();
  }, [load]);

  const respond = async (id: string, status: "accepted" | "declined") => {
    await api.patch(`/friends/requests/${id}`, { status });
    await load();
  };

  const openOrCreateDm = async (friendEmail: string) => {
    const other = normEmail(friendEmail);
    const key = participantsKey(USER_EMAIL, other);
    try {
      const convs = await api.get<
        Array<{ id: string; type: string; participantEmails: string[] }>
      >(`/conversations?email=${encodeURIComponent(USER_EMAIL)}`);
      const hit = convs.find((c) => {
        if (c.type !== "direct" || c.participantEmails.length !== 2) return false;
        const ck = [...c.participantEmails.map(normEmail)].sort().join("|");
        return ck === key;
      });
      if (hit) {
        navigation.navigate("ConversationView", { id: hit.id });
        return;
      }
      const created = await api.post<{ id: string }>("/conversations", {
        type: "direct",
        participantEmails: [normEmail(USER_EMAIL), other].sort(),
      });
      navigation.navigate("ConversationView", { id: created.id });
    } catch {
      showSnackbar("Could not open messages.", { type: "error" });
    }
  };

  const filteredFriends = React.useMemo(() => {
    const q = friendSearch.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => {
      const label = `${f.fullName || ""} ${f.email}`.toLowerCase();
      return label.includes(q);
    });
  }, [friends, friendSearch]);

  const filteredDiscover = React.useMemo(() => {
    const q = discoverSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const label = `${u.fullName || ""} ${u.email}`.toLowerCase();
      return label.includes(q);
    });
  }, [users, discoverSearch]);

  if (loading) return <FriendsSkeleton />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Friends</Text>
      <Text style={styles.subtitle}>Your network, requests, and discovery.</Text>
      <View style={styles.tabs}>
        {(["friends", "requests", "sent", "discover"] as const).map((t) => (
          <Pressable key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]} numberOfLines={1}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "friends" ? (
        <TextInput
          value={friendSearch}
          onChangeText={setFriendSearch}
          placeholder="Search friends"
          placeholderTextColor={COLORS.iconMuted}
          style={styles.searchInput}
        />
      ) : null}
      {tab === "discover" ? (
        <TextInput
          value={discoverSearch}
          onChangeText={setDiscoverSearch}
          placeholder="Search players"
          placeholderTextColor={COLORS.iconMuted}
          style={styles.searchInput}
        />
      ) : null}

      {tab === "requests" ? (
        <Text style={styles.section}>Incoming ({incomingPending.length})</Text>
      ) : null}
      {tab === "sent" ? (
        <Text style={styles.section}>Sent ({outgoingPending.length})</Text>
      ) : null}
      {tab === "friends" ? (
        <Text style={styles.section}>Friends ({filteredFriends.length})</Text>
      ) : null}
      {tab === "discover" ? (
        <Text style={styles.section}>Discover</Text>
      ) : null}

      <FlatList
        key={tab}
        data={
          tab === "friends"
            ? filteredFriends
            : tab === "discover"
              ? filteredDiscover
              : ([] as UserDto[])
        }
        keyExtractor={(i) => i.id}
        refreshing={refreshing}
        onRefresh={() => load({ refresh: true })}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          tab === "requests" ? (
            <View style={{ marginBottom: 8 }}>
              {incomingPending.length === 0 ? (
                <Text style={styles.empty}>No incoming requests.</Text>
              ) : (
                incomingPending.map((r) => (
                  <View key={r.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{r.requesterEmail}</Text>
                    <View style={styles.actions}>
                      <Pressable style={styles.acceptBtn} onPress={() => respond(r.id, "accepted")}>
                        <Text style={styles.acceptText}>Accept</Text>
                      </Pressable>
                      <Pressable style={styles.declineBtn} onPress={() => respond(r.id, "declined")}>
                        <Text style={styles.declineText}>Decline</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : tab === "sent" ? (
            <View style={{ marginBottom: 8 }}>
              {outgoingPending.length === 0 ? (
                <Text style={styles.empty}>No pending sent requests.</Text>
              ) : (
                outgoingPending.map((r) => (
                  <View key={r.id} style={styles.card}>
                    <Text style={styles.cardTitle}>To {r.recipientEmail}</Text>
                    <Text style={styles.cardMeta}>Pending</Text>
                  </View>
                ))
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.fullName || item.email).trim().slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.fullName || item.email}</Text>
                <Text style={styles.cardMeta}>
                  {item.skillLabel || "Player"} · ELO {item.eloRating}
                </Text>
              </View>
            </View>
            {tab === "friends" ? (
              <Pressable style={styles.msgBtn} onPress={() => openOrCreateDm(item.email)}>
                <Text style={styles.msgBtnText}>Message</Text>
              </Pressable>
            ) : null}
            {tab === "discover" ? (
              <Pressable
                style={styles.addBtn}
                onPress={async () => {
                  await api.post("/friends/requests", {
                    requesterEmail: USER_EMAIL,
                    recipientEmail: item.email,
                  });
                  await load();
                }}
              >
                <Text style={styles.addBtnText}>Send request</Text>
              </Pressable>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          tab === "friends" || tab === "discover" ? (
            <Text style={styles.empty}>No items in this section.</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 2, marginBottom: 12, color: COLORS.textMuted },
  searchInput: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    marginBottom: 10,
  },
  section: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 8, marginTop: 6 },
  tabs: { flexDirection: "row", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  tabBtn: {
    flexGrow: 1,
    minWidth: "22%",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 8,
  },
  tabBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { color: COLORS.textSoft, fontWeight: "700", fontSize: 11, textTransform: "capitalize" },
  tabTextActive: { color: COLORS.card },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
  },
  cardTop: { flexDirection: "row", gap: 10, alignItems: "center" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "800", color: COLORS.primaryDark, fontSize: 13 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  cardMeta: { marginTop: 3, fontSize: 12, color: COLORS.textMuted },
  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
  acceptBtn: { backgroundColor: COLORS.success, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  acceptText: { color: COLORS.card, fontWeight: "700", fontSize: 12 },
  declineBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  declineText: { color: COLORS.text, fontWeight: "700", fontSize: 12 },
  msgBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  msgBtnText: { color: COLORS.primaryDark, fontWeight: "700", fontSize: 12 },
  addBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  addBtnText: { color: COLORS.primaryDark, fontWeight: "700", fontSize: 12 },
  empty: { textAlign: "center", marginTop: 24, color: COLORS.textMuted },
});
