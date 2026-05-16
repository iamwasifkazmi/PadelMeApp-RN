import { Platform, TextStyle, ViewStyle } from "react-native";

/** Vertical padding for pill/chip containers — tighter on Android to match iOS visual balance. */
export const CHIP_PAD_V = Platform.OS === "android" ? 3 : 4;
export const CHIP_PAD_V_SM = Platform.OS === "android" ? 2 : 3;
export const CHIP_PAD_V_XS = Platform.OS === "android" ? 1 : 2;

export const chipPillShell: ViewStyle = {
  borderRadius: 999,
  paddingHorizontal: 8,
  paddingVertical: CHIP_PAD_V,
  overflow: "hidden",
  alignSelf: "flex-start",
};

export const chipPillShellSm: ViewStyle = {
  ...chipPillShell,
  paddingHorizontal: 7,
  paddingVertical: CHIP_PAD_V_SM,
};

/**
 * Android adds extra font padding below glyphs (`includeFontPadding`), which makes
 * text-as-chip labels look bottom-heavy. iOS is unchanged.
 */
export function androidChipText(fontSize: number): TextStyle {
  if (Platform.OS !== "android") return {};
  return {
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: Math.max(fontSize + 2, Math.round(fontSize * 1.25)),
  };
}
