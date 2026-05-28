import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { DiscoverScreen, HomeScreen, MessagesScreen, ProfileScreen } from "../screens";
import { MainTabParamList } from "./types";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { ConversationDto } from "../lib/types";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";
import { PREMIUM_ENABLED } from "../config/features";
import { usePremiumGate } from "../hooks/usePremiumGate";

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICON_SIZE = 22;
function CenterCreateButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.centerBtnWrap}>
      <View style={styles.centerBtn}>
        <Ionicons name="add" size={30} color={COLORS.card} />
      </View>
    </Pressable>
  );
}

export function MainTabs() {
  const USER_EMAIL = getCurrentUserEmail();
  const navigation = useNavigation<any>();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const { openGate, gateModal } = usePremiumGate();
  const navigateRoot = React.useCallback(
    (route: string, params?: Record<string, unknown>) => {
      const parent = navigation.getParent?.();
      if (parent?.navigate) parent.navigate(route, params);
      else navigation.navigate(route, params);
    },
    [navigation],
  );
  const handleCompetitionPress = React.useCallback(
    (kind: "tournament" | "league") => {
      if (!PREMIUM_ENABLED) {
        openGate({
          feature: kind === "league" ? "Leagues" : "Tournaments",
          description:
            kind === "league"
              ? "Hosting season-long leagues is coming soon in v2 as part of MiPadel Premium. Stay tuned — we're polishing the experience for you."
              : "Hosting tournaments is coming soon in v2 as part of MiPadel Premium. Stay tuned — we're polishing the experience for you.",
        });
        return;
      }
      navigateRoot("CreateCompetition", { defaultType: kind });
    },
    [navigateRoot, openGate],
  );
  const handleRankingPress = React.useCallback(() => {
    openGate({
      feature: "Rankings",
      description:
        "Global rankings and leaderboards are coming soon in v2 as part of MiPadel Premium. Stay tuned — we're polishing the experience for you.",
    });
  }, [openGate]);

  React.useEffect(() => {
    let mounted = true;
    const loadUnread = async () => {
      try {
        const conversations = await api.get<ConversationDto[]>(
          `/conversations?email=${encodeURIComponent(USER_EMAIL)}`,
        );
        const total = conversations.reduce((sum, c) => {
          const count = c.unreadCounts?.[USER_EMAIL] || 0;
          return sum + count;
        }, 0);
        if (mounted) setUnread(total);
      } catch {
        if (mounted) setUnread(0);
      }
    };
    loadUnread();
    const t = setInterval(loadUnread, 12000);

    const socket = getSocket(USER_EMAIL);
    const onConversationChanged = () => {
      loadUnread().catch(() => undefined);
    };
    socket?.on("conversation:message", onConversationChanged);
    socket?.on("conversation:updated", onConversationChanged);

    return () => {
      mounted = false;
      clearInterval(t);
      socket?.off("conversation:message", onConversationChanged);
      socket?.off("conversation:updated", onConversationChanged);
    };
  }, [USER_EMAIL]);
  return (
    <>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.tabInactive,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeScreen}
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => <Ionicons name="home" size={ICON_SIZE} color={color} />,
          }}
        />
        <Tab.Screen
          name="DiscoverTab"
          component={DiscoverScreen}
          options={{
            title: "Discover",
            tabBarIcon: ({ color }) => <Ionicons name="search" size={ICON_SIZE} color={color} />,
          }}
        />
        <Tab.Screen
          name="CreateTab"
          component={HomeScreen}
          options={{
            title: "",
            tabBarLabel: () => <Text style={styles.hiddenLabel}>Create</Text>,
            tabBarIcon: () => null,
            tabBarButton: () => <CenterCreateButton onPress={() => setCreateOpen(true)} />,
          }}
        />
        <Tab.Screen
          name="MessagesTab"
          component={MessagesScreen}
          options={{
            title: "Messages",
            tabBarIcon: ({ color }) => <Ionicons name="chatbubble-ellipses" size={ICON_SIZE} color={color} />,
            tabBarBadge: unread > 0 ? (unread > 9 ? "9+" : unread) : undefined,
            tabBarBadgeStyle: styles.badge,
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileScreen}
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => <Ionicons name="person" size={ICON_SIZE} color={color} />,
          }}
        />
      </Tab.Navigator>
      </SafeAreaView>

      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCreateOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Create</Text>
              <Pressable onPress={() => setCreateOpen(false)}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              <ActionRow
                icon="radio-outline"
                title="I'm Available to Play"
                subtitle="Post to live feed and get discovered"
                onPress={() => navigateRoot("InstantPlay")}
                highlight
              />
              <ActionRow
                icon="flash-outline"
                title="Play Now"
                subtitle="Find a match instantly - minimal setup"
                onPress={() => navigateRoot("InstantPlay")}
              />

              <View style={styles.sectionDivider} />
              <Text style={styles.sectionLabel}>Full Control</Text>
              <ActionRow
                icon="tennisball-outline"
                title="Create Match"
                subtitle="Set up a single game with full options"
                onPress={() => navigateRoot("CreateMatch")}
              />
              <ActionRow
                icon="repeat-outline"
                title="Recurring Match"
                subtitle="Weekly or repeating series"
                onPress={() => navigateRoot("CreateMatch", { recurring: true })}
              />

              <View style={styles.sectionDivider} />
              <Text style={styles.sectionLabel}>Competitions</Text>
              <ActionRow
                icon="trophy-outline"
                title="Create Tournament"
                subtitle={
                  PREMIUM_ENABLED ? "Knockout or round robin" : "Premium · Coming soon in v2"
                }
                badge={!PREMIUM_ENABLED ? "SOON" : undefined}
                premiumLocked={!PREMIUM_ENABLED}
                onPress={() => handleCompetitionPress("tournament")}
              />
              <ActionRow
                icon="stats-chart-outline"
                title="Create League"
                subtitle={
                  PREMIUM_ENABLED ? "Season-long standings" : "Premium · Coming soon in v2"
                }
                badge={!PREMIUM_ENABLED ? "SOON" : undefined}
                premiumLocked={!PREMIUM_ENABLED}
                onPress={() => handleCompetitionPress("league")}
              />
              <ActionRow
                icon="podium-outline"
                title="Ranking"
                subtitle={
                  PREMIUM_ENABLED
                    ? "Global leaderboards & ELO"
                    : "Premium · Coming soon in v2"
                }
                badge={!PREMIUM_ENABLED ? "SOON" : undefined}
                premiumLocked={!PREMIUM_ENABLED}
                onPress={handleRankingPress}
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      {gateModal}
    </>
  );

  function ActionRow({
    icon,
    title,
    subtitle,
    onPress,
    highlight,
    badge,
    premiumLocked,
  }: {
    icon: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    highlight?: boolean;
    badge?: string;
    premiumLocked?: boolean;
  }) {
    return (
      <Pressable
        style={[
          styles.actionRow,
          highlight && styles.actionRowHighlight,
          premiumLocked && styles.actionRowLocked,
        ]}
        onPress={() => {
          setCreateOpen(false);
          onPress();
        }}
      >
        <View style={[styles.actionIcon, premiumLocked && styles.actionIconLocked]}>
          <Ionicons
            name={icon as any}
            size={18}
            color={premiumLocked ? COLORS.textMuted : COLORS.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.actionTitleRow}>
            <Text style={[styles.actionTitle, premiumLocked && styles.actionTitleLocked]}>
              {title}
            </Text>
            {badge ? (
              <View style={styles.actionBadge}>
                <Ionicons name="diamond" size={9} color={COLORS.card} />
                <Text style={styles.actionBadgeText}>{badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.actionSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons
          name={premiumLocked ? "lock-closed" : "chevron-forward"}
          size={16}
          color={COLORS.iconMuted}
        />
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  tabBar: {
    height: 68,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: COLORS.card,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  centerBtnWrap: {
    top: -20,
    justifyContent: "center",
    alignItems: "center",
  },
  centerBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.38,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 9,
  },
  hiddenLabel: {
    display: "none",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 8,
    maxHeight: "78%",
  },
  sheetScroll: { maxHeight: "100%" },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  sectionDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  sectionLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    backgroundColor: COLORS.bg,
  },
  actionRowHighlight: {
    backgroundColor: COLORS.highlightSoft,
    borderColor: COLORS.highlightBorder,
  },
  actionRowLocked: {
    backgroundColor: COLORS.bg,
    borderColor: COLORS.border,
    opacity: 0.92,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoftAlt,
  },
  actionIconLocked: {
    backgroundColor: COLORS.border,
  },
  actionTitle: { fontWeight: "700", fontSize: 14, color: COLORS.text },
  actionTitleLocked: { color: COLORS.textSubtle },
  actionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  actionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  actionBadgeText: {
    color: COLORS.card,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  actionSubtitle: { marginTop: 2, color: COLORS.textMuted, fontSize: 12 },
  badge: {
    backgroundColor: COLORS.badge,
    color: COLORS.card,
    fontSize: 10,
    fontWeight: "700",
  },
});
