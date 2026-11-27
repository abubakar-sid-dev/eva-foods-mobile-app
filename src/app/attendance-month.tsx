import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { AttendanceTable } from "@/components/attendance-screen";
import { attendanceService } from "@/services/attendance-service";
import type { Attendance, CompanyHoliday, Employee } from "@/types/hrms";
import { buildMonthRangeAttendanceDetails } from "@/utils/attendance-calculations";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function AttendanceMonthScreen() {
  const params = useLocalSearchParams<{
    employeeCode?: string | string[];
    month?: string | string[];
    fromDate?: string | string[];
    toDate?: string | string[];
  }>();
  const router = useRouter();
  const { employee: signedInEmployee } = useSession();
  const isHrAdmin =
    signedInEmployee?.role === "HR" || signedInEmployee?.role === "Admin";
  const employeeCode = isHrAdmin
    ? firstParam(params.employeeCode)
    : (signedInEmployee?.employeeCode ?? "");
  const monthKey = firstParam(params.month);
  const fromDate = firstParam(params.fromDate);
  const toDate = firstParam(params.toDate);
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(monthKey);
  const year = match ? Number(match[1]) : 0;
  const monthIndex = match ? Number(match[2]) - 1 : -1;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [rows, setRows] = useState<Attendance[]>([]);
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    let active = true;
    if (!employeeCode || year < 1 || monthIndex < 0) {
      setFailed(true);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    void Promise.all([
      attendanceService
        .loadEmployees()
        .then((employees) =>
          employees.find(
            (candidate) => candidate.employeeCode === employeeCode,
          ) ?? null,
        ),
      attendanceService.loadEmployeeMonth(employeeCode, year, monthIndex),
      attendanceService.getCompanyHolidays(year),
    ])
      .then(([matchedEmployee, attendance, yearHolidays]) => {
        if (!active) return;
        setEmployee(matchedEmployee);
        setRows(attendance);
        setHolidays(yearHolidays);
        setFailed(!matchedEmployee);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [employeeCode, year, monthIndex]);

  const monthLabel =
    monthIndex >= 0
      ? new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
      : "Attendance";
  const details = useMemo(() => {
    if (!employee || monthIndex < 0) return [];
    return buildMonthRangeAttendanceDetails(
      year,
      monthIndex,
      employee.joiningDate,
      rows,
      holidays,
      fromDate,
      toDate,
      today,
    );
  }, [
    employee,
    monthIndex,
    year,
    fromDate,
    toDate,
    rows,
    holidays,
    today,
  ]);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back to monthly attendance"
          >
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.heading}>{monthLabel}</Text>
            <Text style={styles.subheading}>
              {employee
                ? `${employee.name} · ${employee.employeeCode}`
                : "Employee attendance"}
            </Text>
          </View>
        </View>
        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Attendance Details</Text>
          {loading ? (
            <ActivityIndicator style={styles.loading} color="#176B45" />
          ) : failed ? (
            <Text style={styles.empty}>
              Unable to load attendance for this employee.
            </Text>
          ) : (
            <AttendanceTable rows={details} loading={false} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F7F4" },
  content: {
    paddingBottom: 32,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    minHeight: 76,
    backgroundColor: "#104B35",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
  },
  backButton: { paddingVertical: 5, paddingRight: 5 },
  back: { color: "white", fontSize: 30 },
  headerCopy: { flex: 1 },
  heading: { color: "white", fontSize: 18, fontWeight: "800" },
  subheading: { color: "#D9E9DF", fontSize: 12, marginTop: 3 },
  body: { paddingHorizontal: 18, paddingTop: 18 },
  sectionTitle: {
    color: "#17352B",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
  },
  loading: { paddingVertical: 24 },
  empty: { color: "#53655B", paddingVertical: 20, textAlign: "center" },
});
