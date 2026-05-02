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
import { COLORS } from "../theme/colors";
import { useAuthTheme } from "../theme/authTheme";
import { useKeyboardBottomInset } from "../hooks/useKeyboardBottomInset";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ResetPasswordScreen({ navigation, route }: { navigation: any; route?: any }) {
  const { colors, logoSource } = useAuthTheme();
  const insets = useSafeAreaInsets();
  const keyboardBottomInset = useKeyboardBottomInset();
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
          <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Enter email, OTP code, and new password.</Text>

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="you@example.com"
            colors={colors}
          />
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>OTP Code</Text>
            <OtpField value={code} onChange={setCode} colors={colors} />
          </View>
          <Field
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            placeholder="Enter new password"
            colors={colors}
            rightIcon={
              <Pressable onPress={() => setShowNewPassword((s) => !s)}>
                <Ionicons name={showNewPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.iconMuted} />
              </Pressable>
            }
          />
          <Field
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            placeholder="Re-enter new password"
            colors={colors}
            rightIcon={
              <Pressable onPress={() => setShowConfirmPassword((s) => !s)}>
                <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.iconMuted} />
              </Pressable>
            }
          />

          <Pressable style={[styles.cta, { backgroundColor: colors.primary }, loading && styles.disabled]} onPress={onReset} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.card} /> : <Text style={[styles.ctaText, { color: colors.card }]}>Reset Password</Text>}
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
  keyboardType?: "default" | "email-address" | "number-pad";
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

function OtpField({
  value,
  onChange,
  colors,
}: {
  value: string;
  onChange: (v: string) => void;
  colors: typeof COLORS;
}) {
  const ref = React.useRef<TextInput>(null);
  const safe = value.replace(/\D/g, "").slice(0, 6);
  React.useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 180);
    return () => clearTimeout(t);
  }, []);

  return (
    <Pressable style={styles.otpWrap} onPress={() => ref.current?.focus()}>
      {Array.from({ length: 6 }).map((_, idx) => (
        <View
          key={idx}
          style={[
            styles.otpCell,
            { borderColor: colors.border, backgroundColor: colors.card },
            safe.length === idx && [styles.otpCellActive, { borderColor: colors.primary, backgroundColor: colors.primaryPale }],
          ]}
        >
          <Text style={[styles.otpDigit, { color: colors.text }]}>{safe[idx] || ""}</Text>
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
