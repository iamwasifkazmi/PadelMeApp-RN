import DateTimePicker from "@react-native-community/datetimepicker";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CommonActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { SkeletonBlock } from "../components/Skeleton";
import { useSnackbar } from "../components/Snackbar";
import { LocationSearchModal } from "../components/LocationSearchModal";
import { getCurrentUserEmail, persistSession } from "../store";
import { store } from "../store/store";
import { COLORS } from "../theme/colors";
import Ionicons from "react-native-vector-icons/Ionicons";
import { hasUserGeo, userLocationLabel } from "../lib/userLocation";
import { ageFromUtcDateOfBirth, utcNoonFromParts } from "../lib/ageFromDob";

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

const MIN_ONBOARDING_AGE = 13;

function defaultDobDate(): Date {
  const ref = new Date();
  return utcNoonFromParts(ref.getUTCFullYear() - 25, 5, 15);
}

function maxDobDate(): Date {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - MIN_ONBOARDING_AGE, d.getUTCMonth(), d.getUTCDate());
  return utcNoonFromParts(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function minDobDate(): Date {
  const ref = new Date();
  return utcNoonFromParts(ref.getUTCFullYear() - 100, 0, 1);
}

function OnboardingSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 28) }]}>
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
  const insets = useSafeAreaInsets();
  const USER_EMAIL = getCurrentUserEmail();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [locationPickerOpen, setLocationPickerOpen] = React.useState(false);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [dobDate, setDobDate] = React.useState(defaultDobDate);
  const [locationName, setLocationName] = React.useState("");
  const [locationLat, setLocationLat] = React.useState<number | null>(null);
  const [locationLng, setLocationLng] = React.useState<number | null>(null);
  const [skillLabel, setSkillLabel] = React.useState("intermediate");
  const [androidDobOpen, setAndroidDobOpen] = React.useState(false);

  const computedAge = React.useMemo(() => ageFromUtcDateOfBirth(dobDate), [dobDate]);

  React.useEffect(() => {
    let mounted = true;
    api
      .get<{
        fullName?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        dateOfBirth?: string | null;
        location?: string | null;
        locationName?: string | null;
        locationLat?: number | null;
        locationLng?: number | null;
        skillLabel?: string | null;
        bio?: string | null;
      }>(`/users/me?email=${encodeURIComponent(USER_EMAIL)}`)
      .then((u) => {
        if (!mounted) return;
        const fn = (u.firstName || "").trim();
        const ln = (u.lastName || "").trim();
        if (fn || ln) {
          setFirstName(fn);
          setLastName(ln);
        } else if (u.fullName?.trim()) {
          const parts = u.fullName.trim().split(/\s+/);
          setFirstName(parts[0] || "");
          setLastName(parts.slice(1).join(" ") || "");
        }
        if (u.dateOfBirth) {
          const parsed = new Date(u.dateOfBirth);
          if (!Number.isNaN(parsed.getTime())) {
            setDobDate(
              utcNoonFromParts(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()),
            );
          }
        }
        setLocationName((u.locationName || u.location || "").trim());
        setLocationLat(u.locationLat ?? null);
        setLocationLng(u.locationLng ?? null);
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
      const y = dobDate.getUTCFullYear();
      const mo = dobDate.getUTCMonth();
      const d = dobDate.getUTCDate();
      const dobUtc = utcNoonFromParts(y, mo, d);
      const ageYears = ageFromUtcDateOfBirth(dobUtc);
      const fullNameCombined = `${firstName.trim()} ${lastName.trim()}`.trim();
      await api.patch("/users/me", {
        email: USER_EMAIL,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dobUtc.toISOString(),
        age: ageYears,
        fullName: fullNameCombined,
        location: locationName.trim() || null,
        locationName: locationName.trim() || null,
        locationLat,
        locationLng,
        skillLevel: skillNumeric,
        skillLabel,
        profileComplete: true,
      });
      const auth = store.getState().auth;
      if (auth.token && auth.user?.email) {
        await persistSession({
          token: auth.token,
          user: { ...auth.user, isNewUser: false, fullName: fullNameCombined },
        });
      }
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

  const dobValid = computedAge >= MIN_ONBOARDING_AGE && computedAge <= 100;
  const canContinue =
    step === 1
      ? firstName.trim().length >= 1 && lastName.trim().length >= 1 && dobValid
      : step === 2
        ? Boolean(skillLabel)
        : step === 3
          ? hasUserGeo({ locationLat, locationLng })
          : true;

  const next = () => {
    if (step < 4) {
      setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
      return;
    }
    complete();
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 28) }]}>
      <View style={styles.progressRow}>
        {[1, 2, 3, 4].map((s) => (
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 ? (
          <View style={styles.stepWrap}>
            <Text style={styles.stepEmoji}>👋</Text>
            <Text style={styles.title}>About you</Text>
            <Text style={styles.subtitle}>First name, last name, and date of birth</Text>
            <View style={styles.nameRow}>
              <View style={styles.nameCol}>
                <Field
                  label="First name"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.nameCol}>
                <Field
                  label="Last name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  autoCapitalize="words"
                />
              </View>
            </View>
            <Text style={styles.fieldLabel}>Date of birth</Text>
            {Platform.OS === "ios" ? (
              <View style={styles.dobPickerWrap}>
                <DateTimePicker
                  value={dobDate}
                  mode="date"
                  display="spinner"
                  themeVariant="dark"
                  minimumDate={minDobDate()}
                  maximumDate={maxDobDate()}
                  onChange={(_, date) => {
                    if (date) {
                      setDobDate(
                        utcNoonFromParts(date.getFullYear(), date.getMonth(), date.getDate()),
                      );
                    }
                  }}
                />
              </View>
            ) : (
              <View style={styles.androidDobBlock}>
                <Text style={styles.androidDobValue}>
                  {dobDate.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
                <Pressable style={styles.androidDobBtn} onPress={() => setAndroidDobOpen(true)}>
                  <Text style={styles.androidDobBtnText}>Choose date</Text>
                </Pressable>
                {androidDobOpen ? (
                  <DateTimePicker
                    value={dobDate}
                    mode="date"
                    display="default"
                    minimumDate={minDobDate()}
                    maximumDate={maxDobDate()}
                    onChange={(_, date) => {
                      setAndroidDobOpen(false);
                      if (date) {
                        setDobDate(
                          utcNoonFromParts(date.getFullYear(), date.getMonth(), date.getDate()),
                        );
                      }
                    }}
                  />
                ) : null}
              </View>
            )}
            <View style={styles.agePill}>
              <Text style={styles.agePillLabel}>Age</Text>
              <Text style={styles.agePillValue}>{computedAge} years</Text>
            </View>
            {!dobValid ? (
              <Text style={styles.dobHint}>
                You must be at least {MIN_ONBOARDING_AGE} years old to use MiPadel.
              </Text>
            ) : null}
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
                  style={[styles.skillCard, skillLabel === opt.value && styles.skillCardActive]}
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
            <Text style={styles.subtitle}>We need exact map coordinates — search for your city or club</Text>
            <Text style={styles.locationChosen}>
              {userLocationLabel({ locationName, locationLat, locationLng }) || "No place selected yet"}
            </Text>
            {hasUserGeo({ locationLat, locationLng }) ? (
              <Text style={styles.coordsMini}>
                {locationLat?.toFixed(5)}, {locationLng?.toFixed(5)}
              </Text>
            ) : null}
            <Pressable style={styles.pickLocationBtn} onPress={() => setLocationPickerOpen(true)}>
              <Ionicons name="search-outline" size={14} color={OB.orange} />
              <Text style={styles.pickLocationBtnText}>Search & select location</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.stepWrap}>
            <Text style={styles.stepEmoji}>✨</Text>
            <Text style={styles.title}>You're all set</Text>
            <Text style={styles.subtitle}>
              Tap below to save your profile and start playing. You can edit details anytime in Profile.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        style={[styles.cta, (!canContinue || saving) && styles.disabled]}
        onPress={next}
        disabled={!canContinue || saving}
      >
        <Text style={styles.ctaText}>
          {saving ? "Saving..." : step === 4 ? "Let's Play 🎾" : "Continue"}
        </Text>
      </Pressable>

      <LocationSearchModal
        visible={locationPickerOpen}
        title="Pick your location"
        initialQuery={locationName}
        onClose={() => setLocationPickerOpen(false)}
        onPick={(loc) => {
          const lat = loc.lat;
          const lon = loc.lon;
          if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon)) {
            return;
          }
          setLocationName((loc.label || loc.city || loc.address || "").trim());
          setLocationLat(lat);
          setLocationLng(lon);
        }}
      />
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={OB.muted}
          autoCapitalize={autoCapitalize || "none"}
          style={styles.input}
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
  container: { flex: 1, backgroundColor: OB.bg, paddingHorizontal: 20, paddingTop: 0, paddingBottom: 26 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 12 },
  progressRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16 },
  progressDot: { width: 8, height: 8, borderRadius: 8, backgroundColor: OB.border },
  progressDotActive: { width: 24, backgroundColor: OB.orange },
  progressDotDone: { backgroundColor: OB.orange },
  stepWrap: { flexGrow: 1, justifyContent: "center", paddingVertical: 8 },
  stepEmoji: { textAlign: "center", fontSize: 36, marginBottom: 8 },
  title: { fontSize: 29, fontWeight: "800", color: OB.text, textAlign: "center" },
  subtitle: { marginTop: 4, marginBottom: 18, color: OB.muted, textAlign: "center", fontSize: 13 },
  nameRow: { flexDirection: "row", gap: 10 },
  nameCol: { flex: 1 },
  fieldLabel: { marginBottom: 6, color: OB.muted, fontSize: 12, fontWeight: "600" },
  inputWrap: {
    backgroundColor: OB.surface,
    borderWidth: 2,
    borderColor: OB.border,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    color: OB.text,
    fontSize: 16,
  },
  dobPickerWrap: {
    backgroundColor: OB.surface,
    borderWidth: 2,
    borderColor: OB.border,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  androidDobBlock: {
    backgroundColor: OB.surface,
    borderWidth: 2,
    borderColor: OB.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  androidDobValue: { color: OB.text, fontSize: 16, fontWeight: "700", textAlign: "center" },
  androidDobBtn: {
    alignSelf: "center",
    borderWidth: 1,
    borderColor: OB.orange,
    backgroundColor: OB.orangeTint,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  androidDobBtnText: { color: OB.orange, fontWeight: "700", fontSize: 14 },
  agePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: OB.orangeTint,
    borderWidth: 1,
    borderColor: OB.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  agePillLabel: { color: OB.muted, fontSize: 13, fontWeight: "600" },
  agePillValue: { color: OB.orange, fontSize: 17, fontWeight: "800" },
  dobHint: { color: COLORS.dangerText, fontSize: 12, textAlign: "center", lineHeight: 17 },
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
  locationChosen: {
    textAlign: "center",
    color: OB.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  coordsMini: { textAlign: "center", color: OB.muted, fontSize: 12, marginBottom: 12 },
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
  pickLocationBtnText: { color: OB.orange, fontWeight: "700", fontSize: 14 },
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
