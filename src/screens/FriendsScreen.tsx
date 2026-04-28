import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { FriendRequestDto, UserDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";

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

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<{ friends: UserDto[]; requests: FriendRequestDto[] }>(
        `/friends?email=${encodeURIComponent(USER_EMAIL)}`,
      );
      setFriends(data.friends);
      setRequests(
        data.requests.filter(
          (r) => r.recipientEmail === USER_EMAIL && r.status === "pending",
        ),
      );
    } catch {
      setFriends([]);
      setRequests([]);
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

      {requests.length > 0 && (
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

      <Text style={styles.section}>Friends ({friends.length})</Text>
      <FlatList
        data={friends}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.fullName || item.email}</Text>
            <Text style={styles.cardMeta}>
              {item.skillLabel || "intermediate"} · ELO {item.eloRating}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No friends yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800", color: "#0f172a" },
  subtitle: { marginTop: 2, marginBottom: 12, color: "#64748b" },
  section: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginBottom: 8, marginTop: 6 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 8,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  cardMeta: { marginTop: 3, fontSize: 12, color: "#64748b" },
  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
  acceptBtn: { backgroundColor: "#16a34a", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  acceptText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  declineBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  declineText: { color: "#0f172a", fontWeight: "700", fontSize: 12 },
  empty: { textAlign: "center", marginTop: 24, color: "#64748b" },
});

