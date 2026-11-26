import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/auth/session";
import AttendanceScreen from "@/components/attendance-screen";
import { EmployeeAvatar } from "@/components/employee-avatar";
import { attendanceService } from "@/services/attendance-service";
import type { Employee } from "@/types/hrms";

export default function ProfileScreen() {
  const { employee: signedInEmployee } = useSession();
  const { employeeCode } = useLocalSearchParams<{ employeeCode?: string }>();
  const requestedCode = Array.isArray(employeeCode)
    ? employeeCode[0]
    : employeeCode;
  const profileCode =
    signedInEmployee &&
    (signedInEmployee.role === "HR" || signedInEmployee.role === "Admin")
      ? (requestedCode ?? signedInEmployee.employeeCode)
      : signedInEmployee?.employeeCode;
  const router = useRouter();
  const [profile, setProfile] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void attendanceService
      .loadEmployees()
      .then((employees) => {
        if (!active) return;
        setProfile(
          employees.find((item) => item.employeeCode === profileCode) ?? null,
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profileCode]);

  if (!signedInEmployee) return null;
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.heading}>Employee Profile</Text>
        </View>
        {loading ? (
          <ActivityIndicator style={styles.loading} color={COLORS.green} />
        ) : profile ? (
          <>
            <View style={styles.identity}>
              <EmployeeAvatar
                name={profile.name}
                profileImage={profile.profileImage}
                size={78}
              />
              <View style={styles.identityCopy}>
                <Text style={styles.name}>{profile.name}</Text>
                <Text style={styles.muted}>{profile.employeeCode}</Text>
                <Text style={styles.muted}>{profile.role}</Text>
              </View>
            </View>
            <View style={styles.details}>
              <ProfileField label="Email" value={profile.email} />
              <ProfileField label="Phone" value={profile.phone} />
              <ProfileField label="Designation" value={profile.designation} />
              <ProfileField label="Department" value={profile.department} />
              <ProfileField label="Joining Date" value={profile.joiningDate} />
            </View>
            <AttendanceScreen employeeOverride={profile} embedded />
          </>
        ) : (
          <Text style={styles.empty}>Employee profile could not be found.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || "—"}</Text>
    </View>
  );
}

const COLORS = { green: "#176B45" };
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F7F4" },
  content: {
    paddingBottom: 32,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    minHeight: 60,
    backgroundColor: "#104B35",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
  },
  back: { color: "white", fontSize: 30 },
  heading: { color: "white", fontSize: 18, fontWeight: "800" },
  identity: {
    backgroundColor: "#104B35",
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    paddingHorizontal: 22,
    paddingVertical: 22,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  identityCopy: { flex: 1 },
  name: { color: "white", fontSize: 18, fontWeight: "800" },
  muted: { color: "#D9E9DF", marginTop: 4, fontSize: 13 },
  details: {
    margin: 18,
    backgroundColor: "white",
    borderColor: "#DCE7DF",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 15,
  },
  field: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EFF3F0",
  },
  fieldLabel: { color: "#748078", fontSize: 11, fontWeight: "700" },
  fieldValue: {
    color: "#17352B",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  loading: { padding: 30 },
  empty: { padding: 24, textAlign: "center", color: "#66776F" },
});
