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
} from "../screens";
import { COLORS } from "../theme/colors";
import { MainTabs } from "./MainTabs";
import { RootStackParamList } from "./types";
import { useAuth } from "../store";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, hydrated } = useAuth();

  if (!hydrated) {
    return null;
  }

  return (
    <Stack.Navigator
      initialRouteName={isAuthenticated ? "MainTabs" : "Login"}
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
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="AcceptInvite" component={AcceptInviteScreen} />
      <Stack.Screen name="CreateMatch" component={CreateMatchScreen} />
      <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Competitions" component={CompetitionsScreen} />
      <Stack.Screen name="CreateCompetition" component={CreateCompetitionScreen} />
      <Stack.Screen name="CompetitionDetail" component={CompetitionDetailScreen} />
      <Stack.Screen name="InvitePlayers" component={InvitePlayersScreen} />
      <Stack.Screen name="Verification" component={VerificationScreen} />
      <Stack.Screen name="InstantPlay" component={InstantPlayScreen} />
      <Stack.Screen name="Players" component={PlayersScreen} />
      <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Friends" component={FriendsScreen} />
      <Stack.Screen name="PastEvents" component={PastEventsScreen} />
      <Stack.Screen name="ConversationView" component={ConversationViewScreen} />
      <Stack.Screen name="MatchChat" component={MatchChatScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
