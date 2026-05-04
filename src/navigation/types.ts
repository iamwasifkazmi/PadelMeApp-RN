export type MainTabParamList = {
  HomeTab: undefined;
  DiscoverTab: undefined;
  CreateTab: undefined;
  MessagesTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  Login: undefined;
  Register: undefined;
  VerifyEmailOtp: { email?: string } | undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string } | undefined;
  Onboarding: undefined;
  AcceptInvite: { token?: string } | undefined;
  CreateMatch: { recurring?: boolean } | undefined;
  MatchDetail: { id: string };
  EditProfile: undefined;
  Notifications: undefined;
  Competitions: undefined;
  CreateCompetition: { defaultType?: "tournament" | "league" } | undefined;
  CompetitionDetail: { id: string };
  InvitePlayers:
    | {
        eventId?: string;
        eventKind?: "match" | "competition";
        eventTitle?: string;
        eventSubtitle?: string;
      }
    | undefined;
  Verification: undefined;
  InstantPlay: undefined;
  Players: undefined;
  PlayerProfile: { id: string };
  Friends: undefined;
  PastEvents: undefined;
  ConversationView: { id: string };
  MatchChat: { matchId: string };
  MatchRatePlayers: { matchId: string };
  SubscriptionGate: undefined;
  AdminIDReview: undefined;
  AdminTestMode: undefined;
};
