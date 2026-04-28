import React from "react";
import { StyleSheet, View } from "react-native";

export function SkeletonBlock({
  height = 16,
  width = "100%",
  rounded = 10,
}: {
  height?: number;
  width?: number | `${number}%` | "100%";
  rounded?: number;
}) {
  return <View style={[styles.block, { height, width, borderRadius: rounded }]} />;
}

export function ScreenSkeleton({
  rows = 5,
  topGap = 12,
}: {
  rows?: number;
  topGap?: number;
}) {
  return (
    <View style={[styles.container, { paddingTop: topGap }]}>
      <SkeletonBlock height={28} width="45%" rounded={8} />
      <View style={{ height: 10 }} />
      <SkeletonBlock height={14} width="70%" rounded={8} />
      <View style={{ height: 16 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.card}>
          <SkeletonBlock height={14} width="55%" />
          <View style={{ height: 8 }} />
          <SkeletonBlock height={12} width="85%" />
          <View style={{ height: 6 }} />
          <SkeletonBlock height={12} width="60%" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
  },
  block: {
    backgroundColor: "#e2e8f0",
  },
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
});

