import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme/colors";

type PlaceholderScreenProps = {
  title: string;
  subtitle?: string;
};

export function PlaceholderScreen({ title, subtitle }: PlaceholderScreenProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle ?? "Screen scaffold ready"}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Upcoming</Text>
        <Text style={styles.sectionText}>This block will be replaced with real data from the backend.</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Text style={styles.sectionText}>Base44-style cards and lists will be migrated screen-by-screen.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  headerCard: {
    backgroundColor: COLORS.text,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
  },
  sectionText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.card,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.borderMuted,
    lineHeight: 20,
  },
  // keep a base container shape to simplify future porting
  legacyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: COLORS.darkSurface,
  },
});
