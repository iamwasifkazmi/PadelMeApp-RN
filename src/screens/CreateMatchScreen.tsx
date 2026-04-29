import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { MatchDto } from "../lib/types";
import { COLORS } from "../theme/colors";

const USER_EMAIL = "demo@padelme.app";

export function CreateMatchScreen({ navigation, route }: { navigation: any; route?: any }) {
  const recurring = Boolean(route?.params?.recurring);
  const [title, setTitle] = React.useState(recurring ? "Recurring Padel Series" : "Evening Padel Doubles");
  const [date, setDate] = React.useState("2026-05-05");
  const [time, setTime] = React.useState("19:30");
  const [location, setLocation] = React.useState("Padel Club Downtown");
  const [submitting, setSubmitting] = React.useState(false);

  const onCreate = async () => {
    try {
      setSubmitting(true);
      const created = await api.post<MatchDto>("/matches", {
        title,
        date,
        timeLabel: time,
        locationName: location,
        maxPlayers: 4,
        createdByEmail: USER_EMAIL,
      });
      navigation.replace("MatchDetail", { id: created.id });
    } catch {
      Alert.alert("Error", "Failed to create match");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Match</Text>
      <Text style={styles.subtitle}>
        {recurring ? "Recurring setup - weekly or repeating series" : "Set up your game like Base44 flow"}
      </Text>

      <Field label="Title" value={title} onChangeText={setTitle} />
      <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <Field label="Time (HH:mm)" value={time} onChangeText={setTime} />
      <Field label="Location" value={location} onChangeText={setLocation} />

      <Pressable
        style={[styles.button, submitting && { opacity: 0.65 }]}
        onPress={onCreate}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>{submitting ? "Creating..." : "Create Match"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 2, marginBottom: 14, color: COLORS.textMuted },
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
  button: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  buttonText: { color: COLORS.card, fontWeight: "700", fontSize: 14 },
});

