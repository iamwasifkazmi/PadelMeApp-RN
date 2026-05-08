import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSnackbar } from "../components/Snackbar";
import { COLORS } from "../theme/colors";

export const SUBSCRIPTION_PLAN_KEY = "padelme.subscription.plan.v1";

export function SubscriptionGateScreen({ navigation }: { navigation: any }) {
  const { showSnackbar } = useSnackbar();

  const onStartPremium = () => {
    showSnackbar("Coming soon", { type: "info" });
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="diamond-outline" size={22} color={COLORS.card} />
        </View>
        <Text style={styles.title}>Premium Package</Text>
        <Text style={styles.sub}>
          Host and manage tournaments/leagues with full Base44-style compete tools.
        </Text>

        <View style={styles.features}>
          <Text style={styles.feature}>• Unlimited tournaments and leagues</Text>
          <Text style={styles.feature}>• Entry fee and prize controls</Text>
          <Text style={styles.feature}>• Advanced competition actions</Text>
        </View>

        <Pressable style={styles.startBtn} onPress={onStartPremium}>
          <Text style={styles.startBtnText}>Start Premium</Text>
        </Pressable>

        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 14,
    paddingTop: 18,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.warningText,
    borderRadius: 14,
    backgroundColor: COLORS.warningSoft,
    padding: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.warningText,
    marginBottom: 8,
  },
  title: { color: COLORS.warningText, fontSize: 20, fontWeight: "800" },
  sub: { marginTop: 4, color: COLORS.warningText, opacity: 0.92, fontSize: 12, lineHeight: 18 },
  features: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.warningText,
    borderRadius: 11,
    backgroundColor: COLORS.card,
    padding: 10,
    gap: 5,
  },
  feature: { color: COLORS.text, fontSize: 11, fontWeight: "600" },
  startBtn: {
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: COLORS.warningText,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  startBtnText: { color: COLORS.card, fontSize: 12, fontWeight: "700" },
  backBtn: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.warningText,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
  },
  backBtnText: { color: COLORS.warningText, fontSize: 11, fontWeight: "700" },
});
