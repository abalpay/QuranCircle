import "next/dist/compiled/server-only";

export function isHadithEnabled(): boolean {
  return process.env.HADITH_READER_ENABLED === "true";
}
