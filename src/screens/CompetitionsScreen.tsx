import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { api } from "../lib/api";
import { CompetitionDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { SUBSCRIPTION_PLAN_KEY } from "./SubscriptionGateScreen";
import { COLORS } from "../theme/colors";

export function CompetitionsScreen() {
  const navigation = useNavigation<any>();
  const listRef = React.useRef<FlatList<CompetitionDto>>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [items, setItems] = React.useState<CompetitionDto[]>([]);
  const [tab, setTab] = React.useState<"tournament" | "league">("tournament");
  const [plan, setPlan] = React.useState<"free" | "premium">("free");
  const [showPremiumBanner] = React.useState(true);

  const load = React.useCallback(async (opts?: { refresh?: boolean }) => {
    const isRefresh = opts?.refresh === true;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [res, storedPlan] = await Promise.all([
        api.get<CompetitionDto[]>("/competitions"),
        AsyncStorage.getItem(SUBSCRIPTION_PLAN_KEY),
      ]);
      setItems(res);
      setPlan(storedPlan === "premium" ? "premium" : "free");
    } catch {
      setItems([]);
      setPlan("free");
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

  const tournaments = React.useMemo(() => items.filter((i) => i.type === "tournament"), [items]);
  const leagues = React.useMemo(() => items.filter((i) => i.type === "league"), [items]);
  const listed = tab === "tournament" ? tournaments : leagues;
  const isSubscribed = plan === "premium";

  const switchTab = React.useCallback(
    (next: "tournament" | "league") => {
      if (tab === next) {
        load({ refresh: true });
      } else {
        setTab(next);
      }
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    },
    [load, tab],
  );

  if (loading) return <CompetitionsSkeleton />;
  if (!isSubscribed) {
    return (
      <View style={styles.container}>
        <View style={styles.gateCard}>
          <Text style={styles.gateEmoji}>👑</Text>
          <Text style={styles.gateTitle}>Premium Package Required</Text>
          <Text style={styles.gateText}>
            Start premium to host or fully manage tournaments and leagues like Base44.
          </Text>
          <Pressable style={styles.gateStartBtn} onPress={() => navigation.navigate("SubscriptionGate")}>
            <Text style={styles.gateStartText}>Start Premium</Text>
          </Pressable>
          <Pressable style={styles.gateSkipBtn} onPress={() => navigation.navigate("MainTabs", { screen: "DiscoverTab" })}>
            <Text style={styles.gateSkipText}>Back to Discover</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={listed}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>Ready to compete?</Text>
              <Text style={styles.heroTitle}>Compete & Win 🏆</Text>
              <Text style={styles.heroSub}>Join tournaments or create your own</Text>
              <View style={styles.heroActions}>
                <Pressable style={styles.heroPrimaryBtn} onPress={() => navigation.navigate("CreateCompetition")}>
                  <Ionicons name="add" size={14} color={COLORS.card} />
                  <Text style={styles.heroPrimaryBtnText}>Host Tournament</Text>
                </Pressable>
                <Pressable
                  style={styles.heroGhostBtn}
                  onPress={() => navigation.navigate("MainTabs", { screen: "DiscoverTab" })}
                >
                  <Ionicons name="search-outline" size={14} color={COLORS.card} />
                  <Text style={styles.heroGhostBtnText}>Browse</Text>
                </Pressable>
              </View>
            </View>

            {showPremiumBanner ? (
              <View style={styles.premiumCard}>
                <View style={styles.premiumIcon}>
                  <Ionicons name="diamond-outline" size={16} color={COLORS.card} />
                </View>
                <View style={styles.premiumMain}>
                  <Text style={styles.premiumTitle}>Premium Package</Text>
                  <Text style={styles.premiumSub}>Unlimited tournaments · Better prize controls</Text>
                </View>
                <Text style={styles.premiumTag}>PRO</Text>
              </View>
            ) : null}

            <View style={styles.quickTiles}>
              <QuickTile icon="➕" label="Host" sub="Tournament" accent onPress={() => navigation.navigate("CreateCompetition")} />
              <QuickTile
                icon="🏆"
                label="Find"
                sub="Tournaments"
                active={tab === "tournament"}
                onPress={() => switchTab("tournament")}
              />
              <QuickTile
                icon="📊"
                label="View"
                sub="Leagues"
                active={tab === "league"}
                onPress={() => switchTab("league")}
              />
            </View>

            <View style={styles.tabs}>
              <TabButton
                icon="trophy-outline"
                label="Tournaments"
                count={tournaments.length}
                active={tab === "tournament"}
                onPress={() => switchTab("tournament")}
              />
              <TabButton
                icon="stats-chart-outline"
                label="Leagues"
                count={leagues.length}
                active={tab === "league"}
                onPress={() => switchTab("league")}
              />
            </View>
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("CompetitionDetail", { id: item.id })}
          >
            <View style={styles.cardHeadRow}>
              <View style={styles.cardTypeRow}>
                <View style={styles.iconWrap}>
                  <Text style={styles.iconEmoji}>{item.type === "league" ? "📊" : "🏆"}</Text>
                </View>
                <View style={styles.cardTitleWrap}>
                  <Text numberOfLines={1} style={styles.name}>
                    {item.name}
                  </Text>
                  <Text style={styles.metaLine}>
                    {capitalize(item.format.replaceAll("_", " "))} · {item.participants.length}/{item.maxPlayers || 16} players
                  </Text>
                </View>
              </View>
              <Text style={[styles.statusPill, statusPillStyle(item.status)]}>{capitalize(item.status)}</Text>
            </View>
            <View style={styles.cardBottomRow}>
              <Text style={styles.metaFoot}>
                {item.skillLevel ? `Skill: ${capitalize(item.skillLevel)}` : "Skill: Any"}
              </Text>
              <Text style={styles.metaFoot}>{formatDate(item.createdAt)}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>{tab === "tournament" ? "🏆" : "📊"}</Text>
            <Text style={styles.emptyTitle}>No competitions yet</Text>
            <Text style={styles.emptyText}>
              Be the first to create a {tab === "tournament" ? "tournament" : "league"} in your area.
            </Text>
            <Pressable style={styles.emptyBtn} onPress={() => navigation.navigate("CreateCompetition")}>
              <Text style={styles.emptyBtnText}>{tab === "tournament" ? "Host Tournament" : "Create League"}</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

function QuickTile({
  icon,
  label,
  sub,
  onPress,
  accent,
  active,
}: {
  icon: string;
  label: string;
  sub: string;
  onPress: () => void;
  accent?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable style={[styles.quickTile, accent && styles.quickTileAccent, active && styles.quickTileActive]} onPress={onPress}>
      <Text style={styles.quickTileIcon}>{icon}</Text>
      <Text style={[styles.quickTileLabel, accent && styles.quickTileLabelAccent, active && styles.quickTileLabelActive]}>
        {label}
      </Text>
      <Text style={[styles.quickTileSub, accent && styles.quickTileSubAccent, active && styles.quickTileSubActive]}>
        {sub}
      </Text>
    </Pressable>
  );
}

function TabButton({
  icon,
  label,
  count,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      <Ionicons name={icon as any} size={13} color={active ? COLORS.text : COLORS.textMuted} />
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
      <Text style={[styles.tabCount, active && styles.tabCountActive]}>{count}</Text>
    </Pressable>
  );
}

function statusPillStyle(status: string) {
  if (status === "completed") return styles.statusPillDone;
  if (status === "in_progress") return styles.statusPillLive;
  return styles.statusPillOpen;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function CompetitionsSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.skeletonHero}>
        <SkeletonBlock width="46%" height={10} rounded={8} />
        <View style={styles.skeletonGapSm} />
        <SkeletonBlock width="64%" height={20} rounded={8} />
        <View style={styles.skeletonGapSm} />
        <SkeletonBlock width="72%" height={10} rounded={8} />
        <View style={styles.skeletonGapMd} />
        <View style={styles.skeletonRow}>
          <SkeletonBlock width="62%" height={34} rounded={10} />
          <SkeletonBlock width="34%" height={34} rounded={10} />
        </View>
      </View>
      <View style={styles.skeletonTiles}>
        <SkeletonBlock width="31.5%" height={72} rounded={12} />
        <SkeletonBlock width="31.5%" height={72} rounded={12} />
        <SkeletonBlock width="31.5%" height={72} rounded={12} />
      </View>
      <View style={styles.skeletonTabs}>
        <SkeletonBlock width="49%" height={36} rounded={12} />
        <SkeletonBlock width="49%" height={36} rounded={12} />
      </View>
      <View style={styles.skeletonGapMd} />
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <SkeletonBlock width="70%" height={13} rounded={8} />
          <View style={styles.skeletonGapSm} />
          <SkeletonBlock width="56%" height={10} rounded={8} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 14, paddingTop: 10 },
  listContent: { paddingBottom: 108 },
  heroCard: {
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
    padding: 11,
    marginBottom: 9,
  },
  heroEyebrow: { color: COLORS.card, opacity: 0.75, fontSize: 10, fontWeight: "600" },
  heroTitle: { marginTop: 2, color: COLORS.card, fontSize: 18, fontWeight: "800" },
  heroSub: { marginTop: 2, color: COLORS.card, opacity: 0.78, fontSize: 11 },
  heroActions: { marginTop: 8, flexDirection: "row", gap: 6 },
  heroPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primaryDark,
    borderWidth: 1,
    borderColor: COLORS.card,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flex: 1,
    justifyContent: "center",
  },
  heroPrimaryBtnText: { color: COLORS.card, fontWeight: "700", fontSize: 11 },
  heroGhostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    justifyContent: "center",
  },
  heroGhostBtnText: { color: COLORS.card, fontSize: 11, fontWeight: "700" },
  premiumCard: {
    marginBottom: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.warningText,
    backgroundColor: COLORS.warningSoft,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  premiumIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: COLORS.warningText,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumMain: { flex: 1 },
  premiumTitle: { color: COLORS.warningText, fontSize: 11, fontWeight: "800" },
  premiumSub: { color: COLORS.warningText, opacity: 0.9, fontSize: 9, marginTop: 1 },
  premiumTag: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.warningText,
    backgroundColor: COLORS.card,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: "hidden",
  },
  quickTiles: { flexDirection: "row", gap: 7, marginBottom: 9 },
  quickTile: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTileAccent: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.borderStrong },
  quickTileActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  quickTileIcon: { fontSize: 17, marginBottom: 1 },
  quickTileLabel: { color: COLORS.text, fontSize: 10, fontWeight: "700" },
  quickTileLabelAccent: { color: COLORS.primaryDark },
  quickTileLabelActive: { color: COLORS.primaryDark },
  quickTileSub: { color: COLORS.textMuted, fontSize: 9, marginTop: 1 },
  quickTileSubAccent: { color: COLORS.primaryDark },
  quickTileSubActive: { color: COLORS.primaryDark },
  tabs: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 9,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 10,
    paddingVertical: 7,
  },
  tabBtnActive: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  tabBtnText: { color: COLORS.textSoft, fontWeight: "700", fontSize: 11 },
  tabBtnTextActive: { color: COLORS.text },
  tabCount: {
    fontSize: 9,
    color: COLORS.textMuted,
    backgroundColor: COLORS.bg,
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  tabCountActive: { color: COLORS.primaryDark, borderColor: COLORS.borderStrong, backgroundColor: COLORS.primarySoft },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    marginBottom: 8,
  },
  cardHeadRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  cardTypeRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoftAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: { fontSize: 15 },
  cardTitleWrap: { flex: 1 },
  name: { fontSize: 12, fontWeight: "700", color: COLORS.text },
  metaLine: { marginTop: 1, fontSize: 10, color: COLORS.textMuted, textTransform: "capitalize" },
  statusPill: {
    fontSize: 9,
    fontWeight: "700",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: "hidden",
    textTransform: "capitalize",
  },
  statusPillOpen: {
    color: COLORS.primaryDark,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  statusPillLive: {
    color: COLORS.successText,
    backgroundColor: COLORS.successSoft,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  statusPillDone: {
    color: COLORS.textMuted,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardBottomRow: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metaFoot: { fontSize: 10, color: COLORS.textMuted },
  emptyCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: COLORS.card,
    padding: 14,
    alignItems: "center",
  },
  emptyEmoji: { fontSize: 30, marginBottom: 6 },
  emptyTitle: { color: COLORS.text, fontWeight: "700", fontSize: 14, marginBottom: 2 },
  emptyText: { color: COLORS.textMuted, textAlign: "center", fontSize: 11, lineHeight: 16, marginBottom: 10 },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyBtnText: { color: COLORS.card, fontSize: 11, fontWeight: "700" },
  skeletonHero: {
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 11,
  },
  skeletonTiles: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  skeletonTabs: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  skeletonCard: {
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    marginBottom: 8,
  },
  skeletonRow: { flexDirection: "row", justifyContent: "space-between" },
  skeletonGapSm: { height: 7 },
  skeletonGapMd: { height: 11 },
  gateCard: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.warningText,
    backgroundColor: COLORS.warningSoft,
    padding: 14,
    alignItems: "center",
  },
  gateEmoji: { fontSize: 34, marginBottom: 6 },
  gateTitle: { color: COLORS.warningText, fontSize: 15, fontWeight: "800", marginBottom: 4 },
  gateText: { textAlign: "center", color: COLORS.warningText, opacity: 0.92, fontSize: 11, lineHeight: 16, marginBottom: 10 },
  gateStartBtn: {
    backgroundColor: COLORS.warningText,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  gateStartText: { color: COLORS.card, fontSize: 12, fontWeight: "700" },
  gateSkipBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.warningText,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: COLORS.card,
  },
  gateSkipText: { color: COLORS.warningText, fontSize: 11, fontWeight: "700" },
});

