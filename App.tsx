import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { StatusBar } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { RootNavigator } from "./src/navigation";
import { SnackbarProvider } from "./src/components/Snackbar";
import { bootstrapSession } from "./src/store";
import { store } from "./src/store/store";
import { COLORS } from "./src/theme/colors";

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.bg,
  },
};

function App() {
  React.useEffect(() => {
    bootstrapSession();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
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
