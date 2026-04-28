import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { UserDto } from "../lib/types";
import { ScreenSkeleton } from "../components/Skeleton";

const USER_EMAIL = "demo@padelme.app";

export function ProfileScreen() {
  const [user, setUser] = React.useState<UserDto | null>(null);
  const [loading, setLoading] = React.useState(true);

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

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{fullName.slice(0, 1)}</Text>
        </View>
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.location}>{user?.location || "Set your location"}</Text>
      </View>

      <View style={styles.statsRow}>
        <Stat title="ELO" value={String(elo)} />
        <Stat title="Skill" value={skill} />
        <Stat title="Rating" value={rating.toFixed(1)} />
      </View>
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
  container: { flex: 1, backgroundColor: "#f8fafc", paddingHorizontal: 16, paddingTop: 12 },
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
});

