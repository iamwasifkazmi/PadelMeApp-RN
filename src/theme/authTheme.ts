import { useColorScheme } from "react-native";
import { getThemeColors } from "./colors";

export function useAuthTheme() {
  const isDark = useColorScheme() === "dark";
  const colors = getThemeColors(isDark);
  const logoSource = isDark
    ? require("../../assets/Logos/logo-white.jpeg")
    : require("../../assets/Logos/logo-black.jpeg");
  return { isDark, colors, logoSource };
}
