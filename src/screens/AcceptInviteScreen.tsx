import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { api } from "../lib/api";
import { SkeletonBlock } from "../components/Skeleton";
import { useSnackbar } from "../components/Snackbar";
import { getCurrentUserEmail, useAuth } from "../store";
import { COLORS } from "../theme/colors";
import { androidChipText, CHIP_PAD_V } from "../theme/chipAndroid";
import type { RootStackParamList } from "../navigation/types";
import { pendingPostAuthInviteToken } from "../navigation/pendingPostAuthInvite";

type InviteByToken = {
  id: string;
  token: string;
  status: string;
  senderEmail: string;
  receiverEmail: string;
  eventId?: string | null;
  expiresAt?: string | null;
  eventSummary?: {
    kind: "match" | "competition";
    id: string;
    title: string;
    subtitle?: string;
  } | null;
  alreadyAccepted?: boolean;
};

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

export function AcceptInviteScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showSnackbar } = useSnackbar();
  const { isAuthenticated } = useAuth();
  const USER_EMAIL = getCurrentUserEmail();
  const paramToken = (route.params as { token?: string } | undefined)?.token || "";

  const [loading, setLoading] = React.useState(false);
  const [token, setToken] = React.useState(paramToken);
  const [invite, setInvite] = React.useState<InviteByToken | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (paramToken) setToken(paramToken);
  }, [paramToken]);

  const fetchInvite = React.useCallback(async () => {
    const t = token.trim();
    if (!t) {
      setInvite(null);
      setLoadError(null);
      return;
    }
    try {
      setLoading(true);
      setLoadError(null);
      const data = await api.get<InviteByToken>(`/invites/by-token/${encodeURIComponent(t)}`);
      setInvite(data);
    } catch {
      setInvite(null);
      setLoadError("Invite not found or invalid token.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    const t = token.trim();
    if (!t) return;
    const handle = setTimeout(() => {
      fetchInvite().catch(() => {});
    }, 400);
    return () => clearTimeout(handle);
  }, [token, fetchInvite]);

  const accept = async () => {
    if (!token.trim()) return;
    if (!isAuthenticated || !USER_EMAIL) {
      showSnackbar("Sign in to accept this invite.", { type: "info" });
      pendingPostAuthInviteToken.current = token.trim();
      navigation.navigate("Login");
      return;
    }
    try {
      setBusy(true);
      const res = await api.post<InviteByToken>("/invites/accept", {
        token: token.trim(),
        email: USER_EMAIL,
      });
      showSnackbar(res.alreadyAccepted ? "Already accepted." : "You're in!", { type: "success" });
      const summary = res.eventSummary ?? invite?.eventSummary;
      if (summary?.kind === "match") {
        navigation.replace("MatchDetail", { id: summary.id });
      } else if (summary?.kind === "competition") {
        navigation.replace("CompetitionDetail", { id: summary.id });
      } else if (res.eventId) {
        navigation.replace("MatchDetail", { id: res.eventId });
      } else {
        navigation.navigate("MainTabs");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("410")) showSnackbar("Invite expired.", { type: "error" });
      else if (msg.includes("409")) showSnackbar("Invite no longer available.", { type: "error" });
      else showSnackbar("Could not accept invite.", { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    if (!token.trim()) return;
    if (!isAuthenticated || !USER_EMAIL) {
      showSnackbar("Sign in to decline this invite.", { type: "info" });
      pendingPostAuthInviteToken.current = token.trim();
      navigation.navigate("Login");
      return;
    }
    try {
      setBusy(true);
      await api.post("/invites/decline", { token: token.trim(), email: USER_EMAIL });
      showSnackbar("Invite declined.", { type: "info" });
      setInvite((prev) => (prev ? { ...prev, status: "declined" } : prev));
    } catch {
      showSnackbar("Could not decline invite.", { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const expired =
    invite?.status === "expired" ||
    (invite?.expiresAt && new Date(invite.expiresAt) < new Date() && invite.status !== "accepted");

  const canRespond =
    invite &&
    !expired &&
    invite.status !== "accepted" &&
    invite.status !== "declined" &&
    isAuthenticated &&
    Boolean(USER_EMAIL);

  const showGuestHint = Boolean(invite) && !isAuthenticated;

  if (loading && token.trim()) return <AcceptInviteSkeleton />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Accept invite</Text>
      <Text style={styles.subtitle}>Join a match or competition from a link or token.</Text>

      {showGuestHint ? (
        <View style={styles.guestBanner}>
          <Ionicons name="log-in-outline" size={18} color={COLORS.infoText} />
          <Text style={styles.guestBannerText}>Sign in to accept or decline this invite.</Text>
          <Pressable
            style={styles.guestBannerBtn}
            onPress={() => {
              pendingPostAuthInviteToken.current = token.trim();
              navigation.navigate("Login");
            }}
          >
            <Text style={styles.guestBannerBtnText}>Sign in</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Invite token</Text>
        <TextInput
          value={token}
          onChangeText={setToken}
          placeholder="Paste token from link"
          placeholderTextColor={COLORS.iconMuted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable style={styles.linkHint} onPress={fetchInvite} disabled={!token.trim()}>
          <Ionicons name="refresh-outline" size={16} color={COLORS.primary} />
          <Text style={styles.linkHintText}>Load invite</Text>
        </Pressable>

        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        {invite ? (
          <View style={styles.preview}>
            <Text style={styles.previewLabel}>From</Text>
            <Text style={styles.previewValue}>{invite.senderEmail}</Text>
            {invite.eventSummary ? (
              <>
                <Text style={styles.previewLabel}>Event</Text>
                <Text style={styles.previewTitle}>{invite.eventSummary.title}</Text>
                {invite.eventSummary.subtitle ? (
                  <Text style={styles.previewSub}>{invite.eventSummary.subtitle}</Text>
                ) : null}
                <View style={styles.typeRow}>
                  <View style={styles.typePill}>
                    <Text style={styles.typePillText}>
                      {invite.eventSummary.kind === "match" ? "Match" : "Competition"}
                    </Text>
                  </View>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{invite.status}</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.previewSub}>No linked event — invite only.</Text>
            )}
            {expired ? <Text style={styles.errorText}>This invite has expired.</Text> : null}
          </View>
        ) : null}

        <View style={styles.row}>
          <Pressable
            style={[styles.btnPrimary, (!canRespond || busy) && styles.btnDisabled]}
            onPress={accept}
            disabled={!canRespond || busy}
          >
            <Text style={styles.btnPrimaryText}>{busy ? "Working…" : "Accept"}</Text>
          </Pressable>
          <Pressable
            style={[styles.btnGhost, (!canRespond || busy) && styles.btnDisabled]}
            onPress={decline}
            disabled={!canRespond || busy}
          >
            <Text style={styles.btnGhostText}>Decline</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 2, marginBottom: 12, color: COLORS.textMuted },
  card: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  fieldLabel: { marginBottom: 6, color: COLORS.textSubtle, fontSize: 12, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
  },
  linkHint: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  linkHintText: { color: COLORS.primary, fontWeight: "700", fontSize: 13 },
  errorText: { marginTop: 10, color: COLORS.dangerText, fontSize: 13 },
  preview: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.borderMuted },
  previewLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textSubtle, textTransform: "uppercase" },
  previewValue: { marginTop: 2, color: COLORS.text, fontWeight: "600" },
  previewTitle: { marginTop: 8, fontSize: 17, fontWeight: "800", color: COLORS.text },
  previewSub: { marginTop: 4, color: COLORS.textMuted, fontSize: 13 },
  typeRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  typePill: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: CHIP_PAD_V,
    borderRadius: 8,
  },
  typePillText: {
    color: COLORS.primaryDark,
    fontWeight: "700",
    fontSize: 12,
    ...androidChipText(12),
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: CHIP_PAD_V,
    borderRadius: 8,
  },
  statusPillText: {
    color: COLORS.textMuted,
    fontWeight: "700",
    fontSize: 12,
    textTransform: "capitalize",
    ...androidChipText(12),
  },
  row: { flexDirection: "row", gap: 10, marginTop: 16 },
  btnPrimary: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  btnPrimaryText: { color: COLORS.card, fontWeight: "700" },
  btnGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  btnGhostText: { color: COLORS.text, fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },
  guestBanner: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.infoSoft,
    borderWidth: 1,
    borderColor: COLORS.infoBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  guestBannerText: { flex: 1, minWidth: 120, color: COLORS.infoText, fontSize: 13, fontWeight: "600" },
  guestBannerBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  guestBannerBtnText: { color: COLORS.card, fontWeight: "800", fontSize: 13 },
});
