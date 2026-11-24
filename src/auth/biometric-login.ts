import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BIOMETRIC_CREDENTIAL_KEY = "eva.biometric.credential.v1";
const BIOMETRIC_ENABLED_KEY = "eva.biometric.enabled.v1";
const BIOMETRIC_MODE_KEY = "eva.biometric.mode.v1";
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  requireAuthentication: true,
  authenticationPrompt: "Authenticate to sign in to EVA Foods",
};

export type BiometricAvailability = {
  available: boolean;
  reason?: "unsupported" | "not-enrolled" | "secure-store-unavailable";
  types: LocalAuthentication.AuthenticationType[];
};

export type BiometricReadResult =
  | { status: "success"; credential: string }
  | { status: "not-enabled" }
  | { status: "cancelled-or-failed" }
  | { status: "enrollment-changed" };

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    return { available: false, reason: "unsupported", types: [] };
  }

  try {
    const [hasHardware, enrolled, types, secureStoreAvailable] =
      await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
        SecureStore.isAvailableAsync(),
      ]);

    if (!hasHardware) {
      return { available: false, reason: "unsupported", types };
    }
    if (!enrolled) {
      return { available: false, reason: "not-enrolled", types };
    }
    if (!secureStoreAvailable) {
      return { available: false, reason: "secure-store-unavailable", types };
    }

    return { available: true, types };
  } catch {
    return { available: false, reason: "unsupported", types: [] };
  }
}

export async function isBiometricLoginEnabled() {
  try {
    return (await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)) === "true";
  } catch {
    return false;
  }
}

export async function enableBiometricLogin(username: string) {
  const availability = await getBiometricAvailability();
  if (!availability.available) return false;

  try {
    const credential = username.trim().toLowerCase();
    const secureStoreBiometrics = SecureStore.canUseBiometricAuthentication();
    await SecureStore.setItemAsync(
      BIOMETRIC_CREDENTIAL_KEY,
      credential,
      secureStoreBiometrics ? secureStoreOptions : undefined,
    );
    await SecureStore.setItemAsync(
      BIOMETRIC_MODE_KEY,
      secureStoreBiometrics ? "secure-store" : "local-authentication",
    );
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");
    return true;
  } catch {
    return false;
  }
}

export async function readBiometricLoginCredential(): Promise<BiometricReadResult> {
  if (!(await isBiometricLoginEnabled())) return { status: "not-enabled" };

  try {
    const mode = await SecureStore.getItemAsync(BIOMETRIC_MODE_KEY);
    let credential: string | null;
    if (mode === "local-authentication") {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Sign in to EVA Foods",
        cancelLabel: "Use password",
        disableDeviceFallback: true,
      });
      if (!result.success) return { status: "cancelled-or-failed" };
      credential = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIAL_KEY);
    } else {
      credential = await SecureStore.getItemAsync(
        BIOMETRIC_CREDENTIAL_KEY,
        secureStoreOptions,
      );
    }
    if (!credential) {
      await markBiometricLoginDisabled();
      return { status: "enrollment-changed" };
    }
    return { status: "success", credential };
  } catch {
    // A dismissed prompt, failed scan, lockout, or unavailable device should
    // leave password login available and must not erase a valid enrollment.
    return { status: "cancelled-or-failed" };
  }
}

export async function clearBiometricLogin() {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIAL_KEY);
  } catch {
    // Marker removal still hides the option if the protected item is locked.
  }
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  } catch {
    // Treat an unreadable marker as disabled on the next app launch.
  }
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_MODE_KEY);
  } catch {
    // Missing mode marker is safe; login will require the normal credentials.
  }
}

async function markBiometricLoginDisabled() {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIAL_KEY);
  } catch {
    // The inaccessible value is no longer offered for biometric sign-in.
  }
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_MODE_KEY);
  } catch {
    // Missing mode marker is safe.
  }
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  } catch {
    // A missing or unreadable marker is treated as disabled.
  }
}
