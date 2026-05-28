import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { COLORS } from "../theme/colors";

type PremiumComingSoonModalProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  feature?: string;
  description?: string;
};

export function PremiumComingSoonModal({
  visible,
  onClose,
  title = "Premium Feature",
  feature = "Tournaments & Leagues",
  description = "Hosting tournaments and leagues is coming soon in v2 as part of MiPadel Premium. Stay tuned — we're polishing the experience for you.",
}: PremiumComingSoonModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="diamond" size={12} color={COLORS.card} />
              <Text style={styles.badgeText}>PREMIUM</Text>
            </View>
            <Pressable
              hitSlop={10}
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={18} color={COLORS.textMuted} />
            </Pressable>
          </View>

          <View style={styles.iconWrap}>
            <Text style={styles.iconEmoji}>👑</Text>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.feature}>{feature}</Text>
          <Text style={styles.body}>{description}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="rocket-outline" size={12} color={COLORS.primary} />
              <Text style={styles.metaChipText}>Coming in v2</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="lock-closed-outline" size={12} color={COLORS.primary} />
              <Text style={styles.metaChipText}>Premium only</Text>
            </View>
          </View>

          <Pressable style={styles.primaryBtn} onPress={onClose} accessibilityRole="button">
            <Text style={styles.primaryBtnText}>Got it</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: COLORS.card,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
  },
  iconWrap: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
    marginTop: 6,
    marginBottom: 12,
  },
  iconEmoji: {
    fontSize: 36,
  },
  title: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  feature: {
    textAlign: "center",
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  body: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSubtle,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    flexWrap: "wrap",
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primarySoftAlt,
  },
  metaChipText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: "700",
  },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: COLORS.card,
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
