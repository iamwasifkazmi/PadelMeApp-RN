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
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { useSnackbar } from "../components/Snackbar";
import { MatchDto } from "../lib/types";
import { LocationSearchModal } from "../components/LocationSearchModal";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";
import { hasUserGeo, userLocationLabel } from "../lib/userLocation";

type Mode = "instant" | "scheduled" | "recurring";
type MatchTypeValue = "singles" | "doubles" | "mixed_doubles";
type SkillValue = "any" | "beginner" | "intermediate" | "advanced";
type VisibilityValue = "public" | "invite_only";
type GenderRequirementValue = "any" | "male" | "female" | "mixed";
type VerificationValue = "none" | "photo" | "id";

type FormState = {
  mode: Mode;
  matchType: MatchTypeValue;
  title: string;
  date: string;
  timeLabel: string;
  durationMinutes: 60 | 90 | 120;
  locationName: string;
  locationAddress: string;
  locationLat: number | null;
  locationLng: number | null;
  skillLevel: SkillValue;
  visibility: VisibilityValue;
  tags: string[];
  notes: string;
  genderRequirement: GenderRequirementValue;
  ageMinText: string;
  ageMaxText: string;
  skillRangeMinText: string;
  skillRangeMaxText: string;
  minRatingThresholdText: string;
  verificationRequirement: VerificationValue;
};

const MATCH_TYPES: Array<{
  value: MatchTypeValue;
  label: string;
  icon: string;
  sub: string;
}> = [
  { value: "singles", label: "Singles", icon: "👤", sub: "1v1 · 2 players" },
  { value: "doubles", label: "Doubles", icon: "👥", sub: "2v2 · 4 players" },
  { value: "mixed_doubles", label: "Mixed", icon: "🤝", sub: "2v2 · mixed" },
];

const SKILL_OPTIONS: Array<{ value: SkillValue; label: string }> = [
  { value: "any", label: "🌍 Any Level" },
  { value: "beginner", label: "🌱 Beginner" },
  { value: "intermediate", label: "⚡ Mid" },
  { value: "advanced", label: "🏆 Advanced" },
];

const TAG_OPTIONS = ["🔥 Competitive", "🤝 Social", "🎯 Training", "😎 Chill", "🌱 Beginner-friendly"];

