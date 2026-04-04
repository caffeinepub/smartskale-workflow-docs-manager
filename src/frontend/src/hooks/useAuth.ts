import { createContext, useContext } from "react";

export interface CredentialUser {
  username: string;
  password: string;
  role: "admin" | "member";
  profile: {
    name: string;
    jobTitle: string;
    department: string;
    email: string;
    phone: string;
    userRole: "Admin" | "Manager" | "Employee";
  };
}

// Hardcoded credentials — username is case-insensitive for matching.
// Passwords are compared at runtime; they live only in the compiled JS bundle.
export const CREDENTIALS: CredentialUser[] = [
  {
    username: "admin@smartskale.tech",
    password: "SmartSkale@26",
    role: "admin",
    profile: {
      name: "Admin",
      jobTitle: "System Administrator",
      department: "Management",
      email: "admin@smartskale.tech",
      phone: "",
      userRole: "Admin",
    },
  },
  {
    username: "ashray@smartskale.tech",
    password: "Ashray@26",
    role: "member",
    profile: {
      name: "Ashray",
      jobTitle: "Team Member",
      department: "Engineering",
      email: "ashray@smartskale.tech",
      phone: "",
      userRole: "Employee",
    },
  },
  {
    username: "rahul@smartskale.tech",
    password: "Rahul@26",
    role: "member",
    profile: {
      name: "Rahul",
      jobTitle: "Team Member",
      department: "Engineering",
      email: "rahul@smartskale.tech",
      phone: "",
      userRole: "Employee",
    },
  },
  {
    username: "kundan@smartskale.tech",
    password: "Kundan@26",
    role: "member",
    profile: {
      name: "Kundan",
      jobTitle: "Team Member",
      department: "Engineering",
      email: "Kundan@smartskale.tech",
      phone: "",
      userRole: "Employee",
    },
  },
  {
    username: "muzeeb@smartskale.tech",
    password: "Muzeeb@26",
    role: "member",
    profile: {
      name: "Muzeeb",
      jobTitle: "Team Member",
      department: "Engineering",
      email: "muzeeb@smartskale.tech",
      phone: "",
      userRole: "Employee",
    },
  },
  {
    username: "abhilasha@smartskale.tech",
    password: "SmartSkale@26",
    role: "member",
    profile: {
      name: "Abhilasha",
      jobTitle: "Team Member",
      department: "Engineering",
      email: "abhilasha@smartskale.tech",
      phone: "",
      userRole: "Employee",
    },
  },
  {
    username: "suraj@smartskale.tech",
    password: "Suraj@26",
    role: "member",
    profile: {
      name: "Suraj",
      jobTitle: "Team Member",
      department: "Engineering",
      email: "suraj@smartskale.tech",
      phone: "",
      userRole: "Employee",
    },
  },
];

const SESSION_KEY = "smartskale_session";

export interface AuthState {
  user: CredentialUser | null;
  isInitializing: boolean;
  isLoggingIn: boolean;
  loginError: string | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

export const AuthContext = createContext<AuthState>({
  user: null,
  isInitializing: true,
  isLoggingIn: false,
  loginError: null,
  login: () => false,
  logout: () => {},
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

// Utility: look up user by username (case-insensitive) and verify password.
export function findCredential(
  username: string,
  password: string,
): CredentialUser | null {
  const u = username.trim().toLowerCase();
  const match = CREDENTIALS.find(
    (c) => c.username.toLowerCase() === u && c.password === password,
  );
  return match ?? null;
}

export function getStoredSession(): CredentialUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { username?: string; password?: string };
    // Re-validate against CREDENTIALS so stale/malformed sessions are rejected.
    if (!parsed.username || !parsed.password) return null;
    return findCredential(parsed.username, parsed.password) ?? null;
  } catch {
    return null;
  }
}

export function saveSession(user: CredentialUser): void {
  // Store only the minimal fields needed to restore the session.
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ username: user.username, password: user.password }),
  );
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
