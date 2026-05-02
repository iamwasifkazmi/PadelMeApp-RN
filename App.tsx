import React from "react";
import { Linking, StatusBar, useColorScheme } from "react-native";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { RootNavigator } from "./src/navigation";
import { SnackbarProvider } from "./src/components/Snackbar";
import { bootstrapSession } from "./src/store";
import { store } from "./src/store/store";
import { getThemeColors } from "./src/theme/colors";
import { navigationRef } from "./src/navigation/navigationRef";
import { parseInviteDeepLink } from "./src/navigation/inviteDeepLink";
import { pendingPostAuthInviteToken } from "./src/navigation/pendingPostAuthInvite";
import { configureGoogleSignIn } from "./src/lib/googleAuth";

const pendingInviteUrlRef: { current: string | null } = { current: null };

function flushPendingInviteNavigation() {
  const url = pendingInviteUrlRef.current;
  if (!url || !navigationRef.isReady()) return;
  const token = parseInviteDeepLink(url);
  if (!token) {
    pendingInviteUrlRef.current = null;
    return;
  }
  pendingInviteUrlRef.current = null;
  navigationRef.navigate("AcceptInvite", { token });
}

function flushPostAuthInviteNavigation() {
  const token = pendingPostAuthInviteToken.current;
  if (!token || !navigationRef.isReady()) return;
  pendingPostAuthInviteToken.current = null;
  navigationRef.navigate("AcceptInvite", { token });
}

function App() {
  const isDark = useColorScheme() === "dark";
  const colors = getThemeColors(isDark);
  const theme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
      notification: colors.badge,
    },
  };

  React.useEffect(() => {
    configureGoogleSignIn();
  }, []);

  React.useEffect(() => {
    bootstrapSession();
  }, []);

  React.useEffect(() => {
    Linking.getInitialURL().then((u) => {
      if (u) pendingInviteUrlRef.current = u;
      flushPendingInviteNavigation();
    });
  }, []);

  React.useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      pendingInviteUrlRef.current = url;
      flushPendingInviteNavigation();
    });
    return () => sub.remove();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <SnackbarProvider>
            <NavigationContainer
              ref={navigationRef}
              theme={theme}
              onReady={() => {
                flushPendingInviteNavigation();
                flushPostAuthInviteNavigation();
              }}
              onStateChange={() => {
                flushPendingInviteNavigation();
                flushPostAuthInviteNavigation();
              }}
            >
              <RootNavigator />
            </NavigationContainer>
          </SnackbarProvider>
        </SafeAreaView>
      </SafeAreaProvider>
    </Provider>
  );
}

export default App;
