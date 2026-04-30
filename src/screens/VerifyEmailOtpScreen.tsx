import React from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { useSnackbar } from "../components/Snackbar";
import { AuthResponseDto } from "../lib/types";
import { persistSession } from "../store";
import { COLORS } from "../theme/colors";
import { useAuthTheme } from "../theme/authTheme";

export function VerifyEmailOtpScreen({ route, navigation }: { route?: any; navigation: any }) {
  const { colors, logoSource } = useAuthTheme();
  const { showSnackbar } = useSnackbar();
  const [email, setEmail] = React.useState(route?.params?.email || "");
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [resendBusy, setResendBusy] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const onVerify = async () => {
    if (!email.trim() || code.length !== 6) {
      showSnackbar("Please enter your email and 6-digit OTP.", { type: "error" });
      return;
    }
    try {
      setLoading(true);
      const res = await api.post<AuthResponseDto>("/auth/verify-register-otp", {
        email: email.trim().toLowerCase(),
        code,
      });
      await persistSession({ token: res.token, user: res.user });
    } catch {
      showSnackbar("Invalid or expired OTP.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!email.trim() || resendBusy || cooldown > 0) return;
    try {
      setResendBusy(true);
      await api.post("/auth/resend-register-otp", { email: email.trim().toLowerCase() });
      setCooldown(45);
      showSnackbar("A new verification code has been sent to your email.", { type: "success" });
    } catch {
      showSnackbar("Could not resend OTP right now.", { type: "error" });
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.logoWrap}>
        <Image source={logoSource} style={[styles.logo, { borderColor: colors.border }]} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Verify Email</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Enter the 6-digit OTP sent to your email.</Text>

      <View style={styles.fieldBlock}>
        <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="you@example.com"
          placeholderTextColor={colors.iconMuted}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
        />
      </View>

      <View style={styles.fieldBlock}>
        <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>OTP Code</Text>
        <OtpField value={code} onChange={setCode} colors={colors} />
      </View>

      <Pressable style={[styles.cta, { backgroundColor: colors.primary }, loading && styles.disabled]} onPress={onVerify} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.card} /> : <Text style={[styles.ctaText, { color: colors.card }]}>Verify Account</Text>}
      </Pressable>
      <Pressable
        style={[
          styles.secondaryBtn,
          { borderColor: colors.borderMuted, backgroundColor: colors.card },
          (resendBusy || cooldown > 0) && styles.disabled,
        ]}
        onPress={onResend}
        disabled={resendBusy || cooldown > 0}
      >
        <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
          {resendBusy ? "Sending..." : cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
        </Text>
      </Pressable>

      <Pressable style={styles.linkBtn} onPress={() => navigation.navigate("Login")}>
        <Text style={[styles.link, { color: colors.text }]}>Back to login</Text>
      </Pressable>
    </ScrollView>
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
        placeholder="000000"
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
  input: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: COLORS.text,
  },
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
  secondaryBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    backgroundColor: COLORS.card,
  },
  secondaryBtnText: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  linkBtn: { marginTop: 12, alignItems: "center" },
  link: { color: COLORS.primaryDark, fontWeight: "600" },
});
