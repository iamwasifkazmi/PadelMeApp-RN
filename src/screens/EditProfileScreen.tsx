import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { launchImageLibrary } from "react-native-image-picker";
import { api } from "../lib/api";
import { UserDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { useSnackbar } from "../components/Snackbar";
import { LocationSearchModal } from "../components/LocationSearchModal";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";
import { hasUserGeo, userLocationLabel } from "../lib/userLocation";
import { USER_COUNTRY_CHOICES } from "../lib/profileCountries";
import { PadelSkillLevelGrid } from "../components/PadelSkillLevelGrid";
import { PadelSkillLevelSummary } from "../components/PadelSkillLevelSummary";
import { padelSkillApiLabel } from "../lib/padelSkill";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};
const TIMES = [
  { value: "Morning", emoji: "🌅", hint: "7am - 12pm" },
  { value: "Afternoon", emoji: "☀️", hint: "12pm - 5pm" },
  { value: "Evening", emoji: "🌙", hint: "5pm - 10pm" },
];
const PROFILE_STEPS = ["👤 Basics", "🎾 Play Style", "📅 Availability", "🎯 Preferences"];
const MATCH_TYPES = [
  { value: "casual", label: "Social 😎" },
  { value: "competitive", label: "Competitive 🔥" },
  { value: "training", label: "Training 🎯" },
];
const MATCH_FORMATS = [
  { value: "singles", label: "Singles 1v1" },
  { value: "doubles", label: "Doubles 2v2" },
  { value: "both", label: "Both ✌️" },
];
const POSITIONS = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "both", label: "Both" },
];
const CONFIDENCE = [
  { value: "low", label: "Still learning" },
  { value: "medium", label: "Comfortable" },
  { value: "high", label: "Very confident" },
];
const TAG_OPTIONS = [
  { label: "Competitive 🔥", value: "Competitive" },
  { label: "Casual 😎", value: "Casual" },
  { label: "Beginner-friendly 🌱", value: "Beginner-friendly" },
  { label: "Social 🤝", value: "Social" },
  { label: "Training partner 🎯", value: "Training partner" },
];
const TRAVEL_OPTIONS = [5, 10, 20, 50];
const NOTIF_ITEMS = [
  { key: "notifyInstantPlay", label: "⚡ Instant Play matches" },
  { key: "notifyNearbyMatches", label: "📍 Nearby matches" },
  { key: "notifyMatchInvites", label: "✉️ Match invites" },
  { key: "notifyTournaments", label: "🏆 Tournament invitations" },
] as const;

type EditProfileFormState = {
  fullName: string;
  age: string;
  gender: string;
  locationName: string;
  country: string;
  locationLat: number | null;
  locationLng: number | null;
  photoUrl: string;
  photoVerified: boolean;
  bio: string;
  skillLevel: number;
  skillLabel: string;
  skillConfidence: string;
  preferredPosition: string;
  availabilityDays: string[];
  availabilityTimes: string[];
  travelRadiusKm: number;
  useCurrentLocation: boolean;
  matchTypePreference: string;
  matchFormatPreference: string;
  tags: string[];
  profileVisibility: "public" | "private";
  notifyInstantPlay: boolean;
  notifyNearbyMatches: boolean;
  notifyMatchInvites: boolean;
  notifyTournaments: boolean;
};

