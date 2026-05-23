import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { api } from "../lib/api";
import { SkeletonBlock } from "../components/Skeleton";
import { useSnackbar } from "../components/Snackbar";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";
import { androidChipText, CHIP_PAD_V_SM } from "../theme/chipAndroid";
import Ionicons from "react-native-vector-icons/Ionicons";

const PICK_OPTIONS = {
  mediaType: "photo" as const,
  includeBase64: true,
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.5,
  selectionLimit: 1,
};

const CAMERA_OPTIONS = {
  mediaType: "photo" as const,
  includeBase64: true,
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.5,
};

/** Data URLs can get large; keep under typical Postgres driver limits. */
const MAX_DATA_URL_LENGTH = 1_200_000;

function VerificationSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBlock height={20} width="42%" rounded={8} />
      <View style={{ height: 8 }} />
      <SkeletonBlock height={12} width="70%" rounded={8} />
      <View style={{ height: 12 }} />
      <View style={styles.card}>
        <SkeletonBlock height={12} width="35%" />
        <View style={{ height: 8 }} />
        <SkeletonBlock height={38} width="100%" rounded={10} />
        <View style={{ height: 10 }} />
        <SkeletonBlock height={12} width="35%" />
        <View style={{ height: 8 }} />
        <SkeletonBlock height={38} width="100%" rounded={10} />
      </View>
    </View>
  );
}

