import React from "react";
import {
  FlatList,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useRoute } from "@react-navigation/native";
import { api } from "../lib/api";
import { SkeletonBlock } from "../components/Skeleton";
import { useSnackbar } from "../components/Snackbar";
import { UserDto } from "../lib/types";
import { buildWebInviteUrl } from "../config/deepLinks";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";
import { PadelLevelRow } from "../components/PadelLevelRow";
import { formatDistanceAway } from "../lib/padelSkill";

type InviteItem = {
  id: string;
  receiverEmail: string;
  token: string;
  status: string;
  createdAt: string;
};

function InvitePlayersSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBlock height={28} width="45%" rounded={8} />
      <View style={{ height: 10 }} />
      <SkeletonBlock height={14} width="68%" rounded={8} />
      <View style={{ height: 14 }} />
      <SkeletonBlock height={42} width="100%" rounded={12} />
      <View style={{ height: 12 }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.rowCard}>
          <SkeletonBlock height={13} width="42%" />
          <View style={{ height: 6 }} />
          <SkeletonBlock height={12} width="55%" />
        </View>
      ))}
    </View>
  );
}

function buildInviteDeepLink(token: string) {
  return `mipadel://invite/${encodeURIComponent(token)}`;
}

function buildInviteShareMessage(token: string, title?: string) {
  const line = title ? `${title}\n\n` : "";
  const web = buildWebInviteUrl(token);
  const app = buildInviteDeepLink(token);
  return `${line}Join in MiPadel:\n${web}\n\nOpen in app:\n${app}\n\nToken: ${token}`;
}

