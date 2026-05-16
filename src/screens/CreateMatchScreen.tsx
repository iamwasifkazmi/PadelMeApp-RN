import DateTimePicker from "@react-native-community/datetimepicker";
import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { useSnackbar } from "../components/Snackbar";
import { MatchDto, UserDto } from "../lib/types";
import { USER_COUNTRY_CHOICES } from "../lib/profileCountries";
import { LocationSearchModal } from "../components/LocationSearchModal";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";
import { androidChipText } from "../theme/chipAndroid";
import { hasUserGeo, userLocationLabel } from "../lib/userLocation";

type Mode = "instant" | "scheduled" | "recurring";
type MatchTypeValue = "singles" | "doubles" | "mixed_doubles";
type SkillValue = "any" | "beginner" | "intermediate" | "advanced";
type VisibilityValue = "public" | "invite_only";
type ScoringFormatValue = "simple" | "sets";
type NumSetsPick = 1 | 3 | 5;

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
  country: string;
  skillLevel: SkillValue;
  visibility: VisibilityValue;
  tags: string[];
  scoringMode: ScoringFormatValue;
  numSetsPick: NumSetsPick;
  autoBalanceTeams: boolean;
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

const DEFAULT_MATCH_TITLES: Record<MatchTypeValue, string> = {
  singles: "Padel Singles",
  doubles: "Padel Doubles",
  mixed_doubles: "Mixed Padel",
};

const STOCK_MATCH_TITLES = new Set(Object.values(DEFAULT_MATCH_TITLES));

function scoringPresetTitle(matchType: MatchTypeValue, mode: ScoringFormatValue, numSets: NumSetsPick): string {
  const fmt =
    matchType === "singles"
      ? "Singles"
      : matchType === "mixed_doubles"
        ? "Mixed Doubles"
        : "Doubles";
  if (mode === "simple") return DEFAULT_MATCH_TITLES[matchType];
  if (numSets === 1) return `1-Set ${fmt}`;
  if (numSets === 3) return `Best of 3 ${fmt}`;
  return `Best of 5 ${fmt}`;
}

const SKILL_PREVIEW: Record<SkillValue, string> = {
  any: "Any",
  beginner: "Beginner",
  intermediate: "Mid",
  advanced: "Advanced",
};

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

