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
