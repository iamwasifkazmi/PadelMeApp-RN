import type { MatchDto, UserDto } from "./types";

function emailEq(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function normGender(g: string | null | undefined): string | null {
  if (!g) return null;
  return g.trim().toLowerCase();
}

function normRequirement(raw: string | null | undefined): string {
  return (raw || "any").trim().toLowerCase();
}

function normVerification(raw: string | null | undefined): string {
  return (raw || "none").trim().toLowerCase();
}

export function effectiveTeamsAtStartUi(m: MatchDto): { teamA: string[]; teamB: string[] } {
  let teamA = [...(m.teamA || [])];
  let teamB = [...(m.teamB || [])];
  const doublesStyle = m.matchType !== "singles" && m.maxPlayers >= 4;
  const players = m.players || [];
  if (players.length === 2 && !doublesStyle && (teamA.length === 0 || teamB.length === 0)) {
    teamA = [players[0]];
    teamB = [players[1]];
  }
  return { teamA, teamB };
}

function userToProfile(u: UserDto | undefined, email: string) {
  if (!u) {
    return {
      fullName: email.split("@")[0],
      gender: null as string | null,
      age: null as number | null,
      skillLevel: 5,
      averageRating: null as number | null,
      photoVerified: false,
      idVerified: false,
    };
  }
  return {
    fullName: u.fullName ?? email.split("@")[0],
    gender: u.gender ?? null,
    age: u.age ?? null,
    skillLevel: u.skillLevel ?? 5,
    averageRating: u.averageRating ?? null,
    photoVerified: !!u.photoVerified,
    idVerified: !!u.idVerified,
  };
}

function lookupUser(map: Record<string, UserDto>, email: string): UserDto | undefined {
  const hit = map[email];
  if (hit) return hit;
  return Object.values(map).find((u) => emailEq(u.email, email));
}

/** Base44-style roster checks for match start (mirrors backend matchEligibility). */
export function validateMatchRosterForUi(
  m: MatchDto,
  usersByEmail: Record<string, UserDto>,
): { valid: boolean; reason: string } {
  const players = m.players || [];
  const seen = new Set<string>();
  for (const e of players) {
    const k = e.trim().toLowerCase();
    if (seen.has(k)) return { valid: false, reason: "Duplicate players in roster" };
    seen.add(k);
  }

  for (const email of players) {
    const u = lookupUser(usersByEmail, email);
    const p = userToProfile(u, email);
    const name = p.fullName || email.split("@")[0];
    const genderReq = normRequirement(m.genderRequirement);

    if (genderReq && genderReq !== "any" && genderReq !== "mixed") {
      const g = normGender(p.gender);
      if (g && g !== genderReq) {
        return { valid: false, reason: `${name} does not meet gender requirement` };
      }
    }

    if (m.ageMin != null && p.age != null && p.age < m.ageMin) {
      return { valid: false, reason: `${name} is below minimum age requirement` };
    }
    if (m.ageMax != null && p.age != null && p.age > m.ageMax) {
      return { valid: false, reason: `${name} exceeds maximum age requirement` };
    }

    const playerSkill = p.skillLevel;
    if (m.skillRangeMin != null && playerSkill < m.skillRangeMin) {
      return { valid: false, reason: `${name} skill level is too high` };
    }
    if (m.skillRangeMax != null && playerSkill > m.skillRangeMax) {
      return { valid: false, reason: `${name} skill level is too low` };
    }

    if (m.minRatingThreshold != null) {
      const playerRating = p.averageRating ?? 0;
      if (playerRating < m.minRatingThreshold) {
        return { valid: false, reason: `${name} does not meet minimum rating requirement` };
      }
    }

    const ver = normVerification(m.verificationRequirement);
    if (ver !== "none") {
      if (ver === "photo" && !p.photoVerified) {
        return { valid: false, reason: `${name} has not verified their profile` };
      }
      if (ver === "id" && !p.idVerified) {
        return { valid: false, reason: `${name} has not verified their ID` };
      }
    }
  }

  if (m.matchType !== "mixed_doubles") {
    return { valid: true, reason: "" };
  }

  const { teamA, teamB } = effectiveTeamsAtStartUi(m);
  for (const team of [teamA, teamB]) {
    const teamProfiles = team.map((em) => userToProfile(lookupUser(usersByEmail, em), em));
    const maleCount = teamProfiles.filter((p) => normGender(p.gender) === "male").length;
    const femaleCount = teamProfiles.filter((p) => normGender(p.gender) === "female").length;
    if (maleCount !== 1 || femaleCount !== 1) {
      return { valid: false, reason: "Mixed doubles requires 1 male and 1 female per team" };
    }
  }

  return { valid: true, reason: "" };
}
