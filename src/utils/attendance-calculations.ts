import type { Attendance } from "@/database/database";

export type DailyStatus = Attendance["status"] | "Holiday" | "Weekend" | "Not Recorded";

export type DailyAttendance = {
  attendanceDate: string;
  weekday: string;
  status: DailyStatus;
  checkIn: string | null;
  checkOut: string | null;
  recorded: boolean;
};

export type CompanyHoliday = {
  attendanceDate: string;
  name: string;
};

export type AttendanceCounts = {
  present: number;
  absent: number;
  late: number;
  leave: number;
  holiday: number;
  weekend: number;
  notRecorded: number;
};

export function getAttendanceCounts(
  rows: Array<Pick<DailyAttendance, "status">>,
): AttendanceCounts {
  return {
    present: rows.filter((row) => row.status === "Present").length,
    absent: rows.filter((row) => row.status === "Absent").length,
    late: rows.filter((row) => row.status === "Late").length,
    leave: rows.filter((row) => row.status === "Leave").length,
    holiday: rows.filter((row) => row.status === "Holiday").length,
    weekend: rows.filter((row) => row.status === "Weekend").length,
    notRecorded: rows.filter((row) => row.status === "Not Recorded").length,
  };
}

/**
 * Builds a display-only calendar. Generated statuses are never written back to
 * SQLite; actual attendance rows always take precedence over calendar rules.
 */
export function buildDailyAttendanceDetails(
  year: number,
  month: number,
  joiningDate: string,
  attendanceRows: Attendance[],
  holidays: CompanyHoliday[] = [],
  asOfDate: Date = new Date(),
): DailyAttendance[] {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const joined = parseLocalDate(joiningDate);
  const today = new Date(
    asOfDate.getFullYear(),
    asOfDate.getMonth(),
    asOfDate.getDate(),
  );
  const start = monthStart < joined ? joined : monthStart;
  const end = monthEnd > today ? today : monthEnd;

  if (start > end) return [];

  const recordsByDate = new Map(
    attendanceRows.map((row) => [row.attendanceDate, row]),
  );
  const holidaysByDate = new Map(
    holidays.map((holiday) => [holiday.attendanceDate, holiday]),
  );
  const result: DailyAttendance[] = [];

  for (
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    date <= end;
    date.setDate(date.getDate() + 1)
  ) {
    const attendanceDate = formatLocalDate(date);
    const record = recordsByDate.get(attendanceDate);
    const holiday = holidaysByDate.get(attendanceDate);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const status: DailyStatus = record
      ? record.status
      : holiday
        ? "Holiday"
        : weekend
          ? "Weekend"
          : "Not Recorded";

    result.push({
      attendanceDate,
      weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
      status,
      checkIn: record?.checkIn ?? null,
      checkOut: record?.checkOut ?? null,
      recorded: Boolean(record),
    });
  }

  return result;
}

export function getApplicableCalendarDays(
  year: number,
  month: number,
  joiningDate: string,
  asOfDate: Date = new Date(),
) {
  return buildDailyAttendanceDetails(
    year,
    month,
    joiningDate,
    [],
    [],
    asOfDate,
  ).length;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
