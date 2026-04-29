import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { UserDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";

function EditProfileSkeleton() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SkeletonBlock height={28} width="50%" rounded={8} />
      <View style={{ height: 16 }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={{ marginBottom: 12 }}>
          <SkeletonBlock height={12} width="24%" rounded={6} />
          <View style={{ height: 6 }} />
          <SkeletonBlock height={42} width="100%" rounded={12} />
        </View>
      ))}
      <View style={{ height: 10 }} />
      <SkeletonBlock height={44} width="100%" rounded={12} />
    </ScrollView>
  );
}

export function EditProfileScreen() {
  const USER_EMAIL = getCurrentUserEmail();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [skillLabel, setSkillLabel] = React.useState("intermediate");

  React.useEffect(() => {
    let mounted = true;
    api
      .get<UserDto>(`/users/me?email=${encodeURIComponent(USER_EMAIL)}`)
      .then((u) => {
        if (!mounted) return;
        setFullName(u.fullName || "");
        setLocation(u.location || "");
        setBio("");
        setSkillLabel(u.skillLabel || "intermediate");
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [USER_EMAIL]);

  const onSave = async () => {
    try {
      setSaving(true);
      await api.patch("/users/me", {
        email: USER_EMAIL,
        fullName,
        location,
        bio,
        skillLabel,
      });
      Alert.alert("Saved", "Profile updated");
    } catch {
      Alert.alert("Error", "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <EditProfileSkeleton />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Edit Profile</Text>
      <Text style={styles.subtitle}>Update your player details</Text>

      <Field label="Full Name" value={fullName} onChangeText={setFullName} />
      <Field label="Location" value={location} onChangeText={setLocation} />
      <Field label="Skill (beginner/intermediate/advanced)" value={skillLabel} onChangeText={setSkillLabel} />
      <Field label="Bio" value={bio} onChangeText={setBio} multiline />

      <Pressable style={[styles.saveBtn, saving && { opacity: 0.65 }]} onPress={onSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Profile"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, multiline && { minHeight: 90, textAlignVertical: "top" }]}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 120 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 2, marginBottom: 12, color: COLORS.textMuted },
  fieldLabel: { marginBottom: 6, color: COLORS.textSubtle, fontSize: 12, fontWeight: "600" },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
  },
  saveBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  saveBtnText: { color: COLORS.card, fontWeight: "700", fontSize: 14 },
});

