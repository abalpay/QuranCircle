import "next/dist/compiled/server-only";
import { createHadithRepository } from "./repository-core";
import { readHadithJson } from "./production-read";

export { createHadithRepository, HADITH_PAGE_SIZE } from "./repository-core";
export const { getManifest, getIndex, getTopics, getTopicPage, getReader } = createHadithRepository({ readJson: readHadithJson });
