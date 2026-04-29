import React from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { useSnackbar } from "../components/Snackbar";
import { COLORS } from "../theme/colors";

export function ResetPasswordScreen({ navigation, route }: { navigation: any; route?: any }) {
  const { showSnackbar } = useSnackbar();
  const [email, setEmail] = React.useState(route?.params?.email || "");
  const [code, setCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const onReset = async () => {
    if (!email.trim() || !code.trim() || newPassword.length < 8) {
      showSnackbar("Email, 6-digit OTP, and min 8 char password are required.", { type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      showSnackbar("Password and confirm password do not match.", { type: "error" });
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
      });
      showSnackbar("Password updated. You can now login with your new password.", { type: "success" });
      navigation.navigate("Login");
    } catch {
      showSnackbar("Invalid/expired code or server error.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.logoWrap}>
        <Image source={require("../../logo.jpeg")} style={styles.logo} />
      </View>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Enter email, OTP code, and new password.</Text>

      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>OTP Code</Text>
        <OtpField value={code} onChange={setCode} />
      </View>
      <Field
        label="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry={!showNewPassword}
        placeholder="Enter new password"
        rightIcon={
          <Pressable onPress={() => setShowNewPassword((s) => !s)}>
            <Ionicons name={showNewPassword ? "eye-off-outline" : "eye-outline"} size={18} color={COLORS.iconMuted} />
          </Pressable>
        }
      />
      <Field
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showConfirmPassword}
        placeholder="Re-enter new password"
        rightIcon={
          <Pressable onPress={() => setShowConfirmPassword((s) => !s)}>
            <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={18} color={COLORS.iconMuted} />
          </Pressable>
        }
      />

      <Pressable style={[styles.cta, loading && styles.disabled]} onPress={onReset} disabled={loading}>
        {loading ? <ActivityIndicator color={COLORS.card} /> : <Text style={styles.ctaText}>Reset Password</Text>}
      </Pressable>

      <Pressable style={styles.linkBtn} onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Back to login</Text>
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
  keyboardType?: "default" | "email-address" | "number-pad";
  secureTextEntry?: boolean;
  rightIcon?: React.ReactNode;
  placeholder?: string;
}) {
  return (
    <View style={styles.fieldBlock}>
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

function OtpField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = React.useRef<TextInput>(null);
  const safe = value.replace(/\D/g, "").slice(0, 6);
  React.useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 180);
    return () => clearTimeout(t);
  }, []);

  return (
    <Pressable style={styles.otpWrap} onPress={() => ref.current?.focus()}>
      {Array.from({ length: 6 }).map((_, idx) => (
        <View key={idx} style={[styles.otpCell, safe.length === idx && styles.otpCellActive]}>
          <Text style={styles.otpDigit}>{safe[idx] || ""}</Text>
        </View>
      ))}
      <TextInput
        ref={ref}
        value={safe}
        onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        style={styles.otpHiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { flexGrow: 1, justifyContent: "center", padding: 20 },
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
  otpWrap: { flexDirection: "row", justifyContent: "space-between", position: "relative" },
  otpCell: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  otpCellActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryPale },
  otpDigit: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  otpHiddenInput: { position: "absolute", opacity: 0, width: 1, height: 1 },
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
