import type { Locale } from "../index";
import { getPack } from "../registry";
import { en, type Strings } from "./en";

export type { Strings };
/** UI strings for a locale. A translated locale must be loaded first (src/i18n/registry.ts). */
export const strings = (locale: Locale): Strings => (locale === "en" ? en : getPack(locale).strings);
