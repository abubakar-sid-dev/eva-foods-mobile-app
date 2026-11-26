import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BIOMETRIC_CREDENTIAL_KEY = "eva.biometric.credential.v1";
const BIOMETRIC_ENABLED_KEY = "eva.biometric.enabled.v1";
const BIOMETRIC_MODE_KEY = "eva.biometric.mode.v1";
const BIOMETRIC_METHODS_KEY = "eva.biometric.methods.v1";
const BIOMETRIC_FACE_ENABLED_KEY = "eva.biometric.method.face.v1";
const BIOMETRIC_FINGERPRINT_ENABLED_KEY = "eva.biometric.method.fingerprint.v1";
const ENROLLMENT_HANDLED_PREFIX = "eva.biometric.prompt-handled.";

export type BiometricMethod = LocalAuthentication.AuthenticationType;

export type BiometricAvailability = {
  available: boolean;
  reason?: "unsupported" | "not-enrolled" | "secure-store-unavailable";
  types: BiometricMethod[];
};

export type BiometricReadResult =
  | { status: "success"; credential: string }
  | { status: "not-enabled" }
  | { status: "method-unavailable" }
  | { status: "cancelled-or-failed" }
  | { status: "enrollment-changed" };

const isMethod = (value: unknown): value is BiometricMethod =>
  value === LocalAuthentication.AuthenticationType.FINGERPRINT ||
  value === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION;

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    return { available: false, reason: "unsupported", types: [] };
  }

  try {
    const [hasHardware, enrolled, supportedTypes, secureStoreAvailable] =
      await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
        SecureStore.isAvailableAsync(),
      ]);
    const types = supportedTypes.filter(isMethod);

    if (!hasHardware) {
      return { available: false, reason: "unsupported", types };
    }
    if (!enrolled) {
      return { available: false, reason: "not-enrolled", types: [] };
    }
    if (!secureStoreAvailable) {
      return { available: false, reason: "secure-store-unavailable", types };
    }

    return { available: types.length > 0, types };
  } catch {
    return { available: false, reason: "unsupported", types: [] };
  }
}

export async function getEnabledBiometricMethods(): Promise<BiometricMethod[]> {
  try {
    const [faceEnabled, fingerprintEnabled] = await Promise.all([
      SecureStore.getItemAsync(BIOMETRIC_FACE_ENABLED_KEY),
      SecureStore.getItemAsync(BIOMETRIC_FINGERPRINT_ENABLED_KEY),
    ]);
    if (faceEnabled !== null || fingerprintEnabled !== null) {
      return [
        ...(faceEnabled === "true"
          ? [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION]
          : []),
        ...(fingerprintEnabled === "true"
          ? [LocalAuthentication.AuthenticationType.FINGERPRINT]
          : []),
      ];
    }

    // Migrate the previous combined preference into independent secure keys.
    const storedMethods = await SecureStore.getItemAsync(BIOMETRIC_METHODS_KEY);
    if (storedMethods) {
      const parsed: unknown = JSON.parse(storedMethods);
      if (Array.isArray(parsed)) {
        const methods = parsed.filter(isMethod);
        await saveEnabledMethods(methods);
        return methods;
      }
    }

    // Migrate installations created before per-method settings were introduced.
    if ((await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)) === "true") {
      const availability = await getBiometricAvailability();
      await saveEnabledMethods(availability.types);
      return availability.types;
    }
  } catch {
    return [];
  }

  return [];
}

export async function isBiometricLoginEnabled() {
  return (await getEnabledBiometricMethods()).length > 0;
}

export async function wasBiometricEnrollmentHandled(username: string) {
  try {
    return (
      (await SecureStore.getItemAsync(enrollmentHandledKey(username))) ===
      "true"
    );
  } catch {
    return false;
  }
}

export async function markBiometricEnrollmentHandled(username: string) {
  await SecureStore.setItemAsync(enrollmentHandledKey(username), "true");
}

/**
 * Enroll a preference after successful native biometric verification.
 * The preference controls which app option is shown. The operating system
 * chooses which enrolled biometric can satisfy its native prompt.
 */
