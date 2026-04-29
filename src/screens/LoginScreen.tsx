import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { AuthResponseDto } from "../lib/types";
import { persistSession } from "../store";
import { COLORS } from "../theme/colors";

export function LoginScreen({ navigation }: { navigation: any }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const onLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing details", "Please enter email and password.");
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
        Alert.alert("Verify your email", "Please verify your account with OTP before logging in.");
        navigation.navigate("VerifyEmailOtp", { email: email.trim().toLowerCase() });
      } else {
        Alert.alert("Login failed", "Invalid credentials or server error.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.logoWrap}>
        <Image source={require("../../logo.jpeg")} style={styles.logo} />
      </View>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Login to continue your PadelMe journey.</Text>

      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        placeholder="Enter your password"
        rightIcon={
          <Pressable onPress={() => setShowPassword((s) => !s)}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={COLORS.iconMuted} />
          </Pressable>
        }
      />

      <Pressable style={[styles.cta, loading && styles.disabled]} onPress={onLogin} disabled={loading}>
        {loading ? <ActivityIndicator color={COLORS.card} /> : <Text style={styles.ctaText}>Login</Text>}
      </Pressable>

      <Pressable style={styles.linkBtn} onPress={() => navigation.navigate("ForgotPassword")}>
        <Text style={styles.link}>Forgot password?</Text>
      </Pressable>
      <Pressable style={styles.linkBtn} onPress={() => navigation.navigate("Register")}>
        <Text style={styles.link}>No account? Register</Text>
      </Pressable>
    </ScrollView>
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
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "email-address";
  secureTextEntry?: boolean;
  rightIcon?: React.ReactNode;
  placeholder?: string;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          placeholder={placeholder}
          placeholderTextColor={COLORS.iconMuted}
          style={styles.input}
        />
        {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { flexGrow: 1, justifyContent: "center", padding: 20 },
  logoWrap: { alignItems: "center", marginBottom: 16 },
  logo: { width: 112, height: 112, borderRadius: 56, borderWidth: 2, borderColor: COLORS.border },
  title: { fontSize: 28, fontWeight: "800", color: COLORS.text, textAlign: "center" },
  subtitle: { marginTop: 4, marginBottom: 20, textAlign: "center", color: COLORS.textMuted },
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
