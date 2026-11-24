import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import {
  Attendance,
  getEmployeeAttendance,
  seedAttendance,
} from "@/database/database";
import { useSession } from "@/auth/session";

export default function AttendanceScreen() {
  const { employee } = useSession();
  const router = useRouter();
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [rows, setRows] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(month.getFullYear());
  const load = useCallback(async () => {
    if (!employee) return;
    setLoading(true);
    try {
      await seedAttendance();
      setRows(
        await getEmployeeAttendance(
          employee.employeeCode,
          month.getFullYear(),
          month.getMonth(),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [employee, month]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  if (!employee) return null;
  const present = rows.filter((row) => row.status === "Present").length;
  const absent = rows.filter((row) => row.status === "Absent").length;
  const leave = rows.filter((row) => row.status === "Leave").length;
  const late = rows.filter((row) => row.status === "Late").length;
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const joiningDate = new Date(`${employee.joiningDate}T00:00:00`);
  const firstAvailableMonth = new Date(
    joiningDate.getFullYear(),
    joiningDate.getMonth(),
    1,
  );
  const minimumYear = joiningDate.getFullYear();
  const maximumYear = now.getFullYear();
  const changeMonth = (nextMonth: Date) => {
    if (nextMonth >= firstAvailableMonth && nextMonth <= currentMonth) {
      setMonth(nextMonth);
    }
  };
  const move = (by: number) =>
    changeMonth(new Date(month.getFullYear(), month.getMonth() + by, 1));
  const initials = employee.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <View style={s.top}>
            <Pressable onPress={() => router.back()}>
              <Text style={s.back}>‹</Text>
            </Pressable>
            <Text style={s.heading}>Attendance</Text>
          </View>
          <View style={s.profile}>
            <View style={s.avatar}>
              {employee.profileImage ? (
                <Image
                  source={{ uri: employee.profileImage }}
                  resizeMode="cover"
                  style={s.profileImage}
                />
              ) : (
                <Text style={s.initial}>{initials}</Text>
              )}
            </View>
            <View style={s.divider} />
            <View>
              <Text style={s.name}>{employee.name}</Text>
              <Text style={s.detail}>{employee.employeeCode}</Text>
              <Text style={s.detail}>{employee.designation}</Text>
            </View>
          </View>
        </View>
        <View style={s.body}>
          <View style={s.month}>
            <Pressable
              onPress={() => move(-1)}
              disabled={month <= firstAvailableMonth}
              style={month <= firstAvailableMonth && s.disabledArrow}
            >
              <Text style={s.monthArrow}>‹</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setPickerYear(month.getFullYear());
                setDatePickerVisible(true);
              }}
              accessibilityRole="button"
            >
              <Text style={s.monthLabel}>
                {month.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })} ⌄
              </Text>
            </Pressable>
            <Pressable
              onPress={() => move(1)}
              disabled={month >= currentMonth}
              style={month >= currentMonth && s.disabledArrow}
            >
              <Text style={s.monthArrow}>›</Text>
            </Pressable>
          </View>
          <View style={s.total}>
            <Text style={s.bigIcon}>▦</Text>
            <View>
              <Text style={s.totalLabel}>Total Attendance</Text>
              <Text style={s.totalValue}>
                {present}
                <Text style={s.totalSmall}> of {rows.length} Days</Text>
              </Text>
            </View>
          </View>
          <View style={s.metrics}>
            <Metric count={present} label="Present" color="#e0f8eb" icon="✓" />
            <Metric count={absent} label="Absent" color="#ffeded" icon="×" />
            <Metric count={leave} label="Leave" color="#fff6dc" icon="▣" />
          </View>
          <View style={s.lateSummary}>
            <Text style={s.lateLabel}>Late Days</Text>
            <Text style={s.lateValue}>{late}</Text>
          </View>
          <Text style={s.section}>Monthly Attendance</Text>
          <View style={s.summary}>
            <Summary label="Total Working Days" value={rows.length} icon="▦" />
            <Summary label="Present Days" value={present} icon="✓" green />
            <Summary label="Absent Days" value={absent} icon="×" red />
            <Summary label="Leave Days" value={leave} icon="▣" yellow />
          </View>
          <Text style={s.section}>Monthly Attendance Details</Text>
          <View style={s.table}>
            <View style={s.tableHead}>
              <Text style={s.headText}>Date</Text>
              <Text style={s.headText}>Status</Text>
              <Text style={s.headText}>In / Out</Text>
            </View>
            {loading ? (
              <ActivityIndicator style={{ padding: 20 }} color="#176B45" />
            ) : rows.length === 0 ? (
              <Text style={s.emptyState}>
                No attendance records for this month.
              </Text>
            ) : (
              rows.map((row) => (
                <View key={row.id} style={s.tableRow}>
                  <Text style={s.cell}>
                    {Number(row.attendanceDate.slice(-2))}{" "}
                    {month.toLocaleDateString("en-US", { month: "short" })}
                  </Text>
                  <Text
                    style={[
                      s.cell,
                      {
                        color:
                          row.status === "Present"
                            ? "#129653"
                            : row.status === "Late"
                              ? "#d97706"
                              : row.status === "Leave"
                                ? "#be8a00"
                                : "#d43d45",
                      },
                    ]}
                  >
                    {row.status}
                  </Text>
                  <Text style={s.cell}>
                    {row.checkIn ?? "—"} / {row.checkOut ?? "—"}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.pickerCard}>
            <View style={s.pickerHeader}>
              <Text style={s.pickerTitle}>Choose month and year</Text>
              <Pressable onPress={() => setDatePickerVisible(false)}>
                <Text style={s.closePicker}>×</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.years}
            >
              {Array.from(
                { length: maximumYear - minimumYear + 1 },
                (_, index) => minimumYear + index,
              ).map((year) => (
                <Pressable
                  key={year}
                  style={[s.yearChip, pickerYear === year && s.yearChipSelected]}
                  onPress={() => setPickerYear(year)}
                >
                  <Text
                    style={[
                      s.yearText,
                      pickerYear === year && s.yearTextSelected,
                    ]}
                  >
                    {year}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={s.monthGrid}>
              {Array.from({ length: 12 }, (_, index) => index).map(
                (monthIndex) => {
                  const option = new Date(pickerYear, monthIndex, 1);
                  const disabled =
                    option < firstAvailableMonth || option > currentMonth;
                  const selected =
                    option.getFullYear() === month.getFullYear() &&
                    option.getMonth() === month.getMonth();

                  return (
                    <Pressable
                      key={monthIndex}
                      disabled={disabled}
                      style={[
                        s.monthOption,
                        selected && s.monthOptionSelected,
                        disabled && s.monthOptionDisabled,
                      ]}
                      onPress={() => {
                        setMonth(option);
                        setDatePickerVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          s.monthOptionText,
                          selected && s.monthOptionTextSelected,
                          disabled && s.monthOptionTextDisabled,
                        ]}
                      >
                        {option.toLocaleDateString("en-US", { month: "short" })}
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
function Metric({
  count,
  label,
  color,
  icon,
}: {
  count: number;
  label: string;
  color: string;
  icon: string;
}) {
  return (
    <View style={[s.metric, { backgroundColor: color }]}>
      <Text
        style={[
          s.metricIcon,
          {
            backgroundColor:
              label === "Present"
                ? "#15945F"
                : label === "Absent"
                  ? "#C94C4C"
                  : "#C99519",
          },
        ]}
      >
        {icon}
      </Text>
      <Text style={s.metricCount}>{count}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}
function Summary({
  label,
  value,
  icon,
  green,
  red,
  yellow,
}: {
  label: string;
  value: number;
  icon: string;
  green?: boolean;
  red?: boolean;
  yellow?: boolean;
}) {
  return (
    <View style={s.summaryRow}>
      <Text
        style={[
          s.summaryIcon,
          green && { color: "#129653" },
          red && { color: "#d43d45" },
          yellow && { color: "#d29d00" },
        ]}
      >
        {icon}
      </Text>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryValue}>{value}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F7F4" },
  content: { paddingBottom: 30 },
  hero: {
    backgroundColor: "#104B35",
    paddingBottom: 27,
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 38,
  },
  top: {
    paddingHorizontal: 22,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
  },
  back: { fontSize: 36, color: "white" },
  heading: { fontSize: 19, fontWeight: "700", color: "white" },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E4F3E9",
    alignItems: "center",
    justifyContent: "center",
  },
  profileImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  initial: { fontSize: 22, fontWeight: "800", color: "#176B45" },
  divider: { height: 65, width: 1, backgroundColor: "#a6cef5" },
  name: { fontSize: 17, fontWeight: "700", color: "white" },
  detail: { fontSize: 13, color: "#dcecff", marginTop: 3 },
  body: { paddingHorizontal: 18, paddingTop: 18 },
  month: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d8e2ec",
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
  },
  monthArrow: { fontSize: 27, color: "#27364a" },
  monthLabel: { fontSize: 15, fontWeight: "700", color: "#172033" },
  disabledArrow: { opacity: 0.35 },
  total: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: "#E4F3E9",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  bigIcon: { fontSize: 44, color: "#176B45", paddingHorizontal: 6 },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#101827" },
  totalValue: { fontSize: 32, fontWeight: "800", color: "#104B35" },
  totalSmall: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  metrics: { flexDirection: "row", gap: 10, marginTop: 12 },
  metric: {
    flex: 1,
    borderRadius: 14,
    minHeight: 86,
    alignItems: "center",
    justifyContent: "center",
  },
  metricIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#129653",
    color: "white",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
  },
  metricCount: {
    fontSize: 21,
    fontWeight: "800",
    color: "#162033",
    marginTop: 2,
  },
  metricLabel: { fontSize: 13, color: "#364152" },
  section: {
    fontSize: 16,
    fontWeight: "800",
    color: "#172033",
    marginTop: 19,
    marginBottom: 8,
  },
  summary: {
    borderWidth: 1,
    borderColor: "#dce4ec",
    borderRadius: 14,
    backgroundColor: "white",
    paddingHorizontal: 12,
  },
  summaryRow: {
    height: 37,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#edf0f4",
  },
  summaryIcon: { width: 28, fontSize: 17, color: "#176B45", fontWeight: "800" },
  summaryLabel: { flex: 1, fontSize: 13, color: "#263244" },
  summaryValue: { fontSize: 14, fontWeight: "700", color: "#263244" },
  table: {
    borderRadius: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#dce4ec",
    overflow: "hidden",
  },
  tableHead: { flexDirection: "row", backgroundColor: "#E9F2F8", padding: 10 },
  headText: { flex: 1, fontSize: 12, fontWeight: "800", color: "#35445a" },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: "#edf0f4",
  },
  cell: { flex: 1, fontSize: 12, color: "#263244" },
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    textAlign: "center",
    color: "#66776F",
    fontSize: 14,
  },
  lateSummary: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#fff3e0",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  lateLabel: { color: "#9a5200", fontSize: 13, fontWeight: "600" },
  lateValue: { color: "#9a5200", fontSize: 13, fontWeight: "800" },
  modalBackdrop: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.48)",
  },
  pickerCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: "white",
    elevation: 12,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  pickerTitle: { color: "#172033", fontSize: 17, fontWeight: "800" },
  closePicker: { fontSize: 26, color: "#64748b", paddingHorizontal: 6 },
  years: { gap: 8, paddingBottom: 16 },
  yearChip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
  },
  yearChipSelected: { backgroundColor: "#176b45" },
  yearText: { color: "#334155", fontWeight: "600" },
  yearTextSelected: { color: "white" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monthOption: {
    width: "30%",
    paddingVertical: 13,
    alignItems: "center",
    borderRadius: 11,
    backgroundColor: "#eff6ff",
  },
  monthOptionSelected: { backgroundColor: "#d7f2e4" },
  monthOptionDisabled: { backgroundColor: "#f8fafc" },
  monthOptionText: { color: "#1e3a5f", fontWeight: "600" },
  monthOptionTextSelected: { color: "#176b45", fontWeight: "800" },
  monthOptionTextDisabled: { color: "#cbd5e1" },
});
