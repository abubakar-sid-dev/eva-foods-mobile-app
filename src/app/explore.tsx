import { ExternalLink } from "@/components/external-link";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Collapsible } from "@/components/ui/collapsible";
import { WebBadge } from "@/components/web-badge";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { SymbolView } from "expo-symbols";
import { Platform, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ExploreScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const platformPadding = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: { paddingTop: Spacing.five, paddingBottom: Spacing.four },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, platformPadding]}
    >
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">EVA Resources</ThemedText>
          <ThemedText style={styles.centerText} themeColor="textSecondary">
            Helpful guidance for your EVA Foods employee application.
          </ThemedText>
          <ExternalLink href="https://docs.expo.dev" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.helpLink}>
                <ThemedText type="link">Mobile app help</ThemedText>
                <SymbolView
                  tintColor={theme.text}
                  name={{
                    ios: "arrow.up.right.square",
                    android: "link",
                    web: "link",
                  }}
                  size={13}
                />
              </ThemedView>
            </Pressable>
          </ExternalLink>
        </ThemedView>

        <ThemedView style={styles.sections}>
          <Collapsible title="Your employee dashboard">
            <ThemedText type="small">
              The dashboard shows your profile and provides a quick route to
              your attendance information.
            </ThemedText>
            <ExternalLink href="https://docs.expo.dev/router/introduction">
              <ThemedText type="linkPrimary">Navigation help</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title="Attendance history">
            <ThemedText type="small">
              Choose a month and year to review your attendance history, working
              days, and check-in details.
            </ThemedText>
          </Collapsible>

          <Collapsible title="Profile information">
            <ThemedText type="small">
              Your employee information and profile image are associated with
              your signed-in account.
            </ThemedText>
            <ExternalLink href="https://reactnative.dev/docs/images">
              <ThemedText type="linkPrimary">Profile image help</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title="Display preferences">
            <ThemedText type="small">
              EVA Foods follows your device&apos;s light or dark appearance
              preference for a comfortable viewing experience.
            </ThemedText>
            <ExternalLink href="https://docs.expo.dev/develop/user-interface/color-themes/">
              <ThemedText type="linkPrimary">Display settings help</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title="App interactions">
            <ThemedText type="small">
              Expandable help sections use a subtle transition. Tap a section
              heading to open or close it.
            </ThemedText>
          </Collapsible>
        </ThemedView>
        {Platform.OS === "web" && <WebBadge />}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { flexDirection: "row", justifyContent: "center" },
  container: { maxWidth: MaxContentWidth, flexGrow: 1 },
  titleContainer: {
    gap: Spacing.three,
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  centerText: { textAlign: "center", maxWidth: 360 },
  pressed: { opacity: 0.78 },
  helpLink: {
    flexDirection: "row",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 20,
    justifyContent: "center",
    gap: Spacing.two,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCE7DF",
  },
  sections: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    backgroundColor: "transparent",
  },
});
