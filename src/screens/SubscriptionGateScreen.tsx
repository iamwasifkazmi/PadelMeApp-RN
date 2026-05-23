import React from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSnackbar } from "../components/Snackbar";
import { api } from "../lib/api";
import { AuthUserDto } from "../lib/types";
import { mergeAuthUser } from "../store";
import { COLORS } from "../theme/colors";

/** @deprecated Use user.isSubscribed from API */
export const SUBSCRIPTION_PLAN_KEY = "padelme.subscription.plan.v1";

export function SubscriptionGateScreen({
  navigation,
  route,
}: {
  navigation: any;
  route?: { params?: { onSuccess?: "create-competition" } };
}) {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = React.useState(false);

  const finishSuccess = async (user: AuthUserDto) => {
    await mergeAuthUser({
      isSubscribed: user.isSubscribed,
      role: user.role,
    });
    showSnackbar("Welcome to Premium! You can host tournaments and leagues.", { type: "success" });
    if (route?.params?.onSuccess === "create-competition") {
      navigation.replace("CreateCompetition");
    } else {
      navigation.goBack();
    }
  };

  const onStartPremium = async () => {
    try {
      setLoading(true);

      const configured = await api.get<{ stripe: boolean }>("/billing/configured");
      if (configured.stripe) {
        const checkout = await api.post<{ url: string | null; sessionId: string }>(
          "/billing/checkout-session",
        );
        if (!checkout.url) {
          showSnackbar("Could not start checkout.", { type: "error" });
          return;
        }
        await Linking.openURL(checkout.url);
        showSnackbar("Complete payment in the browser, then return here.", { type: "info" });
        return;
      }

      const res = await api.post<{ user: AuthUserDto }>("/auth/subscribe");
      await finishSuccess(res.user);
    } catch (e) {
      const msg = String((e as Error)?.message || "");
      if (msg.includes("use_stripe_checkout") || msg.includes("checkout-session")) {
        showSnackbar("Add STRIPE_PRICE_ID on the server, then try again.", { type: "error" });
      } else {
        showSnackbar("Could not activate premium. Sign in and try again.", { type: "error" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="diamond-outline" size={22} color={COLORS.card} />
        </View>
        <Text style={styles.title}>Premium Package</Text>
        <Text style={styles.sub}>
          Host tournaments and leagues. When Stripe is configured, checkout opens in your browser
          (card payment). Otherwise dev mode activates instantly.
        </Text>

        <View style={styles.features}>
          <Text style={styles.feature}>• Unlimited tournaments and leagues</Text>
          <Text style={styles.feature}>• Entry fee and prize controls</Text>
          <Text style={styles.feature}>• LTA venue search in court picker</Text>
        </View>

        <Pressable style={styles.startBtn} onPress={onStartPremium} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.card} />
          ) : (
            <Text style={styles.startBtnText}>Start Premium</Text>
          )}
        </Pressable>

        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} disabled={loading}>
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
    minHeight: 40,
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
