import React from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { api } from "../lib/api";
import { useSnackbar } from "../components/Snackbar";
import { COLORS } from "../theme/colors";
import { useAuthTheme } from "../theme/authTheme";
import { useKeyboardBottomInset } from "../hooks/useKeyboardBottomInset";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ForgotPasswordScreen({ navigation }: { navigation: any }) {
  const { colors, logoSource } = useAuthTheme();
  const insets = useSafeAreaInsets();
  const keyboardBottomInset = useKeyboardBottomInset();
  const { showSnackbar } = useSnackbar();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const onSendCode = async () => {
    if (!email.trim()) {
      showSnackbar("Please enter your email.", { type: "error" });
      return;
    }
    try {
      setLoading(true);
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      showSnackbar("If your account exists, an OTP code has been emailed.", { type: "success" });
      navigation.navigate("ResetPassword", { email: email.trim().toLowerCase() });
    } catch {
      showSnackbar("Could not send reset code right now.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.flexOne}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 28 + insets.bottom + keyboardBottomInset },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator
        >
          <View style={styles.logoWrap}>
            <Image source={logoSource} style={[styles.logo, { borderColor: colors.border }]} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Forgot Password</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Enter your email to receive OTP reset code.</Text>

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Enter your registered email"
              placeholderTextColor={colors.iconMuted}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
          </View>

          <Pressable style={[styles.cta, { backgroundColor: colors.primary }, loading && styles.disabled]} onPress={onSendCode} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.card} /> : <Text style={[styles.ctaText, { color: colors.card }]}>Send OTP</Text>}
          </Pressable>

          <Pressable style={styles.footerLinkRow} onPress={() => navigation.navigate("Login")}>
            <Text style={[styles.footerMuted, { color: colors.textMuted }]}>Back to </Text>
            <Text style={[styles.footerAction, { color: colors.link }]}>Login</Text>
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  flexOne: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "flex-start", padding: 20, paddingTop: 28 },
  logoWrap: { alignItems: "center", marginBottom: 16 },
  logo: { width: 112, height: 112, borderRadius: 56, borderWidth: 2, borderColor: COLORS.border },
  title: { fontSize: 28, fontWeight: "800", color: COLORS.text, textAlign: "center" },
  subtitle: { marginTop: 4, marginBottom: 20, textAlign: "center", color: COLORS.textMuted },
  fieldBlock: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, marginBottom: 6, color: COLORS.textSubtle, fontWeight: "600" },
  input: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: COLORS.text,
  },
  cta: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  ctaText: { color: COLORS.card, fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  footerLinkRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  footerMuted: { fontSize: 15 },
  footerAction: { fontSize: 15, fontWeight: "700" },
});
