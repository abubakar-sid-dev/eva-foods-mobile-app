import assert from "node:assert/strict";
import {
  buildMonthRangeAttendanceDetails,
  summarizeAttendanceByMonth,
} from "../src/utils/attendance-calculations.ts";

const detail = (attendanceDate, status) => ({
  attendanceDate,
  weekday: "Mon",
  status,
  checkIn: status === "Present" || status === "Late" ? "09:00" : null,
  checkOut: status === "Present" || status === "Late" ? "17:00" : null,
  recorded: true,
});

const fullMonths = summarizeAttendanceByMonth(
  [detail("2026-01-05", "Present"), detail("2026-03-05", "Late")],
  "2026-01-01",
  "2026-03-31",
);
assert.deepEqual(
  fullMonths.map(({ monthKey }) => monthKey),
  ["2026-01", "2026-02", "2026-03"],
);
assert.equal(fullMonths[1].workingDays, 0);
assert.equal(fullMonths[1].percentage, 0);

const rangeSummaries = summarizeAttendanceByMonth(
  [
    detail("2026-01-14", "Absent"),
    detail("2026-01-15", "Present"),
    detail("2026-02-10", "Late"),
  ],
  "2026-01-15",
  "2026-03-10",
);

assert.deepEqual(
  rangeSummaries.map(({ monthKey }) => monthKey),
  ["2026-01", "2026-02", "2026-03"],
);
assert.equal(rangeSummaries[0].counts.present, 1);
assert.equal(rangeSummaries[0].counts.absent, 0);
assert.equal(rangeSummaries[0].percentage, 100);
assert.equal(rangeSummaries[1].counts.late, 1);
assert.equal(rangeSummaries[2].workingDays, 0);
assert.equal(rangeSummaries[2].percentage, 0);

const monthDetails = buildMonthRangeAttendanceDetails(
  2026,
  1,
  "2020-01-01",
  [
    {
      id: 1,
      employeeCode: "EMP-TEST",
      attendanceDate: "2026-02-09",
      checkIn: "09:00",
      checkOut: "17:00",
      status: "Present",
      workingHours: 8,
      lateMinutes: 0,
    },
    {
      id: 2,
      employeeCode: "EMP-TEST",
      attendanceDate: "2026-02-10",
      checkIn: "09:00",
      checkOut: "17:00",
      status: "Late",
      workingHours: 8,
      lateMinutes: 15,
    },
    {
      id: 3,
      employeeCode: "EMP-TEST",
      attendanceDate: "2026-02-21",
      checkIn: "09:00",
      checkOut: "17:00",
      status: "Present",
      workingHours: 8,
      lateMinutes: 0,
    },
  ],
  [],
  "2026-02-10",
  "2026-02-20",
  new Date(2026, 1, 28),
);

assert.ok(monthDetails.length > 0);
assert.ok(monthDetails.every((row) =>
  row.attendanceDate >= "2026-02-10" && row.attendanceDate <= "2026-02-20",
));
assert.equal(
  monthDetails.find((row) => row.attendanceDate === "2026-02-10")?.status,
  "Late",
);
assert.equal(
  monthDetails.some((row) => row.attendanceDate === "2026-02-09"),
  false,
);

console.log("Month range tests passed (multi-month, empty month, partial boundaries).");
