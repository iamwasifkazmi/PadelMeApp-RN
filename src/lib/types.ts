export type MatchDto = {
  id: string;
  title: string;
  date: string;
  timeLabel: string;
  locationName: string;
  skillLevel?: string | null;
  isInstant?: boolean;
  players: string[];
  maxPlayers: number;
  status: string;
  scoreTeamA?: string | null;
  scoreTeamB?: string | null;
  winnerTeam?: string | null;
};

export type UserDto = {
  id: string;
  email: string;
  fullName?: string | null;
  location?: string | null;
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
};

export type ProfileSummaryDto = {
  user: {
    id: string;
    email: string;
    fullName: string;
    location?: string | null;
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
  type: string;
  format: string;
  status: string;
  skillLevel?: string | null;
  maxPlayers?: number | null;
  participants: string[];
  createdAt: string;
};

export type CompetitionDetailDto = CompetitionDto & {
  matches: Array<{
    id: string;
    round: number;
    status: string;
    player1Name?: string | null;
    player2Name?: string | null;
  }>;
};

export type MatchChatMessageDto = {
  id: string;
  matchId: string;
  senderEmail: string;
  senderName: string;
  text: string;
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
};

export type RegisterResponseDto = {
  requiresVerification: boolean;
  email: string;
};

