import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/auth/session";
import { CustomDateRangePicker } from "@/components/custom-date-range-picker";
import { EmployeeAvatar } from "@/components/employee-avatar";
import type { AttendanceSummary } from "@/services/attendance-service";
import { attendanceService } from "@/services/attendance-service";
import type { Attendance, Employee } from "@/types/hrms";
import {
  buildDailyAttendanceDetails,
  getAttendanceCounts,
  summarizeAttendanceByMonth,
  type AttendanceCounts,
  type CompanyHoliday,
  type DailyAttendance,
} from "@/utils/attendance-calculations";

type ViewMode = "monthly" | "yearly";
type CalendarTarget = "from" | "to";
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
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<CalendarTarget>("from");
  const [fromDate, setFromDate] = useState(() => getCurrentMonthRange().from);
  const [toDate, setToDate] = useState(() => getCurrentMonthRange().to);
  const [appliedFromDate, setAppliedFromDate] = useState(
    () => getCurrentMonthRange().from,
  );
  const [appliedToDate, setAppliedToDate] = useState(
    () => getCurrentMonthRange().to,
  );
  const [customApplied, setCustomApplied] = useState(true);
  const [hasUserAppliedRange, setHasUserAppliedRange] = useState(false);
  const [rangeRows, setRangeRows] = useState<Attendance[]>([]);
  const [rangeHolidays, setRangeHolidays] = useState<CompanyHoliday[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allRows, setAllRows] = useState<Attendance[]>([]);
  const [groupAttendanceSummaries, setGroupAttendanceSummaries] = useState<
    AttendanceSummary[]
  >([]);
  const [loadingFilteredRows, setLoadingFilteredRows] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    employee,
  );
  const [selectedDesignation, setSelectedDesignation] = useState(
    employee?.designation ?? "",
  );
  const [selectedDepartment, setSelectedDepartment] = useState(
    employee?.department ?? "",
  );
  const [selectionPicker, setSelectionPicker] = useState<
    "employee" | "designation" | "department" | null
  >(null);
  const [selectionSearch, setSelectionSearch] = useState("");
  const [manualGroupFilters, setManualGroupFilters] = useState(false);
  const initialRangePending = useRef(true);
  const isHrAdmin = employee?.role === "HR" || employee?.role === "Admin";
  const attendanceEmployee = isHrAdmin ? selectedEmployee : employee;

  const loadYear = useCallback(async () => {
    if (!attendanceEmployee) return;
    setLoading(true);
    try {
      let [attendance, companyHolidays] = await Promise.all([
        attendanceService.loadEmployeeYear(
          attendanceEmployee.employeeCode,
          year,
        ),
        attendanceService.getCompanyHolidays(year),
      ]);
      setYearRows(attendance);
      setHolidays(companyHolidays);

      if (initialRangePending.current) {
        const defaultRange = getCurrentMonthRange();
        const defaultYear = new Date().getFullYear();
        if (year !== defaultYear) {
          [attendance, companyHolidays] = await Promise.all([
            attendanceService.loadEmployeeYear(
              attendanceEmployee.employeeCode,
              defaultYear,
            ),
            attendanceService.getCompanyHolidays(defaultYear),
          ]);
        }

        setFromDate(defaultRange.from);
        setToDate(defaultRange.to);
        setAppliedFromDate(defaultRange.from);
        setAppliedToDate(defaultRange.to);
        setRangeRows(attendance);
        setRangeHolidays(companyHolidays);
        setCustomApplied(true);
        initialRangePending.current = false;
      }
    } finally {
      setLoading(false);
    }
  }, [attendanceEmployee, employee, year]);

  useFocusEffect(
    useCallback(() => {
      if (employee && (employee.role === "HR" || employee.role === "Admin")) {
        void attendanceService
          .loadEmployees()
          .then((availableEmployees) => {
            setEmployees(availableEmployees);
          })
          .catch(() =>
            Alert.alert(
              "Unable to load attendance",
              "Please reopen the Attendance screen.",
            ),
          );
      } else {
        initialRangePending.current = true;
        const defaultRange = getCurrentMonthRange();
        setFromDate(defaultRange.from);
        setToDate(defaultRange.to);
        setAppliedFromDate(defaultRange.from);
        setAppliedToDate(defaultRange.to);
        setCustomApplied(true);
        setManualGroupFilters(false);
      }
    }, [employee]),
  );

  useEffect(() => {
    if (isHrAdmin) void loadYear();
  }, [isHrAdmin, loadYear]);

  useFocusEffect(
    useCallback(() => {
      if (!isHrAdmin) void loadYear();
    }, [isHrAdmin, loadYear]),
  );

  const [now] = useState(() => new Date());
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const joiningDate = useMemo(
    () =>
      attendanceEmployee
        ? new Date(`${attendanceEmployee.joiningDate}T00:00:00`)
        : now,
    [attendanceEmployee, now.getFullYear(), now.getMonth(), now.getDate()],
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

  const dailyDetails = useMemo(
    () =>
      buildDailyAttendanceDetails(
        year,
        month.getMonth(),
        attendanceEmployee?.joiningDate ?? formatDate(now),
        monthRows,
        holidays,
        now,
      ),
    [year, month, attendanceEmployee?.joiningDate, monthRows, holidays, now],
  );
  const rangeDetails = useMemo(
    () =>
      buildDateRangeDetails(
        appliedFromDate,
        appliedToDate,
        attendanceEmployee?.joiningDate ?? formatDate(now),
        isHrAdmin
          ? allRows.filter(
              (row) => row.employeeCode === attendanceEmployee?.employeeCode,
            )
          : rangeRows,
        rangeHolidays,
        now,
      ),
    [
      appliedFromDate,
      appliedToDate,
      attendanceEmployee?.employeeCode,
      attendanceEmployee?.joiningDate,
      isHrAdmin,
      allRows,
      rangeRows,
      rangeHolidays,
      now,
    ],
  );
  const visibleDetails = customApplied ? rangeDetails : dailyDetails;
  const visibleCounts = getAttendanceCounts(visibleDetails);
  const visibleDays = visibleDetails.length;
  const rangeMonthCards = useMemo(
    () =>
      summarizeAttendanceByMonth(
        rangeDetails,
        appliedFromDate,
        appliedToDate,
      ),
    [rangeDetails, appliedFromDate, appliedToDate],
  );
  const showRangeDetails = useMemo(
    () => isRangeWithinOneMonth(appliedFromDate, appliedToDate),
    [appliedFromDate, appliedToDate],
  );

  const groupEmployees = useMemo(() => {
    if (!isHrAdmin || !employee) return [];
    return employees.filter(
      (candidate) =>
        (!selectedEmployee ||
          candidate.employeeCode === selectedEmployee.employeeCode) &&
        (!selectedDesignation ||
          candidate.designation === selectedDesignation) &&
        (!selectedDepartment || candidate.department === selectedDepartment),
    );
  }, [
    isHrAdmin,
    employee,
    employees,
    selectedEmployee,
    selectedDesignation,
    selectedDepartment,
  ]);
  const groupEmployeeCodes = useMemo(
    () => groupEmployees.map((candidate) => candidate.employeeCode),
    [groupEmployees],
  );
  const groupEmployeeKey = groupEmployeeCodes.join(",");
  const groupViewActive =
    isHrAdmin && !!employee && (manualGroupFilters || !selectedEmployee);
  const customRangeMinimumDate = useMemo(() => {
    const candidates =
      isHrAdmin && groupViewActive ? groupEmployees : [attendanceEmployee];
    const joiningDates = candidates
      .flatMap((candidate) => (candidate ? [candidate.joiningDate] : []))
      .sort();
    return joiningDates[0] ?? formatDate(now);
  }, [isHrAdmin, groupViewActive, groupEmployees, attendanceEmployee, now]);

  useEffect(() => {
    let active = true;
    setAllRows([]);
    setGroupAttendanceSummaries([]);
    if (!isHrAdmin || !employee || !groupEmployeeCodes.length) {
      setLoadingFilteredRows(false);
      return () => {
        active = false;
      };
    }
    if (!groupViewActive && !customApplied) {
      setLoadingFilteredRows(false);
      return () => {
        active = false;
      };
    }

    setLoadingFilteredRows(true);
    const attendanceLoad = groupViewActive
      ? attendanceService
          .loadAttendanceSummaryForEmployees(
            groupEmployeeCodes,
            appliedFromDate,
            appliedToDate,
          )
          .then((summaries) => {
            if (active) setGroupAttendanceSummaries(summaries);
          })
      : attendanceService
          .loadAttendanceForEmployees(
            groupEmployeeCodes,
            appliedFromDate,
            appliedToDate,
          )
          .then((rows) => {
            if (active) setAllRows(rows);
          });
    void attendanceLoad
      .catch(() => {
        if (active) {
          Alert.alert(
            "Unable to load attendance",
            "Please try applying the filters again.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingFilteredRows(false);
      });

    return () => {
      active = false;
    };
  }, [
    isHrAdmin,
    employee,
    groupEmployeeKey,
    groupEmployeeCodes,
    groupViewActive,
    customApplied,
    appliedFromDate,
    appliedToDate,
  ]);
  const groupSummaries = useMemo(() => {
    const summariesByEmployee = new Map(
      groupAttendanceSummaries.map((summary) => [
        summary.employeeCode,
        summary,
      ]),
    );

    return groupEmployees.map((candidate) => {
      const summary = summariesByEmployee.get(candidate.employeeCode);
      const counts: AttendanceCounts = {
        present: summary?.present ?? 0,
        late: summary?.late ?? 0,
        absent: summary?.absent ?? 0,
        leave: summary?.leave ?? 0,
        holiday: 0,
        weekend: 0,
        notRecorded: 0,
      };
      const accountedDays =
        counts.present + counts.late + counts.absent + counts.leave;
      return {
        employee: candidate,
        counts,
        percentage: accountedDays
          ? Math.round(((counts.present + counts.late) / accountedDays) * 100)
          : 0,
      };
    });
  }, [groupEmployees, groupAttendanceSummaries]);

  const monthlySummaries = useMemo(
    () =>
      employee
        ? MONTHS.map((monthIndex) => {
            const details = buildDailyAttendanceDetails(
              year,
              monthIndex,
              (attendanceEmployee ?? employee).joiningDate,
              yearRows,
              holidays,
              now,
            );
            return {
              monthIndex,
              days: details.length,
              counts: getAttendanceCounts(details),
            };
          })
        : [],
    [employee, attendanceEmployee?.joiningDate, year, yearRows, holidays, now],
  );
  const yearSummary = useMemo(
    () =>
      monthlySummaries.reduce(
        (summary, monthSummary) => ({
          days: summary.days + monthSummary.days,
          present: summary.present + monthSummary.counts.present,
          absent: summary.absent + monthSummary.counts.absent,
          late: summary.late + monthSummary.counts.late,
          leave: summary.leave + monthSummary.counts.leave,
          holiday: summary.holiday + monthSummary.counts.holiday,
          weekend: summary.weekend + monthSummary.counts.weekend,
          notRecorded: summary.notRecorded + monthSummary.counts.notRecorded,
        }),
        {
          days: 0,
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
          holiday: 0,
          weekend: 0,
          notRecorded: 0,
        },
      ),
    [monthlySummaries],
  );

  if (!employee) return null;
  const profileEmployee = isHrAdmin ? (selectedEmployee ?? employee) : employee;

  const setSelectedMonth = (nextMonth: Date) => {
    if (nextMonth < firstAvailableMonth || nextMonth > currentMonth) return;
    setMonth(nextMonth);
    setYear(nextMonth.getFullYear());
  };

  const showCalendar = (target: CalendarTarget) => {
    setCalendarTarget(target);
    setCalendarVisible(true);
  };

  const chooseCalendarDate = (date: Date) => {
    const value = formatDate(date);
    if (calendarTarget === "from") {
      setFromDate(value);
    } else {
      setToDate(value);
    }
    setCalendarVisible(false);
  };

  const applyCustomRange = async () => {
    const from = parseDate(fromDate);
    const to = parseDate(toDate);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (!from || !to) {
      Alert.alert(
        "Choose both dates",
        "Select a From Date and a To Date first.",
      );
      return;
    }
    if (from > to) {
      Alert.alert(
        "Invalid date range",
        "From Date must be on or before To Date.",
      );
      return;
    }
    if (
      from < (parseDate(customRangeMinimumDate) ?? today) || to > today
    ) {
      Alert.alert(
        "Date range unavailable",
        "Choose dates from the selected employee's joining date through today.",
      );
      return;
    }

    setLoading(true);
    try {
      const years = Array.from(
        { length: to.getFullYear() - from.getFullYear() + 1 },
        (_, index) => from.getFullYear() + index,
      );
      const yearHolidays = await Promise.all(
        years.map((rangeYear) =>
          attendanceService.getCompanyHolidays(rangeYear),
        ),
      );
      setRangeHolidays(yearHolidays.flat());
      setAppliedFromDate(fromDate);
      setAppliedToDate(toDate);
      setCustomApplied(true);
      setHasUserAppliedRange(true);
    } catch {
      Alert.alert(
        "Unable to load attendance",
        "Please try applying the date range again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const changeMode = (nextMode: ViewMode) => {
    setCustomApplied(nextMode === "monthly" && hasUserAppliedRange);
    setViewMode(nextMode);
  };

  const chooseSelection = (value: string) => {
    if (!employee) return;
    if (selectionPicker === "employee") {
      const nextEmployee = employees.find(
        (candidate) => candidate.employeeCode === value,
      );
      setSelectedEmployee(nextEmployee ?? null);
      setSelectedDesignation("");
      setSelectedDepartment("");
      setManualGroupFilters(!nextEmployee);
    } else if (selectionPicker === "designation") {
      setSelectedDesignation(value);
      setManualGroupFilters(true);
    } else if (selectionPicker === "department") {
      setSelectedDepartment(value);
      setManualGroupFilters(true);
    }
    setSelectionPicker(null);
    setSelectionSearch("");
  };

  const resetHrFilters = () => {
    setSelectedEmployee(employee);
    setSelectedDesignation(employee.designation);
    setSelectedDepartment(employee.department);
    setManualGroupFilters(false);
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.top}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.back}>‹</Text>
            </Pressable>
            <Text style={styles.heading}>Attendance</Text>
            {!isHrAdmin && (
              <View style={styles.modeSwitch}>
                <ModeButton
                  label="Month"
                  selected={viewMode === "monthly"}
                  onPress={() => changeMode("monthly")}
                />
                <ModeButton
                  label="Year"
                  selected={viewMode === "yearly"}
                  onPress={() => changeMode("yearly")}
                />
              </View>
            )}
          </View>
          <View style={styles.profile}>
            <EmployeeAvatar
              name={profileEmployee.name}
              profileImage={profileEmployee.profileImage}
              size={66}
            />
            <View style={styles.divider} />
            <View style={styles.profileText}>
              <Text style={styles.name}>{profileEmployee.name}</Text>
              <Text style={styles.detail}>{profileEmployee.employeeCode}</Text>
              <Text style={styles.detail}>
                {profileEmployee.designation} · {profileEmployee.department}
              </Text>
            </View>
          </View>
        </View>

        {isHrAdmin && (
          <View style={styles.rangeCard}>
            <Text style={styles.rangeTitle}>Attendance Filters</Text>
            <SearchableSelection
              label="Employee"
              value={
                selectedEmployee
                  ? `${selectedEmployee.name} (${selectedEmployee.employeeCode})`
                  : "All Employees"
              }
              onPress={() => {
                setSelectionSearch("");
                setSelectionPicker("employee");
              }}
            />
            <SearchableSelection
              label="Designation"
              value={selectedDesignation}
              onPress={() => {
                setSelectionSearch("");
                setSelectionPicker("designation");
              }}
            />
            <SearchableSelection
              label="Department"
              value={selectedDepartment}
              onPress={() => {
                setSelectionSearch("");
                setSelectionPicker("department");
              }}
            />
            <Pressable onPress={resetHrFilters} style={styles.resetFilters}>
              <Text style={styles.resetFiltersText}>
                Reset to my attendance
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.rangeCard}>
          <Text style={styles.rangeTitle}>Custom Date Range</Text>
          <View style={styles.rangeFields}>
            <Pressable
              style={[
                styles.rangeDate,
                customApplied && styles.rangeDateApplied,
              ]}
              onPress={() => showCalendar("from")}
            >
              <Text style={styles.rangeCaption}>From Date</Text>
              <Text style={styles.rangeValue}>
                {formatDateLabel(fromDate) || "Select date"}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.rangeDate,
                customApplied && styles.rangeDateApplied,
              ]}
              onPress={() => showCalendar("to")}
            >
              <Text style={styles.rangeCaption}>To Date</Text>
              <Text style={styles.rangeValue}>
                {formatDateLabel(toDate) || "Select date"}
              </Text>
            </Pressable>
          </View>
          <Pressable
            style={styles.applyRange}
            onPress={() => void applyCustomRange()}
            disabled={loading}
          >
            <Text style={styles.applyRangeText}>
              {loading && customApplied ? "Loading…" : "Apply Filter"}
            </Text>
          </Pressable>
          {customApplied &&
            (fromDate !== appliedFromDate || toDate !== appliedToDate) && (
              <Text style={styles.pendingRangeText}>
                Apply changes to update the displayed attendance.
              </Text>
            )}
        </View>

        {isHrAdmin && !groupViewActive && (
          <View style={styles.individualModeSwitch}>
            <ModeButton
              label="Month"
              selected={viewMode === "monthly"}
              onPress={() => changeMode("monthly")}
            />
            <ModeButton
              label="Year"
              selected={viewMode === "yearly"}
              onPress={() => changeMode("yearly")}
            />
          </View>
        )}

        {isHrAdmin && groupViewActive ? (
          <Animated.View
            key={`admin-${selectedEmployee?.employeeCode}-${selectedDesignation}-${selectedDepartment}-${appliedFromDate}-${appliedToDate}`}
            entering={FadeInDown.duration(220)}
            style={styles.body}
          >
            <GroupSummaryTable
              rows={groupSummaries}
              fromDate={appliedFromDate}
              toDate={appliedToDate}
              onOpenProfile={(code) =>
                router.push({
                  pathname: "/profile",
                  params: { employeeCode: code },
                })
              }
              loading={loading || loadingFilteredRows}
            />
          </Animated.View>
        ) : customApplied ? (
          <Animated.View
            key={`range-${appliedFromDate}-${appliedToDate}`}
            entering={FadeInDown.duration(220)}
            style={styles.body}
          >
            <View style={styles.totalCard}>
              <Text style={styles.totalIcon}>▦</Text>
              <View style={styles.totalCopy}>
                <Text style={styles.totalLabel}>Total Attendance</Text>
                <Text style={styles.totalValue}>
                  {visibleCounts.present + visibleCounts.late}
                  <Text style={styles.totalSmall}> of {visibleDays} days</Text>
                </Text>
              </View>
            </View>
            <View style={styles.metrics}>
              <Metric label="Present" count={visibleCounts.present} />
              <Metric label="Late" count={visibleCounts.late} />
              <Metric label="Absent" count={visibleCounts.absent} />
              <Metric label="Leave" count={visibleCounts.leave} />
            </View>
            {showRangeDetails ? (
              <>
                <Text style={styles.sectionTitle}>Attendance Details</Text>
                <AttendanceTable
                  rows={visibleDetails}
                  loading={loading || loadingFilteredRows}
                />
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Monthly Attendance</Text>
                {loading || loadingFilteredRows ? (
                  <ActivityIndicator
                    style={styles.loading}
                    color={COLORS.green}
                  />
                ) : (
              <View style={styles.rangeMonthGrid}>
                {rangeMonthCards.map((card) => (
                  <Pressable
                    key={card.monthKey}
                    style={({ pressed }) => [
                      styles.rangeMonthCard,
                      pressed && styles.cardPressed,
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: "/attendance-month",
                        params: {
                          employeeCode: (attendanceEmployee ?? employee)
                            .employeeCode,
                          month: card.monthKey,
                          fromDate: appliedFromDate,
                          toDate: appliedToDate,
                        },
                      } as never)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`${card.label}: ${card.workingDays} working days, ${card.counts.present} present, ${card.counts.late} late, ${card.counts.absent} absent, ${card.counts.leave} leave, ${card.percentage}% attendance`}
                  >
                    <Text style={styles.rangeMonthTitle}>{card.label}</Text>
                    <RangeMonthStat
                      label="Total Working Days"
                      value={card.workingDays}
                    />
                    <RangeMonthStat label="Present" value={card.counts.present} />
                    <RangeMonthStat label="Late" value={card.counts.late} />
                    <RangeMonthStat label="Absent" value={card.counts.absent} />
                    <RangeMonthStat label="Leave" value={card.counts.leave} />
                    <RangeMonthStat
                      label="Attendance"
                      value={`${card.percentage}%`}
                    />
                  </Pressable>
                ))}
              </View>
                )}
              </>
            )}
          </Animated.View>
        ) : viewMode !== "yearly" ? (
          <Animated.View
            key={`month-${year}-${month.getMonth()}`}
            entering={FadeInDown.duration(220)}
            style={styles.body}
          >

            <View style={styles.totalCard}>
              <Text style={styles.totalIcon}>▦</Text>
              <View style={styles.totalCopy}>
                <Text style={styles.totalLabel}>Total Attendance</Text>
                <Text style={styles.totalValue}>
                  {visibleCounts.present + visibleCounts.late}
                  <Text style={styles.totalSmall}> of {visibleDays} days</Text>
                </Text>
              </View>
            </View>

            <View style={styles.metrics}>
              <Metric label="Present" count={visibleCounts.present} />
              <Metric label="Late" count={visibleCounts.late} />
              <Metric label="Absent" count={visibleCounts.absent} />
              <Metric label="Leave" count={visibleCounts.leave} />
            </View>

            <Text style={styles.sectionTitle}>Monthly Attendance</Text>
            <View style={styles.summaryCard}>
              <SummaryRow
                label="Total Calendar Days"
                count={visibleDays}
                tone="neutral"
              />
              <SummaryRow
                label="Total Attendance (Present + Late)"
                count={visibleCounts.present + visibleCounts.late}
                tone="present"
              />
              <SummaryRow
                label="Present Days"
                count={visibleCounts.present}
                tone="present"
              />
              <SummaryRow
                label="Late Days"
                count={visibleCounts.late}
                tone="late"
              />
              <SummaryRow
                label="Absent Days"
                count={visibleCounts.absent}
                tone="absent"
              />
              <SummaryRow
                label="Leave Days"
                count={visibleCounts.leave}
                tone="leave"
              />
              <SummaryRow
                label="Holiday Days"
                count={visibleCounts.holiday}
                tone="holiday"
              />
              <SummaryRow
                label="Weekend Days"
                count={visibleCounts.weekend}
                tone="weekend"
              />
              <SummaryRow
                label="Not Recorded Days"
                count={visibleCounts.notRecorded}
                tone="unrecorded"
              />
            </View>

            <Text style={styles.sectionTitle}>Monthly Attendance Details</Text>
            <View style={styles.table}>
              <View style={styles.tableHead}>
                <Text style={styles.headText}>Date</Text>
                <Text style={styles.headText}>Status</Text>
                <Text style={styles.headText}>In / Out</Text>
              </View>
              {loading ? (
                <ActivityIndicator
                  style={styles.loading}
                  color={COLORS.green}
                />
              ) : visibleDetails.length === 0 ? (
                <Text style={styles.emptyState}>
                  No dates are available before the employee joined or after
                  today.
                </Text>
              ) : (
                visibleDetails.map((row, index) => (
                  <Animated.View
                    key={row.attendanceDate}
                    entering={FadeInDown.delay(
                      Math.min(index * 12, 180),
                    ).duration(220)}
                    style={styles.tableRow}
                  >
                    <Text style={styles.cell}>
                      {row.weekday}, {Number(row.attendanceDate.slice(-2))}{" "}
                      {new Date(
                        `${row.attendanceDate}T00:00:00`,
                      ).toLocaleDateString("en-US", { month: "short" })}
                    </Text>
                    <Text
                      style={[styles.cell, { color: statusColor(row.status) }]}
                    >
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
                const earliestMonth =
                  selectedYear === firstAvailableMonth.getFullYear()
                    ? firstAvailableMonth.getMonth()
                    : 0;
                const selectedMonth = Math.max(
                  earliestMonth,
                  Math.min(month.getMonth(), latestMonth),
                );
                setMonth(new Date(selectedYear, selectedMonth, 1));
              }}
            />

            <View style={styles.yearTotalCard}>
              <Text style={styles.yearEyebrow}>YEARLY ATTENDANCE</Text>
              <Text style={styles.yearHeading}>{year}</Text>
              {loading ? (
                <ActivityIndicator
                  style={styles.yearLoading}
                  color={COLORS.green}
                />
              ) : (
                <>
                  <Text style={styles.yearTotalDays}>
                    {yearSummary.present + yearSummary.late}{" "}
                    <Text style={styles.yearTotalCaption}>attendance days</Text>
                  </Text>
                  <Text style={styles.yearSubline}>
                    {yearSummary.days} applicable calendar days
                  </Text>
                  <View style={styles.yearCounts}>
                    <YearCount
                      label="Present"
                      count={yearSummary.present}
                      tone="present"
                    />
                    <YearCount
                      label="Late"
                      count={yearSummary.late}
                      tone="late"
                    />
                    <YearCount
                      label="Absent"
                      count={yearSummary.absent}
                      tone="absent"
                    />
                    <YearCount
                      label="Leave"
                      count={yearSummary.leave}
                      tone="leave"
                    />
                  </View>
                  <View style={styles.yearCounts}>
                    <YearCount
                      label="Holiday"
                      count={yearSummary.holiday}
                      tone="holiday"
                    />
                    <YearCount
                      label="Weekend"
                      count={yearSummary.weekend}
                      tone="weekend"
                    />
                    <YearCount
                      label="Not Recorded"
                      count={yearSummary.notRecorded}
                      tone="unrecorded"
                    />
                  </View>
                </>
              )}
            </View>

            <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
            <View style={styles.yearGrid}>
              {monthlySummaries.map(({ monthIndex, days, counts }, index) => {
                const disabled = days === 0;
                const monthName = new Date(
                  year,
                  monthIndex,
                  1,
                ).toLocaleDateString("en-US", { month: "long" });

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
                        changeMode("monthly");
                      }}
                      style={({ pressed }) => [
                        styles.monthCard,
                        disabled && styles.monthCardDisabled,
                        pressed && styles.cardPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${monthName} ${year}: ${counts.present + counts.late} attendance days, ${days} applicable calendar days`}
                    >
                      <View style={styles.monthCardTitleRow}>
                        <Text
                          style={[
                            styles.monthCardTitle,
                            disabled && styles.disabledText,
                          ]}
                        >
                          {monthName}
                        </Text>
                        <Text style={styles.monthCardArrow}>›</Text>
                      </View>
                      <Text style={styles.monthCardDays}>
                        {disabled ? "Not available" : `${days} calendar days`}
                      </Text>
                      <Text style={styles.monthCardPresent}>
                        {counts.present + counts.late}{" "}
                        <Text style={styles.monthCardSmall}>attendance</Text>
                      </Text>
                      <StatusBar counts={counts} total={days} />
                      <Text style={styles.monthCardLegend}>
                        A {counts.absent} · L {counts.late} · Lv {counts.leave}
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
        visible={selectionPicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectionPicker(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select {selectionPicker}</Text>
              <Pressable onPress={() => setSelectionPicker(null)}>
                <Text style={styles.closePicker}>×</Text>
              </Pressable>
            </View>
            <TextInput
              value={selectionSearch}
              onChangeText={setSelectionSearch}
              placeholder={`Search ${selectionPicker}...`}
              style={styles.searchInput}
              autoCapitalize="words"
            />
            <ScrollView
              style={{ maxHeight: 400 }}
              keyboardShouldPersistTaps="handled"
            >
              {(selectionPicker === "employee"
                ? [
                    { value: "", label: "Blank / All Employees" },
                    ...employees.map((item) => ({
                      value: item.employeeCode,
                      label: `${item.name} (${item.employeeCode})`,
                    })),
                  ]
                : selectionPicker === "designation"
                  ? [
                      { value: "", label: "All designations" },
                      ...[
                        ...new Set(employees.map((item) => item.designation)),
                      ].map((value) => ({ value, label: value })),
                    ]
                  : [
                      { value: "", label: "All departments" },
                      ...[
                        ...new Set(employees.map((item) => item.department)),
                      ].map((value) => ({ value, label: value })),
                    ]
              )
                .filter((item) =>
                  item.label
                    .toLowerCase()
                    .includes(selectionSearch.trim().toLowerCase()),
                )
                .map((item) => (
                  <Pressable
                    key={item.value}
                    style={styles.selectionOption}
                    onPress={() => chooseSelection(item.value)}
                  >
                    <Text style={styles.selectionOptionText}>{item.label}</Text>
                  </Pressable>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <CustomDateRangePicker
        visible={calendarVisible}
        target={calendarTarget}
        selectedDate={calendarTarget === "from" ? fromDate : toDate}
        minimumDate={customRangeMinimumDate}
        maximumDate={formatDate(now)}
        onClose={() => setCalendarVisible(false)}
        onSelect={chooseCalendarDate}
      />
    </SafeAreaView>
  );
}

function AttendanceTable({
  rows,
  loading,
}: {
  rows: DailyAttendance[];
  loading: boolean;
}) {
  if (loading)
    return <ActivityIndicator style={styles.loading} color={COLORS.green} />;
  if (rows.length === 0) {
    return (
      <Text style={styles.emptyState}>
        No attendance dates are available for this range.
      </Text>
    );
  }

  return (
    <View style={styles.table}>
      <View style={styles.tableHead}>
        <Text style={styles.headText}>Date</Text>
        <Text style={styles.headText}>Status</Text>
        <Text style={styles.headText}>In / Out</Text>
      </View>
      {rows.map((row) => (
        <View key={row.attendanceDate} style={styles.tableRow}>
          <Text style={styles.cell}>
            {row.weekday},{" "}
            {new Date(`${row.attendanceDate}T00:00:00`).toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric" },
            )}
          </Text>
          <Text style={[styles.cell, { color: statusColor(row.status) }]}>
            {row.status}
          </Text>
          <Text style={styles.cell}>
            {row.checkIn ?? "—"} / {row.checkOut ?? "—"}
          </Text>
        </View>
      ))}
    </View>
  );
}

function RangeMonthStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.rangeMonthStat}>
      <Text style={styles.rangeMonthStatLabel}>{label}</Text>
      <Text style={styles.rangeMonthStatValue}>{value}</Text>
    </View>
  );
}

function SearchableSelection({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.selectionField}
      accessibilityRole="button"
    >
      <Text style={styles.rangeCaption}>{label}</Text>
      <Text style={styles.selectionValue}>{value || "Select"} ▾</Text>
    </Pressable>
  );
}

function GroupSummaryTable({
  rows,
  fromDate,
  toDate,
  onOpenProfile,
  loading,
}: {
  rows: { employee: Employee; counts: AttendanceCounts; percentage: number }[];
  fromDate: string;
  toDate: string;
  onOpenProfile: (employeeCode: string) => void;
  loading: boolean;
}) {
  if (loading)
    return <ActivityIndicator style={styles.loading} color={COLORS.green} />;
  if (!rows.length)
    return <Text style={styles.emptyState}>No matching employees found.</Text>;
  const from = parseDate(fromDate);
  const to = parseDate(toDate);
  const month =
    from &&
    to &&
    from.getMonth() === to.getMonth() &&
    from.getFullYear() === to.getFullYear()
      ? from.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : from && to
        ? `${from.toLocaleDateString("en-US", { month: "short", year: "numeric" })} – ${to.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
        : "—";
  const dateRange = `${formatDateLabel(fromDate)} – ${formatDateLabel(toDate)}`;
  const columnWidths = [105, 160, 120, 190, 65, 65, 75, 65, 90];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View style={styles.groupTable}>
        <View style={[styles.groupTableRow, styles.groupTableHead]}>
          {[
            "Employee ID",
            "Employee Name",
            "Month",
            "Applied Date Range",
            "Total",
            "Late",
            "Present",
            "Leave",
            "Attendance",
          ].map((heading, index) => (
            <Text
              key={heading}
              style={[
                styles.groupTableCell,
                styles.groupTableHeadText,
                { width: columnWidths[index] },
              ]}
            >
              {heading}
            </Text>
          ))}
        </View>
        {rows.map(({ employee: person, counts, percentage }) => {
          const total =
            counts.present + counts.late + counts.absent + counts.leave;
          const values: (string | number)[] = [
            person.employeeCode,
            person.name,
            month,
            dateRange,
            total,
            counts.late,
            counts.present,
            counts.leave,
            `${percentage}%`,
          ];
          return (
            <View key={person.employeeCode} style={styles.groupTableRow}>
              {values.map((value, index) => (
                <View
                  key={`${person.employeeCode}-${index}`}
                  style={[
                    styles.groupTableCell,
                    { width: columnWidths[index] },
                  ]}
                >
                  {index === 1 ? (
                    <Pressable
                      onPress={() => onOpenProfile(person.employeeCode)}
                      accessibilityRole="link"
                    >
                      <Text style={styles.groupName}>{value}</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.groupCellText}>{value}</Text>
                  )}
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function buildDateRangeDetails(
  fromDate: string,
  toDate: string,
  joiningDate: string,
  rows: Attendance[],
  holidays: CompanyHoliday[],
  asOfDate: Date,
): DailyAttendance[] {
  const from = parseDate(fromDate);
  const to = parseDate(toDate);
  if (!from || !to || from > to) return [];

  const details: DailyAttendance[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const endMonth = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= endMonth) {
    const monthDetails = buildDailyAttendanceDetails(
      cursor.getFullYear(),
      cursor.getMonth(),
      joiningDate,
      rows.filter((row) =>
        row.attendanceDate.startsWith(
          `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
        ),
      ),
      holidays.filter((holiday) =>
        holiday.attendanceDate.startsWith(
          `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
        ),
      ),
      asOfDate,
    );
    details.push(
      ...monthDetails.filter(
        (row) => row.attendanceDate >= fromDate && row.attendanceDate <= toDate,
      ),
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return details;
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
    ? parsed
    : null;
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getCurrentMonthRange() {
  const today = new Date();
  return {
    from: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: formatDate(today),
  };
}

function isRangeWithinOneMonth(fromDate: string, toDate: string) {
  const from = parseDate(fromDate);
  const to = parseDate(toDate);
  if (!from || !to || from > to) return false;
  return (to.getTime() - from.getTime()) / 86_400_000 <= 31;
}

function formatDateLabel(value: string) {
  const date = parseDate(value);
  return date?.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
      <Text
        style={[
          styles.modeButtonText,
          selected && styles.modeButtonTextSelected,
        ]}
      >
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
      <Text style={[styles.metricCount, { color: statusColor(label) }]}>
        {count}
      </Text>
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

type StatusTone =
  | "neutral"
  | "present"
  | "absent"
  | "late"
  | "leave"
  | "holiday"
  | "weekend"
  | "unrecorded";

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
          { backgroundColor: COLORS.orange, flex: counts.late },
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
          { backgroundColor: COLORS.gold, flex: counts.leave },
        ]}
      />
      <View
        style={[
          styles.statusSegment,
          { backgroundColor: COLORS.purple, flex: counts.holiday },
        ]}
      />
      <View
        style={[
          styles.statusSegment,
          { backgroundColor: COLORS.blue, flex: counts.weekend },
        ]}
      />
      <View
        style={[
          styles.statusSegment,
          { backgroundColor: COLORS.track, flex: counts.notRecorded },
        ]}
      />
    </View>
  );
}

function statusColor(status: string) {
  if (status === "Present") return COLORS.green;
  if (status === "Absent") return COLORS.red;
  if (status === "Late") return COLORS.orange;
  if (status === "Leave") return COLORS.gold;
  if (status === "Holiday") return COLORS.purple;
  if (status === "Weekend") return COLORS.blue;
  return COLORS.neutral;
}

function statusSoftColor(status: string) {
  if (status === "Present") return "#E4F3E9";
  if (status === "Absent") return "#FCEAEA";
  if (status === "Late") return "#FFF0E1";
  if (status === "Leave") return "#FFF6D9";
  if (status === "Holiday") return "#F0EAFE";
  if (status === "Weekend") return "#E8F2FC";
  return "#EEF1F3";
}

function toneColor(tone: StatusTone) {
  if (tone === "neutral") return "#94A39A";
  if (tone === "present") return COLORS.green;
  if (tone === "absent") return COLORS.red;
  if (tone === "late") return COLORS.orange;
  if (tone === "leave") return COLORS.gold;
  if (tone === "holiday") return COLORS.purple;
  if (tone === "weekend") return COLORS.blue;
  return COLORS.neutral;
}

const COLORS = {
  green: "#176B45",
  red: "#C94C4C",
  orange: "#D97706",
  gold: "#C99519",
  purple: "#7955B8",
  blue: "#3478B8",
  neutral: "#84918A",
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
  rangeCard: {
    marginHorizontal: 18,
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#DCE7DF",
  },
  rangeTitle: {
    color: "#17352B",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  selectionField: {
    minHeight: 52,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE7DF",
    justifyContent: "center",
    marginBottom: 8,
  },
  selectionValue: {
    color: "#17352B",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  resetFilters: { alignSelf: "center", paddingVertical: 8 },
  resetFiltersText: { color: COLORS.green, fontSize: 12, fontWeight: "800" },
  searchInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#DCE7DF",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    color: "#17352B",
  },
  selectionOption: {
    minHeight: 44,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EFF3F0",
  },
  selectionOptionText: { color: "#17352B", fontSize: 14 },
  groupTable: {
    minWidth: 935,
    borderRadius: 14,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#DCE7DF",
    overflow: "hidden",
  },
  groupTableRow: {
    flexDirection: "row",
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: "#EFF3F0",
  },
  groupTableHead: { backgroundColor: "#E9F2F8", borderTopWidth: 0 },
  groupTableCell: {
    flexShrink: 0,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  groupTableHeadText: { color: "#53655B", fontSize: 10, fontWeight: "800" },
  groupCellText: { color: "#35483D", fontSize: 10 },
  groupName: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  individualModeSwitch: {
    flexDirection: "row",
    alignSelf: "flex-end",
    marginHorizontal: 18,
    marginTop: 12,
    padding: 3,
    gap: 3,
    backgroundColor: "#E4EEE8",
    borderRadius: 16,
  },
  rangeFields: { flexDirection: "row", gap: 10 },
  rangeDate: {
    flex: 1,
    minHeight: 58,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE7DF",
    justifyContent: "center",
  },
  rangeDateApplied: { borderColor: "#176B45", backgroundColor: "#F1F8F3" },
  rangeCaption: { color: "#748078", fontSize: 10, fontWeight: "700" },
  rangeValue: {
    color: "#17352B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  pendingRangeText: {
    color: "#8A5B00",
    fontSize: 11,
    marginTop: 8,
    textAlign: "center",
  },
  applyRange: {
    marginTop: 10,
    minHeight: 42,
    backgroundColor: COLORS.green,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  applyRangeText: { color: "white", fontSize: 13, fontWeight: "800" },
  clearRange: { alignSelf: "center", paddingTop: 9 },
  clearRangeText: { color: COLORS.green, fontSize: 12, fontWeight: "700" },
  rangeMonthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  rangeMonthCard: {
    width: "48%",
    minWidth: 132,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DCE7DF",
    backgroundColor: "white",
  },
  rangeMonthTitle: {
    color: "#17352B",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },
  rangeMonthStat: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 5,
    paddingVertical: 3,
  },
  rangeMonthStatLabel: { color: "#53655B", fontSize: 10, flexShrink: 1 },
  rangeMonthStatValue: { color: "#17352B", fontSize: 10, fontWeight: "800" },
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
  totalValue: {
    fontSize: 29,
    fontWeight: "900",
    color: COLORS.green,
    marginTop: 1,
  },
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
  metricLabel: {
    marginTop: 2,
    color: "#42534A",
    fontSize: 11,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#17352B",
    marginTop: 20,
    marginBottom: 9,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: "#DCE7DF",
    borderRadius: 16,
    backgroundColor: "white",
    paddingHorizontal: 13,
  },
  summaryRow: {
    minHeight: 39,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EFF3F0",
  },
  summaryDot: { width: 9, height: 9, borderRadius: 5, marginRight: 10 },
  summaryLabel: { flex: 1, color: "#42534A", fontSize: 13 },
  summaryValue: { color: "#17352B", fontSize: 14, fontWeight: "800" },
  table: {
    borderRadius: 14,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#DCE7DF",
    overflow: "hidden",
  },
  tableHead: { flexDirection: "row", backgroundColor: "#E9F2F8", padding: 11 },
  headText: { flex: 1, fontSize: 11, fontWeight: "800", color: "#53655B" },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#EFF3F0",
  },
  cell: { flex: 1, fontSize: 11, color: "#35483D" },
  loading: { padding: 22 },
  emptyState: {
    padding: 24,
    textAlign: "center",
    color: "#66776F",
    fontSize: 13,
  },
  yearSelector: { gap: 8, paddingBottom: 14 },
  yearSelectorChip: {
    backgroundColor: "white",
    borderColor: "#DCE7DF",
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 18,
  },
  yearTotalCard: {
    backgroundColor: "#104B35",
    borderRadius: 22,
    padding: 20,
    elevation: 4,
    shadowColor: "#104B35",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  yearEyebrow: {
    color: "#C6DFD0",
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: "800",
  },
  yearHeading: {
    color: "white",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 2,
  },
  yearTotalDays: {
    color: "#F4D77F",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 10,
  },
  yearTotalCaption: { color: "white", fontSize: 14, fontWeight: "600" },
  yearSubline: { color: "#D9E9DF", fontSize: 12, marginTop: 2 },
  yearCounts: { flexDirection: "row", gap: 10, marginTop: 18 },
  yearCount: {
    flex: 1,
    borderRadius: 13,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  yearCountValue: { fontSize: 18, fontWeight: "900" },
  yearCountLabel: { fontSize: 10, color: "#E5EEE8", marginTop: 3 },
  yearLoading: { padding: 20 },
  yearGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  monthCardWrapper: { width: "48%" },
  monthCard: {
    minHeight: 148,
    borderRadius: 17,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#DCE7DF",
    padding: 12,
    elevation: 2,
    shadowColor: "#123528",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  monthCardDisabled: { opacity: 0.55, backgroundColor: "#F7F9F7" },
  monthCardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  monthCardTitle: { color: "#17352B", fontSize: 14, fontWeight: "800" },
  monthCardArrow: { color: COLORS.green, fontSize: 19, fontWeight: "700" },
  monthCardDays: { color: "#748078", fontSize: 10, marginTop: 4 },
  monthCardPresent: {
    color: COLORS.green,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 7,
  },
  monthCardSmall: { color: "#66776F", fontSize: 11, fontWeight: "600" },
  statusTrack: {
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: COLORS.track,
    marginTop: 8,
  },
  statusSegment: { height: 7 },
  monthCardLegend: { fontSize: 9, color: "#66776F", marginTop: 7 },
  disabledText: { color: "#9BA69F" },
  cardPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  pressed: { opacity: 0.75 },
  modalBackdrop: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.48)",
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
  pickerTitle: { color: "#17352B", fontSize: 17, fontWeight: "800" },
  closePicker: { fontSize: 26, color: "#64748B", paddingHorizontal: 6 },
  yearChipSelected: { backgroundColor: COLORS.green },
  yearText: { color: "#334155", fontWeight: "600" },
  yearTextSelected: { color: "white" },
});