/** Step 0–3 = PROFILE_STEPS; step 4 = bio section (scroll target; tab bar capped at Preferences). */
function getProfileValidationError(
  form: EditProfileFormState,
): { message: string; step: number } | null {
  if (!form.photoUrl.trim()) {
    return { message: "Add a profile photo to complete your profile.", step: 0 };
  }
  if (!form.fullName.trim()) {
    return { message: "Enter your full name.", step: 0 };
  }
  const ageNum = Number.parseInt(form.age.trim(), 10);
  if (!form.age.trim() || !Number.isFinite(ageNum) || ageNum < 13 || ageNum > 100) {
    return { message: "Enter a valid age (13–100).", step: 0 };
  }
  if (!form.gender.trim()) {
    return { message: "Select your gender.", step: 0 };
  }
  if (!form.country.trim()) {
    return { message: "Select the country where you mainly play.", step: 0 };
  }
  if (!hasUserGeo(form)) {
    return { message: "Pick a home location with Search so we can save exact coordinates.", step: 0 };
  }

  const sl = Number(form.skillLevel);
  if (!Number.isFinite(sl) || sl < 1 || sl > 10) {
    return { message: "Select your padel level (1–10).", step: 1 };
  }
  if (!form.skillConfidence) {
    return { message: "Select your confidence on court.", step: 1 };
  }
  if (!form.preferredPosition) {
    return { message: "Select your preferred court position.", step: 1 };
  }

  if (form.availabilityDays.length < 1) {
    return { message: "Choose at least one day you’re available.", step: 2 };
  }
  if (form.availabilityTimes.length < 1) {
    return { message: "Choose at least one time of day (morning, afternoon, or evening).", step: 2 };
  }

  if (!form.matchTypePreference) {
    return { message: "Select how you like to play (match type).", step: 3 };
  }
  if (!form.matchFormatPreference) {
    return { message: "Select your preferred match format.", step: 3 };
  }
  if (form.tags.length < 1) {
    return { message: "Pick at least one vibe tag.", step: 3 };
  }

  if (!form.bio.trim()) {
    return { message: "Write a short bio — other players see this on your profile.", step: 4 };
  }

  return null;
}

function EditProfileSkeleton() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SkeletonBlock height={22} width="45%" rounded={8} />
      <View style={{ height: 12 }} />
      <SkeletonBlock height={12} width="75%" rounded={6} />
      <View style={{ height: 16 }} />
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={i} style={{ marginBottom: 10 }}>
          <SkeletonBlock height={12} width="32%" rounded={6} />
          <View style={{ height: 6 }} />
          <SkeletonBlock height={42} width="100%" rounded={12} />
        </View>
      ))}
    </ScrollView>
  );
}

