import React from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../lib/api";
import { useSnackbar } from "../components/Snackbar";
import { CompetitionDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";
import { LocationSearchModal } from "../components/LocationSearchModal";
import { getCurrentUserEmail } from "../store";
import { COLORS } from "../theme/colors";
import { hasUserGeo, userLocationLabel } from "../lib/userLocation";

type CompetitionTypeValue = "tournament" | "league";
type CompetitionFormatValue = "knockout" | "round_robin" | "group_knockout";

type FormState = {
  name: string;
  description: string;
  type: CompetitionTypeValue;
  format: CompetitionFormatValue;
  visibility: "public" | "private";
  locationName: string;
  locationAddress: string;
  locationLat: number | null;
  locationLng: number | null;
  startDate: string;
  endDate: string;
  skillLevel: "any" | "beginner" | "intermediate" | "advanced";
  maxPlayers: number;
  entryFee: number;
  prizeType: "cash" | "non_cash" | "badges";
  prizeDescription: string;
  scoringMode: "simple" | "sets";
  numSets: 1 | 3 | 5;
  gamesPerSet: 4 | 6 | 8;
  tiebreakRule: "tiebreak_at_6" | "match_tiebreak" | "none";
  weeklyDay: "" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  leagueWeeks: 4 | 6 | 8 | 10 | 12 | 16 | 20;
  genderRequirement: "any" | "male" | "female" | "mixed";
  teamStructure: "singles" | "doubles" | "mixed_doubles";
  ageMin: string;
  ageMax: string;
  skillRangeMin: string;
  skillRangeMax: string;
  minRatingThreshold: string;
  verificationRequirement: "none" | "photo" | "id";
  pointsWin: number;
  pointsLoss: number;
  pointsDraw: number;
  allowDraws: boolean;
};

function CreateCompetitionSkeleton() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SkeletonBlock height={28} width="68%" rounded={8} />
      <View style={styles.skeletonGapSm} />
      <SkeletonBlock height={12} width="60%" rounded={8} />
      <View style={styles.skeletonGapMd} />
      {Array.from({ length: 9 }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <SkeletonBlock height={14} width="36%" rounded={8} />
          <View style={styles.skeletonGapSm} />
          <SkeletonBlock height={42} width="100%" rounded={12} />
          <View style={styles.skeletonGapXs} />
          <SkeletonBlock height={12} width="78%" rounded={8} />
        </View>
      ))}
      <SkeletonBlock height={48} width="100%" rounded={12} />
    </ScrollView>
  );
}

