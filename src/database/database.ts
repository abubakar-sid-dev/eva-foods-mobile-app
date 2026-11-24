import type * as SQLite from "expo-sqlite";
import type { CompanyHoliday } from "@/utils/attendance-calculations";

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
export type Attendance = {
  id: number;
  employeeCode: string;
  attendanceDate: string;
  checkIn: string | null;
  checkOut: string | null;
  status: "Present" | "Absent" | "Late" | "Leave";
  workingHours: number;
  lateMinutes: number;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDatabase() {
  if (!dbPromise) {
    dbPromise = import("expo-sqlite").then(({ openDatabaseAsync }) =>
      openDatabaseAsync("eva_hrms.db"),
    );
  }

  return dbPromise;
}
const names = [
  "Muhammad Ali",
  "Ayesha Khan",
  "Ahmed Raza",
  "Fatima Noor",
  "Usman Malik",
  "Zainab Ahmed",
  "Hassan Shah",
  "Maryam Iqbal",
  "Bilal Hussain",
  "Sana Javed",
  "Omar Farooq",
  "Hira Sheikh",
  "Hamza Tariq",
  "Noor Fatima",
  "Danish Akram",
  "Iqra Siddiqui",
  "Saad Qureshi",
  "Mariam Aslam",
  "Taha Mahmood",
  "Laiba Yousuf",
];
const departments = [
  "Sales",
  "Human Resources",
  "Finance",
  "Production",
  "Quality Assurance",
  "Supply Chain",
  "Information Technology",
  "Marketing",
  "Operations",
  "Procurement",
];
const titles = [
  "Sales Executive",
  "HR Officer",
  "Accountant",
  "Production Supervisor",
  "Quality Inspector",
  "Supply Chain Officer",
  "Software Engineer",
  "Marketing Executive",
  "Operations Manager",
  "Procurement Officer",
];
const roles: Role[] = [
  "Employee",
  "Employee",
  "Employee",
  "Employee",
  "Employee",
  "Employee",
  "Employee",
  "HR",
  "Employee",
  "Admin",
];

export async function initializeDatabase() {
  if (!initializationPromise) {
    initializationPromise = initializeDatabaseInternal().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}

let initializationPromise: Promise<void> | null = null;

async function initializeDatabaseInternal() {
  const db = await getDatabase();
  await db.execAsync(`PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS Employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT, employeeCode TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL UNIQUE, department TEXT NOT NULL,
      designation TEXT NOT NULL, joiningDate TEXT NOT NULL, profileImage TEXT,
      role TEXT NOT NULL CHECK(role IN ('Employee','HR','Admin'))
    );
    CREATE TABLE IF NOT EXISTS Attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT, employeeCode TEXT NOT NULL,
      attendanceDate TEXT NOT NULL, checkIn TEXT, checkOut TEXT,
      status TEXT NOT NULL CHECK(status IN ('Present','Absent','Leave')),
      workingHours REAL NOT NULL DEFAULT 0, lateMinutes INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(employeeCode) REFERENCES Employees(employeeCode),
      UNIQUE(employeeCode, attendanceDate)
    );
    CREATE TABLE IF NOT EXISTS AppMetadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS CompanyHolidays (
      attendanceDate TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL
    );`);
  const todayString = formatDate(new Date());
  await db.runAsync(
    "UPDATE Employees SET joiningDate = ? WHERE joiningDate > ?",
    todayString,
    todayString,
  );
  await migrateAttendanceStatuses(db);
  await seedEmployees();
}

async function migrateAttendanceStatuses(db: SQLite.SQLiteDatabase) {
  const table = await db.getFirstAsync<{ sql: string | null }>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'Attendance'",
  );
  if (!table?.sql || table.sql.includes("'Late'")) return;

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      CREATE TABLE Attendance_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeCode TEXT NOT NULL,
        attendanceDate TEXT NOT NULL,
        checkIn TEXT,
        checkOut TEXT,
        status TEXT NOT NULL CHECK(status IN ('Present', 'Absent', 'Late', 'Leave')),
        workingHours REAL NOT NULL DEFAULT 0,
        lateMinutes INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(employeeCode) REFERENCES Employees(employeeCode),
        UNIQUE(employeeCode, attendanceDate)
      );
      INSERT INTO Attendance_new SELECT * FROM Attendance;
      DROP TABLE Attendance;
      ALTER TABLE Attendance_new RENAME TO Attendance;
    `);
  });
}

export async function seedEmployees() {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM Employees",
  );
  if ((existing?.count ?? 0) > 0) {
    return;
  }

  const today = new Date();
  const todayString = formatDate(today);
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < 100; i++) {
      const name = names[i % names.length];
      const suffix = String(i + 1).padStart(3, "0");
      const dept = departments[i % departments.length];
      const role = roles[i % roles.length];
      const plannedJoiningDate = `${2018 + (i % 9)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`;
      const joiningDate = plannedJoiningDate > todayString ? todayString : plannedJoiningDate;
      await db.runAsync(
        "INSERT INTO Employees (employeeCode, username, password, name, email, phone, department, designation, joiningDate, profileImage, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        `EMP-${1024 + i}`,
        `eva${suffix}`,
        "EVA@123",
        name,
        `employee${suffix}@evafoods.pk`,
        `+92${3000000000 + i}`,
        dept,
        titles[i % titles.length],
        joiningDate,
        null,
        role,
      );
    }
  });
}

let attendanceSeedPromise: Promise<void> | null = null;

export function seedAttendance() {
  if (!attendanceSeedPromise) {
    attendanceSeedPromise = seedAttendanceInternal().catch((error) => {
      attendanceSeedPromise = null;
      throw error;
    });
  }

  return attendanceSeedPromise;
}

async function seedAttendanceInternal() {
  const db = await getDatabase();
  const seeded = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM AppMetadata WHERE key = ?",
    "attendance_history_v1",
  );
  if (seeded?.value === "complete") return;

  const employees = await db.getAllAsync<Pick<Employee, "employeeCode" | "joiningDate">>(
    "SELECT employeeCode, joiningDate FROM Employees",
  );
  const today = new Date();
  const todayString = formatDate(today);

  await db.withTransactionAsync(async () => {
    for (const employee of employees) {
      const startDate = new Date(`${employee.joiningDate}T00:00:00`);
      const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      let batch: (string | number | null)[] = [];

      const insertBatch = async () => {
        if (batch.length === 0) return;
        const rowCount = batch.length / 7;
        const placeholders = Array.from(
          { length: rowCount },
          () => "(?, ?, ?, ?, ?, ?, ?)",
        ).join(", ");
        await db.runAsync(
          `INSERT OR IGNORE INTO Attendance
            (employeeCode, attendanceDate, checkIn, checkOut, status, workingHours, lateMinutes)
           VALUES ${placeholders}`,
          batch,
        );
        batch = [];
      };

      while (formatDate(date) <= todayString) {
        const weekday = date.getDay();
        if (weekday !== 0 && weekday !== 6) {
          const dateKey = formatDate(date);
          const daySeed = Math.floor(date.getTime() / 86400000);
          const employeeSeed = Number(employee.employeeCode.slice(-4));
          const seed = (employeeSeed * 17 + daySeed * 13) % 100;
          const status = seed < 5 ? "Leave" : seed < 13 ? "Absent" : seed < 23 ? "Late" : "Present";
          const lateMinutes = status === "Late" ? 10 + (seed % 6) * 5 : 0;
          const checkIn = status === "Present" || status === "Late"
            ? status === "Late" ? `09:${String((seed * 3) % 60).padStart(2, "0")}` : `08:${String((seed * 3) % 60).padStart(2, "0")}`
            : null;
          const checkOut = checkIn ? `17:${String((seed * 7) % 60).padStart(2, "0")}` : null;
          const workingHours = checkIn ? Math.round((8 - lateMinutes / 60) * 10) / 10 : 0;

          batch.push(
            employee.employeeCode,
            dateKey,
            checkIn,
            checkOut,
            status,
            workingHours,
            lateMinutes,
          );
          if (batch.length >= 700) await insertBatch();
        }

        date.setDate(date.getDate() + 1);
      }
      await insertBatch();
    }
    await db.runAsync(
      "INSERT OR REPLACE INTO AppMetadata (key, value) VALUES (?, ?)",
      "attendance_history_v1",
      "complete",
    );
  });
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export async function getAllEmployees() {
  return (await getDatabase()).getAllAsync<Employee>(
    "SELECT * FROM Employees ORDER BY id",
  );
}
export async function getEmployeeByUsername(username: string) {
  return (await getDatabase()).getFirstAsync<Employee>(
    "SELECT * FROM Employees WHERE username = ?",
    username.trim().toLowerCase(),
  );
}
export async function getEmployeeByCode(employeeCode: string) {
  return (await getDatabase()).getFirstAsync<Employee>(
    "SELECT * FROM Employees WHERE employeeCode = ?",
    employeeCode,
  );
}
export async function getEmployeeAttendance(
  employeeCode: string,
  year: number,
  month: number,
) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}%`;
  return (await getDatabase()).getAllAsync<Attendance>(
    `SELECT * FROM Attendance
     WHERE employeeCode = ?
       AND attendanceDate LIKE ?
       AND attendanceDate >= (SELECT joiningDate FROM Employees WHERE employeeCode = ?)
       AND attendanceDate <= date('now', 'localtime')
     ORDER BY attendanceDate`,
    employeeCode,
    prefix,
    employeeCode,
  );
}

export async function getEmployeeAttendanceForYear(
  employeeCode: string,
  year: number,
) {
  const yearPrefix = `${year}-%`;
  return (await getDatabase()).getAllAsync<Attendance>(
    `SELECT * FROM Attendance
     WHERE employeeCode = ?
       AND attendanceDate LIKE ?
       AND attendanceDate >= (SELECT joiningDate FROM Employees WHERE employeeCode = ?)
       AND attendanceDate <= date('now', 'localtime')
     ORDER BY attendanceDate`,
    employeeCode,
    yearPrefix,
    employeeCode,
  );
}

/** Returns only explicitly configured company holidays; none are assumed. */
export async function getCompanyHolidaysForYear(year: number) {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  return (await getDatabase()).getAllAsync<CompanyHoliday>(
    `SELECT attendanceDate, name FROM CompanyHolidays
     WHERE attendanceDate >= ? AND attendanceDate <= ?
     ORDER BY attendanceDate`,
    startDate,
    endDate,
  );
}

export async function getAllAttendance() {
  return (await getDatabase()).getAllAsync<Attendance>(
    "SELECT * FROM Attendance ORDER BY attendanceDate, employeeCode",
  );
}
export async function authenticate(username: string, password: string) {
  const employee = await getEmployeeByUsername(username);
  return employee?.password === password ? employee : null;
}
