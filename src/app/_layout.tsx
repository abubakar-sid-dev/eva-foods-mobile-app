import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SessionProvider, useSession } from "@/auth/session";

function NavigationGate() {
  const { employee, ready } = useSession();
  const segments = useSegments();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    const route = String(segments[0] ?? "");
    const onLogin = route !== "home" && route !== "attendance";
    if (!employee && !onLogin) router.replace("/");
    if (employee && onLogin) router.replace("/home" as never);
  }, [employee, ready, segments, router]);
  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F4F7F4",
        }}
      >
        <ActivityIndicator color="#176B45" />
      </View>
    );
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 220,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="home" />
      <Stack.Screen name="attendance" />
    </Stack>
  );
}
export default function RootLayout() {
  return (
    <SessionProvider>
      <NavigationGate />
    </SessionProvider>
  );
}
