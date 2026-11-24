import {
  authenticate as authenticateFromSqlite,
  getEmployeeByUsername,
  initializeDatabase,
} from "@/database/database";
import type { Employee } from "@/types/hrms";

/**
 * Authentication boundary for the UI. Replace the demo implementation with
 * the FastAPI client when the backend is available.
 */
export interface AuthenticationService {
  authenticateWithPassword(username: string, password: string): Promise<Employee | null>;
  authenticateWithBiometricCredential(credential: string): Promise<Employee | null>;
}

/** Local demo only: biometric verification happens on-device before this call. */
export const authenticationService: AuthenticationService = {
  async authenticateWithPassword(username, password) {
    await initializeDatabase();
    return authenticateFromSqlite(username, password);
  },
  async authenticateWithBiometricCredential(credential) {
    // In this demo the protected value is only a username locator.
    // Production must exchange a backend-issued, revocable credential.
    await initializeDatabase();
    return getEmployeeByUsername(credential);
  },
};
