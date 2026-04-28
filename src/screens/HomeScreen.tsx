import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { MatchDto, UserDto } from "../lib/types";
import { ScreenSkeleton } from "../components/Skeleton";
import { useNavigation } from "@react-navigation/native";

type Match = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  players: number;
  maxPlayers: number;
  status: "open" | "in_progress" | "awaiting_score";
};

type Player = { id: string; name: string; level: string };
type Competition = { id: string; name: string; type: string; joined: number; max: number };
type RecentResult = { id: string; result: "W" | "L"; elo: number; date: string };

const MOCK_MATCHES: Match[] = [
  {
    id: "m1",
    title: "Evening Padel Doubles",
    date: "Fri 2 May",
    time: "19:30",
    location: "Padel Club Downtown",
    players: 3,
    maxPlayers: 4,
    status: "open",
  },
  {
    id: "m2",
    title: "Competitive Session",
    date: "Sat 3 May",
    time: "11:00",
    location: "Central Courts",
    players: 4,
    maxPlayers: 4,
    status: "awaiting_score",
  },
];

const MOCK_PLAYERS: Player[] = [
  { id: "p1", name: "Ahmed", level: "Advanced" },
  { id: "p2", name: "Mariam", level: "Intermediate" },
  { id: "p3", name: "Hassan", level: "Advanced" },
  { id: "p4", name: "Nora", level: "Beginner" },
];

const MOCK_COMPETITIONS: Competition[] = [
  { id: "c1", name: "Spring Open", type: "Tournament", joined: 18, max: 32 },
  { id: "c2", name: "Weekend League", type: "League", joined: 10, max: 16 },
];

const MOCK_RECENT: RecentResult[] = [
  { id: "r1", result: "W", elo: 12, date: "27 Apr" },
  { id: "r2", result: "L", elo: -8, date: "24 Apr" },
  { id: "r3", result: "W", elo: 15, date: "19 Apr" },
  { id: "r4", result: "W", elo: 7, date: "15 Apr" },
  { id: "r5", result: "L", elo: -6, date: "10 Apr" },
];

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {!!action && <Text style={styles.sectionAction}>{action}</Text>}
    </View>
  );
}

function MatchCard({
  match,
  onPress,
}: {
  match: Match;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.matchCard} onPress={onPress}>
      <View style={styles.matchHeaderRow}>
        <Text style={styles.matchTitle}>{match.title}</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{match.status.replace("_", " ")}</Text>
        </View>
      </View>
      <Text style={styles.matchMeta}>
        {match.date} · {match.time} · {match.location}
      </Text>
      <Text style={styles.matchMeta}>
        {match.players}/{match.maxPlayers} players
      </Text>
    </Pressable>
  );
}

function PlayerMini({ player }: { player: Player }) {
  return (
    <Pressable style={styles.playerMini}>
      <View style={styles.playerAvatar}>
        <Text style={styles.playerAvatarText}>{player.name.slice(0, 1)}</Text>
      </View>
      <Text style={styles.playerName}>{player.name}</Text>
      <Text style={styles.playerLevel}>{player.level}</Text>
    </Pressable>
  );
}

