/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import "@/global.css";

import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#17352B",
    background: "#F4F7F4",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#E8F1EB",
    textSecondary: "#66776F",
  },
  dark: {
    text: "#F3F7F4",
    background: "#101B17",
    backgroundElement: "#1A2922",
    backgroundSelected: "#243B30",
    textSecondary: "#A9B9AF",
  },
} as const;

export const BrandColors = {
  green: "#176B45",
  greenDeep: "#104B35",
  greenDark: "#0B3529",
  greenSoft: "#E4F3E9",
  gold: "#E6B942",
  goldSoft: "#FFF4D6",
  ink: "#17352B",
  muted: "#66776F",
  canvas: "#F4F7F4",
  surface: "#FFFFFF",
  border: "#DCE7DF",
  danger: "#C94C4C",
  blueSoft: "#E9F2F8",
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
