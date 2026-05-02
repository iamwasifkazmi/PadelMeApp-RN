import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CommonActions } from "@react-navigation/native";
import { api } from "../lib/api";
import { SkeletonBlock } from "../components/Skeleton";
import { useSnackbar } from "../components/Snackbar";
import { LocationSearchModal } from "../components/LocationSearchModal";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";
import Ionicons from "react-native-vector-icons/Ionicons";

/** Onboarding uses MiPadel brand: black / navy surfaces + orange accents (not default light gray shell). */
const OB = {
  bg: COLORS.primaryDark,
  surface: COLORS.darkCard,
  text: COLORS.darkText,
  muted: COLORS.darkTextMuted,
  border: COLORS.darkBorder,
  orange: COLORS.primary,
  orangeTint: "rgba(255, 92, 26, 0.14)",
} as const;

function OnboardingSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBlock height={28} width="52%" rounded={8} />
      <View style={{ height: 10 }} />
      <SkeletonBlock height={14} width="70%" rounded={8} />
      <View style={{ height: 14 }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={{ marginBottom: 10 }}>
          <SkeletonBlock height={12} width="28%" />
          <View style={{ height: 6 }} />
          <SkeletonBlock height={42} width="100%" rounded={12} />
        </View>
      ))}
      <SkeletonBlock height={44} width="100%" rounded={12} />
    </View>
  );
}

export function OnboardingScreen({ navigation }: { navigation: any }) {
  const { showSnackbar } = useSnackbar();
  const USER_EMAIL = getCurrentUserEmail();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [locationPickerOpen, setLocationPickerOpen] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [skillLabel, setSkillLabel] = React.useState("intermediate");

  React.useEffect(() => {
    let mounted = true;
    api
      .get<{ fullName?: string | null; location?: string | null; skillLabel?: string | null; bio?: string | null }>(
        `/users/me?email=${encodeURIComponent(USER_EMAIL)}`,
      )
      .then((u) => {
        if (!mounted) return;
        setFullName(u.fullName || "");
        setLocation(u.location || "");
        setSkillLabel(u.skillLabel || "intermediate");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [USER_EMAIL]);

  const complete = async () => {
    try {
      setSaving(true);
      const skillNumeric =
        skillLabel === "advanced" ? 8 : skillLabel === "intermediate" ? 5 : 2;
      await api.patch("/users/me", {
        email: USER_EMAIL,
        fullName: fullName.trim(),
        location: location.trim(),
        skillLevel: skillNumeric,
        skillLabel,
        profileComplete: true,
      });
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: "MainTabs",
              state: {
                routes: [
                  { name: "HomeTab" },
                  { name: "DiscoverTab" },
                  { name: "CreateTab" },
                  { name: "MessagesTab" },
                  { name: "ProfileTab" },
                ],
                index: 4,
              },
            },
          ],
        }),
      );
    } catch {
      showSnackbar("Could not save onboarding details.", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <OnboardingSkeleton />;

  const canContinue =
    step === 1
      ? fullName.trim().length >= 2
      : step === 2
        ? Boolean(skillLabel)
        : location.trim().length >= 2;

  const next = () => {
    if (step < 3) {
      setStep((s) => (s + 1) as 1 | 2 | 3);
      return;
    }
    complete();
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressRow}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              s === step && styles.progressDotActive,
              s < step && styles.progressDotDone,
            ]}
          />
        ))}
      </View>

      {step === 1 ? (
        <View style={styles.stepWrap}>
          <Text style={styles.stepEmoji}>👋</Text>
          <Text style={styles.title}>What's your name?</Text>
          <Text style={styles.subtitle}>This is how other players will see you</Text>
          <Field
            label="Your name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your name"
          />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.stepWrap}>
          <Text style={styles.stepEmoji}>🎾</Text>
          <Text style={styles.title}>Your Padel level?</Text>
          <Text style={styles.subtitle}>We'll match you with the right players</Text>
          <View style={styles.skillList}>
            {SKILL_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.skillCard,
                  skillLabel === opt.value && styles.skillCardActive,
                ]}
                onPress={() => setSkillLabel(opt.value)}
              >
                <Text style={styles.skillEmoji}>{opt.emoji}</Text>
                <View style={styles.flexOne}>
                  <Text style={[styles.skillName, skillLabel === opt.value && styles.skillNameActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.skillDesc}>{opt.desc}</Text>
                </View>
                {skillLabel === opt.value ? (
                  <View style={styles.skillTick}>
                    <View style={styles.skillTickInner} />
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.stepWrap}>
          <Text style={styles.stepEmoji}>📍</Text>
          <Text style={styles.title}>Where are you based?</Text>
          <Text style={styles.subtitle}>Find matches near you</Text>
          <Field
            label="City or town"
            value={location}
            onChangeText={setLocation}
            placeholder="Enter your location"
            leftIcon={<Ionicons name="location-outline" size={18} color={OB.orange} />}
          />
          <Pressable
            style={styles.pickLocationBtn}
            onPress={() => setLocationPickerOpen(true)}
          >
            <Ionicons name="search-outline" size={14} color={OB.orange} />
            <Text style={styles.pickLocationBtnText}>Search & select location</Text>
          </Pressable>
          <Pressable onPress={() => setLocation("TBD")}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        style={[styles.cta, (!canContinue || saving) && styles.disabled]}
        onPress={next}
        disabled={!canContinue || saving}
      >
        <Text style={styles.ctaText}>
          {saving ? "Saving..." : step === 3 ? "Let's Play 🎾" : "Continue"}
        </Text>
      </Pressable>

      <LocationSearchModal
        visible={locationPickerOpen}
        title="Pick your location"
        initialQuery={location}
        onClose={() => setLocationPickerOpen(false)}
        onPick={(loc) => setLocation(loc.city || loc.label)}
      />
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  leftIcon,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  leftIcon?: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={OB.muted}
          style={[styles.input, leftIcon ? styles.inputWithIcon : null]}
        />
      </View>
    </View>
  );
}