function CompetitionCard({ competition }: { competition: Competition }) {
  const pct = Math.round((competition.joined / competition.max) * 100);
  return (
    <Pressable style={styles.competitionCard}>
      <View style={styles.competitionIconWrap}>
        <Ionicons name="trophy-outline" size={18} color="#06b6d4" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.competitionName}>{competition.name}</Text>
        <Text style={styles.competitionMeta}>
          {competition.type} · {competition.joined}/{competition.max}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
      </View>
    </Pressable>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const [playersTab, setPlayersTab] = useState<"nearby" | "friends">("nearby");
  const [matches, setMatches] = useState<Match[]>(MOCK_MATCHES);
  const [players, setPlayers] = useState<Player[]>(MOCK_PLAYERS);
  const [competitions, setCompetitions] = useState<Competition[]>(MOCK_COMPETITIONS);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [matchesResp, usersResp, compsResp] = await Promise.all([
          api.get<MatchDto[]>("/matches?status=open"),
          api.get<UserDto[]>("/users"),
          api.get<
            { id: string; name: string; type: string; participants: string[]; maxPlayers?: number | null }[]
          >("/competitions"),
        ]);

        if (!mounted) return;
        setMatches(
          matchesResp.slice(0, 4).map((m) => ({
            id: m.id,
            title: m.title,
            date: new Date(m.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
            time: m.timeLabel,
            location: m.locationName,
            players: m.players.length,
            maxPlayers: m.maxPlayers,
            status: (m.status as Match["status"]) || "open",
          })),
        );
        setPlayers(
          usersResp.slice(0, 8).map((u) => ({
            id: u.id,
            name: u.fullName || u.email.split("@")[0],
            level: u.skillLabel || "Intermediate",
          })),
        );
        setCompetitions(
          compsResp.slice(0, 4).map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            joined: c.participants?.length || 0,
            max: c.maxPlayers || 16,
          })),
        );
      } catch {
        // Keep mock data when backend is not available.
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);
  const eloSum = useMemo(
    () => MOCK_RECENT.reduce((sum, r) => sum + r.elo, 0),
    [],
  );

  if (loading) return <ScreenSkeleton rows={8} topGap={16} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>A</Text>
          </View>
          <View>
            <Text style={styles.greeting}>Hi Ahmed 👋</Text>
            <Text style={styles.greetingSub}>Dubai</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.headerIconBtn}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#041521" />
          </Pressable>
          <Pressable style={styles.headerIconBtn}>
            <Ionicons name="notifications-outline" size={18} color="#041521" />
          </Pressable>
        </View>
      </View>

      <View style={styles.instantCard}>
        <Text style={styles.instantTitle}>⚡ Instant Play</Text>
        <Text style={styles.instantSubtitle}>Find players near you right now</Text>
      </View>

      <View style={styles.quickActionsRow}>
        {[
          { icon: "search", label: "Find Game" },
          { icon: "add", label: "Create", accent: true },
          { icon: "trophy-outline", label: "Compete" },
          { icon: "people-outline", label: "Players" },
        ].map((item) => (
          <Pressable
            key={item.label}
            style={[styles.quickAction, item.accent && styles.quickActionAccent]}
            onPress={() => {
              if (item.label === "Find Game") navigation.navigate("DiscoverTab");
              if (item.label === "Create") navigation.navigate("CreateMatch");
              if (item.label === "Compete") navigation.navigate("Competitions");
              if (item.label === "Players") navigation.navigate("Players");
            }}
          >
            <Ionicons
              name={item.icon}
              size={20}
              color={item.accent ? "#ffffff" : "#041521"}
            />
            <Text style={[styles.quickActionText, item.accent && { color: "#fff" }]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <SectionHeader title="📅 Your Matches" subtitle="Matches you're in" action="See all →" />
      {matches.map((m) => (
        <MatchCard
          key={m.id}
          match={m}
          onPress={() => navigation.navigate("MatchDetail", { id: m.id })}
        />
      ))}

      <SectionHeader
        title="👥 Players"
        subtitle={playersTab === "nearby" ? "Suggested for you" : "Friends"}
      />
      <View style={styles.playersSwitch}>
        <Pressable
          style={[styles.switchBtn, playersTab === "nearby" && styles.switchBtnActive]}
          onPress={() => setPlayersTab("nearby")}
        >
          <Text
            style={[
              styles.switchBtnText,
              playersTab === "nearby" && styles.switchBtnTextActive,
            ]}
          >
            Nearby
          </Text>
        </Pressable>
        <Pressable
          style={[styles.switchBtn, playersTab === "friends" && styles.switchBtnActive]}
          onPress={() => setPlayersTab("friends")}
        >
          <Text
            style={[
              styles.switchBtnText,
              playersTab === "friends" && styles.switchBtnTextActive,
            ]}
          >
            Friends
          </Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playersRow}>
        {players.map((p) => (
          <PlayerMini key={p.id} player={p} />
        ))}
      </ScrollView>

      <SectionHeader title="🏆 Competitions" subtitle="Tournaments and leagues" action="See all →" />
      {competitions.map((c) => (
        <CompetitionCard key={c.id} competition={c} />
      ))}

      <SectionHeader title="Recent Results" subtitle={`ELO ${eloSum >= 0 ? `+${eloSum}` : eloSum}`} action="All History →" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.resultsRow}>
        {MOCK_RECENT.map((r) => (
          <View key={r.id} style={styles.resultDotWrap}>
            <View
              style={[
                styles.resultDot,
                r.result === "W" ? styles.resultDotWin : styles.resultDotLoss,
              ]}
            >
              <Text
                style={[
                  styles.resultDotText,
                  r.result === "W" ? styles.resultDotTextWin : styles.resultDotTextLoss,
                ]}
              >
                {r.result}
              </Text>
            </View>
            <Text style={styles.resultElo}>{r.elo > 0 ? `+${r.elo}` : r.elo}</Text>
            <Text style={styles.resultDate}>{r.date}</Text>
          </View>
        ))}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#edf9fd" },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  userAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#041521", alignItems: "center", justifyContent: "center" },
  userAvatarText: { color: "#fff", fontWeight: "700" },
  greeting: { fontSize: 20, fontWeight: "800", color: "#041521" },
  greetingSub: { fontSize: 12, color: "#4f6b7b", marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8 },
  headerIconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#c8e6ef", alignItems: "center", justifyContent: "center" },
  instantCard: { backgroundColor: "#041521", borderRadius: 16, padding: 16, marginBottom: 12 },
  instantTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  instantSubtitle: { color: "#b7d8e2", marginTop: 4, fontSize: 12 },
  quickActionsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  quickAction: { flex: 1, borderRadius: 14, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#c8e6ef", alignItems: "center", justifyContent: "center", paddingVertical: 10, gap: 4 },
  quickActionAccent: { backgroundColor: "#06b6d4", borderColor: "#06b6d4" },
  quickActionText: { fontSize: 11, fontWeight: "700", color: "#041521" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8, marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#041521" },
  sectionSubtitle: { fontSize: 11, color: "#4f6b7b", marginTop: 2 },
  sectionAction: { fontSize: 12, color: "#06b6d4", fontWeight: "600" },
  matchCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#c8e6ef", padding: 12, marginBottom: 8 },
  matchHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  matchTitle: { fontSize: 14, fontWeight: "700", color: "#041521", flex: 1, marginRight: 8 },
  statusPill: { backgroundColor: "#fef3c7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 10, color: "#92400e", fontWeight: "700", textTransform: "capitalize" },
  matchMeta: { fontSize: 11, color: "#4f6b7b", marginTop: 4 },
  playersSwitch: { flexDirection: "row", backgroundColor: "#c8e6ef", borderRadius: 12, padding: 3, alignSelf: "flex-start", marginBottom: 10 },
  switchBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9 },
  switchBtnActive: { backgroundColor: "#fff" },
  switchBtnText: { fontSize: 11, color: "#475569", fontWeight: "600" },
  switchBtnTextActive: { color: "#041521" },
  playersRow: { marginBottom: 14 },
  playerMini: { width: 90, alignItems: "center", marginRight: 10 },
  playerAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#d8f5fb", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  playerAvatarText: { color: "#0891b2", fontWeight: "800" },
  playerName: { fontSize: 12, fontWeight: "700", color: "#041521" },
  playerLevel: { fontSize: 10, color: "#4f6b7b", marginTop: 2 },
  competitionCard: { flexDirection: "row", gap: 10, alignItems: "center", borderRadius: 14, borderWidth: 1, borderColor: "#c8e6ef", backgroundColor: "#fff", padding: 12, marginBottom: 8 },
  competitionIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#d8f5fb", alignItems: "center", justifyContent: "center" },
  competitionName: { fontSize: 14, fontWeight: "700", color: "#041521" },
  competitionMeta: { fontSize: 11, color: "#4f6b7b", marginTop: 2 },
  progressTrack: { height: 6, borderRadius: 99, backgroundColor: "#c8e6ef", marginTop: 8, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 99, backgroundColor: "#06b6d4" },
  resultsRow: { marginBottom: 10 },
  resultDotWrap: { width: 56, alignItems: "center", marginRight: 8 },
  resultDot: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  resultDotWin: { backgroundColor: "#dcfce7" },
  resultDotLoss: { backgroundColor: "#fee2e2" },
  resultDotText: { fontWeight: "800", fontSize: 12 },
  resultDotTextWin: { color: "#15803d" },
  resultDotTextLoss: { color: "#dc2626" },
  resultElo: { fontSize: 10, marginTop: 4, color: "#1a3a4a", fontWeight: "700" },
  resultDate: { fontSize: 9, marginTop: 2, color: "#4f6b7b" },
});

