import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { CompetitionDto } from "../lib/types";
import { SkeletonBlock } from "../components/Skeleton";

function CreateCompetitionSkeleton() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SkeletonBlock height={28} width="55%" rounded={8} />
      <View style={{ height: 14 }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={{ marginBottom: 12 }}>
          <SkeletonBlock height={12} width="26%" rounded={6} />
          <View style={{ height: 6 }} />
          <SkeletonBlock height={42} width="100%" rounded={12} />
        </View>
      ))}
      <View style={{ height: 8 }} />
      <SkeletonBlock height={44} width="100%" rounded={12} />
    </ScrollView>
  );
}

export function CreateCompetitionScreen({ navigation }: { navigation: any }) {
  const [loading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("Weekend League");
  const [description, setDescription] = React.useState("Community padel event");
  const [type, setType] = React.useState("league");
  const [format, setFormat] = React.useState("round_robin");
  const [skillLevel, setSkillLevel] = React.useState("intermediate");
  const [maxPlayers, setMaxPlayers] = React.useState("16");
  const [locationName, setLocationName] = React.useState("Dubai");
  const [locationAddress, setLocationAddress] = React.useState("Al Quoz Padel Club");
  const [startDate, setStartDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [entryFee, setEntryFee] = React.useState("25");
  const [prizePool, setPrizePool] = React.useState("500");
  const [numSets, setNumSets] = React.useState("3");
  const [gamesPerSet, setGamesPerSet] = React.useState("6");
  const [tiebreakRule, setTiebreakRule] = React.useState("7-point");
  const [scoringMode, setScoringMode] = React.useState("standard");

  const create = async () => {
    try {
      setSaving(true);
      const created = await api.post<CompetitionDto>("/competitions", {
        name,
        description,
        type,
        format,
        skillLevel,
        maxPlayers: Number(maxPlayers) || 16,
        hostEmail: "demo@padelme.app",
        locationName,
        locationAddress,
        startDate: new Date(startDate).toISOString(),
        entryFee: Number(entryFee) || 0,
        prizePool: Number(prizePool) || 0,
        numSets: Number(numSets) || 3,
        gamesPerSet: Number(gamesPerSet) || 6,
        tiebreakRule,
        scoringMode,
      });
      navigation.replace("CompetitionDetail", { id: created.id });
    } catch {
      Alert.alert("Error", "Could not create competition");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CreateCompetitionSkeleton />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Competition</Text>
      <Text style={styles.subtitle}>Tournament or league setup</Text>

      <Field label="Name" value={name} onChangeText={setName} />
      <Field label="Description" value={description} onChangeText={setDescription} />
      <Field label="Type (tournament/league)" value={type} onChangeText={setType} />
      <Field label="Format (knockout/round_robin)" value={format} onChangeText={setFormat} />
      <Field label="Skill Level" value={skillLevel} onChangeText={setSkillLevel} />
      <Field label="Max Players" value={maxPlayers} onChangeText={setMaxPlayers} keyboardType="number-pad" />
      <Field label="Location Name" value={locationName} onChangeText={setLocationName} />
      <Field label="Location Address" value={locationAddress} onChangeText={setLocationAddress} />
      <Field label="Start Date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} />
      <Field label="Entry Fee" value={entryFee} onChangeText={setEntryFee} keyboardType="number-pad" />
      <Field label="Prize Pool" value={prizePool} onChangeText={setPrizePool} keyboardType="number-pad" />
      <Field label="Scoring Mode" value={scoringMode} onChangeText={setScoringMode} />
      <Field label="Sets" value={numSets} onChangeText={setNumSets} keyboardType="number-pad" />
      <Field label="Games per Set" value={gamesPerSet} onChangeText={setGamesPerSet} keyboardType="number-pad" />
      <Field label="Tiebreak Rule" value={tiebreakRule} onChangeText={setTiebreakRule} />

      <Pressable style={[styles.saveBtn, saving && { opacity: 0.65 }]} onPress={create} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? "Creating..." : "Create Competition"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#edf9fd" },
  content: { padding: 16, paddingBottom: 120 },
  title: { fontSize: 26, fontWeight: "800", color: "#041521" },
  subtitle: { marginTop: 2, marginBottom: 12, color: "#4f6b7b" },
  fieldLabel: { marginBottom: 6, color: "#1a3a4a", fontSize: 12, fontWeight: "600" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c8e6ef",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#041521",
  },
  saveBtn: {
    marginTop: 8,
    backgroundColor: "#06b6d4",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

