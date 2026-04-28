import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { UserDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";

const USER_EMAIL = "demo@padelme.app";

function PlayerProfileSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <SkeletonBlock height={82} width={82} rounded={41} />
        <View style={{ height: 12 }} />
        <SkeletonBlock height={22} width="45%" rounded={8} />
        <View style={{ height: 8 }} />
        <SkeletonBlock height={14} width="30%" rounded={8} />
      </View>
      <View style={styles.statsRow}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={styles.statCard}>
            <SkeletonBlock height={12} width="50%" rounded={6} />
            <View style={{ height: 7 }} />
            <SkeletonBlock height={18} width="40%" rounded={8} />
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
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<UserDto | null>(null);
  const [requesting, setRequesting] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get<UserDto>(`/users/${route.params.id}`)
      .then((res) => mounted && setUser(res))
      .catch(() => mounted && setUser(null))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [route.params.id]);

  const sendFriendRequest = async () => {
    if (!user) return;
    try {
      setRequesting(true);
      await api.post("/friends/requests", {
        requesterEmail: USER_EMAIL,
        recipientEmail: user.email,
      });
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return <PlayerProfileSkeleton />;
  if (!user)
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Player not found.</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user.fullName || user.email).slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user.fullName || user.email.split("@")[0]}</Text>
        <Text style={styles.location}>{user.location || "No location set"}</Text>
      </View>

      <View style={styles.statsRow}>
        <Stat title="ELO" value={String(user.eloRating)} />
        <Stat title="Skill" value={user.skillLabel || "intermediate"} />
        <Stat title="Rating" value={(user.averageRating ?? 4.5).toFixed(1)} />
      </View>

      <Pressable
        style={[styles.friendBtn, requesting && { opacity: 0.65 }]}
        onPress={sendFriendRequest}
        disabled={requesting}
      >
        <Text style={styles.friendBtnText}>
          {requesting ? "Sending..." : "Send Friend Request"}
        </Text>
      </Pressable>
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
  container: { flex: 1, backgroundColor: "#edf9fd", paddingHorizontal: 16, paddingTop: 12 },
  hero: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c8e6ef",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 12,
  },
  avatar: { width: 82, height: 82, borderRadius: 41, backgroundColor: "#041521", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 30, fontWeight: "800" },
  name: { marginTop: 12, fontSize: 22, fontWeight: "800", color: "#041521" },
  location: { marginTop: 4, color: "#4f6b7b", fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#c8e6ef", borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  statTitle: { fontSize: 11, color: "#4f6b7b", fontWeight: "600" },
  statValue: { marginTop: 5, fontSize: 16, color: "#041521", fontWeight: "800", textTransform: "capitalize" },
  friendBtn: { backgroundColor: "#06b6d4", borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  friendBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  empty: { marginTop: 24, textAlign: "center", color: "#4f6b7b" },
});

