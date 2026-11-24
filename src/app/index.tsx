import { useEffect, useState } from "react";
import {
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
import { useSession } from "@/auth/session";
import { authenticate } from "@/database/database";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cardOpacity] = useState(() => new Animated.Value(0));
  const { signIn } = useSession();
  const router = useRouter();

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
      const employee = await authenticate(username, password);
      if (!employee) {
        setError("Incorrect username or password.");
        return;
      }

      signIn(employee);
      router.replace("/home" as never);
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
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
                secureTextEntry={!visible}
                onSubmitEditing={login}
                returnKeyType="go"
              />
              <Pressable
                onPress={() => setVisible(!visible)}
                accessibilityLabel={visible ? "Hide password" : "Show password"}
              >
                <Text style={styles.eye}>{visible ? "◉" : "◎"}</Text>
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
  error: { color: "#c62b3c", marginBottom: 10 },
  demo: { fontSize: 12, color: "#66768a", textAlign: "center", marginTop: 18 },
});
