import {
  getCompanyHolidaysForYear,
  getEmployeeAttendance,
  getEmployeeAttendanceForYear,
  getAllEmployees,
  getAttendanceForEmployees,
  getAttendanceSummaryForEmployees,
  initializeDatabase,
  seedAttendance,
} from "@/database/database";
import type { Attendance, CompanyHoliday, Employee } from "@/types/hrms";

export interface AttendanceService {
  loadEmployeeMonth(
    employeeCode: string,
    year: number,
    month: number,
  ): Promise<Attendance[]>;
  loadEmployeeYear(employeeCode: string, year: number): Promise<Attendance[]>;
  getCompanyHolidays(year: number): Promise<CompanyHoliday[]>;
  loadEmployees(): Promise<Employee[]>;
  loadAttendanceForEmployees(
    employeeCodes: string[],
    fromDate: string,
    toDate: string,
  ): Promise<Attendance[]>;
  loadAttendanceSummaryForEmployees(
    employeeCodes: string[],
    fromDate: string,
    toDate: string,
  ): Promise<AttendanceSummary[]>;
}

export type AttendanceSummary = {
  employeeCode: string;
  present: number;
  late: number;
  absent: number;
  leave: number;
};

let employeesPromise: Promise<Employee[]> | null = null;
const companyHolidayCache = new Map<number, Promise<CompanyHoliday[]>>();
const filteredAttendanceCache = new Map<string, Promise<Attendance[]>>();
const attendanceSummaryCache = new Map<string, Promise<AttendanceSummary[]>>();

const demoAttendanceService: AttendanceService = {
  async loadEmployeeMonth(employeeCode, year, month) {
    await initializeDatabase();
    const monthNumber = String(month + 1).padStart(2, "0");
    const monthStart = `${year}-${monthNumber}-01`;
    const monthEnd = new Date(year, month + 1, 0).getDate();
    await seedAttendance(
      [employeeCode],
      monthStart,
      `${year}-${monthNumber}-${String(monthEnd).padStart(2, "0")}`,
    );
    return getEmployeeAttendance(employeeCode, year, month);
  },
  async loadEmployeeYear(employeeCode, year) {
    await initializeDatabase();
    await seedAttendance([employeeCode], `${year}-01-01`, `${year}-12-31`);
    return getEmployeeAttendanceForYear(employeeCode, year);
  },
  async getCompanyHolidays(year) {
    let request = companyHolidayCache.get(year);
    if (!request) {
      request = initializeDatabase()
        .then(() => getCompanyHolidaysForYear(year))
        .catch((error) => {
          companyHolidayCache.delete(year);
          throw error;
        });
      companyHolidayCache.set(year, request);
    }
    return request;
  },
  async loadEmployees() {
    if (!employeesPromise) {
      employeesPromise = initializeDatabase()
        .then(() => getAllEmployees())
        .catch((error) => {
          employeesPromise = null;
          throw error;
        });
    }
    return employeesPromise;
  },
  async loadAttendanceForEmployees(employeeCodes, fromDate, toDate) {
    if (!employeeCodes.length) return [];
    const key = `${[...employeeCodes].sort().join(",")}|${fromDate}|${toDate}`;
    const cached = filteredAttendanceCache.get(key);
    if (cached) {
      filteredAttendanceCache.delete(key);
      filteredAttendanceCache.set(key, cached);
      return cached;
    }

    const request = (async () => {
      await initializeDatabase();
      await seedAttendance(employeeCodes, fromDate, toDate);
      return getAttendanceForEmployees(employeeCodes, fromDate, toDate);
    })().catch((error) => {
      filteredAttendanceCache.delete(key);
      throw error;
    });
    filteredAttendanceCache.set(key, request);
    if (filteredAttendanceCache.size > 8) {
      const oldestKey = filteredAttendanceCache.keys().next().value;
      if (oldestKey) filteredAttendanceCache.delete(oldestKey);
    }
    return request;
  },
  async loadAttendanceSummaryForEmployees(employeeCodes, fromDate, toDate) {
    if (!employeeCodes.length) return [];
    const key = `${[...employeeCodes].sort().join(",")}|${fromDate}|${toDate}`;
    const cached = attendanceSummaryCache.get(key);
    if (cached) {
      attendanceSummaryCache.delete(key);
      attendanceSummaryCache.set(key, cached);
      return cached;
    }

    const request = (async () => {
      await initializeDatabase();
      await seedAttendance(employeeCodes, fromDate, toDate);
      return getAttendanceSummaryForEmployees(employeeCodes, fromDate, toDate);
    })().catch((error) => {
      attendanceSummaryCache.delete(key);
      throw error;
    });
    attendanceSummaryCache.set(key, request);
    if (attendanceSummaryCache.size > 8) {
      const oldestKey = attendanceSummaryCache.keys().next().value;
      if (oldestKey) attendanceSummaryCache.delete(oldestKey);
    }
    return request;
  },
};

// Swap this implementation for the backend repository when API contracts exist.
export const attendanceService = demoAttendanceService;
