import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { api } from "../lib/api";
import { CompetitionDto } from "../lib/types";
import { ScreenSkeleton } from "../components/Skeleton";
import { COLORS } from "../theme/colors";

export function CompetitionsScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<CompetitionDto[]>([]);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get<CompetitionDto[]>("/competitions")
      .then((res) => mounted && setItems(res))
      .catch(() => mounted && setItems([]))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <ScreenSkeleton rows={6} topGap={12} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Competitions</Text>
      <Text style={styles.subtitle}>Tournaments and leagues</Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 110 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("CompetitionDetail", { id: item.id })}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="trophy-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.type} · {item.format} · {item.status}
              </Text>
              <Text style={styles.meta}>
                Skill: {item.skillLevel || "any"} · Capacity: {item.maxPlayers || 16}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.iconMuted} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No competitions yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { marginTop: 2, marginBottom: 12, color: COLORS.textMuted },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoftAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  meta: { marginTop: 2, fontSize: 12, color: COLORS.textMuted, textTransform: "capitalize" },
  empty: { marginTop: 24, alignItems: "center" },
  emptyText: { color: COLORS.textMuted },
});

