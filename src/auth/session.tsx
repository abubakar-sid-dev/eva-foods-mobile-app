import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, View } from "react-native";

import type { Employee } from "@/types/hrms";

export const SESSION_TIMEOUT_MS = 30 * 1000;

type SessionContextValue = {
  employee: Employee | null;
  ready: boolean;
  signIn: (employee: Employee) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [ready] = useState(true);
  const lastActivityAt = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signOut = useCallback(() => {
    lastActivityAt.current = 0;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setEmployee(null);
  }, []);

  const scheduleTimeout = useCallback(
    (delay = SESSION_TIMEOUT_MS) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        const remaining =
          SESSION_TIMEOUT_MS - (Date.now() - lastActivityAt.current);
        if (remaining <= 0) {
          signOut();
          return;
        }
        scheduleTimeout(remaining);
      }, delay);
    },
    [signOut],
  );

  const signIn = useCallback(
    (nextEmployee: Employee) => {
      lastActivityAt.current = Date.now();
      setEmployee(nextEmployee);
      scheduleTimeout();
    },
    [scheduleTimeout],
  );

  const recordActivity = useCallback(() => {
    if (!employee) return;
    lastActivityAt.current = Date.now();
    scheduleTimeout();
  }, [employee, scheduleTimeout]);

  useEffect(() => {
    if (!employee) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      return;
    }

    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;

      const remaining =
        SESSION_TIMEOUT_MS - (Date.now() - lastActivityAt.current);
      if (remaining <= 0) {
        signOut();
        return;
      }
      scheduleTimeout(remaining);
    });

    scheduleTimeout(
      Math.max(SESSION_TIMEOUT_MS - (Date.now() - lastActivityAt.current), 0),
    );

    return () => {
      subscription.remove();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [employee, scheduleTimeout, signOut]);

  return (
    <SessionContext.Provider value={{ employee, ready, signIn, signOut }}>
      <View style={{ flex: 1 }} onTouchStart={recordActivity}>
        {children}
      </View>
    </SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
