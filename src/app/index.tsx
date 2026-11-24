import { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useSession } from "@/auth/session";
import { authenticationService } from "@/auth/auth-service";
import {
  clearBiometricLogin,
  enableBiometricLogin,
  getBiometricAvailability,
  isBiometricLoginEnabled,
  readBiometricLoginCredential,
} from "@/auth/biometric-login";
import type { Employee } from "@/types/hrms";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [cardOpacity] = useState(() => new Animated.Value(0));
  const { signIn } = useSession();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const enabled = await isBiometricLoginEnabled();
      if (!enabled) return;
      const availability = await getBiometricAvailability();
      if (!availability.available) {
        await clearBiometricLogin();
      }
      if (mounted) setBiometricEnabled(enabled && availability.available);
    })();
    return () => {
      mounted = false;
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
      const employee =
        await authenticationService.authenticateWithPassword(username, password);
      if (!employee) {
        setError("Incorrect username or password.");
        return;
      }

      await finishPasswordSignIn(employee);
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const finishPasswordSignIn = async (employee: Employee) => {
    if (await isBiometricLoginEnabled()) {
      signIn(employee);
      router.replace("/home" as never);
      return;
    }

    const availability = await getBiometricAvailability();
    if (!availability.available) {
      signIn(employee);
      router.replace("/home" as never);
      return;
    }

    Alert.alert(
      "Enable Biometric Login?",
      "Use your device's enrolled fingerprint or face authentication for your next sign-in. Your password will not be stored.",
      [
        {
          text: "Not Now",
          style: "cancel",
          onPress: () => {
            signIn(employee);
            router.replace("/home" as never);
          },
        },
        {
          text: "Enable",
          onPress: () => {
            void (async () => {
              const enabled = await enableBiometricLogin(employee.username);
              setBiometricEnabled(enabled);
              if (!enabled) {
                Alert.alert(
                  "Biometric login unavailable",
                  "You can continue with your ERP username and password.",
                );
              }
              signIn(employee);
              router.replace("/home" as never);
            })();
          },
        },
      ],
      { cancelable: false },
    );
  };

  const loginWithBiometrics = async () => {
    setBiometricBusy(true);
    setError("");
    try {
      const result = await readBiometricLoginCredential();
      if (result.status === "success") {
        const employee =
          await authenticationService.authenticateWithBiometricCredential(
            result.credential,
          );
        if (!employee) {
          await clearBiometricLogin();
          setBiometricEnabled(false);
          setError(
            "Biometric login is no longer available. Sign in with your ERP credentials.",
          );
          return;
        }
        signIn(employee);
        router.replace("/home" as never);
        return;
      }

      if (result.status === "enrollment-changed") {
        setBiometricEnabled(false);
        setError(
          "Your device biometrics changed. Sign in with your ERP credentials to enable biometric login again.",
        );
      } else if (result.status === "cancelled-or-failed") {
        setError(
          "Biometric authentication was cancelled or unsuccessful. You can use your ERP credentials.",
        );
      }
    } catch {
      setError("Biometric login is unavailable. Please use your ERP credentials.");
    } finally {
      setBiometricBusy(false);
    }
  };

  const disableBiometrics = () => {
    Alert.alert(
      "Disable Biometric Login?",
      "You can continue signing in with your ERP username and password.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          style: "destructive",
          onPress: () => {
            void clearBiometricLogin().then(() => setBiometricEnabled(false));
          },
        },
      ],
    );
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
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        >
          <View style={styles.hero}>
            <Text style={styles.logo}>EVA</Text>
            <Text style={styles.brand}>EVA FOODS</Text>
            <Text style={styles.tagline}>People first. Quality always.</Text>
          </View>

          <Animated.View style={[styles.card, { opacity: cardOpacity }]}>
            <Text style={styles.title}>Login to Your Account</Text>
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
                secureTextEntry={!passwordVisible}
                onSubmitEditing={login}
                returnKeyType="go"
                onBlur={() => setPasswordVisible(false)}
              />
              <Pressable
                onPressIn={() => setPasswordVisible(true)}
                onPressOut={() => setPasswordVisible(false)}
                onTouchCancel={() => setPasswordVisible(false)}
                onResponderTerminate={() => setPasswordVisible(false)}
                accessibilityLabel="Press and hold to show password"
                accessibilityRole="button"
                hitSlop={8}
              >
                <SymbolView name={{ ios: passwordVisible ? "eye.slash" : "eye", android: passwordVisible ? "visibility_off" : "visibility", web: passwordVisible ? "visibility_off" : "visibility" }} tintColor="#596a7c" size={21} />
              </Pressable>
            </View>
            {!!error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={login}
              disabled={busy}
            >
              <Text style={styles.buttonText}>
                {busy ? "Signing in…" : "Login"}
              </Text>
            </Pressable>
            {biometricEnabled && (
              <Pressable
                style={({ pressed }) => [
                  styles.biometricButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={loginWithBiometrics}
                disabled={biometricBusy}
                accessibilityRole="button"
                accessibilityLabel="Sign in with fingerprint or face authentication"
              >
                <Text style={styles.biometricButtonText}>
                  {biometricBusy
                    ? "Waiting for device authentication…"
                    : "Sign in with Biometrics"}
                </Text>
              </Pressable>
            )}
            {biometricEnabled && (
              <Pressable
                onPress={disableBiometrics}
                style={styles.disableBiometric}
                accessibilityRole="button"
              >
                <Text style={styles.disableBiometricText}>
                  Disable Biometric Login
                </Text>
              </Pressable>
            )}
            <Text style={styles.demo}>
              Demo accounts: eva001–eva100 · Password: EVA@123
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#edf5fc" },
  background: { flex: 1 },
  backgroundImage: {
    ...StyleSheet.absoluteFill,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(9, 39, 34, 0.42)",
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
    color: "#f4ce58",
    fontWeight: "900",
    letterSpacing: 5,
  },
  brand: {
    fontSize: 26,
    fontWeight: "800",
    color: "white",
    letterSpacing: 1,
  },
  tagline: { fontSize: 15, color: "#f5ead1", marginTop: 5 },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
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
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#d8e2ec",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 13,
    fontSize: 16,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  passwordRow: {
    height: 52,
    borderWidth: 1,
    borderColor: "#d8e2ec",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  password: { flex: 1, fontSize: 16 },
  eye: { fontSize: 21, color: "#596a7c" },
  button: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#176b45",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  buttonPressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
  buttonText: { color: "white", fontSize: 17, fontWeight: "700" },
  biometricButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#176b45",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  biometricButtonText: { color: "#176b45", fontSize: 15, fontWeight: "700" },
  disableBiometric: { alignSelf: "center", paddingVertical: 10, marginTop: 3 },
  disableBiometricText: {
    color: "#66768a",
    fontSize: 12,
    textDecorationLine: "underline",
  },
  error: { color: "#c62b3c", marginBottom: 10 },
  demo: { fontSize: 12, color: "#66768a", textAlign: "center", marginTop: 18 },
});
