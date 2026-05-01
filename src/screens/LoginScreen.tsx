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
import { useSnackbar } from "../components/Snackbar";
import { AuthResponseDto } from "../lib/types";
import { persistSession } from "../store";
import { COLORS } from "../theme/colors";
import { useAuthTheme } from "../theme/authTheme";

export function LoginScreen({ navigation }: { navigation: any }) {
  const { colors, logoSource } = useAuthTheme();
  const { showSnackbar } = useSnackbar();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

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
      await persistSession({ token: res.token, user: res.user });
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
          <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Login to continue your PadelMe journey.</Text>

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

          <Pressable style={[styles.cta, { backgroundColor: colors.primary }, loading && styles.disabled]} onPress={onLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.card} /> : <Text style={[styles.ctaText, { color: colors.card }]}>Login</Text>}
          </Pressable>

          <Pressable style={styles.linkBtn} onPress={() => navigation.navigate("ForgotPassword")}>
            <Text style={[styles.link, { color: colors.text }]}>Forgot password?</Text>
          </Pressable>
          <Pressable style={styles.linkBtn} onPress={() => navigation.navigate("Register")}>
            <Text style={[styles.link, { color: colors.text }]}>No account? Register</Text>
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
  linkBtn: { marginTop: 12, alignItems: "center" },
  link: { color: COLORS.primaryDark, fontWeight: "600" },
});
