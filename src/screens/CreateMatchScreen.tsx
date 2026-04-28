import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { MatchDto } from "../lib/types";

const USER_EMAIL = "demo@padelme.app";

export function CreateMatchScreen({ navigation }: { navigation: any }) {
  const [title, setTitle] = React.useState("Evening Padel Doubles");
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
      <Text style={styles.subtitle}>Set up your game like Base44 flow</Text>

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
  container: { flex: 1, backgroundColor: "#edf9fd" },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "800", color: "#041521" },
  subtitle: { marginTop: 2, marginBottom: 14, color: "#4f6b7b" },
  fieldLabel: { marginBottom: 6, color: "#1a3a4a", fontSize: 12, fontWeight: "600" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c8e6ef",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#041521",
  },
  button: {
    marginTop: 8,
    backgroundColor: "#06b6d4",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