function PhotoPickRow({
  label,
  sublabel,
  uri,
  busy,
  onCamera,
  onLibrary,
}: {
  label: string;
  sublabel: string;
  uri: string;
  busy: boolean;
  onCamera: () => void;
  onLibrary: () => void;
}) {
  const hasPhoto = Boolean(uri?.trim());

  return (
    <View style={styles.pickRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldHint}>{sublabel}</Text>
      <View style={styles.pickRowInner}>
        <View style={styles.thumb}>
          {busy ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : hasPhoto ? (
            <Image source={{ uri }} style={styles.thumbImage} />
          ) : (
            <Ionicons name="image-outline" size={22} color={COLORS.iconMuted} />
          )}
        </View>
        <View style={styles.pickActions}>
          <Pressable
            style={[styles.pickBtn, busy && styles.pickBtnDisabled]}
            onPress={onCamera}
            disabled={busy}
          >
            <Ionicons name="camera-outline" size={16} color={COLORS.text} />
            <Text style={styles.pickBtnText}>Camera</Text>
          </Pressable>
          <Pressable
            style={[styles.pickBtn, busy && styles.pickBtnDisabled]}
            onPress={onLibrary}
            disabled={busy}
          >
            <Ionicons name="images-outline" size={16} color={COLORS.text} />
            <Text style={styles.pickBtnText}>Photos</Text>
          </Pressable>
        </View>
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
  const [profilePhotoUri, setProfilePhotoUri] = React.useState<string | null>(null);
  const [idPhotoUrl, setIdPhotoUrl] = React.useState("");
  const [selfieUrl, setSelfieUrl] = React.useState("");
  const [showIdForm, setShowIdForm] = React.useState(false);
  const [pickingSlot, setPickingSlot] = React.useState<null | "id" | "selfie">(null);
  const [isAdmin, setIsAdmin] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const [verifyRes, me] = await Promise.all([
        api.get<{ status: string; idPhotoUrl?: string | null; selfieUrl?: string | null }>(
          `/verification/status?email=${encodeURIComponent(USER_EMAIL)}`,
        ),
        api.get<{
          fullName?: string | null;
          idVerified?: boolean;
          photoVerified?: boolean;
          photoUrl?: string | null;
          role?: string;
        }>(`/users/me?email=${encodeURIComponent(USER_EMAIL)}`),
      ]);
      setStatus(verifyRes.status || "not_submitted");
      setIdPhotoUrl(verifyRes.idPhotoUrl || "");
      setSelfieUrl(verifyRes.selfieUrl || "");
      setIsAdmin(me.role === "admin");
      setFullName(me.fullName || USER_EMAIL.split("@")[0] || "Player");
      setProfilePhotoUri(me.photoUrl?.trim() ? me.photoUrl : null);
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

  const pickForSlot = async (slot: "id" | "selfie", source: "camera" | "library") => {
    if (pickingSlot) return;
    setPickingSlot(slot);
    try {
      const launcher = source === "camera" ? launchCamera : launchImageLibrary;
      const opts = source === "camera" ? CAMERA_OPTIONS : PICK_OPTIONS;
      const result = await launcher(opts);
      if (result.didCancel) return;
      const asset = result.assets?.[0];
      if (!asset?.base64) {
        showSnackbar("Could not read this image. Try another photo.", { type: "error" });
        return;
      }
      const mime = asset.type || "image/jpeg";
      const dataUrl = `data:${mime};base64,${asset.base64}`;
      if (dataUrl.length > MAX_DATA_URL_LENGTH) {
        showSnackbar("Image is too large. Try a closer photo or slightly darker scene.", {
          type: "error",
        });
        return;
      }
      if (slot === "id") setIdPhotoUrl(dataUrl);
      else setSelfieUrl(dataUrl);
    } catch {
      showSnackbar("Could not access camera or photos.", { type: "error" });
    } finally {
      setPickingSlot(null);
    }
  };

  const submit = async () => {
    if (!idPhotoUrl.trim() || !selfieUrl.trim()) {
      showSnackbar("Add both ID photo and selfie before submitting.", { type: "error" });
      return;
    }
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
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Verification</Text>
      <Text style={styles.subtitle}>Build trust with other players</Text>

      <View style={styles.profileCard}>
        {profilePhotoUri ? (
          <Image source={{ uri: profilePhotoUri }} style={styles.profileAvatarImg} />
        ) : (
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials(fullName)}</Text>
          </View>
        )}
        <View style={styles.flexOne}>
          <Text style={styles.profileName} numberOfLines={1}>
            {fullName}
          </Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>
              {idVerified || photoVerified ? "Verified" : "Unverified"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.levelIconBgGreen}>
          <Ionicons name="camera-outline" size={18} color="#16A34A" />
        </View>
        <View style={styles.flexOne}>
          <Text style={styles.cardTitle}>Level 1 · Photo verified</Text>
          <Text style={styles.cardBody}>Add a profile photo for a green badge.</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("EditProfile")}>
            <Text style={styles.secondaryBtnText}>{photoVerified ? "Update photo" : "Upload photo"}</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.levelIconBgBlue}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#2563EB" />
        </View>
        <View style={styles.flexOne}>
          <Text style={styles.cardTitle}>Level 2 · ID verified</Text>
          <Text style={styles.cardBody}>
            Photograph your government ID and a live selfie. An admin reviews before the blue tick is
            granted.
          </Text>
          <Pressable style={styles.secondaryBtn} onPress={() => setShowIdForm((s) => !s)}>
            <Text style={styles.secondaryBtnText}>{idVerified ? "Re-submit ID" : "Submit ID"}</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
          </Pressable>

          {showIdForm ? (
            <View style={styles.idFormWrap}>
              <PhotoPickRow
                label="Government ID"
                sublabel="Legible photo of ID card or passport (not a link)."
                uri={idPhotoUrl}
                busy={pickingSlot === "id"}
                onCamera={() => pickForSlot("id", "camera")}
                onLibrary={() => pickForSlot("id", "library")}
              />
              <PhotoPickRow
                label="Selfie"
                sublabel="Your face, good lighting — we match it to your ID."
                uri={selfieUrl}
                busy={pickingSlot === "selfie"}
                onCamera={() => pickForSlot("selfie", "camera")}
                onLibrary={() => pickForSlot("selfie", "library")}
              />
              <Pressable
                style={[styles.btn, (submitting || pickingSlot !== null) && styles.btnDisabled]}
                onPress={submit}
                disabled={submitting || pickingSlot !== null}
              >
                <Text style={styles.btnText}>
                  {submitting ? "Submitting…" : "Submit for review"}
                </Text>
              </Pressable>
              <Text style={styles.helperText}>Status: {prettyStatus(status)}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.whyCard}>
        <Text style={styles.whyTitle}>Why verify?</Text>
        <Text style={styles.whyItem}>✓ Verified players surface first in discovery</Text>
        <Text style={styles.whyItem}>✓ Some leagues require ID verification</Text>
        <Text style={styles.whyItem}>✓ Green badge = profile photo</Text>
        <Text style={styles.whyItem}>✓ Blue tick = ID approved by admin</Text>
        <Text style={styles.whyNote}>
          Images are sent securely for review only. No URLs or file links to paste.
        </Text>
      </View>

      {isAdmin ? (
        <View style={styles.adminLinks}>
          <Pressable style={styles.adminLinkBtn} onPress={() => navigation.navigate("AdminIDReview")}>
            <Text style={styles.adminLinkText}>Admin ID Review</Text>
          </Pressable>
          <Pressable style={styles.adminLinkBtn} onPress={() => navigation.navigate("AdminTestMode")}>
            <Text style={styles.adminLinkText}>Admin Test Mode</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
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
  scroll: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 },
  title: { fontSize: 22, fontWeight: "700", color: COLORS.text },
  subtitle: { marginTop: 4, marginBottom: 12, color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primarySoftAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarImg: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.borderMuted },
  profileAvatarText: { color: COLORS.primaryDark, fontWeight: "800", fontSize: 16 },
  profileName: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  statusPill: {
    alignSelf: "flex-start",
    marginTop: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgMuted,
    paddingHorizontal: 10,
    paddingVertical: CHIP_PAD_V_SM,
  },
  statusPillText: { color: COLORS.textMuted, fontWeight: "600", fontSize: 11, ...androidChipText(11) },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    gap: 10,
  },
  levelIconBgGreen: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  levelIconBgBlue: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  flexOne: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, color: COLORS.text, fontWeight: "700" },
  cardBody: { marginTop: 4, marginBottom: 8, color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  secondaryBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  secondaryBtnText: { color: COLORS.text, fontSize: 13, fontWeight: "600" },
  idFormWrap: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  fieldLabel: { color: COLORS.text, fontSize: 12, fontWeight: "700" },
  fieldHint: { marginTop: 2, marginBottom: 8, color: COLORS.textMuted, fontSize: 11, lineHeight: 15 },
  pickRow: { marginBottom: 12 },
  pickRowInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    backgroundColor: COLORS.bgMuted,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: { width: "100%", height: "100%" },
  pickActions: { flex: 1, flexDirection: "row", gap: 8 },
  pickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgMuted,
  },
  pickBtnDisabled: { opacity: 0.55 },
  pickBtnText: { fontSize: 12, fontWeight: "600", color: COLORS.text },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.65 },
  btnText: { color: COLORS.card, fontWeight: "700", fontSize: 14 },
  helperText: { marginTop: 8, color: COLORS.textMuted, fontSize: 11 },
  whyCard: {
    backgroundColor: COLORS.bgMuted,
    borderRadius: 16,
    padding: 12,
    marginTop: 4,
  },
  whyTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  whyItem: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
  whyNote: { marginTop: 8, color: COLORS.textMuted, fontSize: 11, lineHeight: 16 },
  adminLinks: { marginTop: 12, gap: 6 },
  adminLinkBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  adminLinkText: { color: COLORS.primaryDark, fontWeight: "600", fontSize: 11 },
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
});