const SKILL_OPTIONS = [
  { value: "beginner", label: "Beginner", emoji: "🌱", desc: "Just starting out" },
  { value: "intermediate", label: "Intermediate", emoji: "⚡", desc: "Played for a while" },
  { value: "advanced", label: "Advanced", emoji: "🏆", desc: "Competitive player" },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: OB.bg, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 26 },
  progressRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16 },
  progressDot: { width: 8, height: 8, borderRadius: 8, backgroundColor: OB.border },
  progressDotActive: { width: 24, backgroundColor: OB.orange },
  progressDotDone: { backgroundColor: OB.orange },
  stepWrap: { flex: 1, justifyContent: "center" },
  stepEmoji: { textAlign: "center", fontSize: 36, marginBottom: 8 },
  title: { fontSize: 29, fontWeight: "800", color: OB.text, textAlign: "center" },
  subtitle: { marginTop: 4, marginBottom: 18, color: OB.muted, textAlign: "center", fontSize: 13 },
  fieldLabel: { marginBottom: 6, color: OB.muted, fontSize: 12, fontWeight: "600" },
  inputWrap: {
    backgroundColor: OB.surface,
    borderWidth: 2,
    borderColor: OB.border,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  leftIcon: { marginLeft: 12, marginRight: -2 },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    color: OB.text,
    fontSize: 16,
  },
  inputWithIcon: {
    paddingLeft: 10,
  },
  skillList: { gap: 10 },
  skillCard: {
    borderWidth: 2,
    borderColor: OB.border,
    borderRadius: 16,
    backgroundColor: OB.surface,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  skillCardActive: { borderColor: OB.orange, backgroundColor: OB.orangeTint },
  skillEmoji: { fontSize: 24 },
  flexOne: { flex: 1 },
  skillName: { fontSize: 16, fontWeight: "700", color: OB.text },
  skillNameActive: { color: OB.orange },
  skillDesc: { fontSize: 12, color: OB.muted, marginTop: 1 },
  skillTick: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: OB.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  skillTickInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.card },
  pickLocationBtn: {
    borderWidth: 1,
    borderColor: OB.orange,
    backgroundColor: OB.orangeTint,
    borderRadius: 12,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  pickLocationBtnText: { color: OB.text, fontSize: 12, fontWeight: "700" },
  skipText: { marginTop: 2, color: OB.muted, textAlign: "center", fontSize: 12 },
  cta: {
    marginTop: 10,
    backgroundColor: OB.orange,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  ctaText: { color: COLORS.card, fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.6 },
});