export function CreateCompetitionScreen({
  navigation,
  route,
}: {
  navigation: any;
  route?: { params?: { defaultType?: "tournament" | "league" } };
}) {
  const { showSnackbar } = useSnackbar();
  const USER_EMAIL = getCurrentUserEmail();
  const loading = false;
  const [activeDateField, setActiveDateField] = React.useState<"startDate" | "endDate" | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const defaultType: CompetitionTypeValue =
    route?.params?.defaultType === "tournament" ? "tournament" : "league";
  const [form, setForm] = React.useState<FormState>({
    name:
      defaultType === "league"
        ? "Madrid Club League Season 1"
        : "Spring Padel Open 2026",
    description: "Community padel competition for all players.",
    type: defaultType,
    format: defaultType === "league" ? "round_robin" : "knockout",
    visibility: "public",
    locationName: "",
    locationAddress: "",
    locationLat: null,
    locationLng: null,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    skillLevel: "any",
    maxPlayers: 8,
    entryFee: 0,
    prizeType: "non_cash",
    prizeDescription: "",
    scoringMode: "simple",
    numSets: 1,
    gamesPerSet: 6,
    tiebreakRule: "tiebreak_at_6",
    weeklyDay: "",
    leagueWeeks: 8,
    genderRequirement: "any",
    teamStructure: "singles",
    ageMin: "",
    ageMax: "",
    skillRangeMin: "",
    skillRangeMax: "",
    minRatingThreshold: "",
    verificationRequirement: "none",
    pointsWin: 3,
    pointsLoss: 0,
    pointsDraw: 1,
    allowDraws: false,
  });

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isLeague = form.type === "league";
  const gross = form.entryFee * form.maxPlayers;
  const platformFee = form.entryFee > 0 ? gross * 0.025 : 0;
  const estimatedPool = Math.max(0, gross - platformFee);

  const create = async () => {
    if (
      !form.name.trim() ||
      !form.startDate ||
      !form.locationName.trim() ||
      !hasUserGeo({ locationLat: form.locationLat, locationLng: form.locationLng })
    ) {
      showSnackbar("Please fill name, start date, and pick a venue with Search (coordinates required).", {
        type: "error",
      });
      return;
    }

    try {
      setSaving(true);
      const created = await api.post<CompetitionDto>("/competitions", {
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.type,
        format: form.format,
        visibility: form.visibility,
        hostEmail: USER_EMAIL,
        locationName: form.locationName.trim(),
        locationAddress: form.locationAddress.trim(),
        locationLat: form.locationLat!,
        locationLng: form.locationLng!,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        skillLevel: form.skillLevel,
        maxPlayers: form.maxPlayers,
        entryFee: form.entryFee,
        prizePool: form.entryFee > 0 ? Number(estimatedPool.toFixed(2)) : 0,
        scoringMode: form.scoringMode,
        numSets: form.scoringMode === "sets" ? form.numSets : 1,
        gamesPerSet: form.scoringMode === "sets" ? form.gamesPerSet : 6,
        tiebreakRule: form.scoringMode === "sets" ? form.tiebreakRule : undefined,
      });
      showSnackbar("Competition created! 🏆", { type: "success" });
      navigation.replace("CompetitionDetail", { id: created.id });
    } catch {
      showSnackbar("Could not create competition", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CreateCompetitionSkeleton />;

  const activeDateValue =
    activeDateField && form[activeDateField]
      ? new Date(`${form[activeDateField]}T12:00:00`)
      : new Date();

  const onDateValueChange = (_event: any, selectedDate?: Date) => {
    if (!activeDateField) return;
    if (!selectedDate) return;
    update(activeDateField, formatDate(selectedDate));
    if (Platform.OS !== "ios") {
      setActiveDateField(null);
    }
  };

  const onDateDismiss = () => {
    if (Platform.OS !== "ios") {
      setActiveDateField(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.typeToggle}>
        <Choice
          label="🏆 Tournament"
          active={form.type === "tournament"}
          onPress={() => update("type", "tournament")}
        />
        <Choice
          label="📅 League"
          active={form.type === "league"}
          onPress={() => update("type", "league")}
        />
      </View>

      <SectionCard icon="create-outline" title="Basics">
        <Field
          label="Competition Name *"
          value={form.name}
          placeholder={isLeague ? "Madrid Club League S1" : "Spring Padel Open 2026"}
          onChangeText={(v) => update("name", v)}
        />
        <Field
          label="Description"
          value={form.description}
          placeholder="Tell players about this competition..."
          onChangeText={(v) => update("description", v)}
          multiline
        />
      </SectionCard>

      <SectionCard icon="git-branch-outline" title="Format">
        <FieldLabel text="Competition Format" />
        <View style={styles.chipsRow}>
          <Chip
            label="Knockout"
            selected={form.format === "knockout"}
            onPress={() => update("format", "knockout")}
          />
          <Chip
            label="Round Robin"
            selected={form.format === "round_robin"}
            onPress={() => update("format", "round_robin")}
          />
          <Chip
            label="Group + KO"
            selected={form.format === "group_knockout"}
            onPress={() => update("format", "group_knockout")}
          />
        </View>
      </SectionCard>

      <SectionCard icon="location-outline" title="Venue & Dates">
        <Text style={styles.fieldLabel}>Venue (exact map pin) *</Text>
        <Text style={styles.venueHint}>
          {userLocationLabel(form) || "Search for the venue — coordinates are required."}
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
        <View style={styles.row2}>
          <View style={styles.flexOne}>
            <DateField
              label="Start Date *"
              value={form.startDate}
              placeholder="Select start date"
              onPress={() => setActiveDateField("startDate")}
            />
          </View>
          <View style={styles.flexOne}>
            <DateField
              label="End Date"
              value={form.endDate}
              placeholder="Select end date"
              onPress={() => setActiveDateField("endDate")}
            />
          </View>
        </View>
      </SectionCard>

      {isLeague ? (
        <SectionCard icon="calendar-outline" title="Weekly Schedule">
          <FieldLabel text="Fixture Day" />
          <View style={styles.chipsRow}>
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
              <Chip
                key={day}
                label={day.slice(0, 3)}
                selected={form.weeklyDay === day}
                onPress={() => update("weeklyDay", day as FormState["weeklyDay"])}
              />
            ))}
          </View>
          <FieldLabel text="League Duration" />
          <View style={styles.chipsRow}>
            {[4, 6, 8, 10, 12, 16, 20].map((w) => (
              <Chip
                key={w}
                label={`${w} weeks`}
                selected={form.leagueWeeks === w}
                onPress={() => update("leagueWeeks", w as FormState["leagueWeeks"])}
              />
            ))}
          </View>
          <Text style={styles.helperText}>
            New match-ups are generated weekly. League ends after {form.leagueWeeks} rounds.
          </Text>
        </SectionCard>
      ) : null}

      <SectionCard icon="people-outline" title="Players & Skill">
        <View style={styles.row2}>
          <View style={styles.flexOne}>
            <FieldLabel text="Max Players" />
            <View style={styles.chipsRow}>
              {[4, 8, 16, 32].map((n) => (
                <Chip
                  key={n}
                  label={`${n}`}
                  selected={form.maxPlayers === n}
                  onPress={() => update("maxPlayers", n)}
                />
              ))}
            </View>
          </View>
          <View style={styles.flexOne}>
            <FieldLabel text="Skill Level" />
            <View style={styles.chipsRow}>
              {["any", "beginner", "intermediate", "advanced"].map((lvl) => (
                <Chip
                  key={lvl}
                  label={lvl === "any" ? "Any" : capitalize(lvl)}
                  selected={form.skillLevel === lvl}
                  onPress={() => update("skillLevel", lvl as FormState["skillLevel"])}
                />
              ))}
            </View>
          </View>
        </View>
      </SectionCard>

      <SectionCard icon="cash-outline" title="Entry Fee & Prize">
        <Field
          label="Entry Fee (£)"
          value={String(form.entryFee)}
          placeholder="0 = free"
          keyboardType="number-pad"
          onChangeText={(v) => update("entryFee", sanitizeNumber(v))}
        />
        {form.entryFee > 0 ? (
          <View style={styles.feeCard}>
            <RowLabel label={`${form.maxPlayers} players × £${form.entryFee}`} value={`£${gross.toFixed(2)}`} />
            <RowLabel label="Platform fee (2.5%)" value={`-£${platformFee.toFixed(2)}`} subtle />
            <View style={styles.feeDivider} />
            <RowLabel label="Prize Pool" value={`£${estimatedPool.toFixed(2)}`} strong />
          </View>
        ) : null}
        <FieldLabel text="Prize Type" />
        <View style={styles.chipsRow}>
          <Chip
            label="💰 Cash"
            selected={form.prizeType === "cash"}
            onPress={() => update("prizeType", "cash")}
          />
          <Chip
            label="🎖 Non-cash"
            selected={form.prizeType === "non_cash"}
            onPress={() => update("prizeType", "non_cash")}
          />
          <Chip
            label="🏅 Badges"
            selected={form.prizeType === "badges"}
            onPress={() => update("prizeType", "badges")}
          />
        </View>
        <Field
          label="Prize Details"
          value={form.prizeDescription}
          placeholder="Winner takes all, club membership, etc."
          onChangeText={(v) => update("prizeDescription", v)}
        />
      </SectionCard>

      <SectionCard icon="eye-outline" title="Visibility">
        <View style={styles.chipsRow}>
          <Chip
            label="Public"
            selected={form.visibility === "public"}
            onPress={() => update("visibility", "public")}
          />
          <Chip
            label="Private"
            selected={form.visibility === "private"}
            onPress={() => update("visibility", "private")}
          />
        </View>
      </SectionCard>

      <SectionCard icon="shield-checkmark-outline" title="Eligibility Criteria">
        <FieldLabel text="Team Structure" />
        <View style={styles.chipsRow}>
          <Chip
            label="Singles"
            selected={form.teamStructure === "singles"}
            onPress={() => update("teamStructure", "singles")}
          />
          <Chip
            label="Doubles"
            selected={form.teamStructure === "doubles"}
            onPress={() => update("teamStructure", "doubles")}
          />
          <Chip
            label="Mixed Doubles"
            selected={form.teamStructure === "mixed_doubles"}
            onPress={() => update("teamStructure", "mixed_doubles")}
          />
        </View>

        <FieldLabel text="Gender" />
        <View style={styles.chipsRow}>
          {[
            { v: "any", l: "Any" },
            { v: "male", l: "Male" },
            { v: "female", l: "Female" },
            { v: "mixed", l: "Mixed" },
          ].map((g) => (
            <Chip
              key={g.v}
              label={g.l}
              selected={form.genderRequirement === g.v}
              onPress={() => update("genderRequirement", g.v as FormState["genderRequirement"])}
            />
          ))}
        </View>

        <View style={styles.row2}>
          <View style={styles.flexOne}>
            <Field
              label="Min Age"
              value={form.ageMin}
              keyboardType="number-pad"
              placeholder="18"
              onChangeText={(v) => update("ageMin", v.replace(/\D/g, ""))}
            />
          </View>
          <View style={styles.flexOne}>
            <Field
              label="Max Age"
              value={form.ageMax}
              keyboardType="number-pad"
              placeholder="40"
              onChangeText={(v) => update("ageMax", v.replace(/\D/g, ""))}
            />
          </View>
        </View>

        <View style={styles.row2}>
          <View style={styles.flexOne}>
            <Field
              label="Skill Min (1-10)"
              value={form.skillRangeMin}
              keyboardType="number-pad"
              placeholder="3"
              onChangeText={(v) => update("skillRangeMin", v.replace(/\D/g, ""))}
            />
          </View>
          <View style={styles.flexOne}>
            <Field
              label="Skill Max (1-10)"
              value={form.skillRangeMax}
              keyboardType="number-pad"
              placeholder="8"
              onChangeText={(v) => update("skillRangeMax", v.replace(/\D/g, ""))}
            />
          </View>
        </View>

        <Field
          label="Minimum Reliability Rating (1-5)"
          value={form.minRatingThreshold}
          placeholder="3.5"
          keyboardType="number-pad"
          onChangeText={(v) => update("minRatingThreshold", v)}
        />

        <FieldLabel text="Verification Requirement" />
        <View style={styles.chipsRow}>
          <Chip
            label="None"
            selected={form.verificationRequirement === "none"}
            onPress={() => update("verificationRequirement", "none")}
          />
          <Chip
            label="📸 Photo"
            selected={form.verificationRequirement === "photo"}
            onPress={() => update("verificationRequirement", "photo")}
          />
          <Chip
            label="🪪 ID"
            selected={form.verificationRequirement === "id"}
            onPress={() => update("verificationRequirement", "id")}
          />
        </View>
      </SectionCard>

      {form.type === "tournament" ? (
        <SectionCard icon="stats-chart-outline" title="Match Scoring Format">
          <View style={styles.chipsRow}>
            <Chip
              label="Simple Score"
              selected={form.scoringMode === "simple"}
              onPress={() => update("scoringMode", "simple")}
            />
            <Chip
              label="Set-Based"
              selected={form.scoringMode === "sets"}
              onPress={() => update("scoringMode", "sets")}
            />
          </View>

          {form.scoringMode === "sets" ? (
            <>
              <FieldLabel text="Number of Sets" />
              <View style={styles.chipsRow}>
                <Chip
                  label="1 Set"
                  selected={form.numSets === 1}
                  onPress={() => update("numSets", 1)}
                />
                <Chip
                  label="Best of 3"
                  selected={form.numSets === 3}
                  onPress={() => update("numSets", 3)}
                />
                <Chip
                  label="Best of 5"
                  selected={form.numSets === 5}
                  onPress={() => update("numSets", 5)}
                />
              </View>

              <FieldLabel text="Games per Set" />
              <View style={styles.chipsRow}>
                <Chip
                  label="First to 4"
                  selected={form.gamesPerSet === 4}
                  onPress={() => update("gamesPerSet", 4)}
                />
                <Chip
                  label="First to 6"
                  selected={form.gamesPerSet === 6}
                  onPress={() => update("gamesPerSet", 6)}
                />
                <Chip
                  label="First to 8"
                  selected={form.gamesPerSet === 8}
                  onPress={() => update("gamesPerSet", 8)}
                />
              </View>

              <FieldLabel text="Tie-break Rule" />
              <View style={styles.chipsRow}>
                <Chip
                  label="Tie-break 6-6"
                  selected={form.tiebreakRule === "tiebreak_at_6"}
                  onPress={() => update("tiebreakRule", "tiebreak_at_6")}
                />
                <Chip
                  label="Match TB (10)"
                  selected={form.tiebreakRule === "match_tiebreak"}
                  onPress={() => update("tiebreakRule", "match_tiebreak")}
                />
                <Chip
                  label="No tie-break"
                  selected={form.tiebreakRule === "none"}
                  onPress={() => update("tiebreakRule", "none")}
                />
              </View>
            </>
          ) : null}
        </SectionCard>
      ) : null}

      {form.type === "tournament" &&
      (form.format === "round_robin" || form.format === "group_knockout") ? (
        <SectionCard icon="list-outline" title="Group Stage Points Rules">
          <View style={styles.row3}>
            <View style={styles.flexOne}>
              <Field
                label="Win"
                value={String(form.pointsWin)}
                keyboardType="number-pad"
                onChangeText={(v) => update("pointsWin", sanitizeNumber(v))}
              />
            </View>
            <View style={styles.flexOne}>
              <Field
                label="Loss"
                value={String(form.pointsLoss)}
                keyboardType="number-pad"
                onChangeText={(v) => update("pointsLoss", sanitizeNumber(v))}
              />
            </View>
            <View style={styles.flexOne}>
              <Field
                label="Draw"
                value={String(form.pointsDraw)}
                keyboardType="number-pad"
                onChangeText={(v) => update("pointsDraw", sanitizeNumber(v))}
              />
            </View>
          </View>
          <Pressable
            style={styles.toggleLine}
            onPress={() => update("allowDraws", !form.allowDraws)}
          >
            <View>
              <Text style={styles.toggleTitle}>Allow draws</Text>
              <Text style={styles.toggleSub}>Players can agree to draw a match.</Text>
            </View>
            <View style={[styles.togglePill, form.allowDraws && styles.togglePillOn]}>
              <Ionicons
                name={form.allowDraws ? "checkmark" : "close"}
                size={12}
                color={form.allowDraws ? COLORS.card : COLORS.textMuted}
              />
            </View>
          </Pressable>
          <Text style={styles.helperText}>
            Example: Win {form.pointsWin}, Loss {form.pointsLoss}, Draw {form.pointsDraw}
          </Text>
        </SectionCard>
      ) : null}

      <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={create} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? "Creating..." : "Create Competition 🏆"}</Text>
      </Pressable>

      {activeDateField && Platform.OS === "ios" ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setActiveDateField(null)}>
          <View style={styles.dateModalRoot}>
            <Pressable style={styles.dateModalBackdrop} onPress={() => setActiveDateField(null)} />
            <View style={styles.datePickerCard}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>
                  {activeDateField === "startDate" ? "Select start date" : "Select end date"}
                </Text>
                <Pressable style={styles.dateDoneBtn} onPress={() => setActiveDateField(null)}>
                  <Text style={styles.dateDoneText}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={activeDateValue}
                mode="date"
                display="spinner"
                onValueChange={onDateValueChange}
                onDismiss={onDateDismiss}
              />
            </View>
          </View>
        </Modal>
      ) : null}
      {activeDateField && Platform.OS !== "ios" ? (
        <DateTimePicker
          value={activeDateValue}
          mode="date"
          display="default"
          onValueChange={onDateValueChange}
          onDismiss={onDateDismiss}
        />
      ) : null}
      <LocationSearchModal
        visible={locationPickerOpen}
        title="Pick competition location"
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
    </ScrollView>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name={icon} size={15} color={COLORS.text} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Choice({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.choiceBtn, active && styles.choiceBtnActive]} onPress={onPress}>
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.chip, selected && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.fieldLabel}>{text}</Text>;
}

