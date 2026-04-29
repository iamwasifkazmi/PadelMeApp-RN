import React from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../theme/colors";

type SnackbarType = "success" | "error" | "info";

type SnackbarOptions = {
  type?: SnackbarType;
  durationMs?: number;
};

type SnackbarContextValue = {
  showSnackbar: (message: string, options?: SnackbarOptions) => void;
};

const SnackbarContext = React.createContext<SnackbarContextValue | null>(null);

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = React.useState<string>("");
  const [type, setType] = React.useState<SnackbarType>("info");
  const [visible, setVisible] = React.useState(false);
  const translateY = React.useRef(new Animated.Value(90)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = React.useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 90, duration: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setMessage("");
    });
  }, [opacity, translateY]);

  const showSnackbar = React.useCallback(
    (nextMessage: string, options?: SnackbarOptions) => {
      if (!nextMessage.trim()) return;
      if (hideTimer.current) clearTimeout(hideTimer.current);

      const nextType = options?.type || "info";
      const duration = options?.durationMs ?? 2800;

      setType(nextType);
      setMessage(nextMessage.trim());
      setVisible(true);

      translateY.setValue(90);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 210, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 210, useNativeDriver: true }),
      ]).start();

      hideTimer.current = setTimeout(hide, duration);
    },
    [hide, opacity, translateY],
  );

  React.useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      {visible ? (
        <View pointerEvents="box-none" style={styles.overlay}>
          <Animated.View
            style={[
              styles.wrap,
              {
                transform: [{ translateY }],
                opacity,
              },
            ]}
          >
            <Pressable
              onPress={hide}
              style={[
                styles.snackbar,
                type === "success" && styles.snackbarSuccess,
                type === "error" && styles.snackbarError,
              ]}
            >
              <Text style={styles.text}>{message}</Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const ctx = React.useContext(SnackbarContext);
  if (!ctx) throw new Error("useSnackbar must be used within SnackbarProvider");
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 22,
    paddingHorizontal: 14,
  },
  wrap: { alignItems: "center" },
  snackbar: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.darkCard,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    maxWidth: "100%",
  },
  snackbarSuccess: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  snackbarError: {
    backgroundColor: COLORS.dangerText,
    borderColor: COLORS.dangerText,
  },
  text: {
    color: COLORS.card,
    fontSize: 13,
    fontWeight: "600",
  },
});