export function InvitePlayersScreen() {
  const route = useRoute();
  const params = (route.params || {}) as {
    eventId?: string;
    eventTitle?: string;
    eventSubtitle?: string;
  };
  const { showSnackbar } = useSnackbar();
  const USER_EMAIL = getCurrentUserEmail();
  const eventId = params.eventId || "";
  const eventTitle = params.eventTitle || "This event";
  const eventSubtitle = params.eventSubtitle;

  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [shareBusy, setShareBusy] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [users, setUsers] = React.useState<UserDto[]>([]);
  const [invites, setInvites] = React.useState<InviteItem[]>([]);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const shareTokenRef = React.useRef<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const [usersResp, invitesResp] = await Promise.all([
        api.get<UserDto[]>(`/users?viewerEmail=${encodeURIComponent(USER_EMAIL)}`),
        eventId ? api.get<InviteItem[]>(`/invites/event/${eventId}`) : Promise.resolve([]),
      ]);
      setUsers(usersResp);
      setInvites(invitesResp);
    } catch {
      setUsers([]);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  React.useEffect(() => {
    shareTokenRef.current = null;
  }, [eventId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const filteredUsers = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const invitedSet = new Set(
      invites
        .filter((i) => !i.receiverEmail.startsWith("share."))
        .map((i) => i.receiverEmail.toLowerCase()),
    );
    return users.filter((u) => {
      const label = `${u.fullName || ""} ${u.email}`.toLowerCase();
      if (invitedSet.has(u.email)) return false;
      return q ? label.includes(q) : true;
    });
  }, [users, invites, search]);

  const selectedEmails = React.useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected],
  );

  const toggle = (email: string) =>
    setSelected((prev) => ({ ...prev, [email]: !prev[email] }));

  const ensureShareToken = async (): Promise<string | null> => {
    if (!eventId) {
      showSnackbar("Missing event — open from match or competition.", { type: "error" });
      return null;
    }
    if (shareTokenRef.current) return shareTokenRef.current;
    const created = await api.post<InviteItem>("/invites/create", {
      senderEmail: USER_EMAIL,
      eventId,
    });
    shareTokenRef.current = created.token;
    await load();
    return created.token;
  };

  const sendInvites = async () => {
    if (!eventId) {
      showSnackbar("Open this screen from a match or competition to invite.", { type: "error" });
      return;
    }
    if (selectedEmails.length === 0) return;
    try {
      setSending(true);
      await api.post("/invites/bulk-create", {
        senderEmail: USER_EMAIL,
        eventId,
        receiverEmails: selectedEmails,
      });
      setSelected({});
      await load();
      showSnackbar(`${selectedEmails.length} invite(s) sent.`, { type: "success" });
    } catch {
      showSnackbar("Could not send invites.", { type: "error" });
    } finally {
      setSending(false);
    }
  };

  const onCopyShare = async () => {
    try {
      setShareBusy(true);
      const t = await ensureShareToken();
      if (!t) return;
      const msg = buildInviteShareMessage(t, eventTitle);
      await Share.share({ message: msg, title: "Invite to MiPadel" });
    } catch {
      showSnackbar("Could not create share link.", { type: "error" });
    } finally {
      setShareBusy(false);
    }
  };

  const openChannel = async (channel: "whatsapp" | "sms" | "mail") => {
    try {
      setShareBusy(true);
      const t = await ensureShareToken();
      if (!t) return;
      const body = buildInviteShareMessage(t, eventTitle);
      if (channel === "whatsapp") {
        const encoded = encodeURIComponent(body);
        const appUrl = `whatsapp://send?text=${encoded}`;
        const webUrl = `https://api.whatsapp.com/send?text=${encoded}`;
        let opened = false;
        try {
          if (await Linking.canOpenURL(appUrl)) {
            await Linking.openURL(appUrl);
            opened = true;
          }
        } catch {
          /* try web fallback */
        }
        if (!opened) {
          try {
            await Linking.openURL(webUrl);
            opened = true;
          } catch {
            showSnackbar("Could not open WhatsApp.", { type: "error" });
          }
        }
      } else if (channel === "sms") {
        const url = `sms:?body=${encodeURIComponent(body)}`;
        await Linking.openURL(url);
      } else {
        const subject = encodeURIComponent(`Join: ${eventTitle}`);
        const url = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
        await Linking.openURL(url);
      }
    } catch {
      showSnackbar("Could not open app.", { type: "error" });
    } finally {
      setShareBusy(false);
    }
  };

  if (loading) return <InvitePlayersSkeleton />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invite players</Text>
      <Text style={styles.subtitle}>Share a link or pick players from the community.</Text>

      {eventId ? (
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{eventTitle}</Text>
          {eventSubtitle ? <Text style={styles.heroSub}>{eventSubtitle}</Text> : null}
        </View>
      ) : (
        <View style={styles.warnCard}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.warningText} />
          <Text style={styles.warnText}>Open Invite from a match or competition to attach this event.</Text>
        </View>
      )}

      <Text style={styles.section}>Quick share</Text>
      <View style={styles.quickRow}>
        <Pressable
          style={[styles.quickBtn, shareBusy && styles.quickBtnOff]}
          onPress={onCopyShare}
          disabled={shareBusy || !eventId}
        >
          <Ionicons name="share-outline" size={18} color={COLORS.card} />
          <Text style={styles.quickBtnText}>{shareBusy ? "…" : "Share"}</Text>
        </Pressable>
        <Pressable
          style={[styles.quickBtnAlt, shareBusy && styles.quickBtnOff]}
          onPress={() => openChannel("whatsapp")}
          disabled={shareBusy || !eventId}
        >
          <Ionicons name="logo-whatsapp" size={18} color={COLORS.successText} />
        </Pressable>
        <Pressable
          style={[styles.quickBtnAlt, shareBusy && styles.quickBtnOff]}
          onPress={() => openChannel("sms")}
          disabled={shareBusy || !eventId}
        >
          <Ionicons name="chatbubble-outline" size={18} color={COLORS.text} />
        </Pressable>
        <Pressable
          style={[styles.quickBtnAlt, shareBusy && styles.quickBtnOff]}
          onPress={() => openChannel("mail")}
          disabled={shareBusy || !eventId}
        >
          <Ionicons name="mail-outline" size={18} color={COLORS.text} />
        </Pressable>
      </View>

      {eventId && invites.length > 0 ? (
        <>
          <Text style={styles.section}>Sent for this event ({invites.length})</Text>
          <FlatList
            data={invites.slice(0, 12)}
            keyExtractor={(i) => i.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.inviteRow}>
                <Text style={styles.inviteEmail} numberOfLines={1}>
                  {item.receiverEmail.startsWith("share.") ? "Link invite" : item.receiverEmail}
                </Text>
                <Text style={styles.inviteStatus}>{item.status}</Text>
              </View>
            )}
          />
        </>
      ) : null}

      <Text style={styles.section}>Invite from directory</Text>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search players by name or email"
        placeholderTextColor={COLORS.iconMuted}
        style={styles.searchInput}
      />

      <Pressable
        style={[styles.sendBtn, (sending || selectedEmails.length === 0 || !eventId) && { opacity: 0.6 }]}
        onPress={sendInvites}
        disabled={sending || selectedEmails.length === 0 || !eventId}
      >
        <Text style={styles.sendBtnText}>
          {sending ? "Sending…" : `Send invites (${selectedEmails.length})`}
        </Text>
      </Pressable>

      <FlatList
        data={filteredUsers}
        keyExtractor={(u) => u.id}
        style={{ marginTop: 10 }}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item }) => {
          const checked = !!selected[item.email];
          const dist = formatDistanceAway(item.distanceKm);
          return (
            <Pressable style={[styles.rowCard, checked && styles.rowCardSelected]} onPress={() => toggle(item.email)}>
              <Text style={styles.userName}>{item.fullName || item.email.split("@")[0]}</Text>
              <Text style={styles.userMeta}>{item.email}</Text>
              <View style={styles.inviteSkillWrap}>
                <PadelLevelRow skillLevel={item.skillLevel} fallbackLabel={item.skillLabel} compact />
              </View>
              <Text style={styles.inviteMetaLine}>
                ELO {item.eloRating ?? 1000}
                {dist ? ` · ${dist}` : ""}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>No players available to invite.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 2, marginBottom: 12, color: COLORS.textMuted },
  hero: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 12,
  },
  heroTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  heroSub: { marginTop: 4, color: COLORS.textMuted, fontSize: 13 },
  warnCard: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: COLORS.warningSoft,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  warnText: { flex: 1, color: COLORS.warningText, fontSize: 13 },
  section: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 8, marginTop: 4 },
  quickRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  quickBtnText: { color: COLORS.card, fontWeight: "800" },
  quickBtnAlt: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
  },
  quickBtnOff: { opacity: 0.55 },
  inviteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMuted,
  },
  inviteEmail: { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: "600", marginRight: 8 },
  inviteStatus: { color: COLORS.textMuted, fontSize: 12, textTransform: "capitalize" },
  searchInput: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
  },
  sendBtn: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  sendBtnText: { color: COLORS.card, fontWeight: "700" },
  rowCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
  },
  rowCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  userName: { color: COLORS.text, fontWeight: "700", fontSize: 14 },
  userMeta: { color: COLORS.textMuted, marginTop: 2, fontSize: 12 },
  inviteSkillWrap: { marginTop: 8, alignSelf: "flex-start" },
  inviteMetaLine: { marginTop: 6, fontSize: 12, color: COLORS.textSubtle, fontWeight: "600" },
  emptyText: { textAlign: "center", color: COLORS.textMuted, marginTop: 20 },
});
