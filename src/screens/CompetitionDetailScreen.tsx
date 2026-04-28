import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { CompetitionDetailDto } from "../lib/types";
import { ScreenSkeleton } from "../components/Skeleton";

export function CompetitionDetailScreen({
  route,
  navigation,
}: {
  route: { params: { id: string } };
  navigation: any;
}) {
  const id = route.params.id;
  const [loading, setLoading] = React.useState(true);
  const [item, setItem] = React.useState<CompetitionDetailDto | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [joining, setJoining] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<CompetitionDetailDto>(`/competitions/${id}`);
      setItem(res);
    } catch {
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  const advanceBracket = async () => {
    try {
      setBusy(true);
      await api.post(`/competitions/${id}/advance-bracket`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const joinCompetition = async () => {
    try {
      setJoining(true);
      await api.post(`/competitions/${id}/join`, { email: "demo@padelme.app" });
      await load();
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <ScreenSkeleton rows={5} topGap={12} />;
  if (!item)
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Competition not found.</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.meta}>
          {item.type} · {item.format} · {item.status}
        </Text>
        <Text style={styles.meta}>
          Skill: {item.skillLevel || "any"} · Capacity: {item.maxPlayers || 16}
        </Text>
      </View>

      <Pressable
        style={[styles.advanceBtn, busy && { opacity: 0.65 }]}
        onPress={advanceBracket}
        disabled={busy}
      >
        <Ionicons name="git-branch-outline" size={16} color="#fff" />
        <Text style={styles.advanceBtnText}>Advance Bracket</Text>
      </Pressable>
      <Pressable
        style={[styles.joinBtn, joining && { opacity: 0.65 }]}
        onPress={joinCompetition}
        disabled={joining}
      >
        <Ionicons name="person-add-outline" size={16} color="#041521" />
        <Text style={styles.joinBtnText}>{joining ? "Joining..." : "Join Competition"}</Text>
      </Pressable>
      <Pressable style={styles.inviteBtn} onPress={() => navigation.navigate("InvitePlayers", { eventId: item.id })}>
        <Ionicons name="mail-outline" size={16} color="#0891b2" />
        <Text style={styles.inviteBtnText}>Invite Players</Text>
      </Pressable>

      <Text style={styles.matchesTitle}>Matches</Text>
      <FlatList
        data={item.matches}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item: m }) => (
          <View style={styles.matchCard}>
            <Text style={styles.matchTitle}>
              Round {m.round}: {m.player1Name || "TBD"} vs {m.player2Name || "TBD"}
            </Text>
            <Text style={styles.matchMeta}>{m.status}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No matches generated yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#edf9fd", paddingHorizontal: 16, paddingTop: 12 },
  hero: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#c8e6ef",
    padding: 14,
    marginBottom: 10,
  },
  title: { fontSize: 23, fontWeight: "800", color: "#041521" },
  meta: { marginTop: 4, fontSize: 12, color: "#4f6b7b", textTransform: "capitalize" },
  advanceBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#06b6d4",
    borderRadius: 12,
    paddingVertical: 11,
    marginBottom: 12,
  },
  advanceBtnText: { color: "#fff", fontWeight: "700" },
  joinBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d8f5fb",
    borderRadius: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  joinBtnText: { color: "#041521", fontWeight: "700" },
  inviteBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#9fe4f2",
    borderRadius: 12,
    paddingVertical: 11,
    marginBottom: 12,
    backgroundColor: "#ecfbff",
  },
  inviteBtnText: { color: "#0891b2", fontWeight: "700" },
  matchesTitle: { fontSize: 16, fontWeight: "700", color: "#041521", marginBottom: 8 },
  matchCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#c8e6ef",
    padding: 12,
    marginBottom: 8,
  },
  matchTitle: { fontSize: 14, color: "#041521", fontWeight: "700" },
  matchMeta: { marginTop: 3, fontSize: 12, color: "#4f6b7b", textTransform: "capitalize" },
  emptyText: { textAlign: "center", color: "#4f6b7b", marginTop: 20 },
});

