import React from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { SkeletonBlock } from "../components/Skeleton";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";

function AcceptInviteSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBlock height={28} width="50%" rounded={8} />
      <View style={{ height: 10 }} />
      <SkeletonBlock height={16} width="75%" rounded={8} />
      <View style={{ height: 16 }} />
      <View style={styles.card}>
        <SkeletonBlock height={14} width="35%" />
        <View style={{ height: 6 }} />
        <SkeletonBlock height={42} width="100%" rounded={12} />
        <View style={{ height: 12 }} />
        <SkeletonBlock height={44} width="100%" rounded={12} />
      </View>
    </View>
  );
}

export function AcceptInviteScreen({ route }: { route?: { params?: { token?: string } } }) {
  const USER_EMAIL = getCurrentUserEmail();
  const [loading] = React.useState(false);
  const [token, setToken] = React.useState(route?.params?.token || "");
  const [inviteState, setInviteState] = React.useState<string>("idle");
  const [busy, setBusy] = React.useState(false);

  const accept = async () => {
    if (!token.trim()) return;
    try {
      setBusy(true);
      const invite = await api.post<{ status: string }>("/invites/accept", {
        token: token.trim(),
        email: USER_EMAIL,
      });
      setInviteState(invite.status || "accepted");
    } catch {
      Alert.alert("Error", "Invite not found or expired");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AcceptInviteSkeleton />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accept Invite</Text>
      <Text style={styles.subtitle}>Join match or competition via invite token</Text>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Invite Token</Text>
        <TextInput
          value={token}
          onChangeText={setToken}
          placeholder="Paste invite token"
          placeholderTextColor={COLORS.iconMuted}
          style={styles.input}
        />

        <Pressable style={[styles.btn, busy && { opacity: 0.65 }]} onPress={accept} disabled={busy}>
          <Text style={styles.btnText}>{busy ? "Accepting..." : "Accept Invite"}</Text>
        </Pressable>

        {inviteState !== "idle" && (
          <Text style={styles.status}>Invite status: {inviteState}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 2, marginBottom: 12, color: COLORS.textMuted },
  card: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  fieldLabel: { marginBottom: 6, color: COLORS.textSubtle, fontSize: 12, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: COLORS.borderMuted, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text },
  btn: { marginTop: 12, backgroundColor: COLORS.primary, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  btnText: { color: COLORS.card, fontWeight: "700" },
  status: { marginTop: 10, color: COLORS.text, fontWeight: "600", textTransform: "capitalize" },
});

