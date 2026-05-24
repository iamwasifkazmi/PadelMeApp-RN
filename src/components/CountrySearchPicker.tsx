import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  countryChoiceByValue,
  countryDisplayLabel,
  filterCountryChoices,
} from "../lib/profileCountries";
import { COLORS } from "../theme/colors";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
};

/**
 * Country field with search bar (same look as Discover → Players) and a filtered pick list.
 */
export function CountrySearchPicker({
  value,
  onChange,
  placeholder = "Search country (e.g. UK, Spain)",
  hint,
}: Props) {
  const [focused, setFocused] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const showList = focused || query.length > 0;
  const filtered = React.useMemo(() => filterCountryChoices(query), [query]);
  const selected = countryChoiceByValue(value);

  const inputValue = focused || query.length > 0 ? query : value ? countryDisplayLabel(value) : "";

  const pick = (canonical: string) => {
    onChange(canonical);
    const choice = countryChoiceByValue(canonical);
    setQuery(choice ? choice.label : canonical);
    setFocused(false);
  };

  const clear = () => {
    onChange("");
    setQuery("");
    setFocused(false);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.searchWrap}>
        <Ionicons name="globe-outline" size={17} color={COLORS.iconMuted} />
        <TextInput
          style={styles.searchInput}
          value={inputValue}
          onChangeText={(t) => {
            setQuery(t);
            if (!focused) setFocused(true);
            const exact = filterCountryChoices(t).find(
              (c) => c.label.toLowerCase() === t.trim().toLowerCase() || c.value.toLowerCase() === t.trim().toLowerCase(),
            );
            if (exact) onChange(exact.value);
            else if (!t.trim()) onChange("");
          }}
          onFocus={() => {
            setFocused(true);
            if (value && !query) {
              const choice = countryChoiceByValue(value);
              setQuery(choice ? choice.label : value);
            }
          }}
          onBlur={() => {
            setTimeout(() => setFocused(false), 200);
          }}
          placeholder={placeholder}
          placeholderTextColor={COLORS.iconMuted}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
        />
        {(focused || query.length > 0 || value) ? (
          <Pressable onPress={clear} hitSlop={8} accessibilityLabel="Clear country">
            <Ionicons name="close-circle" size={18} color={COLORS.iconMuted} />
          </Pressable>
        ) : null}
      </View>

      {selected && !showList ? (
        <Text style={styles.selectedHint}>
          Selected: {selected.value}
          {selected.label !== selected.value ? ` (${selected.label})` : ""}
        </Text>
      ) : null}

      {showList ? (
        <View style={styles.listPanel}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.listScroll}
          >
            {filtered.length === 0 ? (
              <Text style={styles.empty}>No countries match “{query.trim()}”.</Text>
            ) : (
              filtered.map((c) => {
                const active = value === c.value;
                return (
                  <Pressable
                    key={c.value}
                    style={[styles.row, active && styles.rowActive]}
                    onPress={() => pick(c.value)}
                  >
                    <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>{c.label}</Text>
                    {c.label !== c.value ? (
                      <Text style={styles.rowValue}>{c.value}</Text>
                    ) : null}
                    {active ? (
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} style={styles.rowCheck} />
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      ) : null}

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  selectedHint: {
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  listPanel: {
    marginTop: 8,
    maxHeight: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    backgroundColor: COLORS.card,
    overflow: "hidden",
  },
  listScroll: { maxHeight: 220 },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderMuted,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  rowActive: { backgroundColor: COLORS.primarySoft },
  rowLabel: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  rowLabelActive: { color: COLORS.primaryDark },
  rowValue: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  rowCheck: { marginLeft: "auto" },
  empty: { padding: 12, color: COLORS.textMuted, fontSize: 13 },
  hint: { marginTop: 8, color: COLORS.textMuted, fontSize: 11, lineHeight: 15 },
});
