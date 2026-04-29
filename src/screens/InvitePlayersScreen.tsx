import React from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../lib/api";
import { SkeletonBlock } from "../components/Skeleton";
import { useSnackbar } from "../components/Snackbar";
import { UserDto } from "../lib/types";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";

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

export function InvitePlayersScreen({ route }: { route: { params?: { eventId?: string } } }) {
  const { showSnackbar } = useSnackbar();
  const USER_EMAIL = getCurrentUserEmail();
  const eventId = route?.params?.eventId || "";
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [users, setUsers] = React.useState<UserDto[]>([]);
  const [invites, setInvites] = React.useState<InviteItem[]>([]);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const [usersResp, invitesResp] = await Promise.all([
        api.get<UserDto[]>("/users"),
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
    load();
  }, [load]);

  const filteredUsers = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const invitedSet = new Set(invites.map((i) => i.receiverEmail));
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

  const sendInvites = async () => {
    if (!eventId) {
      showSnackbar("Missing event id for invite flow.", { type: "error" });
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
      showSnackbar(`${selectedEmails.length} invite(s) created.`, { type: "success" });
    } catch {
      showSnackbar("Could not send invites.", { type: "error" });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <InvitePlayersSkeleton />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invite Players</Text>
      <Text style={styles.subtitle}>Select players to invite to this event</Text>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search players by name or email"
        placeholderTextColor={COLORS.iconMuted}
        style={styles.searchInput}
      />

      <Pressable
        style={[styles.sendBtn, (sending || selectedEmails.length === 0) && { opacity: 0.6 }]}
        onPress={sendInvites}
        disabled={sending || selectedEmails.length === 0}
      >
        <Text style={styles.sendBtnText}>
          {sending ? "Sending..." : `Send Invites (${selectedEmails.length})`}
        </Text>
      </Pressable>

      <FlatList
        data={filteredUsers}
        keyExtractor={(u) => u.id}
        style={{ marginTop: 10 }}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item }) => {
          const checked = !!selected[item.email];
          return (
            <Pressable style={[styles.rowCard, checked && styles.rowCardSelected]} onPress={() => toggle(item.email)}>
              <Text style={styles.userName}>{item.fullName || item.email.split("@")[0]}</Text>
              <Text style={styles.userMeta}>{item.email}</Text>
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
  emptyText: { textAlign: "center", color: COLORS.textMuted, marginTop: 20 },
});

