import {
  getCompanyHolidaysForYear,
  getEmployeeAttendanceForYear,
  initializeDatabase,
  seedAttendance,
} from "@/database/database";
import type { Attendance, CompanyHoliday } from "@/types/hrms";

export interface AttendanceService {
  loadEmployeeYear(employeeCode: string, year: number): Promise<Attendance[]>;
  getCompanyHolidays(year: number): Promise<CompanyHoliday[]>;
}

const demoAttendanceService: AttendanceService = {
  async loadEmployeeYear(employeeCode, year) {
    await initializeDatabase();
    await seedAttendance();
    return getEmployeeAttendanceForYear(employeeCode, year);
  },
  async getCompanyHolidays(year) {
    await initializeDatabase();
    return getCompanyHolidaysForYear(year);
  },
};

// Swap this implementation for the backend repository when API contracts exist.
export const attendanceService = demoAttendanceService;
