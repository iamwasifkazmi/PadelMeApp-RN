import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

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
    backgroundColor: "#edf9fd",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  headerCard: {
    backgroundColor: "#041521",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#c8e6ef",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#041521",
    marginBottom: 6,
  },
  sectionText: {
    color: "#4f6b7b",
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#b7d8e2",
    lineHeight: 20,
  },
  // keep a base container shape to simplify future porting
  legacyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#0b1220",
  },
});
