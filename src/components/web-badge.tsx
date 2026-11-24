import { StyleSheet } from "react-native";
import { version } from "expo/package.json";

import { Spacing } from "@/constants/theme";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

export function WebBadge() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="smallBold" style={styles.brand}>
        EVA FOODS
      </ThemedText>
      <ThemedText type="code" themeColor="textSecondary">
        Employee App · v{version}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.five,
    padding: Spacing.four,
    alignItems: "center",
    gap: Spacing.one,
    borderTopWidth: 1,
    borderColor: "#DCE7DF",
  },
  brand: { color: "#176B45", letterSpacing: 1.2 },
});