function DateField({
  label,
  value,
  placeholder,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <FieldLabel text={label} />
      <Pressable style={styles.dateField} onPress={onPress}>
        <Text style={[styles.dateFieldText, !value && styles.dateFieldPlaceholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={16} color={COLORS.iconMuted} />
      </Pressable>
    </View>
  );
}

function RowLabel({
  label,
  value,
  subtle,
  strong,
}: {
  label: string;
  value: string;
  subtle?: boolean;
  strong?: boolean;
}) {
  return (
    <View style={styles.rowLabel}>
      <Text style={[styles.rowLabelText, subtle && styles.rowLabelTextSubtle, strong && styles.rowLabelTextStrong]}>
        {label}
      </Text>
      <Text style={[styles.rowLabelValue, subtle && styles.rowLabelValueSubtle, strong && styles.rowLabelValueStrong]}>
        {value}
      </Text>
    </View>
  );
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
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View style={styles.fieldWrap}>
      <FieldLabel text={label} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        style={[styles.input, multiline && styles.inputMultiline]}
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function sanitizeNumber(v: string) {
  const n = Number(v.replace(/[^\d.]/g, ""));
  if (Number.isNaN(n)) return 0;
  return n;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 14, paddingBottom: 112, paddingTop: 16 },
  typeToggle: { flexDirection: "row", gap: 8, marginBottom: 10 },
  choiceBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    paddingVertical: 8,
    alignItems: "center",
  },
  choiceBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  choiceText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },
  choiceTextActive: { color: COLORS.primaryDark },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  sectionTitle: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  fieldWrap: { marginBottom: 8 },
  fieldLabel: { marginBottom: 5, color: COLORS.textSubtle, fontSize: 11, fontWeight: "600" },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    color: COLORS.text,
    fontSize: 12,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: "top" },
  dateField: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateFieldText: { color: COLORS.text, fontSize: 12 },
  dateFieldPlaceholder: { color: COLORS.textMuted },
  venueHint: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 6,
  },
  coordsHint: { color: COLORS.textMuted, fontSize: 11, marginBottom: 8 },
  pickLocationBtn: {
    marginTop: 2,
    marginBottom: 8,
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
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 6 },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 999,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  chipText: { color: COLORS.text, fontSize: 10, fontWeight: "600" },
  chipTextActive: { color: COLORS.primaryDark },
  row2: { flexDirection: "row", gap: 8 },
  row3: { flexDirection: "row", gap: 8 },
  flexOne: { flex: 1 },
  feeCard: {
    borderWidth: 1,
    borderColor: COLORS.primaryPale,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 11,
    padding: 9,
    marginBottom: 8,
  },
  feeDivider: { height: 1, backgroundColor: COLORS.primaryPale, marginVertical: 5 },
  rowLabel: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabelText: { color: COLORS.textSubtle, fontSize: 11 },
  rowLabelValue: { color: COLORS.text, fontSize: 11, fontWeight: "600" },
  rowLabelTextSubtle: { color: COLORS.textMuted },
  rowLabelValueSubtle: { color: COLORS.textMuted },
  rowLabelTextStrong: { color: COLORS.primaryDark, fontWeight: "700" },
  rowLabelValueStrong: { color: COLORS.primaryDark, fontWeight: "700" },
  toggleLine: {
    marginTop: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleTitle: { color: COLORS.text, fontSize: 12, fontWeight: "600" },
  toggleSub: { marginTop: 1, color: COLORS.textMuted, fontSize: 10 },
  togglePill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.border,
  },
  togglePillOn: { backgroundColor: COLORS.primary },
  helperText: { marginTop: 2, color: COLORS.textMuted, fontSize: 10, lineHeight: 14 },
  saveBtn: {
    marginTop: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText: { color: COLORS.card, fontWeight: "700", fontSize: 13 },
  datePickerCard: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: COLORS.card,
    paddingTop: 6,
    paddingBottom: 12,
  },
  dateModalRoot: { flex: 1, justifyContent: "flex-end" },
  dateModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
  datePickerHeader: {
    paddingHorizontal: 10,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  datePickerTitle: { color: COLORS.text, fontWeight: "700", fontSize: 12 },
  dateDoneBtn: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dateDoneText: { color: COLORS.primaryDark, fontWeight: "700", fontSize: 12 },
  skeletonGapXs: { height: 6 },
  skeletonGapSm: { height: 8 },
  skeletonGapMd: { height: 12 },
  skeletonCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
});
