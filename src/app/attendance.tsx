import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
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
import Animated, {
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/auth/session";
import {
  getApplicableCalendarDays,
  getAttendanceCounts,
  type AttendanceCounts,
} from "@/utils/attendance-calculations";
import {
  Attendance,
  getEmployeeAttendanceForYear,
  seedAttendance,
} from "@/database/database";

type ViewMode = "monthly" | "yearly";
const MONTHS = Array.from({ length: 12 }, (_, month) => month);

export default function AttendanceScreen() {
  const { employee } = useSession();
  const router = useRouter();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [year, setYear] = useState(month.getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [yearRows, setYearRows] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(month.getFullYear());

  const loadYear = useCallback(async () => {
    if (!employee) return;
    setLoading(true);
    try {
      await seedAttendance();
      setYearRows(
        await getEmployeeAttendanceForYear(employee.employeeCode, year),
      );
    } finally {
      setLoading(false);
    }
  }, [employee, year]);

  useFocusEffect(
    useCallback(() => {
      void loadYear();
    }, [loadYear]),
  );

  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const joiningDate = useMemo(
    () => (employee ? new Date(`${employee.joiningDate}T00:00:00`) : now),
    [employee, now.getFullYear(), now.getMonth(), now.getDate()],
  );
  const firstAvailableMonth = new Date(
    joiningDate.getFullYear(),
    joiningDate.getMonth(),
    1,
  );
  const minimumYear = joiningDate.getFullYear();
  const maximumYear = now.getFullYear();

  const monthRows = useMemo(
    () =>
      yearRows.filter((row) => {
        const date = new Date(`${row.attendanceDate}T00:00:00`);
        return date.getMonth() === month.getMonth();
      }),
    [month, yearRows],
  );

  if (!employee) return null;

  const monthCounts = getAttendanceCounts(monthRows);
  const availableDays = (targetYear: number, targetMonth: number) =>
    getApplicableCalendarDays(
      targetYear,
      targetMonth,
      employee.joiningDate,
      now,
    );

  const monthlyRows = MONTHS.map((monthIndex) =>
    yearRows.filter((row) => {
      const rowDate = new Date(`${row.attendanceDate}T00:00:00`);
      return rowDate.getMonth() === monthIndex;
    }),
  );
  const monthlySummaries = monthlyRows.map((rows, monthIndex) => ({
    monthIndex,
    days: availableDays(year, monthIndex),
    counts: getAttendanceCounts(rows),
  }));
  const yearSummary = monthlySummaries.reduce(
    (summary, monthSummary) => ({
      days: summary.days + monthSummary.days,
      present: summary.present + monthSummary.counts.present,
      absent: summary.absent + monthSummary.counts.absent,
      late: summary.late + monthSummary.counts.late,
      leave: summary.leave + monthSummary.counts.leave,
    }),
    { days: 0, present: 0, absent: 0, late: 0, leave: 0 },
  );

  const setSelectedMonth = (nextMonth: Date) => {
    if (nextMonth < firstAvailableMonth || nextMonth > currentMonth) return;
    setMonth(nextMonth);
    setYear(nextMonth.getFullYear());
  };

  const initials = employee.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.top}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.back}>‹</Text>
            </Pressable>
            <Text style={styles.heading}>Attendance</Text>
            <View style={styles.modeSwitch}>
              <ModeButton
                label="Month"
                selected={viewMode === "monthly"}
                onPress={() => setViewMode("monthly")}
              />
              <ModeButton
                label="Year"
                selected={viewMode === "yearly"}
                onPress={() => setViewMode("yearly")}
              />
            </View>
          </View>
          <View style={styles.profile}>
            <View style={styles.avatar}>
              {employee.profileImage ? (
                <Image
                  source={{ uri: employee.profileImage }}
                  resizeMode="cover"
                  style={styles.profileImage}
                />
              ) : (
                <Text style={styles.initial}>{initials}</Text>
              )}
            </View>
            <View style={styles.divider} />
            <View style={styles.profileText}>
              <Text style={styles.name}>{employee.name}</Text>
              <Text style={styles.detail}>{employee.employeeCode}</Text>
              <Text style={styles.detail}>{employee.designation}</Text>
            </View>
          </View>
        </View>

        {viewMode === "monthly" ? (
          <Animated.View
            key={`month-${year}-${month.getMonth()}`}
            entering={FadeInDown.duration(220)}
            style={styles.body}
          >
            <View style={styles.monthSelector}>
              <Pressable
                onPress={() =>
                  setSelectedMonth(
                    new Date(year, month.getMonth() - 1, 1),
                  )
                }
                disabled={month <= firstAvailableMonth}
                style={({ pressed }) => [
                  styles.monthNavButton,
                  month <= firstAvailableMonth && styles.disabled,
                  pressed && styles.pressed,
                ]}
                accessibilityLabel="Previous month"
              >
                <Text style={styles.monthArrow}>‹</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setPickerYear(year);
                  setDatePickerVisible(true);
                }}
                style={styles.monthTitleButton}
                accessibilityRole="button"
              >
                <Text style={styles.monthLabel}>
                  {month.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })} {"  ⌄"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  setSelectedMonth(new Date(year, month.getMonth() + 1, 1))
                }
                disabled={month >= currentMonth}
                style={({ pressed }) => [
                  styles.monthNavButton,
                  month >= currentMonth && styles.disabled,
                  pressed && styles.pressed,
                ]}
                accessibilityLabel="Next month"
              >
                <Text style={styles.monthArrow}>›</Text>
              </Pressable>
            </View>

            <View style={styles.totalCard}>
              <Text style={styles.totalIcon}>▦</Text>
              <View style={styles.totalCopy}>
                <Text style={styles.totalLabel}>Total Attendance</Text>
                <Text style={styles.totalValue}>
                  {monthCounts.present}
                  <Text style={styles.totalSmall}> of {availableDays(year, month.getMonth())} days</Text>
                </Text>
              </View>
            </View>

            <View style={styles.metrics}>
              <Metric label="Present" count={monthCounts.present} />
              <Metric label="Absent" count={monthCounts.absent} />
              <Metric label="Late" count={monthCounts.late} />
              <Metric label="Leave" count={monthCounts.leave} />
            </View>

            <Text style={styles.sectionTitle}>Monthly Attendance</Text>
            <View style={styles.summaryCard}>
              <SummaryRow label="Total Calendar Days" count={availableDays(year, month.getMonth())} tone="neutral" />
              <SummaryRow label="Present Days" count={monthCounts.present} tone="present" />
              <SummaryRow label="Absent Days" count={monthCounts.absent} tone="absent" />
              <SummaryRow label="Late Days" count={monthCounts.late} tone="late" />
              <SummaryRow label="Leave Days" count={monthCounts.leave} tone="leave" />
            </View>

            <Text style={styles.sectionTitle}>Monthly Attendance Details</Text>
            <View style={styles.table}>
              <View style={styles.tableHead}>
                <Text style={styles.headText}>Date</Text>
                <Text style={styles.headText}>Status</Text>
                <Text style={styles.headText}>In / Out</Text>
              </View>
              {loading ? (
                <ActivityIndicator style={styles.loading} color={COLORS.green} />
              ) : monthRows.length === 0 ? (
                <Text style={styles.emptyState}>
                  No attendance records for this month.
                </Text>
              ) : (
                monthRows.map((row, index) => (
                  <Animated.View
                    key={row.id}
                    entering={FadeInDown.delay(Math.min(index * 12, 180)).duration(220)}
                    style={styles.tableRow}
                  >
                    <Text style={styles.cell}>
                      {Number(row.attendanceDate.slice(-2))} {month.toLocaleDateString("en-US", { month: "short" })}
                    </Text>
                    <Text style={[styles.cell, { color: statusColor(row.status) }]}>
                      {row.status}
                    </Text>
                    <Text style={styles.cell}>
                      {row.checkIn ?? "—"} / {row.checkOut ?? "—"}
                    </Text>
                  </Animated.View>
                ))
              )}
            </View>
          </Animated.View>
        ) : (
          <Animated.View
            key={`year-${year}`}
            entering={FadeInDown.duration(220)}
            layout={LinearTransition.duration(180)}
            style={styles.body}
          >
            <YearSelector
              year={year}
              minimumYear={minimumYear}
              maximumYear={maximumYear}
              onSelect={(selectedYear) => {
                setYear(selectedYear);
                const latestMonth =
                  selectedYear === now.getFullYear() ? now.getMonth() : 11;
                const selectedMonth = Math.max(
                  firstAvailableMonth.getMonth(),
                  Math.min(month.getMonth(), latestMonth),
                );
                setMonth(new Date(selectedYear, selectedMonth, 1));
              }}
            />

            <View style={styles.yearTotalCard}>
              <Text style={styles.yearEyebrow}>YEARLY ATTENDANCE</Text>
              <Text style={styles.yearHeading}>{year}</Text>
              {loading ? (
                <ActivityIndicator style={styles.yearLoading} color={COLORS.green} />
              ) : (
                <>
                  <Text style={styles.yearTotalDays}>
                    {yearSummary.present} <Text style={styles.yearTotalCaption}>present days</Text>
                  </Text>
                  <Text style={styles.yearSubline}>
                    {yearSummary.days} applicable calendar days
                  </Text>
                  <View style={styles.yearCounts}>
                    <YearCount label="Absent" count={yearSummary.absent} tone="absent" />
                    <YearCount label="Late" count={yearSummary.late} tone="late" />
                    <YearCount label="Leave" count={yearSummary.leave} tone="leave" />
                  </View>
                </>
              )}
            </View>

            <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
            <View style={styles.yearGrid}>
              {monthlySummaries.map(({ monthIndex, days, counts }, index) => {
                const disabled = days === 0;
                const monthName = new Date(year, monthIndex, 1).toLocaleDateString(
                  "en-US",
                  { month: "long" },
                );

                return (
                  <Animated.View
                    key={`${year}-${monthIndex}`}
                    entering={FadeInDown.delay(index * 18).duration(240)}
                    layout={LinearTransition.duration(160)}
                    style={styles.monthCardWrapper}
                  >
                    <Pressable
                      disabled={disabled}
                      onPress={() => {
                        setSelectedMonth(new Date(year, monthIndex, 1));
                        setViewMode("monthly");
                      }}
                      style={({ pressed }) => [
                        styles.monthCard,
                        disabled && styles.monthCardDisabled,
                        pressed && styles.cardPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${monthName} ${year}: ${counts.present} present days, ${days} applicable calendar days`}
                    >
                      <View style={styles.monthCardTitleRow}>
                        <Text style={[styles.monthCardTitle, disabled && styles.disabledText]}>
                          {monthName}
                        </Text>
                        <Text style={styles.monthCardArrow}>›</Text>
                      </View>
                      <Text style={styles.monthCardDays}>
                        {disabled ? "Not available" : `${days} calendar days`}
                      </Text>
                      <Text style={styles.monthCardPresent}>
                        {counts.present} <Text style={styles.monthCardSmall}>present</Text>
                      </Text>
                      <StatusBar counts={counts} total={days} />
                      <Text style={styles.monthCardLegend}>
                        A {counts.absent}  ·  L {counts.late}  ·  Lv {counts.leave}
                      </Text>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <Modal
        visible={datePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Choose month and year</Text>
              <Pressable onPress={() => setDatePickerVisible(false)}>
                <Text style={styles.closePicker}>×</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.years}
            >
              {Array.from(
                { length: maximumYear - minimumYear + 1 },
                (_, index) => minimumYear + index,
              ).map((candidateYear) => (
                <Pressable
                  key={candidateYear}
                  style={[
                    styles.yearChip,
                    pickerYear === candidateYear && styles.yearChipSelected,
                  ]}
                  onPress={() => setPickerYear(candidateYear)}
                >
                  <Text
                    style={[
                      styles.yearText,
                      pickerYear === candidateYear && styles.yearTextSelected,
                    ]}
                  >
                    {candidateYear}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.monthGrid}>
              {MONTHS.map((monthIndex) => {
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
                      styles.monthOption,
                      selected && styles.monthOptionSelected,
                      disabled && styles.monthOptionDisabled,
                    ]}
                    onPress={() => {
                      setSelectedMonth(option);
                      setDatePickerVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.monthOptionText,
                        selected && styles.monthOptionTextSelected,
                        disabled && styles.monthOptionTextDisabled,
                      ]}
                    >
                      {option.toLocaleDateString("en-US", { month: "short" })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ModeButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeButton,
        selected && styles.modeButtonSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.modeButtonText, selected && styles.modeButtonTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function YearSelector({
  year,
  minimumYear,
  maximumYear,
  onSelect,
}: {
  year: number;
  minimumYear: number;
  maximumYear: number;
  onSelect: (year: number) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.yearSelector}
    >
      {Array.from(
        { length: maximumYear - minimumYear + 1 },
        (_, index) => minimumYear + index,
      ).map((candidateYear) => (
        <Pressable
          key={candidateYear}
          onPress={() => onSelect(candidateYear)}
          style={({ pressed }) => [
            styles.yearSelectorChip,
            candidateYear === year && styles.yearChipSelected,
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.yearText,
              candidateYear === year && styles.yearTextSelected,
            ]}
          >
            {candidateYear}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Metric({ label, count }: { label: string; count: number }) {
  return (
    <View style={[styles.metric, { backgroundColor: statusSoftColor(label) }]}>
      <Text style={[styles.metricCount, { color: statusColor(label) }]}>{count}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SummaryRow({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: StatusTone;
}) {
  return (
    <View style={styles.summaryRow}>
      <View style={[styles.summaryDot, { backgroundColor: toneColor(tone) }]} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{count}</Text>
    </View>
  );
}

type StatusTone = "neutral" | "present" | "absent" | "late" | "leave";

function YearCount({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: StatusTone;
}) {
  return (
    <View style={styles.yearCount}>
      <Text style={[styles.yearCountValue, { color: toneColor(tone) }]}>
        {count}
      </Text>
      <Text style={styles.yearCountLabel}>{label}</Text>
    </View>
  );
}

function StatusBar({
  counts,
  total,
}: {
  counts: AttendanceCounts;
  total: number;
}) {
  if (!total) return <View style={styles.statusTrack} />;
  return (
    <View style={styles.statusTrack}>
      <View
        style={[
          styles.statusSegment,
          { backgroundColor: COLORS.green, flex: counts.present },
        ]}
      />
      <View
        style={[
          styles.statusSegment,
          { backgroundColor: COLORS.red, flex: counts.absent },
        ]}
      />
      <View
        style={[
          styles.statusSegment,
          { backgroundColor: COLORS.orange, flex: counts.late },
        ]}
      />
      <View
        style={[
          styles.statusSegment,
          { backgroundColor: COLORS.gold, flex: counts.leave },
        ]}
      />
      <View
        style={[
          styles.statusSegment,
          {
            backgroundColor: COLORS.track,
            flex: Math.max(total - counts.present - counts.absent - counts.late - counts.leave, 0),
          },
        ]}
      />
    </View>
  );
}

function statusColor(status: string) {
  if (status === "Present") return COLORS.green;
  if (status === "Absent") return COLORS.red;
  if (status === "Late") return COLORS.orange;
  return COLORS.gold;
}

function statusSoftColor(status: string) {
  if (status === "Present") return "#E4F3E9";
  if (status === "Absent") return "#FCEAEA";
  if (status === "Late") return "#FFF0E1";
  return "#FFF6D9";
}

function toneColor(tone: StatusTone) {
  if (tone === "neutral") return "#94A39A";
  if (tone === "present") return COLORS.green;
  if (tone === "absent") return COLORS.red;
  if (tone === "late") return COLORS.orange;
  return COLORS.gold;
}

const COLORS = {
  green: "#176B45",
  red: "#C94C4C",
  orange: "#D97706",
  gold: "#C99519",
  track: "#E9EEF0",
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F7F4" },
  content: { paddingBottom: 34 },
  hero: {
    backgroundColor: "#104B35",
    paddingBottom: 26,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  top: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backButton: { padding: 4 },
  back: { fontSize: 32, color: "white" },
  heading: { fontSize: 18, fontWeight: "800", color: "white", flex: 1 },
  modeSwitch: {
    flexDirection: "row",
    padding: 3,
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
  },
  modeButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 13 },
  modeButtonSelected: { backgroundColor: "#F4D77F" },
  modeButtonText: { color: "white", fontSize: 11, fontWeight: "700" },
  modeButtonTextSelected: { color: "#17352B" },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#E4F3E9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileImage: { width: 66, height: 66, borderRadius: 33 },
  initial: { fontSize: 21, fontWeight: "800", color: COLORS.green },
  divider: { height: 58, width: 1, backgroundColor: "#9CC7AE" },
  profileText: { flex: 1 },
  name: { fontSize: 16, fontWeight: "800", color: "white" },
  detail: { fontSize: 12, color: "#D9E9DF", marginTop: 3 },
  body: { paddingHorizontal: 18, paddingTop: 18 },
  monthSelector: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCE7DF",
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  monthNavButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  monthTitleButton: { flex: 1, alignItems: "center", justifyContent: "center" },
  monthArrow: { fontSize: 25, color: COLORS.green },
  monthLabel: { fontSize: 14, fontWeight: "800", color: "#17352B" },
  disabled: { opacity: 0.35 },
  totalCard: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: "#E4F3E9",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  totalIcon: { fontSize: 38, color: COLORS.green },
  totalCopy: { flex: 1 },
  totalLabel: { fontSize: 13, fontWeight: "700", color: "#355647" },
  totalValue: { fontSize: 29, fontWeight: "900", color: COLORS.green, marginTop: 1 },
  totalSmall: { fontSize: 13, fontWeight: "600", color: "#66776F" },
  metrics: { flexDirection: "row", gap: 8, marginTop: 12 },
  metric: {
    flex: 1,
    minHeight: 70,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  metricCount: { fontSize: 20, fontWeight: "900" },
  metricLabel: { marginTop: 2, color: "#42534A", fontSize: 11, fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#17352B", marginTop: 20, marginBottom: 9 },
  summaryCard: {
    borderWidth: 1,
    borderColor: "#DCE7DF",
    borderRadius: 16,
    backgroundColor: "white",
    paddingHorizontal: 13,
  },
  summaryRow: { minHeight: 39, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#EFF3F0" },
  summaryDot: { width: 9, height: 9, borderRadius: 5, marginRight: 10 },
  summaryLabel: { flex: 1, color: "#42534A", fontSize: 13 },
  summaryValue: { color: "#17352B", fontSize: 14, fontWeight: "800" },
  table: { borderRadius: 14, backgroundColor: "white", borderWidth: 1, borderColor: "#DCE7DF", overflow: "hidden" },
  tableHead: { flexDirection: "row", backgroundColor: "#E9F2F8", padding: 11 },
  headText: { flex: 1, fontSize: 11, fontWeight: "800", color: "#53655B" },
  tableRow: { flexDirection: "row", paddingHorizontal: 11, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#EFF3F0" },
  cell: { flex: 1, fontSize: 11, color: "#35483D" },
  loading: { padding: 22 },
  emptyState: { padding: 24, textAlign: "center", color: "#66776F", fontSize: 13 },
  yearSelector: { gap: 8, paddingBottom: 14 },
  yearSelectorChip: { backgroundColor: "white", borderColor: "#DCE7DF", borderWidth: 1, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 18 },
  yearTotalCard: { backgroundColor: "#104B35", borderRadius: 22, padding: 20, elevation: 4, shadowColor: "#104B35", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 12 },
  yearEyebrow: { color: "#C6DFD0", fontSize: 10, letterSpacing: 1.4, fontWeight: "800" },
  yearHeading: { color: "white", fontSize: 27, fontWeight: "900", marginTop: 2 },
  yearTotalDays: { color: "#F4D77F", fontSize: 32, fontWeight: "900", marginTop: 10 },
  yearTotalCaption: { color: "white", fontSize: 14, fontWeight: "600" },
  yearSubline: { color: "#D9E9DF", fontSize: 12, marginTop: 2 },
  yearCounts: { flexDirection: "row", gap: 10, marginTop: 18 },
  yearCount: { flex: 1, borderRadius: 13, padding: 10, backgroundColor: "rgba(255,255,255,0.1)" },
  yearCountValue: { fontSize: 18, fontWeight: "900" },
  yearCountLabel: { fontSize: 10, color: "#E5EEE8", marginTop: 3 },
  yearLoading: { padding: 20 },
  yearGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  monthCardWrapper: { width: "48%" },
  monthCard: { minHeight: 148, borderRadius: 17, backgroundColor: "white", borderWidth: 1, borderColor: "#DCE7DF", padding: 12, elevation: 2, shadowColor: "#123528", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8 },
  monthCardDisabled: { opacity: 0.55, backgroundColor: "#F7F9F7" },
  monthCardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  monthCardTitle: { color: "#17352B", fontSize: 14, fontWeight: "800" },
  monthCardArrow: { color: COLORS.green, fontSize: 19, fontWeight: "700" },
  monthCardDays: { color: "#748078", fontSize: 10, marginTop: 4 },
  monthCardPresent: { color: COLORS.green, fontSize: 22, fontWeight: "900", marginTop: 7 },
  monthCardSmall: { color: "#66776F", fontSize: 11, fontWeight: "600" },
  statusTrack: { height: 7, borderRadius: 4, overflow: "hidden", flexDirection: "row", backgroundColor: COLORS.track, marginTop: 8 },
  statusSegment: { height: 7 },
  monthCardLegend: { fontSize: 9, color: "#66776F", marginTop: 7 },
  disabledText: { color: "#9BA69F" },
  cardPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  pressed: { opacity: 0.75 },
  modalBackdrop: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "rgba(15,23,42,0.48)" },
  pickerCard: { padding: 18, borderRadius: 20, backgroundColor: "white", elevation: 12 },
  pickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  pickerTitle: { color: "#17352B", fontSize: 17, fontWeight: "800" },
  closePicker: { fontSize: 26, color: "#64748B", paddingHorizontal: 6 },
  years: { gap: 8, paddingBottom: 16 },
  yearChip: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 18, backgroundColor: "#F1F5F9" },
  yearChipSelected: { backgroundColor: COLORS.green },
  yearText: { color: "#334155", fontWeight: "600" },
  yearTextSelected: { color: "white" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monthOption: { width: "30%", paddingVertical: 13, alignItems: "center", borderRadius: 11, backgroundColor: "#EFF6F2" },
  monthOptionSelected: { backgroundColor: "#D7F2E4" },
  monthOptionDisabled: { backgroundColor: "#F8FAFC" },
  monthOptionText: { color: "#1E3A2F", fontWeight: "600" },
  monthOptionTextSelected: { color: COLORS.green, fontWeight: "800" },
  monthOptionTextDisabled: { color: "#CBD5E1" },
});
