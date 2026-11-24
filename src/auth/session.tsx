import React, { createContext, useContext, useEffect, useState } from "react";
import { Employee, initializeDatabase } from "@/database/database";

type SessionContextValue = {
  employee: Employee | null;
  ready: boolean;
  signIn: (employee: Employee) => void;
  signOut: () => void;
};
const SessionContext = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    initializeDatabase()
      .then(() => setReady(true))
      .catch((error) => {
        console.error("Database initialization failed", error);
        setReady(true);
      });
  }, []);
  return (
    <SessionContext.Provider
      value={{
        employee,
        ready,
        signIn: setEmployee,
        signOut: () => setEmployee(null),
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
