import {
  getCompanyHolidaysForYear,
  getEmployeeAttendanceForYear,
  getAllEmployees,
  getAllAttendance,
  initializeDatabase,
  seedAttendance,
} from "@/database/database";
import type { Attendance, CompanyHoliday, Employee } from "@/types/hrms";

export interface AttendanceService {
  loadEmployeeYear(employeeCode: string, year: number): Promise<Attendance[]>;
  getCompanyHolidays(year: number): Promise<CompanyHoliday[]>;
  loadEmployees(): Promise<Employee[]>;
  loadAllAttendance(): Promise<Attendance[]>;
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
  async loadEmployees() {
    await initializeDatabase();
    return getAllEmployees();
  },
  async loadAllAttendance() {
    await initializeDatabase();
    await seedAttendance();
    return getAllAttendance();
  },
};

// Swap this implementation for the backend repository when API contracts exist.
export const attendanceService = demoAttendanceService;
