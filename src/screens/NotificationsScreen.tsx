import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { NotificationDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";

const USER_EMAIL = "demo@padelme.app";

function NotificationsSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBlock height={28} width="48%" rounded={8} />
      <View style={{ height: 12 }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <SkeletonBlock height={36} width={36} rounded={18} />
            <View style={{ flex: 1 }}>
              <SkeletonBlock height={14} width="60%" />
              <View style={{ height: 6 }} />
              <SkeletonBlock height={12} width="85%" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function NotificationsScreen() {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<NotificationDto[]>([]);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<NotificationDto[]>(
        `/notifications?email=${encodeURIComponent(USER_EMAIL)}`,
      );
      setItems(res);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    await load();
  };

  if (loading) return <NotificationsSkeleton />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.subtitle}>Updates for matches and invites</Text>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => markRead(item.id)}>
            <View style={styles.iconWrap}>
              <Ionicons
                name={item.isRead ? "notifications-outline" : "notifications"}
                size={18}
                color={item.isRead ? "#64748b" : "#2563eb"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {!!item.body && (
                <Text style={styles.cardBody} numberOfLines={2}>
                  {item.body}
                </Text>
              )}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800", color: "#0f172a" },
  subtitle: { marginTop: 2, marginBottom: 12, color: "#64748b" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 14, color: "#0f172a", fontWeight: "700" },
  cardBody: { marginTop: 3, fontSize: 12, color: "#64748b" },
  empty: { textAlign: "center", marginTop: 24, color: "#64748b" },
});

