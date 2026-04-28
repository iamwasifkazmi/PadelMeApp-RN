import React from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { MatchDto } from "../lib/types";
import { ScreenSkeleton } from "../components/Skeleton";
import { useNavigation } from "@react-navigation/native";
import { COLORS } from "../theme/colors";

const LEVELS = ["any", "beginner", "intermediate", "advanced"] as const;

export function FindMatchScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = React.useState("");
  const [level, setLevel] = React.useState<(typeof LEVELS)[number]>("any");
  const [matches, setMatches] = React.useState<MatchDto[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get<MatchDto[]>(`/matches?status=open${level !== "any" ? `&skill=${level}` : ""}`)
      .then((res) => {
        if (mounted) setMatches(res);
      })
      .catch(() => {
        if (mounted) setMatches([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [level]);

  if (loading) return <ScreenSkeleton rows={6} topGap={12} />;
  const filtered = matches.filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      m.title.toLowerCase().includes(q) ||
      m.locationName.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.headRow}>
        <View>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.subtitle}>Find players, games and friends near you</Text>
        </View>
        <Pressable style={styles.locBtn}>
          <Ionicons name="location-outline" size={14} color="#06b6d4" />
          <Text style={styles.locBtnText}>Dubai</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color="#7b95a6" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search venue or match..."
          placeholderTextColor="#7b95a6"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.topTabs}>
        <Pressable style={[styles.topTab, styles.topTabActive]}>
          <Text style={[styles.topTabText, styles.topTabTextActive]}>Games</Text>
        </Pressable>
        <Pressable style={styles.topTab} onPress={() => navigation.navigate("Players")}>
          <Text style={styles.topTabText}>Players</Text>
        </Pressable>
        <Pressable style={styles.topTab} onPress={() => navigation.navigate("Friends")}>
          <Text style={styles.topTabText}>Friends</Text>
        </Pressable>
      </View>

      <View style={styles.filtersRow}>
        {LEVELS.map((item) => (
          <Pressable
            key={item}
            onPress={() => setLevel(item)}
            style={[styles.chip, level === item && styles.chipActive]}
          >
            <Text style={[styles.chipText, level === item && styles.chipTextActive]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("MatchDetail", { id: item.id })}
          >
            <View style={styles.nowRow}>
              {(item as any).isInstant ? (
                <Text style={styles.nowPill}>NOW</Text>
              ) : (
                <Text style={styles.dayPill}>{new Date(item.date).toLocaleDateString()}</Text>
              )}
            </View>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={16} color="#4f6b7b" />
            </View>
            <Text style={styles.cardMeta}>
              {new Date(item.date).toLocaleDateString()} · {item.timeLabel}
            </Text>
            <Text style={styles.cardMeta}>{item.locationName}</Text>
            <Text style={styles.cardMeta}>
              {item.players.length}/{item.maxPlayers} players
            </Text>
            <View style={styles.recoRow}>
              {!!item.skillLevel && item.skillLevel !== "any" && (
                <Text style={styles.recoChip}>Skill {item.skillLevel}</Text>
              )}
              {item.players.length < item.maxPlayers && (
                <Text style={styles.recoChip}>Spots available</Text>
              )}
              {(item as any).isInstant && <Text style={styles.recoChip}>Instant recommended</Text>}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No open matches right now.</Text>
            <View style={styles.emptyActions}>
              <Pressable style={styles.emptyPrimary} onPress={() => navigation.navigate("InstantPlay")}>
                <Ionicons name="flash-outline" size={15} color="#fff" />
                <Text style={styles.emptyPrimaryText}>Play Now</Text>
              </Pressable>
              <Pressable style={styles.emptySecondary} onPress={() => navigation.navigate("CreateMatch")}>
                <Ionicons name="add" size={15} color="#0891b2" />
                <Text style={styles.emptySecondaryText}>Create Match</Text>
              </Pressable>
            </View>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footerCtas}>
            <Pressable style={styles.ctaCard} onPress={() => navigation.navigate("InstantPlay")}>
              <Ionicons name="flash-outline" size={18} color="#f59e0b" />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.ctaTitle}>Play Now</Text>
                <Text style={styles.ctaMeta}>Find match instantly</Text>
              </View>
            </Pressable>
            <Pressable style={styles.ctaCard} onPress={() => navigation.navigate("CreateMatch")}>
              <Ionicons name="tennisball-outline" size={18} color="#06b6d4" />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.ctaTitle}>Create Match</Text>
                <Text style={styles.ctaMeta}>Organize your game</Text>
              </View>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 2, marginBottom: 12, color: COLORS.textMuted },
  headRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  locBtn: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  locBtnText: { fontSize: 12, color: COLORS.primaryDark, fontWeight: "700" },
  searchWrap: {
    marginTop: 4,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, color: COLORS.text, paddingVertical: 10, fontSize: 13 },
  topTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  topTab: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
  },
  topTabActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  topTabText: { fontSize: 12, color: "#1a3a4a", fontWeight: "700" },
  topTabTextActive: { color: COLORS.card },
  filtersRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { backgroundColor: "#c8e6ef", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: COLORS.primaryDark },
  chipText: { textTransform: "capitalize", color: "#1a3a4a", fontWeight: "600", fontSize: 12 },
  chipTextActive: { color: COLORS.card },
  card: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 8 },
  nowRow: { marginBottom: 6 },
  nowPill: {
    alignSelf: "flex-start",
    backgroundColor: "#fef3c7",
    color: "#92400e",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dayPill: { alignSelf: "flex-start", color: "#4f6b7b", fontSize: 11, fontWeight: "600" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontWeight: "700", fontSize: 14, color: COLORS.text, flex: 1, marginRight: 8 },
  cardMeta: { marginTop: 4, color: COLORS.textMuted, fontSize: 12 },
  emptyState: { marginTop: 24, alignItems: "center" },
  emptyText: { color: "#4f6b7b" },
  emptyActions: { marginTop: 12, flexDirection: "row", gap: 8 },
  emptyPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#06b6d4",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  emptySecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ecfbff",
    borderWidth: 1,
    borderColor: "#9fe4f2",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptySecondaryText: { color: "#0891b2", fontWeight: "700", fontSize: 12 },
  footerCtas: { marginTop: 6, gap: 8 },
  ctaCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c8e6ef",
    borderRadius: 14,
    padding: 12,
  },
  ctaTitle: { fontSize: 13, fontWeight: "700", color: "#041521" },
  ctaMeta: { marginTop: 2, fontSize: 11, color: "#4f6b7b" },
  recoRow: { marginTop: 7, flexDirection: "row", gap: 6, flexWrap: "wrap" },
  recoChip: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0891b2",
    backgroundColor: "#ecfbff",
    borderWidth: 1,
    borderColor: "#9fe4f2",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    textTransform: "capitalize",
  },
});

