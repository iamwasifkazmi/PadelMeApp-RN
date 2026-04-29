import React from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { SkeletonBlock } from "../components/Skeleton";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";

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

export function VerificationScreen() {
  const USER_EMAIL = getCurrentUserEmail();
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState<string>("not_submitted");
  const [idPhotoUrl, setIdPhotoUrl] = React.useState("");
  const [selfieUrl, setSelfieUrl] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<{ status: string; idPhotoUrl?: string | null; selfieUrl?: string | null }>(
        `/verification/status?email=${encodeURIComponent(USER_EMAIL)}`,
      );
      setStatus(res.status || "not_submitted");
      setIdPhotoUrl(res.idPhotoUrl || "");
      setSelfieUrl(res.selfieUrl || "");
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
      Alert.alert("Submitted", "Your verification is now pending review.");
    } catch {
      Alert.alert("Error", "Could not submit verification.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <VerificationSkeleton />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verification</Text>
      <Text style={styles.subtitle}>Submit ID and selfie for account trust badge</Text>

      <View style={styles.card}>
        <Text style={styles.status}>Current status: {status}</Text>
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

        <Pressable style={[styles.btn, submitting && { opacity: 0.65 }]} onPress={submit} disabled={submitting}>
          <Text style={styles.btnText}>{submitting ? "Submitting..." : "Submit Verification"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 2, marginBottom: 12, color: COLORS.textMuted },
  card: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  status: { marginBottom: 10, color: COLORS.text, textTransform: "capitalize", fontWeight: "700" },
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
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  btnText: { color: COLORS.card, fontWeight: "700" },
});

