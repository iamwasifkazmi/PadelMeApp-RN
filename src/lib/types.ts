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

