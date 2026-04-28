import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { FriendRequestDto, UserDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { COLORS } from "../theme/colors";

const USER_EMAIL = "demo@padelme.app";

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

export function FriendsScreen() {
  const [loading, setLoading] = React.useState(true);
  const [friends, setFriends] = React.useState<UserDto[]>([]);
  const [requests, setRequests] = React.useState<FriendRequestDto[]>([]);
  const [users, setUsers] = React.useState<UserDto[]>([]);
  const [tab, setTab] = React.useState<"friends" | "requests" | "discover">("friends");

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<{ friends: UserDto[]; requests: FriendRequestDto[] }>(
        `/friends?email=${encodeURIComponent(USER_EMAIL)}`,
      );
      const allUsers = await api.get<UserDto[]>("/users");
      setFriends(data.friends);
      setRequests(
        data.requests.filter(
          (r) => r.recipientEmail === USER_EMAIL && r.status === "pending",
        ),
      );
      setUsers(
        allUsers.filter((u) => u.email !== USER_EMAIL && !data.friends.some((f) => f.email === u.email)),
      );
    } catch {
      setFriends([]);
      setRequests([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const respond = async (id: string, status: "accepted" | "declined") => {
    await api.patch(`/friends/requests/${id}`, { status });
    await load();
  };

  if (loading) return <FriendsSkeleton />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Friends</Text>
      <Text style={styles.subtitle}>Your network and pending requests</Text>
      <View style={styles.tabs}>
        {(["friends", "requests", "discover"] as const).map((t) => (
          <Pressable key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "requests" && requests.length > 0 && (
        <>
          <Text style={styles.section}>Pending Requests</Text>
          {requests.map((r) => (
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
          ))}
        </>
      )}

      {tab === "friends" && <Text style={styles.section}>Friends ({friends.length})</Text>}
      {tab === "discover" && <Text style={styles.section}>Discover Players</Text>}
      <FlatList
        data={tab === "friends" ? friends : tab === "requests" ? [] : users}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.fullName || item.email}</Text>
            <Text style={styles.cardMeta}>
              {item.skillLabel || "intermediate"} · ELO {item.eloRating}
            </Text>
            {tab === "discover" && (
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
                <Text style={styles.addBtnText}>Send Request</Text>
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No items in this section.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 2, marginBottom: 12, color: COLORS.textMuted },
  section: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 8, marginTop: 6 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tabBtn: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 8,
  },
  tabBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { color: COLORS.textSoft, fontWeight: "700", fontSize: 12, textTransform: "capitalize" },
  tabTextActive: { color: COLORS.card },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  cardMeta: { marginTop: 3, fontSize: 12, color: COLORS.textMuted },
  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
  acceptBtn: { backgroundColor: COLORS.success, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  acceptText: { color: COLORS.card, fontWeight: "700", fontSize: 12 },
  declineBtn: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.borderMuted, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  declineText: { color: COLORS.text, fontWeight: "700", fontSize: 12 },
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