function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function parseLocalDateTime(dateStr: string, timeLabel: string): Date {
  const [y, mo, d] = dateStr.split("-").map((v) => Number(v));
  const [h, m] = timeLabel.split(":").map((v) => Number(v || 0));
  return new Date(y, (mo || 1) - 1, d || 1, h || 0, m || 0, 0, 0);
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameLocalCalendarDay(dateStr: string, ref: Date): boolean {
  return dateStr === formatLocalDate(ref);
}

export function CreateMatchScreen({ navigation, route }: { navigation: any; route?: any }) {
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useSnackbar();
  const USER_EMAIL = getCurrentUserEmail();
  const recurring = Boolean(route?.params?.recurring);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [pickerField, setPickerField] = React.useState<"date" | "time" | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [titleEditedByUser, setTitleEditedByUser] = React.useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = React.useState(true);
  const [form, setForm] = React.useState<FormState>({
    mode: recurring ? "recurring" : "scheduled",
    matchType: "doubles",
    title: DEFAULT_MATCH_TITLES.doubles,
    date: formatLocalDate(new Date()),
    timeLabel: "19:30",
    durationMinutes: 90,
    locationName: "",
    locationAddress: "",
    locationLat: null,
    locationLng: null,
    country: "",
    skillLevel: "any",
    visibility: "public",
    tags: [],
    scoringMode: "simple",
    numSetsPick: 1,
    autoBalanceTeams: false,
  });

  React.useEffect(() => {
    if (titleEditedByUser) return;
    const next = scoringPresetTitle(form.matchType, form.scoringMode, form.numSetsPick);
    setForm((prev) => (prev.title === next ? prev : { ...prev, title: next }));
  }, [form.matchType, form.scoringMode, form.numSetsPick, titleEditedByUser]);

  const steps = getSteps(form.mode);
  const currentStep = steps[stepIndex];

  React.useEffect(() => {
    if (!USER_EMAIL) return;
    let cancelled = false;
    api
      .get<UserDto>(`/users/me?email=${encodeURIComponent(USER_EMAIL)}`)
      .then((u) => {
        if (cancelled) return;
        const c = (u.country || "").trim();
        if (c) setForm((p) => ({ ...p, country: p.country || c }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [USER_EMAIL]);

  const applyMatchType = (next: MatchTypeValue) => {
    setForm((prev) => {
      const t = prev.title.trim();
      const nextTitle = !t || STOCK_MATCH_TITLES.has(t) ? DEFAULT_MATCH_TITLES[next] : prev.title;
      return {
        ...prev,
        matchType: next,
        title: nextTitle,
        autoBalanceTeams: next === "singles" ? false : prev.autoBalanceTeams,
      };
    });
  };

  const update = React.useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) =>
      setForm((prev) => ({ ...prev, [key]: value })),
    [],
  );

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
    if (currentStep === "when" && form.mode !== "instant") {
      const t = parseLocalDateTime(form.date, form.timeLabel);
      if (t.getTime() < Date.now()) {
        showSnackbar("Pick a date and time in the future.", { type: "error" });
        return;
      }
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
    if (form.mode !== "instant") {
      const t = parseLocalDateTime(form.date, form.timeLabel);
      if (t.getTime() < Date.now()) {
        showSnackbar("Match must be scheduled in the future.", { type: "error" });
        return;
      }
    }

    try {
      setSaving(true);
      const scoringMode = form.scoringMode;
      const numSets = scoringMode === "sets" ? form.numSetsPick : 1;
      const created = await api.post<MatchDto>("/matches", {
        title: form.title.trim(),
        date: form.date,
        timeLabel: form.timeLabel,
        locationName: form.locationName.trim(),
        locationAddress: form.locationAddress.trim(),
        locationLat: form.locationLat!,
        locationLng: form.locationLng!,
        ...(form.country.trim() ? { country: form.country.trim() } : {}),
        durationMinutes: form.durationMinutes,
        skillLevel: form.skillLevel,
        visibility: form.visibility,
        tags: form.tags,
        isInstant: form.mode === "instant",
        maxPlayers,
        matchType: form.matchType,
        createdByEmail: USER_EMAIL,
        teamA: form.matchType !== "singles" && USER_EMAIL ? [USER_EMAIL] : [],
        scoringMode,
        numSets,
        gamesPerSet: 6,
        tiebreakRule: "tiebreak_at_6",
        autoBalanceTeams:
          form.matchType !== "singles" && Boolean(form.autoBalanceTeams),
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
    const startToday = startOfLocalDay(new Date());
    if (pickerField === "date") {
      const d = new Date(`${form.date}T12:00:00`);
      return d < startToday ? startToday : d;
    }
    const [h, m] = form.timeLabel.split(":").map((v) => Number(v || 0));
    const d = new Date();
    d.setHours(h || 0);
    d.setMinutes(m || 0);
    d.setSeconds(0);
    d.setMilliseconds(0);
    const now = new Date();
    if (isSameLocalCalendarDay(form.date, now) && d < now) return now;
    return d;
  }, [pickerField, form.date, form.timeLabel]);

  const pickerMinimumDate = React.useMemo(() => {
    if (!pickerField) return undefined;
    const startToday = startOfLocalDay(new Date());
    if (pickerField === "date") return startToday;
    return isSameLocalCalendarDay(form.date, new Date()) ? new Date() : undefined;
  }, [pickerField, form.date]);

  const onPickerValueChange = React.useCallback(
    (_event: unknown, selected?: Date) => {
      if (!pickerField || !selected) return;
      const startToday = startOfLocalDay(new Date());
      if (pickerField === "date") {
        const d = selected < startToday ? startToday : selected;
        let nextDate = formatLocalDate(d);
        let nextTime = form.timeLabel;
        if (isSameLocalCalendarDay(nextDate, new Date())) {
          const combined = parseLocalDateTime(nextDate, nextTime);
          const now = new Date();
          if (combined.getTime() < now.getTime()) nextTime = formatTime(now);
        }
        setForm((prev) => ({ ...prev, date: nextDate, timeLabel: nextTime }));
        if (Platform.OS === "android") setPickerField(null);
        return;
      }
      const combined = parseLocalDateTime(form.date, formatTime(selected));
      const now = new Date();
      update("timeLabel", formatTime(combined < now ? now : combined));
      if (Platform.OS === "android") setPickerField(null);
    },
    [pickerField, form.date, form.timeLabel, update],
  );

  const onPickerDismiss = React.useCallback(() => {
    if (Platform.OS !== "ios") setPickerField(null);
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
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
                  onPress={() => applyMatchType(item.value)}
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
              onChangeText={(v) => {
                setTitleEditedByUser(true);
                update("title", v);
              }}
              placeholder={DEFAULT_MATCH_TITLES[form.matchType]}
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
              {userLocationLabel(form) || "Search for a club or court — coordinates are required."}
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
            <SectionLabel text="Country (optional)" />
            <Text style={styles.countryWhenHint}>
              Same labels as your profile country — helps others find this game in Discover.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.countryChipsRow}>
              <Pressable
                onPress={() => update("country", "")}
                style={[styles.countryChip, !form.country && styles.countryChipActive]}
              >
                <Text style={[styles.countryChipText, !form.country && styles.countryChipTextActive]}>None</Text>
              </Pressable>
              {USER_COUNTRY_CHOICES.map((c) => (
                <Pressable
                  key={c.value}
                  onPress={() => update("country", c.value)}
                  style={[styles.countryChip, form.country === c.value && styles.countryChipActive]}
                >
                  <Text
                    style={[styles.countryChipText, form.country === c.value && styles.countryChipTextActive]}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {form.mode !== "instant" ? (
              <View style={styles.scheduledPolicyBox}>
                <Ionicons name="information-circle-outline" size={18} color={COLORS.infoText} style={styles.scheduledPolicyIcon} />
                <Text style={styles.scheduledPolicyText}>
                  If this game fills but no one starts it within 24 hours after the scheduled start time, it will be
                  cancelled automatically and everyone on the roster will be notified.
                </Text>
              </View>
            ) : null}
          </>
        ) : null}

        {currentStep === "players" ? (
          <>
            <Text style={styles.stepTitle}>Players & Skill 👥</Text>
            <Text style={styles.stepSubtitle}>Who should join?</Text>
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

            <Pressable
              style={styles.advancedToggle}
              onPress={() => setShowAdvancedOptions((v) => !v)}
              accessibilityRole="button"
            >
              <Text style={styles.advancedToggleText}>Advanced options</Text>
              <Ionicons
                name={showAdvancedOptions ? "chevron-up" : "chevron-down"}
                size={20}
                color={COLORS.iconMuted}
              />
            </Pressable>

            {showAdvancedOptions ? (
              <View style={styles.advancedPanel}>
                <Text style={[styles.advancedCaps, styles.advancedCapsPanelFirst]}>Scoring format</Text>
                <View style={styles.scoringFormatRow}>
                  <Pressable
                    style={[
                      styles.scoringFormatBtn,
                      form.scoringMode === "simple" && styles.choiceBtnActive,
                    ]}
                    onPress={() => update("scoringMode", "simple")}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        form.scoringMode === "simple" && styles.choiceTextActive,
                      ]}
                    >
                      🎯 Simple
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.scoringFormatBtn,
                      form.scoringMode === "sets" && styles.choiceBtnActive,
                    ]}
                    onPress={() => update("scoringMode", "sets")}
                  >
                    <Text
                      style={[styles.choiceText, form.scoringMode === "sets" && styles.choiceTextActive]}
                    >
                      🎾 Set-Based
                    </Text>
                  </Pressable>
                </View>

                {form.scoringMode === "sets" ? (
                  <>
                    <Text style={[styles.advancedCaps, styles.advancedCapsTight]}>Sets</Text>
                    <View style={styles.setsRow}>
                      {(
                        [
                          [1 as NumSetsPick, "1 Set"],
                          [3 as NumSetsPick, "Best of 3"],
                          [5 as NumSetsPick, "Best of 5"],
                        ] as const
                      ).map(([n, label]) => (
                        <Pressable
                          key={n}
                          style={[
                            styles.setsChip,
                            form.numSetsPick === n && styles.setsChipActive,
                          ]}
                          onPress={() => {
                            update("scoringMode", "sets");
                            update("numSetsPick", n);
                          }}
                        >
                          <Text
                            style={[
                              styles.setsChipText,
                              form.numSetsPick === n && styles.setsChipTextActive,
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.82}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : null}

                {form.matchType !== "singles" ? (
                  <View style={styles.autoBalanceRow}>
                    <View style={styles.autoBalanceTextCol}>
                      <Text style={styles.autoBalanceTitle}>Auto-balance Teams</Text>
                      <Text style={styles.autoBalanceSub}>Balance skill levels automatically</Text>
                    </View>
                    <Switch
                      value={form.autoBalanceTeams}
                      onValueChange={(v) => update("autoBalanceTeams", v)}
                      trackColor={{ false: COLORS.border, true: COLORS.primaryPale }}
                      thumbColor={form.autoBalanceTeams ? COLORS.primary : COLORS.card}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.previewCard}>
              <Text style={styles.previewKicker}>Match Preview</Text>
              <Text style={styles.previewTitle}>{form.title || "Padel Match"}</Text>
              <Text style={styles.previewMeta}>
                {form.mode === "instant"
                  ? "⚡ Instant"
                  : `📅 ${form.date} · ${form.timeLabel}`}
              </Text>
              <Text style={styles.previewMeta}>
                📍 {userLocationLabel(form) || "Venue"}
                {form.country.trim() ? ` · ${form.country.trim()}` : ""} ·{" "}
                {form.matchType === "singles" ? "Singles" : form.matchType === "mixed_doubles" ? "Mixed Doubles" : "Doubles"} ·{" "}
                {form.durationMinutes}min · 🎾 {SKILL_PREVIEW[form.skillLevel]}
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
        Platform.OS === "ios" ? (
          <Modal
            visible
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => setPickerField(null)}
          >
            <View style={styles.pickerModalRoot} pointerEvents="box-none">
              <Pressable style={styles.pickerModalBackdrop} onPress={() => setPickerField(null)} />
              <View
                style={[
                  styles.pickerModalSheet,
                  { paddingBottom: Math.max(insets.bottom, 12) + 8 },
                ]}
              >
                <DateTimePicker
                  value={pickerValue}
                  mode={pickerField === "date" ? "date" : "time"}
                  display="spinner"
                  themeVariant="light"
                  minimumDate={pickerMinimumDate}
                  onValueChange={onPickerValueChange}
                  style={styles.pickerIOSHeight}
                />
                <Pressable style={styles.doneBtn} onPress={() => setPickerField(null)}>
                  <Text style={styles.doneText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        ) : (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={pickerValue}
              mode={pickerField === "date" ? "date" : "time"}
              display="default"
              minimumDate={pickerMinimumDate}
              onValueChange={onPickerValueChange}
              onDismiss={onPickerDismiss}
            />
          </View>
        )
      ) : null}
      <LocationSearchModal
        visible={locationPickerOpen}
        title="Pick match location"
        initialQuery={form.locationName || form.locationAddress}
        searchBias={
          hasUserGeo(form)
            ? {
                lat: form.locationLat as number,
                lng: form.locationLng as number,
                labelHint: form.locationName.trim() || form.locationAddress.trim() || undefined,
              }
            : null
        }
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
  header: { paddingHorizontal: 16, paddingTop: 0, flexDirection: "row", alignItems: "center", gap: 10 },
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
  stepTitle: { fontSize: 22, fontWeight: "800", color: COLORS.text, marginTop: 8, marginBottom: 8 },
  stepSubtitle: { fontSize: 14, fontWeight: "600", color: COLORS.textMuted, marginBottom: 12 },
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
  chipText: { color: COLORS.text, fontWeight: "700", fontSize: 12, ...androidChipText(12) },
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
  countryWhenHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 8,
  },
  scheduledPolicyBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: COLORS.infoSoft,
    borderWidth: 1,
    borderColor: COLORS.infoBorder,
  },
  scheduledPolicyIcon: { marginTop: 1 },
  scheduledPolicyText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 17,
  },
  countryChipsRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 4, paddingRight: 8 },
  countryChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  countryChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  countryChipText: { fontSize: 12, color: COLORS.text, fontWeight: "600", ...androidChipText(12) },
  countryChipTextActive: { color: COLORS.primaryDark },
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
  tagChipText: { fontSize: 12, color: COLORS.text, fontWeight: "600", ...androidChipText(12) },
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
  pickerModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  pickerModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  pickerModalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  /** UIDatePicker wheels need a real height on some iOS devices or they render blank. */
  pickerIOSHeight: { width: "100%", height: 216 },
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
  advancedToggle: {
    marginTop: 14,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  advancedToggleText: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  advancedPanel: {
    marginTop: 4,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.borderMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  advancedCapsPanelFirst: { marginTop: 0 },
  advancedCaps: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textSubtle,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  advancedCapsTight: { marginTop: 4 },
  scoringFormatRow: { flexDirection: "row", gap: 8 },
  scoringFormatBtn: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  setsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "stretch",
    justifyContent: "space-between",
  },
  setsChip: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  setsChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  setsChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    width: "100%",
    ...androidChipText(11),
  },
  setsChipTextActive: { color: COLORS.primaryDark },
  autoBalanceRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  autoBalanceTextCol: { flex: 1, minWidth: 0, paddingRight: 4 },
  autoBalanceTitle: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  autoBalanceSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