export function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useSnackbar();
  const USER_EMAIL = getCurrentUserEmail();
  const scrollRef = React.useRef<ScrollView | null>(null);
  const sectionOffsetsRef = React.useRef<number[]>([0, 0, 0, 0, 0]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [pickingPhoto, setPickingPhoto] = React.useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = React.useState(false);
  const [activeStep, setActiveStep] = React.useState(0);
  const [bioLength, setBioLength] = React.useState(0);
  const [form, setForm] = React.useState({
    fullName: "",
    age: "",
    gender: "",
    locationName: "",
    country: "",
    locationLat: null as number | null,
    locationLng: null as number | null,
    photoUrl: "",
    photoVerified: false,
    bio: "",
    skillLevel: 5,
    skillLabel: "intermediate",
    skillConfidence: "",
    preferredPosition: "",
    availabilityDays: [] as string[],
    availabilityTimes: [] as string[],
    travelRadiusKm: 10,
    useCurrentLocation: false,
    matchTypePreference: "",
    matchFormatPreference: "",
    tags: [] as string[],
    profileVisibility: "public" as "public" | "private",
    notifyInstantPlay: true,
    notifyNearbyMatches: true,
    notifyMatchInvites: true,
    notifyTournaments: true,
  });

  React.useEffect(() => {
    let mounted = true;
    api
      .get<UserDto>(`/users/me?email=${encodeURIComponent(USER_EMAIL)}`)
      .then((u) => {
        if (!mounted) return;
        const nextBio = u.bio || "";
        setForm({
          fullName: u.fullName || "",
          age: u.age ? String(u.age) : "",
          gender: u.gender || "",
          locationName: (u.locationName || u.location || "").trim(),
          country: (u.country || "").trim(),
          locationLat: u.locationLat ?? null,
          locationLng: u.locationLng ?? null,
          photoUrl: u.photoUrl || "",
          photoVerified: Boolean(u.photoVerified),
          bio: nextBio,
          skillLevel: u.skillLevel || 5,
          skillLabel: u.skillLabel || "intermediate",
          skillConfidence: u.skillConfidence || "",
          preferredPosition: u.preferredPosition || "",
          availabilityDays: u.availabilityDays || [],
          availabilityTimes: u.availabilityTimes || [],
          travelRadiusKm: u.travelRadiusKm || 10,
          useCurrentLocation: Boolean(u.useCurrentLocation),
          matchTypePreference: u.matchTypePreference || "",
          matchFormatPreference: u.matchFormatPreference || "",
          tags: u.tags || [],
          profileVisibility: (u.profileVisibility as "public" | "private") || "public",
          notifyInstantPlay: u.notifyInstantPlay !== false,
          notifyNearbyMatches: u.notifyNearbyMatches !== false,
          notifyMatchInvites: u.notifyMatchInvites !== false,
          notifyTournaments: u.notifyTournaments !== false,
        });
        setBioLength(nextBio.length);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [USER_EMAIL]);

  const onSave = async () => {
    const validation = getProfileValidationError(form);
    if (validation) {
      showSnackbar(validation.message, { type: "error" });
      setActiveStep(validation.step <= 3 ? validation.step : 3);
      scrollToSection(validation.step);
      return;
    }
    try {
      setSaving(true);
      await api.patch("/users/me", {
        email: USER_EMAIL,
        fullName: form.fullName.trim(),
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        location: form.locationName.trim() || null,
        locationName: form.locationName.trim() || null,
        locationLat: form.locationLat,
        locationLng: form.locationLng,
        country: form.country.trim() || null,
        bio: form.bio.trim(),
        photoUrl: form.photoUrl.trim() || null,
        photoVerified: form.photoVerified,
        skillLevel: Number(form.skillLevel),
        skillLabel: padelSkillApiLabel(Number(form.skillLevel)),
        skillConfidence: form.skillConfidence || null,
        preferredPosition: form.preferredPosition || null,
        availabilityDays: form.availabilityDays,
        availabilityTimes: form.availabilityTimes,
        travelRadiusKm: Number(form.travelRadiusKm),
        useCurrentLocation: form.useCurrentLocation,
        matchTypePreference: form.matchTypePreference || null,
        matchFormatPreference: form.matchFormatPreference || null,
        tags: form.tags,
        profileVisibility: form.profileVisibility,
        notifyInstantPlay: form.notifyInstantPlay,
        notifyNearbyMatches: form.notifyNearbyMatches,
        notifyMatchInvites: form.notifyMatchInvites,
        notifyTournaments: form.notifyTournaments,
        profileComplete: true,
      });
      showSnackbar("Profile saved", { type: "success" });
      navigation.goBack();
    } catch {
      showSnackbar("Could not save profile", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const onPickPhoto = async () => {
    try {
      setPickingPhoto(true);
      const result = await launchImageLibrary({
        mediaType: "photo",
        selectionLimit: 1,
        includeBase64: true,
        quality: 0.35,
        maxWidth: 240,
        maxHeight: 240,
      });
      if (result.didCancel) return;
      const asset = result.assets?.[0];
      if (!asset?.base64) {
        showSnackbar("Could not read selected image.", { type: "error" });
        return;
      }
      const mime = asset.type || "image/jpeg";
      const dataUrl = `data:${mime};base64,${asset.base64}`;
      if (dataUrl.length > 120000) {
        showSnackbar("Selected image is too large. Please choose a smaller one.", { type: "error" });
        return;
      }
      setForm((prev) => ({
        ...prev,
        photoUrl: dataUrl,
        photoVerified: true,
      }));
      showSnackbar("Profile photo selected", { type: "success" });
    } catch {
      showSnackbar("Could not pick image", { type: "error" });
    } finally {
      setPickingPhoto(false);
    }
  };

  const toggleArray = React.useCallback((field: "availabilityDays" | "availabilityTimes" | "tags", value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((entry) => entry !== value)
        : [...prev[field], value],
    }));
  }, []);

  const setSectionOffset = (index: number, y: number) => {
    sectionOffsetsRef.current[index] = y;
  };

  const scrollToSection = (index: number) => {
    const y = Math.max(0, (sectionOffsetsRef.current[index] || 0) - 116);
    scrollRef.current?.scrollTo({ y, animated: true });
  };

  const onScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y + 160;
    const offsets = sectionOffsetsRef.current;
    let next = 0;
    for (let i = 0; i < offsets.length; i += 1) {
      if (y >= offsets[i]) next = i;
    }
    const capped = Math.min(next, PROFILE_STEPS.length - 1);
    if (capped !== activeStep) setActiveStep(capped);
  };

  if (loading) return <EditProfileSkeleton />;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        onScroll={onScroll}
        scrollEventThrottle={16}
        stickyHeaderIndices={[0]}
      >
        <View style={styles.stickyHeader}>
          <View style={styles.progressLabels}>
            {PROFILE_STEPS.map((step, index) => (
              <Pressable key={step} onPress={() => scrollToSection(index)}>
                <Text style={[styles.progressLabel, index <= activeStep && styles.progressLabelActive]}>{step}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.progressRow}>
            {PROFILE_STEPS.map((step, index) => (
              <View key={step} style={[styles.progressBar, index <= activeStep && styles.progressBarActive]} />
            ))}
          </View>
        </View>

        <SectionCard
          emoji="👤"
          title="Basics"
          subtitle="Photo, name, age, gender, country, and home location are required"
          onLayout={(y) => setSectionOffset(0, y)}
        >
          <View style={styles.photoRow}>
            {form.photoUrl ? (
              <Image source={{ uri: form.photoUrl }} style={styles.photoImage} />
            ) : (
              <View style={styles.photoFallback}>
                <Ionicons name="camera-outline" size={20} color={COLORS.textMuted} />
              </View>
            )}
            {form.photoVerified ? (
              <View style={styles.photoVerifiedDot}>
                <Ionicons name="checkmark" size={12} color={COLORS.card} />
              </View>
            ) : null}
            <View style={styles.photoMeta}>
              <Text style={styles.photoTitle}>
                Profile photo{" "}
                <Text style={styles.requiredMark}>*</Text>
              </Text>
              <Text style={styles.photoSubtitle}>Required — pick a clear photo from your gallery</Text>
              <Pressable
                style={[styles.photoInlineBtn, pickingPhoto && styles.saveBtnDisabled]}
                onPress={onPickPhoto}
                disabled={pickingPhoto}
              >
                <Ionicons name="image-outline" size={12} color={COLORS.card} />
                <Text style={styles.photoInlineBtnText}>
                  {pickingPhoto ? "Opening..." : form.photoUrl ? "Change" : "Upload"}
                </Text>
              </Pressable>
            </View>
          </View>
          <Field
            label="Full Name"
            labelRequired
            value={form.fullName}
            onChangeText={(v) => setForm((p) => ({ ...p, fullName: v }))}
          />
          <Field
            label="Age"
            labelRequired
            value={form.age}
            onChangeText={(v) => setForm((p) => ({ ...p, age: v.replace(/\D/g, "").slice(0, 2) }))}
            keyboardType="number-pad"
          />
          <FieldLabel text="Home location" required />
          <Text style={styles.locationHint}>
            {userLocationLabel(form) || "No place selected yet — use search for a map pin (exact coordinates)."}
          </Text>
          {hasUserGeo(form) ? (
            <Text style={styles.coordsHint}>
              {form.locationLat?.toFixed(5)}, {form.locationLng?.toFixed(5)}
            </Text>
          ) : null}
          <Pressable style={styles.pickLocationBtn} onPress={() => setLocationPickerOpen(true)}>
            <Ionicons name="location-outline" size={14} color={COLORS.primaryDark} />
            <Text style={styles.pickLocationBtnText}>Search & select location</Text>
          </Pressable>
          <FieldLabel text="Country" required />
          <Text style={styles.countryHint}>
            Used for Discover → Players. Choose where you mainly play.
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.countryChipsRow}
          >
            {USER_COUNTRY_CHOICES.map((c) => (
              <Chip
                key={c.value}
                label={c.label}
                selected={form.country === c.value}
                onPress={() => setForm((p) => ({ ...p, country: c.value }))}
              />
            ))}
          </ScrollView>
          <FieldLabel text="Gender" required />
          <View style={styles.chipsRow}>
            {["male", "female", "other"].map((g) => (
              <Chip
                key={g}
                label={capitalize(g)}
                selected={form.gender === g}
                onPress={() => setForm((p) => ({ ...p, gender: g }))}
              />
            ))}
          </View>
        </SectionCard>

        <SectionCard
          emoji="🎾"
          title="Your Padel Level"
          subtitle="Select your level — 1 = Pro, 10 = Just starting. Also set confidence and court position."
          onLayout={(y) => setSectionOffset(1, y)}
        >
          <FieldLabel text="Padel level (1–10)" required />
          <PadelSkillLevelGrid
            value={form.skillLevel}
            onChange={(n) =>
              setForm((p) => ({ ...p, skillLevel: n, skillLabel: padelSkillApiLabel(n) }))
            }
          />
          <PadelSkillLevelSummary skillLevel={form.skillLevel} />

          <FieldLabel text="Confidence on court" required />
          <View style={styles.chipsRow}>
            {CONFIDENCE.map((c) => (
              <Chip
                key={c.value}
                label={c.label}
                selected={form.skillConfidence === c.value}
                onPress={() => setForm((p) => ({ ...p, skillConfidence: c.value }))}
              />
            ))}
          </View>

          <FieldLabel text="Court position" required />
          <View style={styles.chipsRow}>
            {POSITIONS.map((pos) => (
              <Chip
                key={pos.value}
                label={pos.label}
                selected={form.preferredPosition === pos.value}
                onPress={() => setForm((p) => ({ ...p, preferredPosition: pos.value }))}
              />
            ))}
          </View>
        </SectionCard>

        <SectionCard
          emoji="📅"
          title="Availability"
          subtitle="Pick at least one day and one time window"
          onLayout={(y) => setSectionOffset(2, y)}
        >
          <FieldLabel text="Days available" required />
          <View style={styles.daysRow}>
            {DAYS.map((day) => (
              <Pressable
                key={day}
                style={[styles.dayBtn, form.availabilityDays.includes(day) && styles.dayBtnActive]}
                onPress={() => toggleArray("availabilityDays", day)}
              >
                <Text style={[styles.dayBtnText, form.availabilityDays.includes(day) && styles.dayBtnTextActive]}>{DAY_LABELS[day]}</Text>
              </Pressable>
            ))}
          </View>

          <FieldLabel text="Best time of day" required />
          <View style={styles.timeGrid}>
            {TIMES.map((time) => (
              <Pressable
                key={time.value}
                style={[styles.timeCard, form.availabilityTimes.includes(time.value) && styles.timeCardActive]}
                onPress={() => toggleArray("availabilityTimes", time.value)}
              >
                <Text style={styles.timeEmoji}>{time.emoji}</Text>
                <Text style={styles.timeLabel}>{time.value}</Text>
                <Text style={styles.timeHint}>{time.hint}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Travel radius</Text>
          <View style={styles.travelRow}>
            {TRAVEL_OPTIONS.map((km) => (
              <Pressable
                key={km}
                style={[styles.travelBtn, form.travelRadiusKm === km && styles.travelBtnActive]}
                onPress={() => setForm((p) => ({ ...p, travelRadiusKm: km }))}
              >
                <Text style={[styles.travelBtnText, form.travelRadiusKm === km && styles.travelBtnTextActive]}>{km}km</Text>
              </Pressable>
            ))}
          </View>

          <ToggleLine
            label="Use current location for matching"
            value={form.useCurrentLocation}
            onToggle={() => setForm((p) => ({ ...p, useCurrentLocation: !p.useCurrentLocation }))}
          />
        </SectionCard>

        <SectionCard
          emoji="🎯"
          title="How do you like to play?"
          subtitle="Match type, format, and at least one vibe — all required"
          onLayout={(y) => setSectionOffset(3, y)}
        >
          <FieldLabel text="Match type 🎮" required />
          <View style={styles.chipsRow}>
            {MATCH_TYPES.map((type) => (
              <Chip
                key={type.value}
                label={type.label}
                selected={form.matchTypePreference === type.value}
                onPress={() => setForm((p) => ({ ...p, matchTypePreference: type.value }))}
              />
            ))}
          </View>

          <FieldLabel text="Match format 🧩" required />
          <View style={styles.chipsRow}>
            {MATCH_FORMATS.map((format) => (
              <Chip
                key={format.value}
                label={format.label}
                selected={form.matchFormatPreference === format.value}
                onPress={() => setForm((p) => ({ ...p, matchFormatPreference: format.value }))}
              />
            ))}
          </View>

          <FieldLabel text="Your vibe ✨" required />
          <View style={styles.chipsRow}>
            {TAG_OPTIONS.map((tag) => (
              <Chip
                key={tag.value}
                label={tag.label}
                selected={form.tags.includes(tag.value)}
                onPress={() => toggleArray("tags", tag.value)}
              />
            ))}
          </View>
        </SectionCard>

        <SectionCard emoji="🔒" title="Who can see your profile?" subtitle="">
          <View style={styles.visibilityGrid}>
            <Pressable
              style={[styles.visibilityCard, form.profileVisibility === "public" && styles.visibilityCardActive]}
              onPress={() => setForm((p) => ({ ...p, profileVisibility: "public" }))}
            >
              <Ionicons
                name="globe-outline"
                size={18}
                color={form.profileVisibility === "public" ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={styles.visibilityTitle}>Public</Text>
              <Text style={styles.visibilityMeta}>Anyone can find you</Text>
            </Pressable>
            <Pressable
              style={[styles.visibilityCard, form.profileVisibility === "private" && styles.visibilityCardActive]}
              onPress={() => setForm((p) => ({ ...p, profileVisibility: "private" }))}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={form.profileVisibility === "private" ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={styles.visibilityTitle}>Private</Text>
              <Text style={styles.visibilityMeta}>Only friends can view</Text>
            </Pressable>
          </View>
        </SectionCard>

        <SectionCard emoji="🔔" title="Notifications" subtitle="">
          {NOTIF_ITEMS.map((item) => (
            <ToggleLine
              key={item.key}
              label={item.label}
              value={form[item.key]}
              onToggle={() => setForm((p) => ({ ...p, [item.key]: !p[item.key] }))}
            />
          ))}
        </SectionCard>

        <SectionCard
          emoji="💬"
          title="Tell us about you"
          subtitle="Required — a short intro other players will see"
          onLayout={(y) => setSectionOffset(4, y)}
        >
          <Field
            label="Bio"
            labelRequired
            value={form.bio}
            onChangeText={(v) => {
              const next = v.slice(0, 300);
              setForm((p) => ({ ...p, bio: next }));
              setBioLength(next.length);
            }}
            multiline
          />
          <Text style={styles.counterText}>{bioLength}/300</Text>
        </SectionCard>
      </ScrollView>

      <View style={[styles.saveBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={onSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Profile"}</Text>
        </Pressable>
        <Text style={styles.saveHint}>
          Fields marked <Text style={styles.requiredMark}>*</Text> are required to save. You can update anytime after that.
        </Text>
      </View>
      <LocationSearchModal
        visible={locationPickerOpen}
        title="Pick your location"
        initialQuery={form.locationName}
        onClose={() => setLocationPickerOpen(false)}
        onPick={(loc) => {
          const lat = loc.lat;
          const lon = loc.lon;
          if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon)) {
            return;
          }
          const label = (loc.label || loc.city || loc.address || "").trim();
          setForm((p) => ({
            ...p,
            locationName: label,
            locationLat: lat,
            locationLng: lon,
          }));
        }}
      />
    </KeyboardAvoidingView>
  );
}

function SectionCard({
  emoji,
  title,
  subtitle,
  children,
  onLayout,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onLayout?: (y: number) => void;
}) {
  return (
    <View
      style={styles.sectionCard}
      onLayout={(event) => {
        if (onLayout) onLayout(event.nativeEvent.layout.y);
      }}
    >
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>
          {emoji} {title}
        </Text>
        {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}

function ToggleLine({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <Pressable style={styles.toggleLine} onPress={onToggle}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.togglePill, value && styles.togglePillOn]}>
        <Ionicons name={value ? "checkmark" : "close"} size={12} color={value ? COLORS.card : COLORS.textMuted} />
      </View>
    </Pressable>
  );
}

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {text}
      {required ? (
        <>
          {" "}
          <Text style={styles.requiredMark}>*</Text>
        </>
      ) : null}
    </Text>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, selected && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  labelRequired,
  value,
  onChangeText,
  multiline,
  keyboardType,
}: {
  label: string;
  labelRequired?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View style={styles.fieldWrap}>
      <FieldLabel text={label} required={labelRequired} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, multiline && styles.inputMultiline]}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholderTextColor={COLORS.textMuted}
      />
    </View>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingTop: 14, paddingBottom: 150 },
  stickyHeader: {
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: "600" },
  progressLabelActive: { color: COLORS.primary },
  progressRow: { flexDirection: "row", gap: 4 },
  progressBar: { flex: 1, height: 4, borderRadius: 999, backgroundColor: COLORS.border },
  progressBarActive: { backgroundColor: COLORS.primary },
  sectionCard: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  sectionHead: { marginBottom: 8 },
  sectionTitle: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  sectionSubtitle: { marginTop: 2, color: COLORS.textMuted, fontSize: 10 },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  photoImage: { width: 62, height: 62, borderRadius: 31 },
  photoFallback: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.border,
  },
  photoVerifiedDot: {
    position: "absolute",
    left: 46,
    top: 46,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  photoMeta: { marginLeft: 12, flex: 1 },
  photoTitle: { color: COLORS.text, fontSize: 12, fontWeight: "700" },
  photoSubtitle: { marginTop: 2, color: COLORS.textMuted, fontSize: 10 },
  photoInlineBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  photoInlineBtnText: { color: COLORS.card, fontSize: 11, fontWeight: "700" },
  fieldWrap: { marginBottom: 10 },
  fieldLabel: { marginBottom: 6, color: COLORS.textSubtle, fontSize: 11, fontWeight: "600" },
  requiredMark: { color: COLORS.dangerText, fontWeight: "700" },
  locationHint: {
    marginBottom: 6,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  coordsHint: { marginBottom: 8, color: COLORS.textMuted, fontSize: 11 },
  countryHint: { marginBottom: 8, color: COLORS.textMuted, fontSize: 11, lineHeight: 15 },
  countryChipsRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 10, paddingRight: 8 },
  pickLocationBtn: {
    marginTop: -1,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  pickLocationBtnText: { color: COLORS.primaryDark, fontSize: 11, fontWeight: "700" },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: COLORS.text,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: "top" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 999,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  chipText: { color: COLORS.text, fontSize: 11, fontWeight: "600" },
  chipTextActive: { color: COLORS.primaryDark },
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  dayBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
  },
  dayBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  dayBtnText: { color: COLORS.text, fontSize: 10, fontWeight: "700" },
  dayBtnTextActive: { color: COLORS.card },
  timeGrid: { flexDirection: "row", gap: 8, marginBottom: 10 },
  timeCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    paddingVertical: 10,
  },
  timeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  timeEmoji: { fontSize: 20 },
  timeLabel: { marginTop: 2, fontSize: 11, color: COLORS.text, fontWeight: "700" },
  timeHint: { marginTop: 1, fontSize: 10, color: COLORS.textMuted },
  travelRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  travelBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
    paddingVertical: 8,
  },
  travelBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  travelBtnText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },
  travelBtnTextActive: { color: COLORS.primaryDark },
  visibilityGrid: { flexDirection: "row", gap: 8 },
  visibilityCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    padding: 10,
  },
  visibilityCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  visibilityTitle: { marginTop: 6, color: COLORS.text, fontSize: 12, fontWeight: "700" },
  visibilityMeta: { marginTop: 2, color: COLORS.textMuted, fontSize: 9 },
  toggleLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
  },
  toggleLabel: { color: COLORS.text, fontSize: 12, fontWeight: "500", flex: 1, marginRight: 8 },
  togglePill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.border,
  },
  togglePillOn: { backgroundColor: COLORS.primary },
  counterText: { textAlign: "right", color: COLORS.textMuted, fontSize: 11 },
  saveBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  saveBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText: { color: COLORS.card, fontSize: 14, fontWeight: "800" },
  saveHint: { marginTop: 4, textAlign: "center", color: COLORS.textMuted, fontSize: 11 },
});
