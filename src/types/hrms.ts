export type Role = "Employee" | "HR" | "Admin";

export type Employee = {
  id: number;
  employeeCode: string;
  username: string;
  password: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  joiningDate: string;
  profileImage: string | null;
  role: Role;
};

export type AttendanceStatus = "Present" | "Absent" | "Late" | "Leave";

export type Attendance = {
  id: number;
  employeeCode: string;
  attendanceDate: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  workingHours: number;
  lateMinutes: number;
};

export type CompanyHoliday = {
  attendanceDate: string;
  name: string;
};

export type AuthenticationResult = {
  employee: Employee;
  credential: string | null;
};

export type ApiResponse<T> = {
  data: T;
  message?: string;
};
