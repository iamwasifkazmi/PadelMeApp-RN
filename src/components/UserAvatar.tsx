import React from "react";
import { Image, StyleProp, Text, View, ViewStyle } from "react-native";
import { COLORS } from "../theme/colors";

/** Two-letter (or shorter) initials from a display name or email. */
export function userInitials(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("");
  }
  const t = parts[0] || trimmed;
  const letters = t.replace(/[^a-zA-Z0-9]/g, "");
  if (letters.length >= 2) return letters.slice(0, 2).toUpperCase();
  return t.slice(0, Math.min(2, t.length)).toUpperCase() || "?";
}

type Variant = "soft" | "solid" | "chat";

function variantStyle(variant: Variant, size: number) {
  const softFont = Math.max(10, Math.round((12 * size) / 36));
  const solidFont = Math.max(11, Math.round((28 * size) / 72));
  switch (variant) {
    case "soft":
      return {
        backgroundColor: COLORS.primarySoftAlt,
        color: COLORS.primaryDark,
        fontWeight: "800" as const,
        fontSize: softFont,
      };
    case "solid":
      return {
        backgroundColor: COLORS.text,
        color: COLORS.card,
        fontWeight: "800" as const,
        fontSize: solidFont,
      };
    case "chat":
      return {
        backgroundColor: "#DFE5E7",
        color: "#54656F",
        fontWeight: "600" as const,
        fontSize: Math.max(14, Math.round((17 * size) / 40)),
      };
  }
}

export type UserAvatarProps = {
  photoUrl?: string | null;
  label: string;
  size: number;
  shape?: "rounded" | "circle";
  borderRadius?: number;
  variant?: Variant;
  /** When the image fails or is missing; defaults from `variant`. */
  fallbackBackgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function UserAvatar({
  photoUrl,
  label,
  size,
  shape = "rounded",
  borderRadius: borderRadiusProp,
  variant = "soft",
  fallbackBackgroundColor,
  style,
  accessibilityLabel,
}: UserAvatarProps) {
  const [failed, setFailed] = React.useState(false);
  const uri = (photoUrl || "").trim();
  React.useEffect(() => {
    setFailed(false);
  }, [uri]);

  const borderRadius =
    borderRadiusProp ?? (shape === "circle" ? size / 2 : Math.round((size * 10) / 36));
  const vs = variantStyle(variant, size);
  const showImage = uri.length > 0 && !failed;
  const a11y = accessibilityLabel ?? label;
  const fallBg = fallbackBackgroundColor ?? vs.backgroundColor;

  return (
    <View style={[{ width: size, height: size, borderRadius, overflow: "hidden" }, style]}>
      {showImage ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          accessibilityLabel={a11y}
          accessibilityRole="image"
          onError={() => setFailed(true)}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: fallBg,
          }}
          accessibilityRole="image"
          accessibilityLabel={a11y}
        >
          <Text style={{ color: vs.color, fontSize: vs.fontSize, fontWeight: vs.fontWeight }}>
            {userInitials(label)}
          </Text>
        </View>
      )}
    </View>
  );
}
