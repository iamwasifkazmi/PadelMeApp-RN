export type MatchDto = {
  id: string;
  title: string;
  date: string;
  timeLabel: string;
  locationName: string;
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
  eloRating: number;
  skillLabel?: string | null;
  averageRating?: number | null;
};

export type ConversationDto = {
  id: string;
  type: string;
  entityName?: string | null;
  participantEmails: string[];
  lastMessageText?: string | null;
  lastMessageAt?: string | null;
};