function getSteps(mode: Mode) {
  if (mode === "instant") return ["mode", "setup", "players"] as const;
  return ["mode", "setup", "when", "players"] as const;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function CreateMatchScreen({ navigation, route }: { navigation: any; route?: any }) {
  const { showSnackbar } = useSnackbar();
  const USER_EMAIL = getCurrentUserEmail();
  const recurring = Boolean(route?.params?.recurring);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [pickerField, setPickerField] = React.useState<"date" | "time" | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<FormState>({
    mode: recurring ? "recurring" : "scheduled",
    matchType: "doubles",
    title: "Padel Doubles",
    date: formatDate(new Date()),
    timeLabel: "19:30",
    durationMinutes: 90,
    locationName: "",
    locationAddress: "",
    locationLat: null,
    locationLng: null,
    skillLevel: "any",
    visibility: "public",
    tags: [],
    notes: "",
    genderRequirement: "any",
    ageMinText: "",
    ageMaxText: "",
    skillRangeMinText: "",
    skillRangeMaxText: "",
    minRatingThresholdText: "",
    verificationRequirement: "none",
  });

  const steps = getSteps(form.mode);
  const currentStep = steps[stepIndex];

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const maxPlayers = form.matchType === "singles" ? 2 : 4;
  const canNext =
    currentStep === "mode"
      ? Boolean(form.mode)
      : currentStep === "setup"
        ? Boolean(
            form.matchType &&
              form.title.trim().length >= 1 &&
              hasUserGeo({ locationLat: form.locationLat, locationLng: form.locationLng }),
          )
        : currentStep === "when"
          ? Boolean(form.date && form.timeLabel)
          : true;

  const onNext = () => {
    if (!canNext) {
      showSnackbar("Please complete this step first.", { type: "error" });
      return;
    }
    if (stepIndex < steps.length - 1) setStepIndex((s) => s + 1);
  };

  const onBack = () => {
    if (stepIndex === 0) navigation.goBack();
    else setStepIndex((s) => s - 1);
  };

  const onCreate = async () => {
    if (!form.title.trim()) {
      showSnackbar("Match title is required.", { type: "error" });
      return;
    }
    if (!hasUserGeo({ locationLat: form.locationLat, locationLng: form.locationLng })) {
      showSnackbar("Pick a venue with Search so we save exact coordinates.", { type: "error" });
      return;
    }

    try {
      setSaving(true);
      const ageMin = Number.parseInt(form.ageMinText.trim(), 10);
      const ageMax = Number.parseInt(form.ageMaxText.trim(), 10);
      const skillRangeMin = Number.parseInt(form.skillRangeMinText.trim(), 10);
      const skillRangeMax = Number.parseInt(form.skillRangeMaxText.trim(), 10);
      const minRatingThreshold = Number.parseFloat(form.minRatingThresholdText.trim());
      const created = await api.post<MatchDto>("/matches", {
        title: form.title.trim(),
        date: form.date,
        timeLabel: form.timeLabel,
        locationName: form.locationName.trim(),
        locationAddress: form.locationAddress.trim(),
        locationLat: form.locationLat!,
        locationLng: form.locationLng!,
        durationMinutes: form.durationMinutes,
        skillLevel: form.skillLevel,
        visibility: form.visibility,
        tags: form.tags,
        notes: form.notes.trim() || undefined,
        isInstant: form.mode === "instant",
        maxPlayers,
        matchType: form.matchType,
        createdByEmail: USER_EMAIL,
        teamA: form.matchType !== "singles" && USER_EMAIL ? [USER_EMAIL] : [],
        genderRequirement: form.genderRequirement,
        verificationRequirement: form.verificationRequirement,
        ...(form.ageMinText.trim() && Number.isFinite(ageMin) ? { ageMin } : {}),
        ...(form.ageMaxText.trim() && Number.isFinite(ageMax) ? { ageMax } : {}),
        ...(form.skillRangeMinText.trim() && Number.isFinite(skillRangeMin)
          ? { skillRangeMin }
          : {}),
        ...(form.skillRangeMaxText.trim() && Number.isFinite(skillRangeMax)
          ? { skillRangeMax }
          : {}),
        ...(form.minRatingThresholdText.trim() && Number.isFinite(minRatingThreshold)
          ? { minRatingThreshold }
          : {}),
      });
      showSnackbar(form.mode === "instant" ? "Looking for players ⚡" : "Match created! 🎾", {
        type: "success",
      });
      navigation.replace("MatchDetail", { id: created.id });
    } catch {
      showSnackbar("Failed to create match", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const pickerValue = React.useMemo(() => {
    if (pickerField === "date") return new Date(`${form.date}T12:00:00`);
    const [h, m] = form.timeLabel.split(":").map((v) => Number(v || 0));
    const d = new Date();
    d.setHours(h || 0);
    d.setMinutes(m || 0);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
  }, [pickerField, form.date, form.timeLabel]);

  const onPickerChange = (_event: any, selected?: Date) => {
    if (!pickerField) return;
    if (selected) {
      if (pickerField === "date") update("date", formatDate(selected));
      else update("timeLabel", formatTime(selected));
    }
    if (Platform.OS !== "ios") setPickerField(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={17} color={COLORS.text} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Create Padel Match</Text>
          <Text style={styles.headerSub}>
            Step {stepIndex + 1} of {steps.length}
          </Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        {steps.map((step, idx) => (
          <View
            key={step}
            style={[styles.progressDot, idx <= stepIndex && styles.progressDotActive]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {currentStep === "mode" ? (
          <>
            <Text style={styles.stepTitle}>How do you want to play? 🎾</Text>
            <ModeCard
              selected={form.mode === "instant"}
              title="⚡ Play Now"
              subtitle="Find players instantly"
              onPress={() => update("mode", "instant")}
            />
            <ModeCard
              selected={form.mode === "scheduled"}
              title="📅 Schedule a Match"
              subtitle="Pick date, time and venue"
              onPress={() => update("mode", "scheduled")}
            />
            <ModeCard
              selected={form.mode === "recurring"}
              title="🔁 Recurring Match"
              subtitle="Weekly or repeating series"
              onPress={() => update("mode", "recurring")}
            />
          </>
        ) : null}

        {currentStep === "setup" ? (
          <>
            <Text style={styles.stepTitle}>Match Setup 🏓</Text>
            <SectionLabel text="Format" />
            <View style={styles.optionGrid3}>
              {MATCH_TYPES.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => update("matchType", item.value)}
                  style={[styles.optionCard, form.matchType === item.value && styles.optionCardActive]}
                >
                  <Text style={styles.optionEmoji}>{item.icon}</Text>
                  <Text style={[styles.optionTitle, form.matchType === item.value && styles.optionTitleActive]}>
                    {item.label}
                  </Text>
                  <Text style={styles.optionSub}>{item.sub}</Text>
                </Pressable>
              ))}
            </View>

            <Field
              label="Match Name"
              value={form.title}
              onChangeText={(v) => update("title", v)}
              placeholder="Padel Doubles"
            />

            <SectionLabel text="Duration" />
            <View style={styles.row}>
              {[60, 90, 120].map((m) => (
                <Pressable
                  key={m}
                  style={[styles.chip, form.durationMinutes === m && styles.chipActive]}
                  onPress={() => update("durationMinutes", m as FormState["durationMinutes"])}
                >
                  <Text style={[styles.chipText, form.durationMinutes === m && styles.chipTextActive]}>
                    {m}m
                  </Text>
                </Pressable>
              ))}
            </View>

            <SectionLabel text="Venue (exact map pin) *" />
            <Text style={styles.venueHint}>
              {userLocationLabel({
                locationName: form.locationName,
                locationAddress: form.locationAddress,
                locationLat: form.locationLat,
                locationLng: form.locationLng,
              }) || "Search for a club or court — coordinates are required."}
            </Text>
            {hasUserGeo({ locationLat: form.locationLat, locationLng: form.locationLng }) ? (
              <Text style={styles.coordsHint}>
                {form.locationLat?.toFixed(5)}, {form.locationLng?.toFixed(5)}
              </Text>
            ) : null}
            <Pressable style={styles.pickLocationBtn} onPress={() => setLocationPickerOpen(true)}>
              <Ionicons name="location-outline" size={14} color={COLORS.primaryDark} />
              <Text style={styles.pickLocationBtnText}>Search & select location</Text>
            </Pressable>
          </>
        ) : null}

        {currentStep === "when" ? (
          <>
            <Text style={styles.stepTitle}>When & Where? 📍</Text>
            <View style={styles.row}>
              <View style={styles.flexOne}>
                <SectionLabel text="Date" />
                <Pressable style={styles.dateField} onPress={() => setPickerField("date")}>
                  <Text style={styles.dateText}>{form.date}</Text>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.iconMuted} />
                </Pressable>
              </View>
              <View style={styles.flexOne}>
                <SectionLabel text="Time" />
                <Pressable style={styles.dateField} onPress={() => setPickerField("time")}>
                  <Text style={styles.dateText}>{form.timeLabel}</Text>
                  <Ionicons name="time-outline" size={16} color={COLORS.iconMuted} />
                </Pressable>
              </View>
            </View>
          </>
        ) : null}

        {currentStep === "players" ? (
          <>
            <Text style={styles.stepTitle}>Players & Skill 👥</Text>
            <SectionLabel text="Skill Level" />
            <View style={styles.optionGrid2}>
              {SKILL_OPTIONS.map((skill) => (
                <Pressable
                  key={skill.value}
                  style={[styles.choiceBtn, form.skillLevel === skill.value && styles.choiceBtnActive]}
                  onPress={() => update("skillLevel", skill.value)}
                >
                  <Text style={[styles.choiceText, form.skillLevel === skill.value && styles.choiceTextActive]}>
                    {skill.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <SectionLabel text="Who can join?" />
            <View style={styles.row}>
              <Pressable
                style={[styles.flexOne, styles.choiceBox, form.visibility === "public" && styles.choiceBoxActive]}
                onPress={() => update("visibility", "public")}
              >
                <Text style={styles.choiceBoxTitle}>🌍 Public</Text>
                <Text style={styles.choiceBoxSub}>Anyone can join</Text>
              </Pressable>
              <Pressable
                style={[styles.flexOne, styles.choiceBox, form.visibility === "invite_only" && styles.choiceBoxActive]}
                onPress={() => update("visibility", "invite_only")}
              >
                <Text style={styles.choiceBoxTitle}>🔒 Invite Only</Text>
                <Text style={styles.choiceBoxSub}>Friends/invites only</Text>
              </Pressable>
            </View>

            <SectionLabel text="Vibe (optional)" />
            <View style={styles.tagsWrap}>
              {TAG_OPTIONS.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={[styles.tagChip, form.tags.includes(tag) && styles.tagChipActive]}
                >
                  <Text style={[styles.tagChipText, form.tags.includes(tag) && styles.tagChipTextActive]}>{tag}</Text>
                </Pressable>
              ))}
            </View>

            <SectionLabel text="Player requirements (optional, Base44-style)" />
            <Text style={styles.venueHint}>
              Stricter joins: gender, age, skill band (1 = elite, 10 = beginner), min star rating, ID/photo.
            </Text>
            <View style={[styles.row, styles.rowWrap]}>
              {(
                [
                  ["any", "Any gender"],
                  ["male", "Male"],
                  ["female", "Female"],
                  ["mixed", "Mixed pairs"],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  style={[styles.chip, form.genderRequirement === value && styles.chipActive]}
                  onPress={() => update("genderRequirement", value)}
                >
                  <Text style={[styles.chipText, form.genderRequirement === value && styles.chipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.row}>
              <View style={styles.flexOne}>
                <Field
                  label="Min age"
                  value={form.ageMinText}
                  onChangeText={(v) => update("ageMinText", v.replace(/[^\d]/g, ""))}
                  placeholder="—"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.flexOne}>
                <Field
                  label="Max age"
                  value={form.ageMaxText}
                  onChangeText={(v) => update("ageMaxText", v.replace(/[^\d]/g, ""))}
                  placeholder="—"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.flexOne}>
                <Field
                  label="Skill min (1–10)"
                  value={form.skillRangeMinText}
                  onChangeText={(v) => update("skillRangeMinText", v.replace(/[^\d]/g, ""))}
                  placeholder="—"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.flexOne}>
                <Field
                  label="Skill max (1–10)"
                  value={form.skillRangeMaxText}
                  onChangeText={(v) => update("skillRangeMaxText", v.replace(/[^\d]/g, ""))}
                  placeholder="—"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <Field
              label="Min average player rating (stars)"
              value={form.minRatingThresholdText}
              onChangeText={(v) => update("minRatingThresholdText", v.replace(/[^\d.]/g, ""))}
              placeholder="e.g. 4"
              keyboardType="decimal-pad"
            />
            <View style={styles.row}>
              {(
                [
                  ["none", "No verify"],
                  ["photo", "Photo ✓"],
                  ["id", "ID ✓"],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  style={[styles.chip, form.verificationRequirement === value && styles.chipActive]}
                  onPress={() => update("verificationRequirement", value)}
                >
                  <Text
                    style={[styles.chipText, form.verificationRequirement === value && styles.chipTextActive]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Field
              label="Notes (optional)"
              value={form.notes}
              onChangeText={(v) => update("notes", v)}
              placeholder="Court number, meeting point, etc."
              multiline
            />

            <View style={styles.previewCard}>
              <Text style={styles.previewKicker}>Match Preview</Text>
              <Text style={styles.previewTitle}>{form.title || "Padel Match"}</Text>
              <Text style={styles.previewMeta}>
                {form.mode === "instant"
                  ? "⚡ Instant"
                  : `📅 ${form.date} · ${form.timeLabel}`}
              </Text>
              <Text style={styles.previewMeta}>
                📍 {userLocationLabel(form) || "Venue"} ·{" "}
                {form.matchType === "singles" ? "Singles" : form.matchType === "mixed_doubles" ? "Mixed Doubles" : "Doubles"} ·{" "}
                {form.durationMinutes}min
              </Text>
            </View>
          </>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomBar}>
        {stepIndex < steps.length - 1 ? (
          <Pressable style={styles.ctaBtn} onPress={onNext}>
            <Text style={styles.ctaText}>Continue</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.ctaBtn, saving && styles.ctaDisabled]}
            disabled={saving}
            onPress={onCreate}
          >
            <Text style={styles.ctaText}>{saving ? "Creating..." : form.mode === "instant" ? "Find Players ⚡" : "Create Match 🎾"}</Text>
          </Pressable>
        )}
      </View>

      {pickerField ? (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={pickerValue}
            mode={pickerField === "date" ? "date" : "time"}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onPickerChange}
          />
          {Platform.OS === "ios" ? (
            <Pressable style={styles.doneBtn} onPress={() => setPickerField(null)}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <LocationSearchModal
        visible={locationPickerOpen}
        title="Pick match location"
        initialQuery={form.locationName || form.locationAddress}
        onClose={() => setLocationPickerOpen(false)}
        onPick={(loc) => {
          const lat = loc.lat;
          const lon = loc.lon;
          if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon)) {
            return;
          }
          setForm((p) => ({
            ...p,
            locationName: (loc.label || loc.city || loc.address || "").trim(),
            locationAddress: loc.address,
            locationLat: lat,
            locationLng: lon,
          }));
        }}
      />
    </View>
  );
}

function ModeCard({
  selected,
  title,
  subtitle,
  onPress,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.modeCard, selected && styles.modeCardActive]} onPress={onPress}>
      <View>
        <Text style={[styles.modeTitle, selected && styles.modeTitleActive]}>{title}</Text>
        <Text style={styles.modeSubtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.modeDot, selected && styles.modeDotActive]} />
    </Pressable>
  );
}

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
}) {
  return (
    <View style={styles.fieldWrap}>
      <SectionLabel text={label} />
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: COLORS.text, fontSize: 17, fontWeight: "800" },
  headerSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  progressRow: { paddingHorizontal: 16, flexDirection: "row", gap: 6, marginTop: 10, marginBottom: 8 },
  progressDot: { flex: 1, height: 4, borderRadius: 999, backgroundColor: COLORS.border },
  progressDotActive: { backgroundColor: COLORS.primary },
  content: { paddingHorizontal: 16, paddingBottom: 20 },
  stepTitle: { fontSize: 26, fontWeight: "800", color: COLORS.text, marginTop: 10, marginBottom: 9 },
  modeCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  modeTitle: { color: COLORS.text, fontWeight: "800", fontSize: 14 },
  modeTitleActive: { color: COLORS.primaryDark },
  modeSubtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  modeDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: COLORS.borderStrong },
  modeDotActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  sectionLabel: { marginTop: 4, marginBottom: 6, color: COLORS.textSubtle, fontSize: 12, fontWeight: "600" },
  optionGrid3: { flexDirection: "row", gap: 8 },
  optionGrid2: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  optionCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    padding: 10,
    alignItems: "center",
  },
  optionCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  optionEmoji: { fontSize: 20, marginBottom: 4 },
  optionTitle: { color: COLORS.text, fontSize: 12, fontWeight: "700" },
  optionTitleActive: { color: COLORS.primaryDark },
  optionSub: { color: COLORS.textMuted, fontSize: 10, marginTop: 2, textAlign: "center" },
  fieldWrap: { marginTop: 4 },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 8 },
  rowWrap: { flexWrap: "wrap" },
  flexOne: { flex: 1 },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  chipText: { color: COLORS.text, fontWeight: "700", fontSize: 12 },
  chipTextActive: { color: COLORS.primaryDark },
  dateField: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: { color: COLORS.text, fontSize: 13, fontWeight: "600" },
  venueHint: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 6,
  },
  coordsHint: { color: COLORS.textMuted, fontSize: 11, marginBottom: 6 },
  pickLocationBtn: {
    marginTop: 3,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  pickLocationBtnText: { color: COLORS.primaryDark, fontSize: 11, fontWeight: "700" },
  choiceBtn: {
    minWidth: "48%",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    alignItems: "center",
  },
  choiceBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  choiceText: { color: COLORS.text, fontWeight: "700", fontSize: 12 },
  choiceTextActive: { color: COLORS.primaryDark },
  choiceBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    padding: 10,
  },
  choiceBoxActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  choiceBoxTitle: { color: COLORS.text, fontWeight: "700", fontSize: 13 },
  choiceBoxSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tagChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  tagChipText: { fontSize: 12, color: COLORS.text, fontWeight: "600" },
  tagChipTextActive: { color: COLORS.primaryDark },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.cardOverlay,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  ctaBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  ctaDisabled: { opacity: 0.65 },
  ctaText: { color: COLORS.card, fontWeight: "800", fontSize: 15 },
  pickerWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 86,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 6,
  },
  doneBtn: {
    alignSelf: "flex-end",
    marginRight: 10,
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: COLORS.primarySoft,
  },
  doneText: { color: COLORS.primaryDark, fontWeight: "700", fontSize: 12 },
  bottomSpacer: { height: 92 },
  previewCard: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryPale,
    backgroundColor: COLORS.primarySoft,
    padding: 12,
  },
  previewKicker: { color: COLORS.primaryDark, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  previewTitle: { marginTop: 4, color: COLORS.text, fontSize: 15, fontWeight: "800" },
  previewMeta: { marginTop: 3, color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
});
