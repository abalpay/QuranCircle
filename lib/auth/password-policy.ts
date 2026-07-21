import { z } from "zod";

export const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.";

export const PASSWORD_REQUIREMENTS_DESCRIPTION =
  "Use at least 8 characters with uppercase and lowercase letters, a number, and a symbol.";

const ALLOWED_SYMBOLS = new Set(
  Array.from("!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~")
);

export function meetsPasswordRequirements(password: string) {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    Array.from(password).some((character) => ALLOWED_SYMBOLS.has(character))
  );
}

export function createPasswordSchema(message = PASSWORD_REQUIREMENTS_MESSAGE) {
  return z.string().refine(meetsPasswordRequirements, { message });
}
