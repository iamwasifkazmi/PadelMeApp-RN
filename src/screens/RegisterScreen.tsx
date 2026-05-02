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
import { isGoogleSignInConfigured, signInWithGoogleIdToken } from "../lib/googleAuth";
import { useSnackbar } from "../components/Snackbar";
import { AuthResponseDto, RegisterResponseDto } from "../lib/types";
import { COLORS } from "../theme/colors";
import { useAuthTheme } from "../theme/authTheme";
import { persistSession } from "../store";

export function RegisterScreen({ navigation }: { navigation: any }) {
  const { colors, logoSource } = useAuthTheme();
  const { showSnackbar } = useSnackbar();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const onRegister = async () => {
    if (!email.trim()) {
      showSnackbar("Please enter your email.", { type: "error" });
      return;
    }
    if (password.length < 8) {
      showSnackbar("Password must be at least 8 characters.", { type: "error" });
      return;
    }
    if (password !== confirmPassword) {
      showSnackbar("Passwords do not match.", { type: "error" });
      return;
    }

    try {
      setLoading(true);
      const res = await api.post<RegisterResponseDto>("/auth/register", {
        email: email.trim().toLowerCase(),
        password,
      });
      if (res.requiresVerification) {
        navigation.replace("VerifyEmailOtp", { email: res.email });
      } else {
        showSnackbar("Please verify your email using OTP.", { type: "info" });
      }
    } catch {
      showSnackbar("Please check details and try again.", { type: "error" });
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
      showSnackbar("Google sign-in failed. Check backend GOOGLE_OAUTH_CLIENT_IDS and try again.", { type: "error" });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 18 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.flexOne}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.logoWrap}>
            <Image source={logoSource} style={[styles.logo, { borderColor: colors.border }]} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Add your name later in onboarding. You will use email and password to sign in.
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
            placeholder="At least 8 characters"
            colors={colors}
            rightIcon={
              <Pressable onPress={() => setShowPassword((s) => !s)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.iconMuted} />
              </Pressable>
            }
          />
          <Field
            label="Re-enter password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            placeholder="Same as password"
            colors={colors}
          />

          <Pressable style={[styles.cta, { backgroundColor: colors.primary }, loading && styles.disabled]} onPress={onRegister} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.card} /> : <Text style={[styles.ctaText, { color: colors.card }]}>Register</Text>}
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
              (googleLoading || loading) && styles.disabled,
            ]}
            onPress={onGoogle}
            disabled={googleLoading || loading}
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

          <Pressable style={styles.linkBtn} onPress={() => navigation.navigate("Login")}>
            <Text style={[styles.link, { color: colors.text }]}>Already have an account? Login</Text>
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
  content: { flexGrow: 1, justifyContent: "center", padding: 20, paddingBottom: 34 },
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
  linkBtn: { marginTop: 12, alignItems: "center" },
  link: { color: COLORS.primaryDark, fontWeight: "600" },
});
