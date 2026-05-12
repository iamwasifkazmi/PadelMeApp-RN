import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  AcceptInviteScreen,
  CompetitionDetailScreen,
  CompetitionsScreen,
  ConversationViewScreen,
  CreateCompetitionScreen,
  CreateMatchScreen,
  EditProfileScreen,
  FriendsScreen,
  InstantPlayScreen,
  InvitePlayersScreen,
  MatchChatScreen,
  MatchDetailScreen,
  MatchRatePlayersScreen,
  NotificationsScreen,
  OnboardingScreen,
  PastEventsScreen,
  PlayerProfileScreen,
  PlayersScreen,
  LoginScreen,
  RegisterScreen,
  VerifyEmailOtpScreen,
  ForgotPasswordScreen,
  ResetPasswordScreen,
  VerificationScreen,
  SubscriptionGateScreen,
  AdminIDReviewScreen,
  AdminTestModeScreen,
  CommunityScreen,
  MyMatchesScreen,
} from "../screens";
import { COLORS } from "../theme/colors";
import { MainTabs } from "./MainTabs";
import { RootStackParamList } from "./types";
import { useAuth } from "../store";
import { api } from "../lib/api";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, hydrated, user } = useAuth();
  const [authRouteReady, setAuthRouteReady] = React.useState(false);
  const [authedInitialRoute, setAuthedInitialRoute] = React.useState<"MainTabs" | "Onboarding">("MainTabs");

  React.useEffect(() => {
    let mounted = true;
    if (!isAuthenticated) {
      setAuthedInitialRoute("MainTabs");
      setAuthRouteReady(true);
      return () => {
        mounted = false;
      };
    }

    const email = user?.email || "";
    if (!email) {
      setAuthedInitialRoute("MainTabs");
      setAuthRouteReady(true);
      return () => {
        mounted = false;
      };
    }

    const hint = user?.isNewUser;
    if (hint === true) {
      setAuthedInitialRoute("Onboarding");
      setAuthRouteReady(true);
      return () => {
        mounted = false;
      };
    }
    if (hint === false) {
      setAuthedInitialRoute("MainTabs");
      setAuthRouteReady(true);
      return () => {
        mounted = false;
      };
    }

    setAuthRouteReady(false);
    api
      .get<{
        profileComplete?: boolean;
        bio?: string | null;
        locationLat?: number | null;
        locationLng?: number | null;
      }>(`/users/me?email=${encodeURIComponent(email)}`)
      .then((me) => {
        if (!mounted) return;
        const hasLegacyProfile =
          String(me.bio || "").trim().length > 0 &&
          me.locationLat != null &&
          me.locationLng != null &&
          !Number.isNaN(me.locationLat) &&
          !Number.isNaN(me.locationLng);
        const done = Boolean(me.profileComplete || hasLegacyProfile);
        setAuthedInitialRoute(done ? "MainTabs" : "Onboarding");
      })
      .catch(() => {
        if (!mounted) return;
        setAuthedInitialRoute("MainTabs");
      })
      .finally(() => {
        if (mounted) setAuthRouteReady(true);
      });

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user?.email, user?.isNewUser]);

  if (!hydrated || !authRouteReady) {
    return null;
  }

  return (
    <Stack.Navigator
      key={`${isAuthenticated ? "auth" : "guest"}-${authedInitialRoute}`}
      initialRouteName={isAuthenticated ? authedInitialRoute : "Login"}
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: "700" },
        headerBackTitleVisible: false,
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          <Stack.Screen name="VerifyEmailOtp" component={VerifyEmailOtpScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AcceptInvite" component={AcceptInviteScreen} options={{ title: "Invite" }} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AcceptInvite" component={AcceptInviteScreen} />
      <Stack.Screen
        name="CreateMatch"
        component={CreateMatchScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: "Notifications",
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen name="Competitions" component={CompetitionsScreen} />
      <Stack.Screen
        name="CreateCompetition"
        component={CreateCompetitionScreen}
        options={{
          title: "Create competition",
          contentStyle: { paddingTop: 14 },
        }}
      />
      <Stack.Screen name="CompetitionDetail" component={CompetitionDetailScreen} />
      <Stack.Screen name="InvitePlayers" component={InvitePlayersScreen} />
      <Stack.Screen name="Verification" component={VerificationScreen} options={{ title: "Verification" }} />
      <Stack.Screen name="InstantPlay" component={InstantPlayScreen} />
      <Stack.Screen name="Players" component={PlayersScreen} />
      <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Friends" component={FriendsScreen} />
      <Stack.Screen name="PastEvents" component={PastEventsScreen} />
      <Stack.Screen name="MyMatches" component={MyMatchesScreen} options={{ title: "My matches" }} />
      <Stack.Screen name="ConversationView" component={ConversationViewScreen} />
      <Stack.Screen name="MatchChat" component={MatchChatScreen} />
      <Stack.Screen name="MatchRatePlayers" component={MatchRatePlayersScreen} options={{ title: "Rate players" }} />
      <Stack.Screen name="SubscriptionGate" component={SubscriptionGateScreen} />
      <Stack.Screen name="AdminIDReview" component={AdminIDReviewScreen} options={{ title: "Admin ID Review" }} />
      <Stack.Screen name="AdminTestMode" component={AdminTestModeScreen} options={{ title: "Admin Test Mode" }} />
      <Stack.Screen name="Community" component={CommunityScreen} options={{ title: "Community" }} />
        </>
      )}
    </Stack.Navigator>
  );
}
