import { authenticationService } from "@/auth/auth-service";
import {
  getBiometricAvailability,
  getBiometricMethodIcon,
  getBiometricMethodLabel,
  getEnabledBiometricMethods,
  markBiometricEnrollmentHandled,
  readBiometricLoginCredential,
  registerBiometricMethod,
  wasBiometricEnrollmentHandled,
  type BiometricMethod,
} from "@/auth/biometric-login";
import { useSession } from "@/auth/session";
import type { Employee } from "@/types/hrms";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [enabledMethods, setEnabledMethods] = useState<BiometricMethod[]>([]);
  const [availableMethods, setAvailableMethods] = useState<BiometricMethod[]>(
    [],
  );
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [enrollmentStep, setEnrollmentStep] = useState<
    "offer" | "choose" | "other" | null
  >(null);
  const [enrollmentEmployee, setEnrollmentEmployee] = useState<Employee | null>(
    null,
  );
  const [enrollmentOptions, setEnrollmentOptions] = useState<BiometricMethod[]>(
    [],
  );
  const [cardOpacity] = useState(() => new Animated.Value(0));
  const { signIn } = useSession();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    void (async () => {
      const [enabled, availability] = await Promise.all([
        getEnabledBiometricMethods(),
        getBiometricAvailability(),
      ]);
      if (!active) return;
      setEnabledMethods(
        enabled.filter((method) => availability.types.includes(method)),
      );
      setAvailableMethods(availability.types);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    Animated.timing(cardOpacity, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [cardOpacity]);

  const login = async () => {
    if (!username.trim() || !password) {
      setError("Enter your ERP username and password.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const employee = await authenticationService.authenticateWithPassword(
        username,
        password,
      );
      if (!employee) {
        setError("Incorrect username or password.");
        return;
      }

      await finishLogin(employee);
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const finishLogin = async (employee: Employee) => {
    const [enabled, handled, availability] = await Promise.all([
      getEnabledBiometricMethods(),
      wasBiometricEnrollmentHandled(employee.username),
      getBiometricAvailability(),
    ]);
    setEnabledMethods(
      enabled.filter((method) => availability.types.includes(method)),
    );
    setAvailableMethods(availability.types);
    if (enabled.length === 0 && !handled && availability.available) {
      setEnrollmentEmployee(employee);
      setEnrollmentStep("offer");
      return;
    }
    goHome(employee);
  };

  const goHome = (employee: Employee) => {
    signIn(employee);
    router.replace("/home" as never);
  };

  const continueWithoutBiometrics = async () => {
    if (enrollmentEmployee) {
      await markBiometricEnrollmentHandled(enrollmentEmployee.username).catch(
        () => undefined,
      );
      goHome(enrollmentEmployee);
    }
    setEnrollmentStep(null);
  };

  const chooseBiometricMethod = async (method: BiometricMethod) => {
    if (!enrollmentEmployee) return;
    setBiometricBusy(true);
    const enrolled = await registerBiometricMethod(
      enrollmentEmployee.username,
      method,
    );
    setBiometricBusy(false);
    if (!enrolled) {
      Alert.alert(
        "Biometric setup not completed",
        "Authentication was cancelled or unavailable. You can continue with your ERP password and try again from the home menu.",
      );
      await continueWithoutBiometrics();
      return;
    }

    const next = await getEnabledBiometricMethods();
    setEnabledMethods(next);
    const remaining = availableMethods.filter(
      (candidate) => !next.includes(candidate),
    );
    if (remaining.length > 0) {
      setEnrollmentOptions(remaining);
      setEnrollmentStep("other");
      return;
    }
    goHome(enrollmentEmployee);
    setEnrollmentStep(null);
  };

  const nextBiometricMethod = enrollmentOptions[0];

  const loginWithBiometrics = async (method: BiometricMethod) => {
    if (enabledMethods.length === 0) {
      setError(
        "Sign in with your ERP username and password first, then enable biometric login.",
      );
      return;
    }
    setBiometricBusy(true);
    setError("");
    try {
      const result = await readBiometricLoginCredential(method);
      if (result.status === "success") {
        const employee =
          await authenticationService.authenticateWithBiometricCredential(
            result.credential,
          );
        if (employee) {
          signIn(employee);
          router.replace("/home" as never);
        } else {
          setError(
            "Account not found. Please sign in with your ERP credentials.",
          );
        }
      } else if (result.status === "method-unavailable") {
        setError(
          `${getBiometricMethodLabel(method)} is no longer available on this device. Use your ERP credentials or re-enable it from the home menu.`,
        );
      } else {
        setError(
          "Biometric login was cancelled or is unavailable. Use your ERP credentials.",
        );
      }
    } catch {
      setError("Biometric login failed. Please use your ERP credentials.");
    } finally {
      setBiometricBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={styles.background}>
        <Image
          source={require("@/assets/images/eva-login-background.jpg")}
          resizeMode="cover"
          style={styles.backgroundImage}
          accessibilityIgnoresInvertColors
        />
        <View pointerEvents="none" style={styles.overlay} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
        >
          <View style={styles.hero}>
            <Text style={styles.logo}>EVA</Text>
            <Text style={styles.brand}>EVA FOODS</Text>
            <Text style={styles.tagline}>People first. Quality always.</Text>
          </View>

          <Animated.View style={[styles.card, { opacity: cardOpacity }]}>
            <View style={styles.titleRow}>
              <SymbolView
                name={{ ios: "person.2.fill", android: "group", web: "group" }}
                tintColor="#075A34"
                size={30}
              />
              <Text style={styles.title}>Sign In</Text>
            </View>
            <Text style={styles.subtitle}>Access your account to continue</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="ERP Username"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.password}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#8A938D"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="current-password"
                textContentType="password"
                selectionColor="#176B45"
                cursorColor="#176B45"
                underlineColorAndroid="transparent"
                secureTextEntry={!passwordVisible}
                textAlign="left"
                onSubmitEditing={login}
                returnKeyType="go"
                onBlur={() => setPasswordVisible(false)}
              />
              <Pressable
                style={styles.eyeButton}
                onPressIn={() => setPasswordVisible(true)}
                onPressOut={() => setPasswordVisible(false)}
                onTouchCancel={() => setPasswordVisible(false)}
                onResponderTerminate={() => setPasswordVisible(false)}
                accessibilityLabel="Press and hold to show password"
                accessibilityRole="button"
                hitSlop={10}
              >
                <SymbolView
                  name={{
                    ios: passwordVisible ? "eye.slash" : "eye",
                    android: passwordVisible ? "visibility_off" : "visibility",
                    web: passwordVisible ? "visibility_off" : "visibility",
                  }}
                  tintColor="#075A34"
                  size={22}
                />
              </Pressable>
            </View>
            {!!error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}
            <Pressable style={styles.button} onPress={login} disabled={busy}>
              <Text style={styles.buttonText}>
                {busy ? "Signing inâ€¦" : "Login"}
              </Text>
            </Pressable>
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>Or</Text>
              <View style={styles.orLine} />
            </View>
            {enabledMethods.map((method) => (
              <Pressable
                key={method}
                style={({ pressed }) => [
                  styles.biometricButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => void loginWithBiometrics(method)}
                disabled={biometricBusy}
                accessibilityRole="button"
              >
                <SymbolView
                  name={{
                    ios: getBiometricMethodIcon(method),
                    android: method === 2 ? "face" : "fingerprint",
                    web: method === 2 ? "face" : "fingerprint",
                  }}
                  tintColor="#075A34"
                  size={27}
                />
                <View style={styles.biometricDivider} />
                <Text style={styles.biometricText}>
                  {biometricBusy
                    ? "Waiting for authentication..."
                    : `Login with ${getBiometricMethodLabel(method)}`}
                </Text>
              </Pressable>
            ))}
            {enabledMethods.length > 0 && (
              <Text style={styles.biometricNote}>
                Verification uses your device’s native prompt, which may accept
                any enrolled biometric.
              </Text>
            )}
            <Text style={styles.demo}>
              Demo accounts: eva001â€“eva100 Â· Password: EVA@123
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
      <Modal
        visible={enrollmentStep !== null}
        transparent
        animationType="fade"
        onRequestClose={() => void continueWithoutBiometrics()}
      >
        <View style={styles.enrollmentBackdrop}>
          <View style={styles.enrollmentCard}>
            {enrollmentStep === "offer" ? (
              <>
                <Text style={styles.enrollmentTitle}>
                  Enable Biometric Login?
                </Text>
                <Text style={styles.enrollmentSubtitle}>
                  Enjoy faster and more secure access to your EVA Foods account.
                </Text>
                <Pressable
                  style={styles.enrollmentPrimary}
                  onPress={() => setEnrollmentStep("choose")}
                >
                  <Text style={styles.enrollmentPrimaryText}>Enable</Text>
                </Pressable>
                <Pressable
                  style={styles.enrollmentSecondary}
                  onPress={() => void continueWithoutBiometrics()}
                >
                  <Text style={styles.enrollmentSecondaryText}>Not Now</Text>
                </Pressable>
              </>
            ) : enrollmentStep === "other" ? (
              <>
                <Text style={styles.enrollmentTitle}>
                  {nextBiometricMethod
                    ? `Enable ${getBiometricMethodLabel(nextBiometricMethod)}?`
                    : "Add another method?"}
                </Text>
                <Text style={styles.enrollmentSubtitle}>
                  {nextBiometricMethod
                    ? `Would you also like to enable ${getBiometricMethodLabel(nextBiometricMethod)}?`
                    : "Would you also like to enable the other biometric option?"}
                </Text>
                <Pressable
                  style={styles.enrollmentPrimary}
                  onPress={() => setEnrollmentStep("choose")}
                >
                  <Text style={styles.enrollmentPrimaryText}>
                    {nextBiometricMethod
                      ? `Enable ${getBiometricMethodLabel(nextBiometricMethod)}`
                      : "Add Another Method"}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.enrollmentSecondary}
                  onPress={() => {
                    if (enrollmentEmployee) goHome(enrollmentEmployee);
                    setEnrollmentStep(null);
                  }}
                >
                  <Text style={styles.enrollmentSecondaryText}>Skip</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.enrollmentTitle}>Choose a method</Text>
                <Text style={styles.enrollmentSubtitle}>
                  Choose which biometric login option to enable. Your device
                  handles verification and may accept any biometric enrolled on
                  it.
                </Text>
                {availableMethods
                  .filter((method) => !enabledMethods.includes(method))
                  .filter(
                    (method) =>
                      enrollmentOptions.length === 0 ||
                      enrollmentOptions.includes(method),
                  )
                  .map((method) => (
                    <Pressable
                      key={method}
                      style={styles.methodChoice}
                      onPress={() => void chooseBiometricMethod(method)}
                      disabled={biometricBusy}
                    >
                      <SymbolView
                        name={{
                          ios: getBiometricMethodIcon(method),
                          android: method === 2 ? "face" : "fingerprint",
                          web: method === 2 ? "face" : "fingerprint",
                        }}
                        tintColor="#075A34"
                        size={26}
                      />
                      <Text style={styles.methodChoiceText}>
                        {biometricBusy
                          ? "Verifying..."
                          : getBiometricMethodLabel(method)}
                      </Text>
                    </Pressable>
                  ))}
                {(availableMethods.length === 0 ||
                  availableMethods.every((method) =>
                    enabledMethods.includes(method),
                  )) && (
                  <Text style={styles.enrollmentSubtitle}>
                    No additional enrolled biometric method is available. You
                    can continue using your ERP password.
                  </Text>
                )}
                <Pressable
                  style={styles.enrollmentSecondary}
                  onPress={() => void continueWithoutBiometrics()}
                >
                  <Text style={styles.enrollmentSecondaryText}>Continue</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F2F6E9" },
  background: { flex: 1 },
  backgroundImage: {
    ...StyleSheet.absoluteFill,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(7, 62, 36, 0.10)",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  hero: {
    paddingTop: 40,
    paddingBottom: 42,
    alignItems: "center",
  },
  logo: {
    fontSize: 38,
    color: "#075A34",
    fontWeight: "900",
    letterSpacing: 5,
  },
  brand: {
    fontSize: 26,
    fontWeight: "800",
    color: "#075A34",
    letterSpacing: 1,
  },
  tagline: { fontSize: 15, color: "#075A34", marginTop: 5 },
  card: {
    backgroundColor: "rgba(255, 252, 244, 0.97)",
    marginHorizontal: 22,
    borderRadius: 26,
    padding: 24,
    elevation: 10,
    shadowColor: "#10251d",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  title: {
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 24,
    color: "#142033",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#50574F",
    textAlign: "center",
    marginTop: 5,
    marginBottom: 18,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#DDD7C7",
    borderRadius: 28,
    paddingHorizontal: 15,
    marginBottom: 13,
    fontSize: 16,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  passwordRow: {
    height: 52,
    borderWidth: 1,
    borderColor: "#DDD7C7",
    borderRadius: 28,
    paddingHorizontal: 15,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  password: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    color: "#17352B",
    fontSize: 16,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  eye: { fontSize: 21, color: "#596a7c" },
  eyeButton: {
    minWidth: 36,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    height: 52,
    borderRadius: 28,
    backgroundColor: "#087343",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  buttonText: { color: "white", fontSize: 18, fontWeight: "800" },
  buttonPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  buttonArrow: {
    position: "absolute",
    right: 7,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F4D34F",
    alignItems: "center",
    justifyContent: "center",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    marginBottom: 12,
  },
  orLine: { flex: 1, height: 1, backgroundColor: "#B7B9A8" },
  orText: { color: "#555B54", fontSize: 15 },
  biometricButton: {
    minHeight: 58,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#075A34",
    backgroundColor: "rgba(255,255,255,0.9)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginTop: 12,
  },
  biometricDivider: { width: 1, height: 30, backgroundColor: "#075A34" },
  biometricText: { color: "#075A34", fontSize: 15, fontWeight: "700" },
  biometricNote: {
    color: "#66776F",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 8,
  },
  error: { color: "#c62b3c", marginBottom: 10 },
  demo: { fontSize: 12, color: "#66768a", textAlign: "center", marginTop: 18 },
  enrollmentBackdrop: {
    flex: 1,
    backgroundColor: "rgba(8,28,19,0.55)",
    justifyContent: "center",
    padding: 24,
  },
  enrollmentCard: {
    backgroundColor: "#FFFCF4",
    borderRadius: 24,
    padding: 24,
    gap: 12,
    elevation: 12,
  },
  enrollmentTitle: {
    fontSize: 21,
    color: "#104B35",
    fontWeight: "800",
    textAlign: "center",
  },
  enrollmentSubtitle: {
    fontSize: 14,
    color: "#526056",
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 6,
  },
  enrollmentPrimary: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#087343",
  },
  enrollmentPrimaryText: { color: "white", fontSize: 15, fontWeight: "800" },
  enrollmentSecondary: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  enrollmentSecondaryText: {
    color: "#176B45",
    fontSize: 14,
    fontWeight: "700",
  },
  methodChoice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderColor: "#DCE7DF",
    borderWidth: 1,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
  },
  methodChoiceText: { color: "#104B35", fontSize: 16, fontWeight: "700" },
});
