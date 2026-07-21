import { describe, expect, it } from "vitest";
import {
  createPasswordSchema,
  meetsPasswordRequirements,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from "@/lib/auth/password-policy";

describe("password policy", () => {
  it.each([
    "shrt!1A",
    "NOLOWERCASE!1",
    "nouppercase!1",
    "NoNumber!",
    "NoSymbol1",
    "UnicodeSymbol1£",
  ])("rejects %s", (password) => {
    expect(meetsPasswordRequirements(password)).toBe(false);
    expect(createPasswordSchema().safeParse(password).error?.issues[0]?.message).toBe(
      PASSWORD_REQUIREMENTS_MESSAGE
    );
  });

  it.each(["Password!1", "Valid_Pass2", "Brackets[3]"])(
    "accepts %s",
    (password) => {
      expect(meetsPasswordRequirements(password)).toBe(true);
      expect(createPasswordSchema().safeParse(password).success).toBe(true);
    }
  );
});
