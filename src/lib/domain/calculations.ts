import {
  TEF3207_CWR_CONDITIONS,
  TEF3207_JOINTED_CONDITIONS,
} from "@/lib/config/fields";
import type { SectionValues } from "./validation";

/**
 * Calculation helpers converted from the source spreadsheets into tested
 * application logic. Spreadsheet formulas are not evaluated client-side.
 */

/** TEF3071: worst (highest) recorded standard deviation for a site. */
export function maxStandardDeviation(values: (number | null | undefined)[]): number | null {
  const numbers = values.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (numbers.length === 0) return null;
  return Math.max(...numbers);
}

/**
 * TEF3071 Part B opening speed rule.
 * A `NO` answer in the post-work checklist is an unsatisfactory condition, so
 * the pack cannot declare the planned opening speed without mitigation.
 */
export function tef3071RequiresMitigation(values: SectionValues): boolean {
  return Object.entries(values).some(
    ([key, value]) => key.startsWith("checklist.") && String(value).toUpperCase() === "NO",
  );
}

export interface Tef3207Summary {
  trackKind: "cwr" | "jointed";
  /** Selected condition numbers, in ascending order. */
  selectedConditions: number[];
  /** Highest selected condition number: the governing disturbance category. */
  governingCondition: number | null;
  governingConditionText: string | null;
}

/**
 * TEF3207: the governing track condition is the highest numbered category
 * ticked for the applicable track kind. The source workbook records ticks only;
 * the critical rail temperature itself is obtained from NR/L2/TRK/001/mod14 and
 * is not calculated by the workbook.
 */
export function tef3207Summary(values: SectionValues): Tef3207Summary {
  const trackKind = values.conditionTrackKind === "jointed" ? "jointed" : "cwr";
  const prefix = `condition.${trackKind}.`;
  const selected = Object.entries(values)
    .filter(([key, value]) => key.startsWith(prefix) && value === true)
    .map(([key]) => Number(key.slice(prefix.length)))
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b);
  const governing = selected.length > 0 ? selected[selected.length - 1] : null;
  const list = trackKind === "cwr" ? TEF3207_CWR_CONDITIONS : TEF3207_JOINTED_CONDITIONS;
  return {
    trackKind,
    selectedConditions: selected,
    governingCondition: governing,
    governingConditionText: governing ? list[governing - 1] ?? null : null,
  };
}
