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

export type MessageDto = {
  id: string;
  conversationId: string;
  senderEmail: string;
  senderName: string;
  text: string;
  createdAt: string;
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

