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

function getSecureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error("maxExclusive must be a positive integer");
  }

  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure random generation is not available");
  }

  const random = new Uint8Array(1);
  const upperBound = 256 - (256 % maxExclusive);

  do {
    globalThis.crypto.getRandomValues(random);
  } while (random[0] >= upperBound);

  return random[0] % maxExclusive;
}

export function generateShortCode(length = 8): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(getSecureRandomInt(chars.length));
  }
  return result;
}
