import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { SkeletonBlock } from "../components/Skeleton";
import { useSnackbar } from "../components/Snackbar";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";
import Ionicons from "react-native-vector-icons/Ionicons";

function VerificationSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBlock height={28} width="48%" rounded={8} />
      <View style={{ height: 10 }} />
      <SkeletonBlock height={14} width="76%" rounded={8} />
      <View style={{ height: 14 }} />
      <View style={styles.card}>
        <SkeletonBlock height={14} width="35%" />
        <View style={{ height: 8 }} />
        <SkeletonBlock height={42} width="100%" rounded={10} />
        <View style={{ height: 12 }} />
        <SkeletonBlock height={14} width="35%" />
        <View style={{ height: 8 }} />
        <SkeletonBlock height={42} width="100%" rounded={10} />
        <View style={{ height: 12 }} />
        <SkeletonBlock height={44} width="100%" rounded={12} />
      </View>
    </View>
  );
}

export function VerificationScreen({ navigation }: { navigation: any }) {
  const { showSnackbar } = useSnackbar();
  const USER_EMAIL = getCurrentUserEmail();
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState<string>("not_submitted");
  const [idVerified, setIdVerified] = React.useState(false);
  const [photoVerified, setPhotoVerified] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [idPhotoUrl, setIdPhotoUrl] = React.useState("");
  const [selfieUrl, setSelfieUrl] = React.useState("");
  const [showIdForm, setShowIdForm] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const [verifyRes, me] = await Promise.all([
        api.get<{ status: string; idPhotoUrl?: string | null; selfieUrl?: string | null }>(
          `/verification/status?email=${encodeURIComponent(USER_EMAIL)}`,
        ),
        api.get<{ fullName?: string | null; idVerified?: boolean; photoVerified?: boolean }>(
          `/users/me?email=${encodeURIComponent(USER_EMAIL)}`,
        ),
      ]);
      setStatus(verifyRes.status || "not_submitted");
      setIdPhotoUrl(verifyRes.idPhotoUrl || "");
      setSelfieUrl(verifyRes.selfieUrl || "");
      setFullName(me.fullName || USER_EMAIL.split("@")[0] || "Player");
      setIdVerified(Boolean(me.idVerified));
      setPhotoVerified(Boolean(me.photoVerified));
    } catch {
      setStatus("not_submitted");
    } finally {
      setLoading(false);
    }
  }, [USER_EMAIL]);

  React.useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    try {
      setSubmitting(true);
      const res = await api.post<{ status: string }>("/verification/submit", {
        email: USER_EMAIL,
        idPhotoUrl,
        selfieUrl,
      });
      setStatus(res.status || "pending");
      showSnackbar("Your verification is now pending review.", { type: "success" });
    } catch {
      showSnackbar("Could not submit verification.", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <VerificationSkeleton />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verification</Text>
      <Text style={styles.subtitle}>Build trust with other players</Text>

      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{initials(fullName)}</Text>
        </View>
        <View style={styles.flexOne}>
          <Text style={styles.profileName}>{fullName}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{idVerified || photoVerified ? "Verified" : "Unverified"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.levelIconBgGreen}>
          <Ionicons name="camera-outline" size={20} color="#16A34A" />
        </View>
        <View style={styles.flexOne}>
          <Text style={styles.cardTitle}>Level 1 · Photo Verified</Text>
          <Text style={styles.cardBody}>Upload a profile photo to get a green badge</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("EditProfile")}>
            <Text style={styles.secondaryBtnText}>{photoVerified ? "Update Photo" : "Upload Photo"}</Text>
            <Ionicons name="chevron-forward" size={15} color={COLORS.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.levelIconBgBlue}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#2563EB" />
        </View>
        <View style={styles.flexOne}>
          <Text style={styles.cardTitle}>Level 2 · ID Verified (Blue Tick)</Text>
          <Text style={styles.cardBody}>Submit a government ID for admin review. Unlocks priority matchmaking.</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => setShowIdForm((s) => !s)}>
            <Text style={styles.secondaryBtnText}>{idVerified ? "Re-submit ID" : "Submit ID"}</Text>
            <Ionicons name="chevron-forward" size={15} color={COLORS.text} />
          </Pressable>

          {showIdForm ? (
            <View style={styles.idFormWrap}>
              <Text style={styles.fieldLabel}>ID Photo URL</Text>
              <TextInput
                value={idPhotoUrl}
                onChangeText={setIdPhotoUrl}
                placeholder="https://..."
                placeholderTextColor={COLORS.iconMuted}
                style={styles.input}
              />
              <Text style={styles.fieldLabel}>Selfie URL</Text>
              <TextInput
                value={selfieUrl}
                onChangeText={setSelfieUrl}
                placeholder="https://..."
                placeholderTextColor={COLORS.iconMuted}
                style={styles.input}
              />
              <Pressable
                style={[styles.btn, submitting && { opacity: 0.65 }]}
                onPress={submit}
                disabled={submitting}
              >
                <Text style={styles.btnText}>
                  {submitting ? "Submitting..." : "Submit for Review"}
                </Text>
              </Pressable>
              <Text style={styles.helperText}>Current status: {prettyStatus(status)}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.whyCard}>
        <Text style={styles.whyTitle}>Why verify?</Text>
        <Text style={styles.whyItem}>✓ Verified players are shown first in match discovery</Text>
        <Text style={styles.whyItem}>✓ Some leagues & tournaments require ID verification</Text>
        <Text style={styles.whyItem}>✓ Green badge = profile photo uploaded</Text>
        <Text style={styles.whyItem}>✓ Blue tick = government ID approved by admin</Text>
        <Text style={styles.whyNote}>
          Your ID documents are stored securely and only reviewed by admins.
        </Text>
      </View>

      <View style={styles.adminLinks}>
        <Pressable style={styles.adminLinkBtn} onPress={() => navigation.navigate("AdminIDReview")}>
          <Text style={styles.adminLinkText}>Open Admin ID Review</Text>
        </Pressable>
        <Pressable style={styles.adminLinkBtn} onPress={() => navigation.navigate("AdminTestMode")}>
          <Text style={styles.adminLinkText}>Open Admin Test Mode</Text>
        </Pressable>
      </View>
    </View>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function prettyStatus(status: string) {
  if (!status) return "Not submitted";
  return status.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 34, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 2, marginBottom: 14, color: COLORS.textMuted, fontSize: 14 },
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primarySoftAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: { color: COLORS.primaryDark, fontWeight: "800", fontSize: 24 },
  profileName: { fontSize: 30, fontWeight: "700", color: COLORS.text },
  statusPill: {
    alignSelf: "flex-start",
    marginTop: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgMuted,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  statusPillText: { color: COLORS.textMuted, fontWeight: "700", fontSize: 12 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    gap: 12,
  },
  levelIconBgGreen: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  levelIconBgBlue: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  flexOne: { flex: 1 },
  cardTitle: { fontSize: 20, color: COLORS.text, fontWeight: "700" },
  cardBody: { marginTop: 4, marginBottom: 10, color: COLORS.textMuted, fontSize: 15, lineHeight: 21 },
  secondaryBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secondaryBtnText: { color: COLORS.text, fontSize: 16, fontWeight: "700" },
  idFormWrap: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  fieldLabel: { marginBottom: 6, color: COLORS.textSubtle, fontSize: 12, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    marginBottom: 10,
  },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 12, marginTop: 2 },
  btnText: { color: COLORS.card, fontWeight: "700" },
  helperText: { marginTop: 8, color: COLORS.textMuted, fontSize: 12, textTransform: "capitalize" },
  whyCard: {
    backgroundColor: COLORS.bgMuted,
    borderRadius: 24,
    padding: 16,
    marginTop: 6,
  },
  whyTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: 8 },
  whyItem: { color: COLORS.textMuted, fontSize: 15, lineHeight: 24 },
  whyNote: { marginTop: 8, color: COLORS.textMuted, fontSize: 14, lineHeight: 21 },
  adminLinks: { marginTop: 10, gap: 8 },
  adminLinkBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: "center",
  },
  adminLinkText: { color: COLORS.primaryDark, fontWeight: "700", fontSize: 12 },
});