export async function registerBiometricMethod(
  username: string,
  method: BiometricMethod,
): Promise<boolean> {
  const availability = await getBiometricAvailability();
  if (!availability.available || !availability.types.includes(method)) {
    return false;
  }
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Verify your identity to enable biometric login",
      cancelLabel: "Cancel",
      biometricsSecurityLevel: "weak",
      disableDeviceFallback: false,
    });
    if (!result.success) return false;

    const existingMethods = await getEnabledBiometricMethods();
    if (existingMethods.length === 0) {
      // The username is encrypted at rest; passwords are never persisted.
      await SecureStore.setItemAsync(
        BIOMETRIC_CREDENTIAL_KEY,
        username.trim().toLowerCase(),
      );
      await SecureStore.setItemAsync(
        BIOMETRIC_MODE_KEY,
        "local-authentication",
      );
    }

    const nextMethods = Array.from(new Set([...existingMethods, method]));
    await saveEnabledMethods(nextMethods);
    await markBiometricEnrollmentHandled(username);
    return true;
  } catch {
    return false;
  }
}

export async function removeBiometricMethod(method: BiometricMethod) {
  const remaining = (await getEnabledBiometricMethods()).filter(
    (enabledMethod) => enabledMethod !== method,
  );
  await saveEnabledMethods(remaining);
}

export async function readBiometricLoginCredential(
  method: BiometricMethod,
): Promise<BiometricReadResult> {
  const enabledMethods = await getEnabledBiometricMethods();
  if (!enabledMethods.includes(method)) return { status: "not-enabled" };

  try {
    const availability = await getBiometricAvailability();
    if (!availability.available || !availability.types.includes(method)) {
      await removeBiometricMethod(method);
      return { status: "method-unavailable" };
    }

    const mode = await SecureStore.getItemAsync(BIOMETRIC_MODE_KEY);
    let credential: string | null;
    if (mode === "secure-store") {
      credential = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIAL_KEY, {
        requireAuthentication: true,
        authenticationPrompt: "Authenticate to sign in to EVA Foods",
      });
    } else {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Sign in to EVA Foods",
        cancelLabel: "Use password",
        disableDeviceFallback: true,
      });
      if (!result.success) return { status: "cancelled-or-failed" };
      credential = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIAL_KEY);
    }

    if (!credential) {
      await clearBiometricLogin();
      return { status: "enrollment-changed" };
    }
    return { status: "success", credential };
  } catch {
    return { status: "cancelled-or-failed" };
  }
}

export async function clearBiometricLogin() {
  await Promise.all(
    [
      BIOMETRIC_CREDENTIAL_KEY,
      BIOMETRIC_ENABLED_KEY,
      BIOMETRIC_MODE_KEY,
      BIOMETRIC_METHODS_KEY,
      BIOMETRIC_FACE_ENABLED_KEY,
      BIOMETRIC_FINGERPRINT_ENABLED_KEY,
    ].map((key) => SecureStore.deleteItemAsync(key).catch(() => undefined)),
  );
}

export function getBiometricMethodLabel(method: BiometricMethod) {
  return method === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
    ? "Face ID"
    : "Fingerprint";
}

export function getBiometricMethodIcon(method: BiometricMethod) {
  return method === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
    ? "faceid"
    : "touchid";
}

async function saveEnabledMethods(methods: BiometricMethod[]) {
  const faceEnabled = methods.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
  );
  const fingerprintEnabled = methods.includes(
    LocalAuthentication.AuthenticationType.FINGERPRINT,
  );
  await Promise.all([
    SecureStore.setItemAsync(BIOMETRIC_FACE_ENABLED_KEY, String(faceEnabled)),
    SecureStore.setItemAsync(
      BIOMETRIC_FINGERPRINT_ENABLED_KEY,
      String(fingerprintEnabled),
    ),
    // Retained for migration/backward compatibility with older app builds.
    SecureStore.setItemAsync(BIOMETRIC_METHODS_KEY, JSON.stringify(methods)),
    SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, String(methods.length > 0)),
  ]);
  if (methods.length === 0) {
    await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIAL_KEY).catch(
      () => undefined,
    );
    await SecureStore.deleteItemAsync(BIOMETRIC_MODE_KEY).catch(
      () => undefined,
    );
  }
}

function enrollmentHandledKey(username: string) {
  return `${ENROLLMENT_HANDLED_PREFIX}${username.trim().toLowerCase()}`;
}
