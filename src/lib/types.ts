export type MatchDto = {
  id: string;
  title: string;
  date: string;
  timeLabel: string;
  locationName: string;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  country?: string | null;
  durationMinutes?: number | null;
  skillLevel?: string | null;
  matchType?: "singles" | "doubles" | "mixed_doubles";
  visibility?: "public" | "invite_only" | "private" | string;
  invitedEmails?: string[];
  tags?: string[];
  isInstant?: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  players: string[];
  teamA?: string[];
  teamB?: string[];
  maxPlayers: number;
  status: string;
  scoreTeamA?: string | null;
  scoreTeamB?: string | null;
  winnerTeam?: string | null;
  evidenceUrl?: string | null;
  scoreDisputeReason?: string | null;
  disputedBy?: string | null;
  disputedAt?: string | null;
  hostEmail?: string | null;
  confirmedPlayerEmails?: string[];
  teamsLocked?: boolean;
  pendingScoreTeamA?: string | null;
  pendingScoreTeamB?: string | null;
  pendingWinnerTeam?: string | null;
  scoreSubmittedBy?: string | null;
  scoreConfirmedBy?: string | null;
  genderRequirement?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  skillRangeMin?: number | null;
  skillRangeMax?: number | null;
  minRatingThreshold?: number | null;
  verificationRequirement?: string | null;
  replacementNeeded?: boolean;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  teamACaptainEmail?: string | null;
  teamBCaptainEmail?: string | null;
  /** `sets` | `simple` | omit — Base44-style scoring UI */
  scoringMode?: string | null;
  numSets?: number | null;
  gamesPerSet?: number | null;
};

/** Row from GET /matches/:id/recent-form for the viewer */
export type PlayerRecentFormDto = {
  id: string;
  userEmail: string;
  matchId: string;
  matchTitle?: string | null;
  matchDate?: string | null;
  eventType?: string | null;
  matchFormat?: string | null;
  result: string;
  opponentEmails?: string[];
  scoreSummary?: string | null;
  eloChange?: number | null;
  eloAfter?: number | null;
  createdAt: string;
};

export type CommunityPostDto = {
  id: string;
  authorEmail: string;
  kind: "feedback" | "idea" | "general";
  title: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    email: string;
    fullName: string | null;
    photoUrl: string | null;
  };
};

export type UserRecentMatchResultDto = {
  matchId: string;
  title: string | null;
  date: string;
  result: string;
  scoreSummary: string | null;
};

export type UserDto = {
  id: string;
  email: string;
  fullName?: string | null;
  location?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationName?: string | null;
  country?: string | null;
  /** Kilometres from viewer when API called with viewerEmail / friends?email */
  distanceKm?: number | null;
  age?: number | null;
  gender?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  eloRating: number;
  skillLevel?: number | null;
  skillLabel?: string | null;
  skillConfidence?: string | null;
  preferredPosition?: string | null;
  availabilityDays?: string[];
  availabilityTimes?: string[];
  travelRadiusKm?: number | null;
  useCurrentLocation?: boolean;
  matchTypePreference?: string | null;
  matchFormatPreference?: string | null;
  tags?: string[];
  profileVisibility?: "public" | "private";
  notifyInstantPlay?: boolean;
  notifyNearbyMatches?: boolean;
  notifyMatchInvites?: boolean;
  notifyTournaments?: boolean;
  profileComplete?: boolean;
  averageRating?: number | null;
  idVerified?: boolean;
  photoVerified?: boolean;
  /** GET /users/:id — from PlayerStats + PlayerRecentForm */
  matchesPlayed?: number;
  matchesWon?: number;
  matchesLost?: number;
  wins?: number;
  winRatePct?: number | null;
  recentMatchResults?: UserRecentMatchResultDto[];
};

