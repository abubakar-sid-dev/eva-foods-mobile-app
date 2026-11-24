import { useSession } from "@/auth/session";
import { authenticationService } from "@/auth/auth-service";
import { SymbolView } from "expo-symbols";
import {
  clearBiometricLogin,
  enableBiometricLogin,
  getBiometricAvailability,
  isBiometricLoginEnabled,
  readBiometricLoginCredential,
} from "@/auth/biometric-login";
import type { Employee } from "@/types/hrms";
import { useRouter } from "expo-router";
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
    void isBiometricLoginEnabled().then(setBiometricEnabled);
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
      const employee = await authenticationService.authenticateWithPassword(username, password);
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
    if (!(await isBiometricLoginEnabled())) {
      const availability = await getBiometricAvailability();
      if (availability.available) {
        Alert.alert(
          "Enable Biometric Login?",
          "Use your device fingerprint or face to sign in next time.",
          [
            { text: "Not Now", onPress: () => { signIn(employee); router.replace("/home" as never); } },
            { text: "Enable", onPress: () => { void enableBiometricLogin(employee.username).then((enabled) => { setBiometricEnabled(enabled); signIn(employee); router.replace("/home" as never); }); } },
          ],
          { cancelable: false },
        );
        return;
      }
    }
    signIn(employee);
    router.replace("/home" as never);
  };

  const loginWithBiometrics = async () => {
    if (!biometricEnabled) {
      setError("Sign in with your ERP username and password first, then enable biometric login.");
      return;
    }
    setBiometricBusy(true);
    setError("");
    try {
      const result = await readBiometricLoginCredential();
      if (result.status === "success") {
        const employee = await authenticationService.authenticateWithBiometricCredential(result.credential);
        if (employee) {
          signIn(employee);
          router.replace("/home" as never);
        } else {
          setError("Account not found. Please sign in with your ERP credentials.");
        }
      } else {
        setError("Biometric login was cancelled or is unavailable. Use your ERP credentials.");
      }
    } catch {
      setError("Biometric login failed. Please use your ERP credentials.");
    } finally {
      setBiometricBusy(false);
    }
  };

  const disableBiometrics = () => {
    Alert.alert("Disable biometric login?", "You can sign in with your ERP credentials.", [
      { text: "Cancel", style: "cancel" },
      { text: "Disable", style: "destructive", onPress: () => { void clearBiometricLogin().then(() => setBiometricEnabled(false)); } },
    ]);
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
              <SymbolView name={{ ios: "person.2.fill", android: "group", web: "group" }} tintColor="#075A34" size={30} />
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
                hitSlop={10}
              >
                <SymbolView name={{ ios: passwordVisible ? "eye.slash" : "eye", android: passwordVisible ? "visibility_off" : "visibility", web: passwordVisible ? "visibility_off" : "visibility" }} tintColor="#075A34" size={22} />
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
            <Pressable
              style={({ pressed }) => [styles.biometricButton, pressed && styles.buttonPressed]}
              onPress={loginWithBiometrics}
              disabled={biometricBusy}
              accessibilityRole="button"
            >
              <SymbolView name={{ ios: "touchid", android: "fingerprint", web: "fingerprint" }} tintColor="#075A34" size={27} />
              <View style={styles.biometricDivider} />
              <Text style={styles.biometricText}>
                {biometricBusy ? "Waiting for authentication..." : "Login with Biometrics"}
              </Text>
            </Pressable>
            {biometricEnabled && (
              <Pressable onPress={disableBiometrics} style={styles.disableButton}>
                <Text style={styles.disableText}>Disable biometric login</Text>
                <View style={styles.toggleTrack}>
                  <View style={styles.toggleKnob} />
                </View>
              </Pressable>
            )}
            <Text style={styles.demo}>
              Demo accounts: eva001â€“eva100 Â· Password: EVA@123
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
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
  password: { flex: 1, fontSize: 16 },
  eye: { fontSize: 21, color: "#596a7c" },
  button: {
    height: 52,
    borderRadius: 28,
    backgroundColor: "#087343",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  buttonText: { color: "white", fontSize: 17, fontWeight: "700" },  orRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14, marginBottom: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: "#B7B9A8" },
  orText: { color: "#555B54", fontSize: 15 },
  biometricButton: { minHeight: 58, borderRadius: 30, borderWidth: 1.5, borderColor: "#075A34", backgroundColor: "rgba(255,255,255,0.9)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 12 },
  biometricDivider: { width: 1, height: 30, backgroundColor: "#075A34" },
  biometricText: { color: "#075A34", fontSize: 15, fontWeight: "700" },
  disableButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 12 },
  disableText: { color: "#526056", fontSize: 13 },
  toggleTrack: { width: 42, height: 24, borderRadius: 12, backgroundColor: "#087343", justifyContent: "center", padding: 3 },
  toggleKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: "white", alignSelf: "flex-end" },
  error: { color: "#c62b3c", marginBottom: 10 },
  demo: { fontSize: 12, color: "#66768a", textAlign: "center", marginTop: 18 },
});
