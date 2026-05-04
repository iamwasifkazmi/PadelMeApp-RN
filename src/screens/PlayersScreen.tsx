import React from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { api } from "../lib/api";
import { UserDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { useSnackbar } from "../components/Snackbar";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";
import { PadelLevelRow } from "../components/PadelLevelRow";
import { formatDistanceAway } from "../lib/padelSkill";

type DistanceFilter = "any" | "5" | "10" | "20" | "30";
type GenderFilter = "all" | "male" | "female";
type AbilityFilter = "all" | "advanced" | "intermediate" | "beginner";

const DISTANCE_CHIPS: { value: DistanceFilter; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "5", label: "5 km" },
  { value: "10", label: "10 km" },
  { value: "20", label: "20 km" },
  { value: "30", label: "30 km" },
];

const GENDER_CHIPS: { value: GenderFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const ABILITY_CHIPS: { value: AbilityFilter; label: string }[] = [
  { value: "all", label: "Any level" },
  { value: "advanced", label: "Advanced" },
  { value: "intermediate", label: "Intermediate" },
  { value: "beginner", label: "Beginner" },
];

function FilterChipRow({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.filterBlock}>
      <Text style={styles.filterTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
        {children}
      </ScrollView>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterChip, selected && styles.filterChipSelected]}
    >
      <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function PlayersSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBlock height={28} width="38%" rounded={8} />
      <View style={{ height: 10 }} />
      <SkeletonBlock height={42} width="100%" rounded={12} />
      <View style={{ height: 12 }} />
      {Array.from({ length: 7 }).map((_, i) => (
        <View key={i} style={styles.row}>
          <SkeletonBlock height={44} width={44} rounded={22} />
          <View style={{ flex: 1 }}>
            <SkeletonBlock height={14} width="45%" />
            <View style={{ height: 6 }} />
            <SkeletonBlock height={12} width="65%" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function PlayersScreen() {
  const navigation = useNavigation<any>();
  const { showSnackbar } = useSnackbar();
  const USER_EMAIL = getCurrentUserEmail();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [distance, setDistance] = React.useState<DistanceFilter>("any");
  const [gender, setGender] = React.useState<GenderFilter>("all");
  const [ability, setAbility] = React.useState<AbilityFilter>("all");
  const [players, setPlayers] = React.useState<UserDto[]>([]);
  const [openingChatEmail, setOpeningChatEmail] = React.useState<string | null>(null);

  const load = React.useCallback(async (opts?: { refresh?: boolean }) => {
    const isRefresh = opts?.refresh === true;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("viewerEmail", USER_EMAIL);
      const q = query.trim();
      if (q) params.set("search", q);
      if (distance !== "any") params.set("maxDistanceKm", distance);
      if (gender !== "all") params.set("gender", gender);
      if (ability !== "all") params.set("skillTier", ability);
      const res = await api.get<UserDto[]>(`/users?${params.toString()}`);
      setPlayers(res);
    } catch {
      setPlayers([]);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [USER_EMAIL, ability, distance, gender, query]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = React.useCallback(() => {
    load({ refresh: true });
  }, [load]);

  const openDirectChat = React.useCallback(
    async (player: UserDto) => {
      if (!player.email || player.email === USER_EMAIL) return;
      if (openingChatEmail) return;
      try {
        setOpeningChatEmail(player.email);
        const conversations = await api.get<any[]>(
          `/conversations?email=${encodeURIComponent(USER_EMAIL)}`,
        );
        const existing = conversations.find(
          (c) =>
            c.type === "direct" &&
            Array.isArray(c.participantEmails) &&
            c.participantEmails.includes(USER_EMAIL) &&
            c.participantEmails.includes(player.email),
        );

        let conversationId = existing?.id as string | undefined;
        if (!conversationId) {
          const created = await api.post<any>("/conversations", {
            type: "direct",
            participantEmails: [USER_EMAIL, player.email],
            entityName: player.fullName || player.email.split("@")[0],
          });
          conversationId = created.id;
        }
        navigation.navigate("ConversationView", { id: conversationId });
      } catch {
        showSnackbar("Could not open chat right now. Please try again.", { type: "error" });
      } finally {
        setOpeningChatEmail(null);
      }
    },
    [USER_EMAIL, navigation, openingChatEmail, showSnackbar],
  );

  if (loading) return <PlayersSkeleton />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Players</Text>
      <Text style={styles.subtitle}>Recommended players around your level</Text>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search players"
        placeholderTextColor={COLORS.iconMuted}
      />

      <FilterChipRow title="Distance">
        {DISTANCE_CHIPS.map((c) => (
          <FilterChip
            key={c.value}
            label={c.label}
            selected={distance === c.value}
            onPress={() => setDistance(c.value)}
          />
        ))}
      </FilterChipRow>
      <FilterChipRow title="Gender">
        {GENDER_CHIPS.map((c) => (
          <FilterChip
            key={c.value}
            label={c.label}
            selected={gender === c.value}
            onPress={() => setGender(c.value)}
          />
        ))}
      </FilterChipRow>
      <FilterChipRow title="Padel ability">
        {ABILITY_CHIPS.map((c) => (
          <FilterChip
            key={c.value}
            label={c.label}
            selected={ability === c.value}
            onPress={() => setAbility(c.value)}
          />
        ))}
      </FilterChipRow>
      {distance !== "any" ? (
        <Text style={styles.filterHint}>
          Distance uses your profile map location. Set it in Profile → Edit if results are empty.
        </Text>
      ) : null}

      <FlatList
        data={players}
        keyExtractor={(i) => i.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => {
          const dist = formatDistanceAway(item.distanceKm);
          return (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate("PlayerProfile", { id: item.id })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.fullName || item.email).slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.fullName || item.email.split("@")[0]}</Text>
              <View style={styles.skillWrap}>
                <PadelLevelRow skillLevel={item.skillLevel} fallbackLabel={item.skillLabel} compact />
              </View>
              <Text style={styles.metaLine}>
                ELO {item.eloRating ?? 1000}
                {dist ? ` · ${dist}` : ""}
              </Text>
              <View style={styles.rowActions}>
                <Pressable
                  style={styles.messageBtn}
                  onPress={(event) => {
                    event.stopPropagation();
                    openDirectChat(item).catch(() => undefined);
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={13} color={COLORS.primaryDark} />
                  <Text style={styles.messageBtnText}>
                    {openingChatEmail === item.email ? "Opening..." : "Message"}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.profileBtn}
                  onPress={(event) => {
                    event.stopPropagation();
                    navigation.navigate("PlayerProfile", { id: item.id });
                  }}
                >
                  <Text style={styles.profileBtnText}>View Profile</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>No players match these filters.</Text>
            <Text style={styles.emptySub}>
              Try widening distance or ability, or clear gender. With a distance filter, ensure your profile has a
              location pin.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text, marginBottom: 10 },
  subtitle: { marginTop: -6, marginBottom: 10, color: COLORS.textMuted, fontSize: 12 },
  search: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    marginBottom: 8,
    color: COLORS.text,
  },
  filterBlock: { marginBottom: 10 },
  filterTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  chipScroll: { flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.borderStrong,
  },
  filterChipText: { fontSize: 12, fontWeight: "600", color: COLORS.textSubtle },
  filterChipTextSelected: { color: COLORS.primaryDark, fontWeight: "700" },
  filterHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 10,
    lineHeight: 15,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.text, alignItems: "center", justifyContent: "center" },
  avatarText: { color: COLORS.card, fontWeight: "800" },
  name: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  skillWrap: { marginTop: 6, alignSelf: "flex-start" },
  metaLine: { marginTop: 4, fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },
  rowActions: { marginTop: 8, flexDirection: "row", gap: 6 },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  messageBtnText: { color: COLORS.primaryDark, fontWeight: "700", fontSize: 11 },
  profileBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  profileBtnText: { color: COLORS.text, fontWeight: "700", fontSize: 11 },
  emptyWrap: { marginTop: 20, paddingHorizontal: 8 },
  empty: { textAlign: "center", color: COLORS.textMuted, fontWeight: "600" },
  emptySub: { textAlign: "center", marginTop: 8, fontSize: 12, color: COLORS.textSoft, lineHeight: 17 },
});