export type ProfileSummaryDto = {
  user: {
    id: string;
    email: string;
    fullName: string;
    location?: string | null;
    locationName?: string | null;
    country?: string | null;
    locationLat?: number | null;
    locationLng?: number | null;
    bio?: string | null;
    photoUrl?: string | null;
    age?: number | null;
    gender?: string | null;
    skillLevel?: number | null;
    skillLabel: string;
    skillConfidence?: string | null;
    preferredPosition?: string | null;
    availabilityDays?: string[];
    availabilityTimes?: string[];
    travelRadiusKm?: number | null;
    useCurrentLocation?: boolean;
    matchTypePreference?: string | null;
    matchFormatPreference?: string | null;
    tags?: string[];
    profileVisibility?: "public" | "private";
    notifyInstantPlay?: boolean;
    notifyNearbyMatches?: boolean;
    notifyMatchInvites?: boolean;
    notifyTournaments?: boolean;
    statusLine?: string | null;
    averageRating?: number | null;
    eloRating: number;
    idVerified: boolean;
    photoVerified: boolean;
    profileComplete: boolean;
  };
  stats: {
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    winRate: number;
    eloRating: number;
    eloPeak: number;
  };
  recentFormDots: Array<"W" | "L">;
  achievements: Array<{
    key: string;
    icon: string;
    label: string;
    desc: string;
    earned: boolean;
  }>;
  trustBadges: {
    idVerified: boolean;
    photoVerified: boolean;
    topRated: boolean;
    reliable: boolean;
  };
  social: {
    friends: Array<{
      id: string;
      email: string;
      fullName: string;
      photoUrl?: string | null;
    }>;
    playedWith: Array<{
      id: string;
      email: string;
      fullName: string;
      photoUrl?: string | null;
    }>;
    friendCount: number;
  };
  upcomingMatches: Array<{
    id: string;
    title: string;
    date: string;
    locationName: string;
    status: string;
  }>;
  recentHistory: Array<{
    id: string;
    type: "match" | "competition";
    title: string;
    date: string;
    result: string;
    scoreTeamA?: string | null;
    scoreTeamB?: string | null;
    eloChange?: number | null;
    eloAfter?: number | null;
    competitionType?: string;
  }>;
};

export type ConversationDto = {
  id: string;
  type: string;
  entityName?: string | null;
  participantEmails: string[];
  lastMessageText?: string | null;
  lastMessageAt?: string | null;
  unreadCounts?: Record<string, number> | null;
};

export type MessageDto = {
  id: string;
  conversationId: string;
  senderEmail: string;
  senderName: string;
  text: string;
  createdAt: string;
  status?: "sent" | "delivered" | "read";
  readBy?: string[];
  deliveredAt?: string | null;
  readAt?: string | null;
};

export type CompetitionDto = {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  format: string;
  status: string;
  visibility?: string;
  locationName?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  skillLevel?: string | null;
  maxPlayers?: number | null;
  participants: string[];
  hostEmail?: string | null;
  entryFee?: number | null;
  prizePool?: number | null;
  scoringMode?: string | null;
  numSets?: number | null;
  gamesPerSet?: number | null;
  tiebreakRule?: string | null;
  createdAt: string;
};

export type CompetitionDetailDto = CompetitionDto & {
  matches: Array<{
    id: string;
    round: number;
    roundName?: string | null;
    status: string;
    player1Email?: string | null;
    player1Name?: string | null;
    player2Email?: string | null;
    player2Name?: string | null;
    scorePlayer1?: string | null;
    scorePlayer2?: string | null;
    winnerEmail?: string | null;
    winnerTeam?: string | null;
    scheduledDate?: string | null;
    scheduledTime?: string | null;
  }>;
};

export type MatchChatMessageDto = {
  id: string;
  matchId: string;
  senderEmail: string;
  senderName: string;
  /** Enriched from User.photoUrl when loading / sending; omitted for very old payloads. */
  senderPhotoUrl?: string | null;
  text: string;
  replyToId?: string | null;
  replyToTextSnapshot?: string | null;
  replyToSenderSnapshot?: string | null;
  replyToSenderEmail?: string | null;
  readBy?: string[];
  status?: "sent" | "delivered" | "read";
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export type NotificationDto = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  isRead: boolean;
  createdAt: string;
  matchId?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
};

export type FriendRequestDto = {
  id: string;
  requesterEmail: string;
  recipientEmail: string;
  status: string;
  createdAt: string;
};

export type AuthUserDto = {
  id: string;
  email: string;
  fullName?: string | null;
};

export type AuthResponseDto = {
  token: string;
  user: AuthUserDto;
  /** True when the user should see onboarding (e.g. profile not completed). OAuth uses this, not only “first DB insert”. */
  isNewUser?: boolean;
};

export type RegisterResponseDto = {
  requiresVerification: boolean;
  email: string;
};

