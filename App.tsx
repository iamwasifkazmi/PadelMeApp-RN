import React from "react";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { StatusBar, useColorScheme } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { RootNavigator } from "./src/navigation";
import { SnackbarProvider } from "./src/components/Snackbar";
import { bootstrapSession } from "./src/store";
import { store } from "./src/store/store";
import { getThemeColors } from "./src/theme/colors";

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
    bootstrapSession();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <SnackbarProvider>
            <NavigationContainer theme={theme}>
              <RootNavigator />
            </NavigationContainer>
          </SnackbarProvider>
        </SafeAreaView>
      </SafeAreaProvider>
    </Provider>
  );
}

export default App;
