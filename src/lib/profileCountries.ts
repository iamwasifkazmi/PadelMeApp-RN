/**
 * Canonical English names stored in User.country / used for GET /users?country=.
 * Labels are shorter where useful for chip UI.
 */
export const USER_COUNTRY_CHOICES: { value: string; label: string }[] = [
  { value: "United Kingdom", label: "UK" },
  { value: "England", label: "England" },
  { value: "United Arab Emirates", label: "UAE" },
  { value: "Pakistan", label: "Pakistan" },
  { value: "Spain", label: "Spain" },
  { value: "Sweden", label: "Sweden" },
  { value: "United States", label: "USA" },
  { value: "France", label: "France" },
  { value: "Germany", label: "Germany" },
  { value: "Italy", label: "Italy" },
  { value: "Portugal", label: "Portugal" },
  { value: "Netherlands", label: "Netherlands" },
  { value: "Ireland", label: "Ireland" },
  { value: "Australia", label: "Australia" },
  { value: "Saudi Arabia", label: "Saudi Arabia" },
  { value: "India", label: "India" },
  { value: "Egypt", label: "Egypt" },
  { value: "South Africa", label: "South Africa" },
  { value: "Morocco", label: "Morocco" },
  { value: "Qatar", label: "Qatar" },
  { value: "Kuwait", label: "Kuwait" },
];

/** First chip = no filter; rest match USER_COUNTRY_CHOICES. */
export const PLAYERS_COUNTRY_FILTER_CHIPS: { value: string; label: string }[] = [
  { value: "", label: "Any country" },
  ...USER_COUNTRY_CHOICES,
];

export function countryChoiceByValue(value: string) {
  const v = value.trim();
  if (!v) return undefined;
  return USER_COUNTRY_CHOICES.find((c) => c.value === v);
}

export function countryDisplayLabel(value: string): string {
  const choice = countryChoiceByValue(value);
  return choice ? choice.label : value.trim();
}

/** Match canonical name or short chip label (e.g. "UK" → United Kingdom). */
export function filterCountryChoices(query: string) {
  const t = query.trim().toLowerCase();
  if (!t) return USER_COUNTRY_CHOICES;
  return USER_COUNTRY_CHOICES.filter(
    (c) => c.value.toLowerCase().includes(t) || c.label.toLowerCase().includes(t),
  );
}
