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
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { isAppleAuthSupported, isAppleUserCancelled, signInWithAppleForBackend } from "../lib/appleAuth";
import { isGoogleSignInConfigured, signInWithGoogleIdToken } from "../lib/googleAuth";
import { useSnackbar } from "../components/Snackbar";
import { AuthResponseDto } from "../lib/types";
import { persistSession } from "../store";
import { COLORS } from "../theme/colors";
import { useAuthTheme } from "../theme/authTheme";
import { useKeyboardBottomInset } from "../hooks/useKeyboardBottomInset";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APP_DISPLAY_NAME } from "../constants/appBranding";

export function LoginScreen({ navigation }: { navigation: any }) {
  const { colors, logoSource } = useAuthTheme();
  const insets = useSafeAreaInsets();
  const keyboardBottomInset = useKeyboardBottomInset();
  const { showSnackbar } = useSnackbar();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [appleLoading, setAppleLoading] = React.useState(false);

  const onLogin = async () => {
    if (!email.trim() || !password) {
      showSnackbar("Please enter email and password.", { type: "error" });
      return;
    }

    try {
      setLoading(true);
      const res = await api.post<AuthResponseDto>("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      await persistSession({
        token: res.token,
        user: { ...res.user, isNewUser: res.isNewUser },
      });
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.toLowerCase().includes("verify")) {
        showSnackbar("Please verify your account with OTP before logging in.", { type: "info" });
        navigation.navigate("VerifyEmailOtp", { email: email.trim().toLowerCase() });
      } else {
        showSnackbar("Invalid credentials or server error.", { type: "error" });
      }
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    if (!isGoogleSignInConfigured()) {
      showSnackbar("Add your Google web client ID in src/config/googleSignIn.ts (see docs/google-sign-in-setup.md).", {
        type: "info",
      });
      return;
    }
    try {
      setGoogleLoading(true);
      const idToken = await signInWithGoogleIdToken();
      const res = await api.post<AuthResponseDto>("/auth/google", { idToken });
      await persistSession({
        token: res.token,
        user: { ...res.user, isNewUser: res.isNewUser },
      });
    } catch (err: unknown) {
      const msg = String((err as Error)?.message || "");
      if (msg === "cancelled") return;
      const display = msg.length > 200 ? `${msg.slice(0, 197)}...` : msg;
      showSnackbar(display || "Google sign-in failed.", { type: "error" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const onApple = async () => {
    if (!isAppleAuthSupported()) return;
    try {
      setAppleLoading(true);
      const { identityToken, email, fullName } = await signInWithAppleForBackend();
      const res = await api.post<AuthResponseDto>("/auth/apple", {
        identityToken,
        ...(email ? { email } : {}),
        ...(fullName ? { fullName } : {}),
      });
      await persistSession({
        token: res.token,
        user: { ...res.user, isNewUser: res.isNewUser },
      });
    } catch (err: unknown) {
      if (isAppleUserCancelled(err)) return;
      const msg = String((err as Error)?.message || "");
      const display = msg.length > 200 ? `${msg.slice(0, 197)}...` : msg;
      showSnackbar(display || "Apple sign-in failed.", { type: "error" });
    } finally {
      setAppleLoading(false);
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
          <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Login to continue your {APP_DISPLAY_NAME} journey.
          </Text>

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="you@example.com"
            colors={colors}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="Enter your password"
            rightIcon={
              <Pressable onPress={() => setShowPassword((s) => !s)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.iconMuted} />
              </Pressable>
            }
            colors={colors}
          />

          <View style={styles.forgotRow}>
            <Pressable onPress={() => navigation.navigate("ForgotPassword")} hitSlop={10}>
              <Text style={[styles.forgotLink, { color: colors.link }]}>Forgot password?</Text>
            </Pressable>
          </View>

          <Pressable style={[styles.cta, { backgroundColor: colors.primary }, loading && styles.disabled]} onPress={onLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.card} /> : <Text style={[styles.ctaText, { color: colors.card }]}>Login</Text>}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Pressable
            style={[
              styles.googleBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
              (googleLoading || appleLoading || loading) && styles.disabled,
            ]}
            onPress={onGoogle}
            disabled={googleLoading || appleLoading || loading}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={colors.text} />
                <Text style={[styles.googleBtnText, { color: colors.text }]}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {isAppleAuthSupported() ? (
            <Pressable
              style={[styles.appleBtn, (googleLoading || appleLoading || loading) && styles.disabled]}
              onPress={onApple}
              disabled={googleLoading || appleLoading || loading}
            >
              {appleLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
                  <Text style={styles.appleBtnText}>Continue with Apple</Text>
                </>
              )}
            </Pressable>
          ) : null}

          <Pressable style={styles.footerLinkRow} onPress={() => navigation.navigate("Register")}>
            <Text style={[styles.footerMuted, { color: colors.textMuted }]}>No account? </Text>
            <Text style={[styles.footerAction, { color: colors.link }]}>Register</Text>
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
  rightIcon,
  placeholder,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "email-address";
  secureTextEntry?: boolean;
  rightIcon?: React.ReactNode;
  placeholder?: string;
  colors: typeof COLORS;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          placeholder={placeholder}
          placeholderTextColor={colors.iconMuted}
          style={[styles.input, { color: colors.text }]}
        />
        {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
      </View>
    </View>
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
  inputWrap: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: COLORS.text,
  },
  rightIcon: { paddingRight: 12 },
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
  dividerRow: { flexDirection: "row", alignItems: "center", marginTop: 18, marginBottom: 14, gap: 10 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
  dividerText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  googleBtnText: { fontSize: 15, fontWeight: "700" },
  appleBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: "#000000",
  },
  appleBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  forgotRow: { alignItems: "flex-end", marginTop: 4, marginBottom: 4 },
  forgotLink: { fontSize: 14, fontWeight: "600" },
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
