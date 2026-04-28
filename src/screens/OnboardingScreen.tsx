import React from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { SkeletonBlock } from "../components/Skeleton";

const USER_EMAIL = "demo@padelme.app";

function OnboardingSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBlock height={28} width="52%" rounded={8} />
      <View style={{ height: 10 }} />
      <SkeletonBlock height={14} width="70%" rounded={8} />
      <View style={{ height: 14 }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={{ marginBottom: 10 }}>
          <SkeletonBlock height={12} width="28%" />
          <View style={{ height: 6 }} />
          <SkeletonBlock height={42} width="100%" rounded={12} />
        </View>
      ))}
      <SkeletonBlock height={44} width="100%" rounded={12} />
    </View>
  );
}

export function OnboardingScreen({ navigation }: { navigation: any }) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [skillLabel, setSkillLabel] = React.useState("intermediate");
  const [bio, setBio] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    api
      .get<{ fullName?: string | null; location?: string | null; skillLabel?: string | null; bio?: string | null }>(
        `/users/me?email=${encodeURIComponent(USER_EMAIL)}`,
      )
      .then((u) => {
        if (!mounted) return;
        setFullName(u.fullName || "");
        setLocation(u.location || "");
        setSkillLabel(u.skillLabel || "intermediate");
        setBio(u.bio || "");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const complete = async () => {
    try {
      setSaving(true);
      await api.patch("/users/me", {
        email: USER_EMAIL,
        fullName,
        location,
        skillLabel,
        bio,
      });
      navigation.replace("MainTabs");
    } catch {
      Alert.alert("Error", "Could not save onboarding details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <OnboardingSkeleton />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to PadelMe</Text>
      <Text style={styles.subtitle}>Complete your profile to start matching</Text>

      <Field label="Full Name" value={fullName} onChangeText={setFullName} />
      <Field label="Location" value={location} onChangeText={setLocation} />
      <Field label="Skill Label" value={skillLabel} onChangeText={setSkillLabel} />
      <Field label="Bio" value={bio} onChangeText={setBio} />

      <Pressable style={[styles.cta, saving && { opacity: 0.65 }]} onPress={complete} disabled={saving}>
        <Text style={styles.ctaText}>{saving ? "Saving..." : "Complete Setup"}</Text>
      </Pressable>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800", color: "#0f172a" },
  subtitle: { marginTop: 2, marginBottom: 12, color: "#64748b" },
  fieldLabel: { marginBottom: 6, color: "#334155", fontSize: 12, fontWeight: "600" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0f172a",
  },
  cta: {
    marginTop: 8,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

