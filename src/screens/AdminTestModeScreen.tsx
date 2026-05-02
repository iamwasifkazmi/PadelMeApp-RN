import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";

type Summary = {
  open: number;
  inProgress: number;
  completed: number;
  users: number;
  pendingReviews: number;
};

export function AdminTestModeScreen({ navigation }: { navigation: any }) {
  const USER_EMAIL = getCurrentUserEmail();
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [count, setCount] = React.useState("3");

  const load = React.useCallback(async () => {
    try {
      const res = await api.get<Summary>("/admin/test/summary");
      setSummary(res);
    } catch {
      setSummary(null);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const createDummyMatches = async () => {
    try {
      setBusy(true);
      await api.post("/admin/test/create-dummy-matches", {
        hostEmail: USER_EMAIL,
        count: Number(count || 3),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Test Mode</Text>
      <Text style={styles.subtitle}>Create test data and quickly inspect admin queues</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>System Summary</Text>
        <Text style={styles.meta}>Open matches: {summary?.open ?? "—"}</Text>
        <Text style={styles.meta}>In progress matches: {summary?.inProgress ?? "—"}</Text>
        <Text style={styles.meta}>Completed matches: {summary?.completed ?? "—"}</Text>
        <Text style={styles.meta}>Users: {summary?.users ?? "—"}</Text>
        <Text style={styles.meta}>Pending ID reviews: {summary?.pendingReviews ?? "—"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create Dummy Matches</Text>
        <TextInput
          value={count}
          onChangeText={setCount}
          keyboardType="number-pad"
          placeholder="Count"
          placeholderTextColor={COLORS.iconMuted}
          style={styles.input}
        />
        <Pressable
          style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
          disabled={busy}
          onPress={createDummyMatches}
        >
          <Text style={styles.primaryBtnText}>{busy ? "Creating..." : "Create dummy matches"}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("AdminIDReview")}>
        <Text style={styles.secondaryBtnText}>Go to Admin ID Review</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 3, color: COLORS.textMuted, marginBottom: 10 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
  meta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  primaryBtnText: { color: COLORS.card, fontWeight: "700" },
  secondaryBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
  },
  secondaryBtnText: { color: COLORS.primaryDark, fontWeight: "700" },
});
