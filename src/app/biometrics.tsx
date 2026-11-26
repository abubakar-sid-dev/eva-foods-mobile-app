import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getBiometricAvailability,
  getBiometricMethodIcon,
  getBiometricMethodLabel,
  getEnabledBiometricMethods,
  registerBiometricMethod,
  removeBiometricMethod,
  type BiometricMethod,
} from "@/auth/biometric-login";
import { useSession } from "@/auth/session";

export default function BiometricSettingsScreen() {
  const { employee } = useSession();
  const router = useRouter();
  const [available, setAvailable] = useState<BiometricMethod[]>([]);
  const [enabled, setEnabled] = useState<BiometricMethod[]>([]);
  const [loadingMethod, setLoadingMethod] = useState<BiometricMethod | null>(
    null,
  );

  const refresh = useCallback(async () => {
    const [availability, configured] = await Promise.all([
      getBiometricAvailability(),
      getEnabledBiometricMethods(),
    ]);
    setAvailable(availability.types);
    setEnabled(
      configured.filter((method) => availability.types.includes(method)),
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (!employee) return null;

  const addMethod = async (method: BiometricMethod) => {
    setLoadingMethod(method);
    const result = await registerBiometricMethod(employee.username, method);
    setLoadingMethod(null);
    if (!result) {
      Alert.alert(
        "Setup not completed",
        "The device could not verify the biometric. Your current login settings are unchanged.",
      );
      return;
    }
    await refresh();
  };

  const confirmRemove = (method: BiometricMethod) => {
    Alert.alert(
      `Disable ${getBiometricMethodLabel(method)}?`,
      "You can continue signing in with your ERP username and password.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          style: "destructive",
          onPress: () => {
            void removeBiometricMethod(method)
              .then(refresh)
              .catch(() => {
                Alert.alert("Unable to update", "Please try again.");
              });
          },
        },
      ],
    );
  };

  const emptyReason =
    available.length > 0
      ? "No biometric method is currently enrolled in EVA Foods."
      : "No supported, enrolled biometric method was found on this device. You can still sign in with your ERP username and password.";

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.heading}>Security & Biometrics</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Manage the biometric methods available for this device.
        </Text>
        {available.length === 0 ? (
          <Text style={styles.empty}>{emptyReason}</Text>
        ) : null}
        {available.map((method) => {
          const isEnabled = enabled.includes(method);
          return (
            <View key={method} style={styles.methodCard}>
              <View style={styles.iconTile}>
                <SymbolView
                  name={{
                    ios: getBiometricMethodIcon(method),
                    android: method === 2 ? "face" : "fingerprint",
                    web: method === 2 ? "face" : "fingerprint",
                  }}
                  tintColor="#176B45"
                  size={28}
                />
              </View>
              <View style={styles.methodCopy}>
                <Text style={styles.methodTitle}>
                  {getBiometricMethodLabel(method)}
                </Text>
                <Text style={styles.methodStatus}>
                  {isEnabled ? "Enabled on this device" : "Available to enable"}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  isEnabled ? confirmRemove(method) : void addMethod(method)
                }
                disabled={loadingMethod !== null}
                style={[styles.action, isEnabled && styles.disableAction]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.actionText,
                    isEnabled && styles.disableActionText,
                  ]}
                >
                  {loadingMethod === method
                    ? "Verifying…"
                    : isEnabled
                      ? "Disable"
                      : "Enable"}
                </Text>
              </Pressable>
            </View>
          );
        })}
        <Text style={styles.note}>
          Your device displays its own biometric prompt and chooses which
          enrolled scan to use. EVA Foods does not access or store biometric
          templates.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F7F4" },
  header: {
    backgroundColor: "#104B35",
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 10,
  },
  backButton: { padding: 6 },
  back: { color: "white", fontSize: 30, lineHeight: 32 },
  heading: { color: "white", fontSize: 18, fontWeight: "800" },
  content: { padding: 20, gap: 14 },
  intro: { color: "#53655B", fontSize: 14, lineHeight: 21, marginBottom: 4 },
  empty: {
    color: "#53655B",
    backgroundColor: "white",
    borderRadius: 18,
    padding: 18,
    lineHeight: 22,
  },
  methodCard: {
    minHeight: 86,
    padding: 14,
    backgroundColor: "white",
    borderColor: "#DCE7DF",
    borderWidth: 1,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#E4F3E9",
    alignItems: "center",
    justifyContent: "center",
  },
  methodCopy: { flex: 1 },
  methodTitle: { color: "#17352B", fontSize: 15, fontWeight: "800" },
  methodStatus: { color: "#66776F", fontSize: 12, marginTop: 4 },
  action: {
    minWidth: 76,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: "#176B45",
  },
  actionText: { color: "white", fontSize: 12, fontWeight: "800" },
  disableAction: { backgroundColor: "#FFF1E8" },
  disableActionText: { color: "#A44B30" },
  note: { marginTop: 6, color: "#718078", fontSize: 12, lineHeight: 18 },
});
