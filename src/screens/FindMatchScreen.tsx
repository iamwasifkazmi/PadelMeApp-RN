import React from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { api } from "../lib/api";
import { MatchDto } from "../lib/types";
import { ScreenSkeleton } from "../components/Skeleton";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";

type DayFilter = "" | "today" | "tomorrow" | "week";
type SkillFilter = "" | "beginner" | "intermediate" | "advanced";
type FormatFilter = "" | "singles" | "doubles" | "mixed_doubles";
type Tab = "games" | "players" | "friends";

export function FindMatchScreen() {
  const navigation = useNavigation<any>();
  const USER_EMAIL = getCurrentUserEmail();
  const [tab, setTab] = React.useState<Tab>("games");
  const [query, setQuery] = React.useState("");
  const [dayFilter, setDayFilter] = React.useState<DayFilter>("");
  const [skillFilter, setSkillFilter] = React.useState<SkillFilter>("");
  const [formatFilter, setFormatFilter] = React.useState<FormatFilter>("");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [matches, setMatches] = React.useState<MatchDto[]>([]);
  const [friendsCount, setFriendsCount] = React.useState(0);
  const [playersCount, setPlayersCount] = React.useState(0);

  const load = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [openMatches, usersResp, friendsResp] = await Promise.all([
        api.get<MatchDto[]>("/matches?status=open"),
        api.get<Array<{ id: string; email: string }>>("/users"),
        api.get<{ friends: Array<{ id: string }> }>(
          `/friends?email=${encodeURIComponent(USER_EMAIL)}`,
        ),
      ]);
      setMatches(openMatches);
      setPlayersCount(usersResp.length);
      setFriendsCount(friendsResp.friends.length);
    } catch {
      if (!isRefresh) {
        setMatches([]);
        setPlayersCount(0);
        setFriendsCount(0);
      }
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [USER_EMAIL]);

  React.useEffect(() => {
    load(false);
  }, [load]);

  const onRefresh = React.useCallback(() => {
    load(true);
  }, [load]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const tomorrowIso = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const weekOutIso = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const filteredMatches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return matches
      .filter((m) => {
        if (q) {
          const hay = `${m.title} ${m.locationName} ${m.locationAddress || ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (skillFilter && m.skillLevel && m.skillLevel !== skillFilter && m.skillLevel !== "any") {
          return false;
        }
        if (formatFilter && m.matchType && m.matchType !== formatFilter) {
          return false;
        }
        const dateIso = String(m.date).slice(0, 10);
        if (dayFilter === "today" && dateIso !== todayIso) return false;
        if (dayFilter === "tomorrow" && dateIso !== tomorrowIso) return false;
        if (dayFilter === "week" && dateIso > weekOutIso) return false;
        return true;
      })
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [matches, query, skillFilter, formatFilter, dayFilter, todayIso, tomorrowIso, weekOutIso]);

  const instantMatches = filteredMatches.filter((m) => m.isInstant);
  const todayMatches = filteredMatches.filter((m) => String(m.date).slice(0, 10) === todayIso && !m.isInstant);
  const upcomingMatches = filteredMatches.filter((m) => String(m.date).slice(0, 10) > todayIso && !m.isInstant);

  if (loading) return <ScreenSkeleton rows={7} topGap={10} />;

  return (
    <View style={styles.container}>
      <View style={styles.headRow}>
        <View>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.subtitle}>Find players, games and friends near you</Text>
        </View>
        <View style={styles.headActions}>
          <Pressable style={styles.locBtn}>
            <Ionicons name="location-outline" size={13} color={COLORS.primary} />
            <Text style={styles.locText}>Nearby</Text>
            <Ionicons name="chevron-down" size={13} color={COLORS.primaryDark} />
          </Pressable>
          <Pressable style={styles.navBtn}>
            <Ionicons name="navigate-outline" size={14} color={COLORS.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={COLORS.iconMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, town or venue..."
          placeholderTextColor={COLORS.iconMuted}
          style={styles.searchInput}
        />
        {query ? (
          <Pressable onPress={() => setQuery("")}>
            <Ionicons name="close" size={16} color={COLORS.iconMuted} />
          </Pressable>
        ) : (
          <Ionicons name="options-outline" size={16} color={COLORS.iconMuted} />
        )}
      </View>

      <View style={styles.tabsRow}>
        <TopTab
          label="🎾 Games"
          active={tab === "games"}
          count={filteredMatches.length}
          onPress={() => setTab("games")}
        />
        <TopTab
          label="👥 Players"
          active={tab === "players"}
          count={playersCount}
          onPress={() => {
            setTab("players");
            navigation.navigate("Players");
          }}
        />
        <TopTab
          label="🤝 Friends"
          active={tab === "friends"}
          count={friendsCount}
          onPress={() => {
            setTab("friends");
            navigation.navigate("Friends");
          }}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterStrip}
      >
        <FilterChip
          label="Today"
          active={dayFilter === "today"}
          onPress={() => setDayFilter(dayFilter === "today" ? "" : "today")}
        />
        <FilterChip
          label="Tomorrow"
          active={dayFilter === "tomorrow"}
          onPress={() => setDayFilter(dayFilter === "tomorrow" ? "" : "tomorrow")}
        />
        <FilterChip
          label="This Week"
          active={dayFilter === "week"}
          onPress={() => setDayFilter(dayFilter === "week" ? "" : "week")}
        />
        <View style={styles.filterDivider} />
        {[
          { v: "beginner", l: "🌱 Beginner" },
          { v: "intermediate", l: "⚡ Mid" },
          { v: "advanced", l: "🏆 Advanced" },
        ].map((item) => (
          <FilterChip
            key={item.v}
            label={item.l}
            active={skillFilter === item.v}
            onPress={() => setSkillFilter(skillFilter === item.v ? "" : (item.v as SkillFilter))}
          />
        ))}
        <View style={styles.filterDivider} />
        {[
          { v: "singles", l: "1v1" },
          { v: "doubles", l: "2v2" },
          { v: "mixed_doubles", l: "Mixed" },
        ].map((item) => (
          <FilterChip
            key={item.v}
            label={item.l}
            active={formatFilter === item.v}
            onPress={() => setFormatFilter(formatFilter === item.v ? "" : (item.v as FormatFilter))}
          />
        ))}
        {(dayFilter || skillFilter || formatFilter) ? (
          <Pressable
            style={styles.clearChip}
            onPress={() => {
              setDayFilter("");
              setSkillFilter("");
              setFormatFilter("");
            }}
          >
            <Ionicons name="close" size={12} color={COLORS.dangerText} />
            <Text style={styles.clearChipText}>Clear</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={styles.liveCard}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>Live Availability · {playersCount} players discoverable</Text>
      </View>

      <FlatList
        data={buildRows(instantMatches, todayMatches, upcomingMatches)}
        keyExtractor={(item, idx) => `${item.kind}-${idx}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          if (item.kind === "header") {
            return (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{item.title}</Text>
              </View>
            );
          }
          const spots = Math.max(0, item.match.maxPlayers - item.match.players.length);
          const joined = item.match.players.includes(USER_EMAIL);
          return (
            <Pressable
              style={styles.matchCard}
              onPress={() => navigation.navigate("MatchDetail", { id: item.match.id })}
            >
              <View style={styles.matchTop}>
                <View style={styles.badges}>
                  {item.match.isInstant ? <Text style={styles.nowPill}>⚡ NOW</Text> : null}
                  <Text style={styles.whenText}>
                    {new Date(item.match.date).toLocaleDateString()} · {item.match.timeLabel}
                  </Text>
                </View>
                <Pressable
                  style={styles.viewBtn}
                  onPress={() => navigation.navigate("MatchDetail", { id: item.match.id })}
                >
                  <Text style={styles.viewBtnText}>{joined ? "Joined ✓" : spots === 0 ? "View" : "Join →"}</Text>
                </Pressable>
              </View>
              <Text style={styles.matchTitle}>{item.match.title}</Text>
              <Text style={styles.matchMeta}>📍 {item.match.locationName}</Text>
              <Text style={styles.matchMeta}>
                {item.match.players.length}/{item.match.maxPlayers} players
              </Text>
              <View style={styles.metaChips}>
                {item.match.skillLevel && item.match.skillLevel !== "any" ? (
                  <Text style={styles.metaChip}>Skill {item.match.skillLevel}</Text>
                ) : null}
                {item.match.matchType ? (
                  <Text style={styles.metaChip}>{item.match.matchType === "singles" ? "1v1" : item.match.matchType === "mixed_doubles" ? "Mixed" : "2v2"}</Text>
                ) : null}
                <Text style={styles.metaChip}>
                  {spots} spots left
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No games found nearby</Text>
            <Text style={styles.emptySub}>Be the first to organize a padel game!</Text>
            <View style={styles.emptyActions}>
              <Pressable style={styles.instantBtn} onPress={() => navigation.navigate("InstantPlay")}>
                <Text style={styles.instantBtnText}>⚡ Play Now</Text>
              </Pressable>
              <Pressable style={styles.createBtn} onPress={() => navigation.navigate("CreateMatch")}>
                <Text style={styles.createBtnText}>🎾 Create Match</Text>
              </Pressable>
            </View>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footerCtas}>
            <Pressable style={styles.footerCard} onPress={() => navigation.navigate("InstantPlay")}>
              <Text style={styles.footerTitle}>⚡ Play Now</Text>
              <Text style={styles.footerMeta}>Find a game instantly</Text>
            </Pressable>
            <Pressable style={styles.footerCard} onPress={() => navigation.navigate("CreateMatch")}>
              <Text style={styles.footerTitle}>➕ Create Match</Text>
              <Text style={styles.footerMeta}>Organize your own game</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

function TopTab({
  label,
  active,
  count,
  onPress,
}: {
  label: string;
  active: boolean;
  count: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.topTab, active && styles.topTabActive]} onPress={onPress}>
      <Text style={[styles.topTabText, active && styles.topTabTextActive]}>{label}</Text>
      {count > 0 ? (
        <View style={[styles.countPill, active && styles.countPillActive]}>
          <Text style={[styles.countText, active && styles.countTextActive]}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function buildRows(instant: MatchDto[], today: MatchDto[], upcoming: MatchDto[]) {
  const rows: Array<
    | { kind: "header"; title: string }
    | { kind: "item"; match: MatchDto }
  > = [];
  if (instant.length > 0) {
    rows.push({ kind: "header", title: "⚡ Play Now" });
    instant.forEach((m) => rows.push({ kind: "item", match: m }));
  }
  if (today.length > 0) {
    rows.push({ kind: "header", title: "🔥 Today" });
    today.forEach((m) => rows.push({ kind: "item", match: m }));
  }
  if (upcoming.length > 0) {
    rows.push({ kind: "header", title: "📅 Upcoming" });
    upcoming.forEach((m) => rows.push({ kind: "item", match: m }));
  }
  return rows;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 14, paddingTop: 10 },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headActions: { marginTop: 6, flexDirection: "row", gap: 8, alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800", color: COLORS.text },
  subtitle: { color: COLORS.textMuted, marginTop: 2, fontSize: 12 },
  locBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primaryPale,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  locText: { color: COLORS.primaryDark, fontSize: 11, fontWeight: "700" },
  searchWrap: {
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 13, paddingVertical: 10 },
  tabsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  topTab: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
  },
  topTabActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  topTabText: { color: COLORS.textSubtle, fontSize: 11, fontWeight: "700" },
  topTabTextActive: { color: COLORS.card },
  countPill: { borderRadius: 999, backgroundColor: COLORS.primarySoft, paddingHorizontal: 6, paddingVertical: 1 },
  countPillActive: { backgroundColor: "rgba(255,255,255,0.28)" },
  countText: { fontSize: 10, fontWeight: "800", color: COLORS.primaryDark },
  countTextActive: { color: COLORS.card },
  filterStrip: { gap: 7, paddingBottom: 8 },
  filterDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 3, marginVertical: 4 },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  filterChipText: { color: COLORS.textSubtle, fontSize: 11, fontWeight: "700" },
  filterChipTextActive: { color: COLORS.primaryDark },
  clearChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.dangerText,
    backgroundColor: COLORS.dangerSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  clearChipText: { fontSize: 11, fontWeight: "700", color: COLORS.dangerText },
  liveCard: {
    marginTop: 1,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 7,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  liveText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "600" },
  listContent: { paddingBottom: 120 },
  sectionHeader: { marginTop: 6, marginBottom: 7 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: COLORS.text },
  matchCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 13,
    marginBottom: 9,
  },
  matchTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badges: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  nowPill: {
    borderRadius: 999,
    backgroundColor: COLORS.warningSoft,
    color: COLORS.warningText,
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: "hidden",
  },
  whenText: { fontSize: 11, color: COLORS.textMuted, fontWeight: "600", flexShrink: 1 },
  viewBtn: {
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryPale,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  viewBtnText: { color: COLORS.primaryDark, fontSize: 11, fontWeight: "800" },
  matchTitle: { marginTop: 6, color: COLORS.text, fontWeight: "800", fontSize: 14 },
  matchMeta: { marginTop: 3, fontSize: 12, color: COLORS.textMuted },
  metaChips: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.primarySoft,
    color: COLORS.primaryDark,
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  empty: { alignItems: "center", marginTop: 30 },
  emptyTitle: { fontSize: 15, color: COLORS.text, fontWeight: "700" },
  emptySub: { marginTop: 6, color: COLORS.textMuted, fontSize: 12, textAlign: "center" },
  emptyActions: { marginTop: 12, flexDirection: "row", gap: 8 },
  instantBtn: {
    borderRadius: 999,
    backgroundColor: COLORS.warningText,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  instantBtnText: { color: COLORS.card, fontSize: 12, fontWeight: "700" },
  createBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  createBtnText: { color: COLORS.primaryDark, fontSize: 12, fontWeight: "700" },
  footerCtas: { marginTop: 6, gap: 8 },
  footerCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 12,
  },
  footerTitle: { fontSize: 13, fontWeight: "700", color: COLORS.text },
  footerMeta: { marginTop: 2, fontSize: 11, color: COLORS.textMuted },
});
