import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { api } from "../lib/api";
import { CompetitionDto } from "../lib/types";
import { ScreenSkeleton } from "../components/Skeleton";
import { COLORS } from "../theme/colors";

export function CompetitionsScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [items, setItems] = React.useState<CompetitionDto[]>([]);
  const [tab, setTab] = React.useState<"all" | "tournament" | "league">("all");

  const load = React.useCallback(async (opts?: { refresh?: boolean }) => {
    const isRefresh = opts?.refresh === true;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get<CompetitionDto[]>("/competitions");
      setItems(res);
    } catch {
      setItems([]);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = React.useCallback(() => {
    load({ refresh: true });
  }, [load]);

  if (loading) return <ScreenSkeleton rows={6} topGap={12} />;
  const filtered = items.filter((i) => (tab === "all" ? true : i.type === tab));

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Competitions</Text>
          <Text style={styles.subtitle}>Tournaments and leagues</Text>
        </View>
        <Pressable style={styles.createBtn} onPress={() => navigation.navigate("CreateCompetition")}>
          <Ionicons name="add" size={16} color={COLORS.card} />
          <Text style={styles.createBtnText}>Create</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {(["all", "tournament", "league"] as const).map((t) => (
          <Pressable key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 110 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("CompetitionDetail", { id: item.id })}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="trophy-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.type} · {item.format} · {item.status}
              </Text>
              <Text style={styles.meta}>
                Skill: {item.skillLevel || "any"} · Capacity: {item.maxPlayers || 16}
              </Text>
              <View style={styles.chipRow}>
                <Text style={styles.chip}>{item.type}</Text>
                <Text style={styles.chip}>{item.status}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.iconMuted} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No competitions yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 2, marginBottom: 12, color: COLORS.textMuted },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  createBtnText: { color: COLORS.card, fontWeight: "700", fontSize: 12 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tabBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 8,
  },
  tabBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabBtnText: { color: COLORS.textSoft, fontWeight: "700", textTransform: "capitalize", fontSize: 12 },
  tabBtnTextActive: { color: COLORS.card },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoftAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  meta: { marginTop: 2, fontSize: 12, color: COLORS.textMuted, textTransform: "capitalize" },
  chipRow: { marginTop: 6, flexDirection: "row", gap: 6 },
  chip: {
    fontSize: 10,
    color: COLORS.primaryDark,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    textTransform: "capitalize",
  },
  empty: { marginTop: 24, alignItems: "center" },
  emptyText: { color: COLORS.textMuted },
});

