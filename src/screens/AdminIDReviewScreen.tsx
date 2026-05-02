import React from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { COLORS } from "../theme/colors";

type VerificationItem = {
  id: string;
  userEmail: string;
  idPhotoUrl?: string | null;
  selfieUrl?: string | null;
  status: string;
  reviewNotes?: string | null;
  createdAt: string;
};

export function AdminIDReviewScreen() {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<VerificationItem[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<VerificationItem[]>(
        `/admin/id-verifications?status=${encodeURIComponent(statusFilter)}`,
      );
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    load();
  }, [load]);

  const review = async (id: string, status: "approved" | "rejected") => {
    try {
      setBusyId(id);
      await api.patch(`/admin/id-verifications/${id}`, {
        status,
        reviewNotes: notes[id] || "",
        reviewedBy: "admin",
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin ID Review</Text>
      <Text style={styles.subtitle}>Approve or reject identity verification requests</Text>

      <View style={styles.filtersRow}>
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <Pressable
            key={s}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? <Text style={styles.loading}>Loading...</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 90 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.email}>{item.userEmail}</Text>
            <Text style={styles.meta}>Status: {item.status}</Text>
            <Text style={styles.meta}>
              Submitted: {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
            </Text>
            <Text style={styles.meta}>ID URL: {item.idPhotoUrl || "—"}</Text>
            <Text style={styles.meta}>Selfie URL: {item.selfieUrl || "—"}</Text>

            <TextInput
              value={notes[item.id] || ""}
              onChangeText={(v) => setNotes((p) => ({ ...p, [item.id]: v }))}
              placeholder="Review notes (optional)"
              placeholderTextColor={COLORS.iconMuted}
              style={styles.input}
            />

            <View style={styles.actions}>
              <Pressable
                style={[styles.approveBtn, busyId === item.id && { opacity: 0.6 }]}
                disabled={busyId === item.id}
                onPress={() => review(item.id, "approved")}
              >
                <Text style={styles.approveBtnText}>Approve</Text>
              </Pressable>
              <Pressable
                style={[styles.rejectBtn, busyId === item.id && { opacity: 0.6 }]}
                disabled={busyId === item.id}
                onPress={() => review(item.id, "rejected")}
              >
                <Text style={styles.rejectBtnText}>Reject</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No verification requests.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 3, color: COLORS.textMuted, marginBottom: 10 },
  filtersRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipActive: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.borderStrong },
  filterChipText: { color: COLORS.textMuted, fontWeight: "700", textTransform: "capitalize" },
  filterChipTextActive: { color: COLORS.primaryDark },
  loading: { color: COLORS.textMuted, marginBottom: 8 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 10,
  },
  email: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  meta: { marginTop: 3, color: COLORS.textMuted, fontSize: 12 },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
  },
  actions: { marginTop: 9, flexDirection: "row", gap: 8 },
  approveBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: COLORS.success,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  approveBtnText: { color: COLORS.card, fontWeight: "700" },
  rejectBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  rejectBtnText: { color: COLORS.text, fontWeight: "700" },
  empty: { textAlign: "center", color: COLORS.textMuted, marginTop: 20 },
});
