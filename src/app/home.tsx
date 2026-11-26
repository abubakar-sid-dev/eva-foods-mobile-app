import { useState } from "react";
import { SymbolView } from "expo-symbols";
import { useRouter } from "expo-router";
import { Alert, Modal } from "react-native";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/auth/session";
import { EmployeeAvatar } from "@/components/employee-avatar";

export default function HomeScreen() {
  const { employee, signOut } = useSession();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  if (!employee) return null;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            onPress={() => setMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            hitSlop={12}
          >
            <SymbolView
              name={{ ios: "line.3.horizontal", android: "menu", web: "menu" }}
              tintColor="white"
              size={23}
            />
          </Pressable>
          <Text style={styles.welcome}>Welcome</Text>
          <View style={styles.notification}>
            <SymbolView
              name={{ ios: "bell", android: "notifications", web: "notifications" }}
              tintColor="white"
              size={22}
            />
            <Text style={styles.badge}>3</Text>
          </View>
        </View>

        <View style={styles.profile}>
          <EmployeeAvatar name={employee.name} profileImage={employee.profileImage} size={60} />
          <View style={styles.profileCopy}>
            <Text style={styles.name}>{employee.name}</Text>
            <Text style={styles.designation}>{employee.designation}</Text>
          </View>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{employee.role}</Text>
          </View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>EVA FOODS · {employee.department}</Text>
          <Text style={styles.workspaceTitle}>Your workspace</Text>
          <Text style={styles.workspaceCopy}>
            Quick access to your employee services.
          </Text>
        </View>

        <View style={styles.cards}>
          <View style={styles.card}>
            <View style={[styles.iconTile, styles.erpIconTile]}>
              <SymbolView
                name={{
                  ios: "desktopcomputer",
                  android: "dashboard",
                  web: "dashboard",
                }}
                tintColor="#176B45"
                size={31}
              />
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>ERP System</Text>
              <Text style={styles.cardSubtitle}>
                Approvals, Orders, Reports & Approval History
              </Text>
              <Text style={styles.comingSoon}>Available soon</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => router.push("/attendance" as never)}
            accessibilityRole="button"
            accessibilityLabel="Open attendance"
          >
            <View style={[styles.iconTile, styles.attendanceIconTile]}>
              <SymbolView
                name={{
                  ios: "calendar",
                  android: "calendar_month",
                  web: "calendar_month",
                }}
                tintColor="#176B45"
                size={31}
              />
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>Attendance</Text>
              <Text style={styles.cardSubtitle}>
                Employee profile & monthly attendance
              </Text>
              <Text style={styles.actionLabel}>View attendance</Text>
            </View>
            <SymbolView
              name={{
                ios: "chevron.right",
                android: "chevron_right",
                web: "chevron_right",
              }}
              tintColor="#176B45"
              size={17}
            />
          </Pressable>
        </View>
      </ScrollView>
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <View style={styles.drawerBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuVisible(false)} />
          <View style={styles.drawer}>
            <View style={styles.drawerProfile}>
              <EmployeeAvatar name={employee.name} profileImage={employee.profileImage} size={48} />
              <View style={styles.profileCopy}>
                <Text style={styles.drawerName}>{employee.name}</Text>
                <Text style={styles.drawerDesignation}>{employee.designation}</Text>
              </View>
            </View>
            <DrawerItem label="Home" onPress={() => { setMenuVisible(false); router.replace("/home" as never); }} />
            <DrawerItem label="My Profile" pending onPress={() => setMenuVisible(false)} />
            <DrawerItem label="Settings" pending onPress={() => setMenuVisible(false)} />
            <DrawerItem label="Help & Support" pending onPress={() => setMenuVisible(false)} />
            <DrawerItem label="Biometric Login" onPress={() => { setMenuVisible(false); router.push("/biometrics" as never); }} />
            <View style={styles.drawerDivider} />
            <DrawerItem label="Logout" destructive onPress={() => Alert.alert("Log out?", "Are you sure you want to log out?", [
              { text: "Cancel", style: "cancel" },
              { text: "Logout", style: "destructive", onPress: () => { setMenuVisible(false); signOut(); router.replace("/" as never); } },
            ])} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

type DrawerLabel = "Home" | "My Profile" | "Settings" | "Help & Support" | "Biometric Login" | "Logout";

function DrawerItem({ label, onPress, pending = false, destructive = false }: {
  label: DrawerLabel;
  onPress: () => void;
  pending?: boolean;
  destructive?: boolean;
}) {
  const iconNames = {
    Home: { ios: "house", android: "home", web: "home" },
    "My Profile": { ios: "person", android: "person", web: "person" },
    Settings: { ios: "gearshape", android: "settings", web: "settings" },
    "Help & Support": { ios: "questionmark.circle", android: "help", web: "help" },
    "Biometric Login": { ios: "faceid", android: "fingerprint", web: "fingerprint" },
    Logout: { ios: "rectangle.portrait.and.arrow.right", android: "logout", web: "logout" },
  } as const;
  return (
    <Pressable onPress={onPress} style={styles.drawerItem} accessibilityRole="button">
      <SymbolView name={iconNames[label]} tintColor={destructive ? "#B33B3B" : "#176B45"} size={21} />
      <Text style={[styles.drawerItemText, destructive && styles.logoutText]}>{label}</Text>
      {pending && <Text style={styles.pendingTag}>Pending</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F7F4" },
  content: {
    paddingBottom: 40,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    backgroundColor: "#104B35",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  welcome: {
    color: "white",
    fontWeight: "700",
    fontSize: 18,
    flex: 1,
    letterSpacing: 0.2,
  },
  notification: { position: "relative", padding: 2 },
  badge: {
    position: "absolute",
    right: -6,
    top: -5,
    backgroundColor: "#E6B942",
    color: "#17352B",
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
  },
  profile: {
    backgroundColor: "#104B35",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 24,
    paddingBottom: 27,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E4F3E9",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 20, color: "#176B45", fontWeight: "800" },
  profileCopy: { flex: 1 },
  name: { color: "white", fontSize: 17, fontWeight: "700" },
  designation: { color: "#D9E9DF", marginTop: 4, fontSize: 14 },
  rolePill: {
    backgroundColor: "rgba(255,255,255,0.13)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
  },
  roleText: { color: "#F4D77F", fontSize: 11, fontWeight: "700" },
  intro: {
    backgroundColor: "#F4F7F4",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    marginTop: -12,
    paddingHorizontal: 24,
    paddingTop: 23,
  },
  eyebrow: {
    fontSize: 11,
    color: "#66776F",
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  workspaceTitle: {
    fontSize: 25,
    color: "#17352B",
    fontWeight: "800",
    marginTop: 7,
  },
  workspaceCopy: { color: "#66776F", fontSize: 14, marginTop: 4 },
  cards: { paddingHorizontal: 20, paddingTop: 18, gap: 15 },
  card: {
    borderRadius: 22,
    minHeight: 132,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#DCE7DF",
    backgroundColor: "#FFFFFF",
    elevation: 3,
    shadowColor: "#123528",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  iconTile: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  erpIconTile: { backgroundColor: "#E9F2F8" },
  attendanceIconTile: { backgroundColor: "#E4F3E9" },
  cardCopy: { flex: 1 },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#17352B",
    marginBottom: 6,
  },
  cardSubtitle: { fontSize: 13, color: "#66776F", lineHeight: 19 },
  comingSoon: {
    marginTop: 8,
    color: "#9A7416",
    fontSize: 11,
    fontWeight: "700",
  },
  actionLabel: {
    marginTop: 8,
    color: "#176B45",
    fontSize: 12,
    fontWeight: "700",
  },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  drawerBackdrop: { flex: 1, backgroundColor: "rgba(10,25,18,0.45)" },
  drawer: { width: "82%", maxWidth: 340, flex: 1, backgroundColor: "#FFFFFF", paddingTop: 52, paddingHorizontal: 18, elevation: 20 },
  drawerProfile: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#104B35", marginHorizontal: -18, marginTop: -52, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, marginBottom: 16 },
  drawerName: { color: "white", fontSize: 16, fontWeight: "800" },
  drawerDesignation: { color: "#D9E9DF", fontSize: 12, marginTop: 3 },
  drawerItem: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 8 },
  drawerItemText: { flex: 1, color: "#17352B", fontSize: 15, fontWeight: "600" },
  pendingTag: { color: "#8C721F", backgroundColor: "#FFF5D7", overflow: "hidden", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: "700" },
  drawerDivider: { height: 1, backgroundColor: "#E6ECE8", marginVertical: 10 },
  logoutText: { color: "#B33B3B" },
});
