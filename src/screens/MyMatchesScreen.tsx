import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { api } from "../lib/api";
import { MatchDto } from "../lib/types";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";
import { androidChipText, CHIP_PAD_V } from "../theme/chipAndroid";
import { displayMatchTitle } from "../lib/matchDisplay";
import { matchAppearsOnDiscoveryListBySchedule } from "../lib/matchSchedule";
import { emailsMatch } from "../lib/matchPendingScore";

type StatusFilter = "upcoming" | "open" | "full" | "active";

const FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "upcoming", label: "Upcoming" },
  { id: "open", label: "Open" },
  { id: "full", label: "Full" },
  { id: "active", label: "Live / Score" },
];

function playerOnRoster(match: MatchDto, email: string): boolean {
  return (match.players || []).some((p) => emailsMatch(p, email));
}

function statusLabel(status: string | undefined): string {
  const s = (status || "open").toLowerCase();
  if (s === "in_progress") return "Live";
  if (s === "awaiting_score") return "Awaiting score";
  if (s === "pending_validation") return "Pending";
  if (s === "open") return "Open";
  if (s === "full") return "Full";
  return s.replace(/_/g, " ");
}

export function MyMatchesScreen() {
  const navigation = useNavigation<any>();
  const USER_EMAIL = getCurrentUserEmail();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [allMine, setAllMine] = React.useState<MatchDto[]>([]);
  const [filter, setFilter] = React.useState<StatusFilter>("upcoming");

  const load = React.useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const results = await Promise.all([
          api.get<MatchDto[]>("/matches?status=open"),
          api.get<MatchDto[]>("/matches?status=full"),
          api.get<MatchDto[]>("/matches?status=in_progress"),
          api.get<MatchDto[]>("/matches?status=awaiting_score"),
          api.get<MatchDto[]>("/matches?status=pending_validation"),
        ]);
        const byId = new Map<string, MatchDto>();
        for (const chunk of results) {
          for (const m of chunk) {
            if (!m?.id) continue;
            if (String(m.status || "").toLowerCase() === "cancelled") continue;
            if (!playerOnRoster(m, USER_EMAIL)) continue;
            byId.set(m.id, m);
          }
        }
        setAllMine(Array.from(byId.values()));
      } catch {
        if (!isRefresh) setAllMine([]);
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [USER_EMAIL],
  );

  React.useEffect(() => {
    load(false).catch(() => {});
  }, [load]);

  const visible = React.useMemo(() => {
    const mine = allMine.filter((m) => String(m.status || "").toLowerCase() !== "cancelled");
    if (filter === "upcoming") {
      return mine.filter(
        (m) =>
          playerOnRoster(m, USER_EMAIL) &&
          (String(m.status || "").toLowerCase() === "open" ||
            String(m.status || "").toLowerCase() === "full") &&
          matchAppearsOnDiscoveryListBySchedule(m),
      );
    }
    if (filter === "open") {
      return mine.filter(
        (m) =>
          String(m.status || "").toLowerCase() === "open" &&
          matchAppearsOnDiscoveryListBySchedule(m),
      );
    }
    if (filter === "full") {
      return mine.filter(
        (m) =>
          String(m.status || "").toLowerCase() === "full" &&
          matchAppearsOnDiscoveryListBySchedule(m),
      );
    }
    return mine.filter((m) =>
      ["in_progress", "awaiting_score", "pending_validation"].includes(
        String(m.status || "").toLowerCase(),
      ),
    );
  }, [allMine, filter, USER_EMAIL]);

  const sorted = React.useMemo(() => {
    return [...visible].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [visible]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => setFilter(f.id)}
            style={[styles.chip, filter === f.id && styles.chipOn]}
          >
            <Text style={[styles.chipText, filter === f.id && styles.chipTextOn]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.hint}>
        {filter === "upcoming"
          ? "Today and future scheduled games you’re in (past start times are hidden)."
          : "Tap a status to filter. Cancelled matches are never listed."}
      </Text>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              load(true).catch(() => {});
            }}
            tintColor={COLORS.primary}
          />
        }
      >
        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No matches here</Text>
            <Text style={styles.emptySub}>Try another filter or pull to refresh.</Text>
          </View>
        ) : (
          sorted.map((m) => (
            <Pressable
              key={m.id}
              style={styles.card}
              onPress={() => navigation.navigate("MatchDetail", { id: m.id })}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {displayMatchTitle(m)}
                </Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{statusLabel(m.status)}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                📅 {new Date(m.date).toLocaleDateString()} · {m.timeLabel}
              </Text>
              <Text style={styles.meta}>📍 {m.locationName}</Text>
              <Text style={styles.metaSmall}>
                👥 {m.players.length}/{m.maxPlayers} players
              </Text>
              <View style={styles.chevRow}>
                <Ionicons name="chevron-forward" size={16} color={COLORS.iconMuted} />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  chipRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  chipOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  chipText: { fontSize: 13, fontWeight: "700", color: COLORS.text, ...androidChipText(13) },
  chipTextOn: { color: COLORS.primaryDark },
  hint: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
  list: { paddingHorizontal: 14, paddingBottom: 28 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: COLORS.text },
  statusPill: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: CHIP_PAD_V,
  },
  statusPillText: { fontSize: 11, fontWeight: "700", color: COLORS.primaryDark, ...androidChipText(11) },
  meta: { marginTop: 6, fontSize: 13, color: COLORS.textMuted, fontWeight: "600" },
  metaSmall: { marginTop: 4, fontSize: 12, color: COLORS.textSubtle },
  chevRow: { alignItems: "flex-end", marginTop: 4 },
  empty: { paddingVertical: 40, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  emptySub: { marginTop: 6, fontSize: 13, color: COLORS.textMuted, textAlign: "center", paddingHorizontal: 20 },
});
