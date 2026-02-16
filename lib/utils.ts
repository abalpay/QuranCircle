import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const WEAK_PASSWORD_PATTERNS = [
  "Password should be at least",
  "Password should contain at least one character of each",
];

export function formatAuthError(message: string): string {
  const isWeakPassword = WEAK_PASSWORD_PATTERNS.some((p) =>
    message.includes(p)
  );
  if (isWeakPassword) {
    return "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.";
  }
  return message;
}

export function generateShortCode(length = 6): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
