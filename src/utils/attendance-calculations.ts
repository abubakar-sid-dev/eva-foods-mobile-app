import type { Attendance } from "@/database/database";

export type AttendanceCounts = {
  present: number;
  absent: number;
  late: number;
  leave: number;
};

export function getAttendanceCounts(rows: Attendance[]): AttendanceCounts {
  return {
    present: rows.filter((row) => row.status === "Present").length,
    absent: rows.filter((row) => row.status === "Absent").length,
    late: rows.filter((row) => row.status === "Late").length,
    leave: rows.filter((row) => row.status === "Leave").length,
  };
}

export function getApplicableCalendarDays(
  year: number,
  month: number,
  joiningDate: string,
  asOfDate: Date = new Date(),
) {
  const [joiningYear, joiningMonth, joiningDay] = joiningDate
    .split("-")
    .map(Number);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const joinedOn = new Date(joiningYear, joiningMonth - 1, joiningDay);
  const today = new Date(
    asOfDate.getFullYear(),
    asOfDate.getMonth(),
    asOfDate.getDate(),
  );
  const start = monthStart < joinedOn ? joinedOn : monthStart;
  const end = monthEnd > today ? today : monthEnd;

  if (start > end) return 0;

  const startUtc = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((endUtc - startUtc) / 86400000) + 1;
}
