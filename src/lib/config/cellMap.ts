/**
 * Field to workbook cell mapping.
 *
 * Every cell reference used by the Excel export lives in this file so that the
 * mapping can be reviewed and version-controlled independently of the code.
 *
 * Site-specific rows in `TQS FORM` follow a fixed pattern taken from the source
 * workbook: Track Details start at row 25 and OTM Details at row 48, each site
 * occupying four rows.
 */

export interface CellRef {
  sheet: "TQS FORM" | "TEF 3071 SITE _" | "TEF3207 SITE _";
  /** Column letters, e.g. "C" or "AA". */
  column: string;
  /** Row number for pack-level cells, or the row used by site 1. */
  row: number;
  /** Row increment applied per additional site (site-banded TQS FORM rows). */
  rowStep?: number;
}

export const TQS_PACK_CELLS: Record<string, CellRef> = {
  tgs: { sheet: "TQS FORM", column: "C", row: 2 },
  assistant: { sheet: "TQS FORM", column: "E", row: 2 },
  location: { sheet: "TQS FORM", column: "N", row: 2 },
  plannedWorksiteStart: { sheet: "TQS FORM", column: "E", row: 11 },
  plannedWorksiteEnd: { sheet: "TQS FORM", column: "G", row: 11 },
  actualWorksiteStart: { sheet: "TQS FORM", column: "E", row: 15 },
  actualWorksiteEnd: { sheet: "TQS FORM", column: "G", row: 15 },
  tgsComments: { sheet: "TQS FORM", column: "I", row: 8 },
  additionalWorksPostTamping: { sheet: "TQS FORM", column: "I", row: 14 },
  weekNo: { sheet: "TQS FORM", column: "C", row: 11 },
  day: { sheet: "TQS FORM", column: "C", row: 13 },
  date: { sheet: "TQS FORM", column: "C", row: 15 },
  itemNo: { sheet: "TQS FORM", column: "C", row: 17 },
  trackSectionManager: { sheet: "TQS FORM", column: "G", row: 42 },
  designApplied: { sheet: "TQS FORM", column: "E", row: 45 },
};

/** Track Details band: site 1 = rows 25-28, site 2 = rows 29-32, ... */
export const TQS_SITE_TRACK_CELLS: Record<string, CellRef> = {
  levelCrossing1Name: { sheet: "TQS FORM", column: "C", row: 25, rowStep: 4 },
  levelCrossing1Lxa: { sheet: "TQS FORM", column: "E", row: 25, rowStep: 4 },
  levelCrossing2Name: { sheet: "TQS FORM", column: "C", row: 27, rowStep: 4 },
  levelCrossing2Lxa: { sheet: "TQS FORM", column: "E", row: 27, rowStep: 4 },
  worksiteMileageFrom: { sheet: "TQS FORM", column: "G", row: 25, rowStep: 4 },
  worksiteMileageTo: { sheet: "TQS FORM", column: "I", row: 25, rowStep: 4 },
  tpatGupat: { sheet: "TQS FORM", column: "K", row: 25, rowStep: 4 },
  elr: { sheet: "TQS FORM", column: "M", row: 25, rowStep: 4 },
  trackId: { sheet: "TQS FORM", column: "M", row: 27, rowStep: 4 },
  line: { sheet: "TQS FORM", column: "O", row: 25, rowStep: 4 },
  plannedStartTampMileage: { sheet: "TQS FORM", column: "Q", row: 25, rowStep: 4 },
  plannedEndTampMileage: { sheet: "TQS FORM", column: "S", row: 25, rowStep: 4 },
  actualStartTampMileage: { sheet: "TQS FORM", column: "U", row: 25, rowStep: 4 },
  actualEndTampMileage: { sheet: "TQS FORM", column: "W", row: 25, rowStep: 4 },
  lineSpeed: { sheet: "TQS FORM", column: "Y", row: 25, rowStep: 4 },
};

/** OTM Details band: site 1 = rows 48-51, site 2 = rows 52-55, ... */
export const TQS_SITE_OTM_CELLS: Record<string, CellRef> = {
  machineType: { sheet: "TQS FORM", column: "B", row: 48, rowStep: 4 },
  headCode: { sheet: "TQS FORM", column: "D", row: 48, rowStep: 4 },
  preSdTop: { sheet: "TQS FORM", column: "I", row: 48, rowStep: 4 },
  preSdLine: { sheet: "TQS FORM", column: "I", row: 50, rowStep: 4 },
  designSdTop: { sheet: "TQS FORM", column: "K", row: 48, rowStep: 4 },
  designSdLine: { sheet: "TQS FORM", column: "K", row: 50, rowStep: 4 },
  postSdTop: { sheet: "TQS FORM", column: "M", row: 48, rowStep: 4 },
  postSdLine: { sheet: "TQS FORM", column: "M", row: 50, rowStep: 4 },
  maxSlue: { sheet: "TQS FORM", column: "O", row: 48, rowStep: 4 },
  maxLift: { sheet: "TQS FORM", column: "Q", row: 48, rowStep: 4 },
  stoneUsed: { sheet: "TQS FORM", column: "S", row: 48, rowStep: 4 },
  trackCat: { sheet: "TQS FORM", column: "U", row: 48, rowStep: 4 },
  railTemp: { sheet: "TQS FORM", column: "W", row: 48, rowStep: 4 },
  scUnits: { sheet: "TQS FORM", column: "Y", row: 48, rowStep: 4 },
};

/** TEF3071 worksheet cells (one worksheet per site, so no row stepping). */
export const TEF3071_CELLS: Record<string, CellRef> = {
  location: { sheet: "TEF 3071 SITE _", column: "F", row: 5 },
  elr: { sheet: "TEF 3071 SITE _", column: "P", row: 5 },
  line: { sheet: "TEF 3071 SITE _", column: "Z", row: 5 },
  trackId: { sheet: "TEF 3071 SITE _", column: "AL", row: 5 },
  mileageFrom: { sheet: "TEF 3071 SITE _", column: "F", row: 6 },
  mileageTo: { sheet: "TEF 3071 SITE _", column: "AC", row: 6 },
  publishedSpeed: { sheet: "TEF 3071 SITE _", column: "F", row: 7 },
  esrTsrProtected: { sheet: "TEF 3071 SITE _", column: "R", row: 7 },
  esrTsrSpeed: { sheet: "TEF 3071 SITE _", column: "AL", row: 7 },
  plannedOpeningSpeed: { sheet: "TEF 3071 SITE _", column: "F", row: 8 },
  partCompleted: { sheet: "TEF 3071 SITE _", column: "C", row: 21 },
  partCompletedBy: { sheet: "TEF 3071 SITE _", column: "O", row: 21 },
  inspectionDate: { sheet: "TEF 3071 SITE _", column: "H", row: 22 },
  inspectionTime: { sheet: "TEF 3071 SITE _", column: "Y", row: 22 },
  reopenSpeed: { sheet: "TEF 3071 SITE _", column: "O", row: 26 },
  tampingLeaderName: { sheet: "TEF 3071 SITE _", column: "E", row: 27 },
  tgsName: { sheet: "TEF 3071 SITE _", column: "M", row: 29 },
  tgsSignature: { sheet: "TEF 3071 SITE _", column: "AB", row: 29 },
  tgsSignatureDate: { sheet: "TEF 3071 SITE _", column: "AM", row: 29 },
  additionalWorks: { sheet: "TEF 3071 SITE _", column: "L", row: 31 },
  workEnteredIntoEllipse: { sheet: "TEF 3071 SITE _", column: "AE", row: 32 },
  smtName: { sheet: "TEF 3071 SITE _", column: "E", row: 33 },
  smtDate: { sheet: "TEF 3071 SITE _", column: "AH", row: 33 },
  preMaxVerticalSd: { sheet: "TEF 3071 SITE _", column: "N", row: 38 },
  preMaxLateralSd: { sheet: "TEF 3071 SITE _", column: "AL", row: 38 },
  postMaxTwist: { sheet: "TEF 3071 SITE _", column: "I", row: 70 },
  postMaxCrossLevelError: { sheet: "TEF 3071 SITE _", column: "I", row: 71 },
  postMaxVerticalSd: { sheet: "TEF 3071 SITE _", column: "AJ", row: 70 },
  postMaxLateralSd: { sheet: "TEF 3071 SITE _", column: "AJ", row: 71 },
  liftApplied: { sheet: "TEF 3071 SITE _", column: "Q", row: 72 },
  slueApplied: { sheet: "TEF 3071 SITE _", column: "AJ", row: 72 },
  designImplementedByName: { sheet: "TEF 3071 SITE _", column: "H", row: 87 },
  designImplementedByPost: { sheet: "TEF 3071 SITE _", column: "V", row: 87 },
  postWorkComments: { sheet: "TEF 3071 SITE _", column: "M", row: 90 },
  partBInspectionDate: { sheet: "TEF 3071 SITE _", column: "H", row: 92 },
  partBInspectionTime: { sheet: "TEF 3071 SITE _", column: "X", row: 92 },
  partBPlannedOpeningSpeed: { sheet: "TEF 3071 SITE _", column: "AM", row: 94 },
  partBMitigatedSpeed: { sheet: "TEF 3071 SITE _", column: "AM", row: 96 },
  partBReducedSpeed: { sheet: "TEF 3071 SITE _", column: "AM", row: 98 },
  partBTgsName: { sheet: "TEF 3071 SITE _", column: "E", row: 99 },
  partBSignature: { sheet: "TEF 3071 SITE _", column: "S", row: 99 },
};

/** Work-undertaken Y/N answers occupy column Y, rows 12-19 in worksheet order. */
export const TEF3071_WORK_TYPE_ROWS: Record<string, number> = {
  plainLineMeasurement: 12,
  plainLineDesign: 13,
  plainLineAtg: 14,
  dts: 15,
  scSingleMachine: 16,
  scMultipleMachines: 17,
  plainLineStoneblowing: 18,
  scStoneblowing: 19,
};
export const TEF3071_WORK_TYPE_COLUMN = "Y";

/** Post-work checklist answers occupy column AG, rows 74-86. */
export const TEF3071_CHECKLIST_ROWS: Record<string, number> = {
  trackDesign: 74,
  twist: 75,
  crossLevel: 76,
  verticalGeometry: 77,
  lateralGeometry: 78,
  voiding: 79,
  ballast: 80,
  stEquipment: 81,
  adjustmentSwitches: 82,
  conductorRail: 83,
  oleEquipment: 84,
  oleAdjustments: 85,
  designImplementation: 86,
};
export const TEF3071_CHECKLIST_COLUMN = "AG";

/** Work-in-progress ramp checks: ramp in rows 44-50, ramp out rows 53-59. */
export const TEF3071_RAMP_ROWS = {
  in: [44, 45, 46, 47, 48, 49, 50],
  out: [53, 54, 55, 56, 57, 58, 59],
} as const;

export const TEF3071_RAMP_COLUMNS: Record<string, string> = {
  designCant: "G",
  actualCant: "L",
  error: "Q",
  verticalDatum: "Y",
  structureClearance: "AE",
  passingClearance: "AK",
};

export const TEF3207_CELLS: Record<string, CellRef> = {
  disturbedState: { sheet: "TEF3207 SITE _", column: "C", row: 3 },
  recordDate: { sheet: "TEF3207 SITE _", column: "N", row: 3 },
  workUndertaken: { sheet: "TEF3207 SITE _", column: "E", row: 4 },
  siteRailTemperature: { sheet: "TEF3207 SITE _", column: "O", row: 4 },
  locationName: { sheet: "TEF3207 SITE _", column: "E", row: 7 },
  smtArea: { sheet: "TEF3207 SITE _", column: "M", row: 7 },
  elr: { sheet: "TEF3207 SITE _", column: "E", row: 9 },
  trackIdLine: { sheet: "TEF3207 SITE _", column: "G", row: 9 },
  line: { sheet: "TEF3207 SITE _", column: "I", row: 9 },
  pointNumbers: { sheet: "TEF3207 SITE _", column: "O", row: 9 },
  mileageFrom: { sheet: "TEF3207 SITE _", column: "F", row: 10 },
  mileageTo: { sheet: "TEF3207 SITE _", column: "L", row: 10 },
  comments: { sheet: "TEF3207 SITE _", column: "B", row: 56 },
  personInChargeName: { sheet: "TEF3207 SITE _", column: "F", row: 57 },
  personInChargeSignature: { sheet: "TEF3207 SITE _", column: "M", row: 57 },
  personInChargePost: { sheet: "TEF3207 SITE _", column: "D", row: 58 },
  supervisorDate: { sheet: "TEF3207 SITE _", column: "M", row: 58 },
  supervisorName: { sheet: "TEF3207 SITE _", column: "F", row: 60 },
  supervisorSignature: { sheet: "TEF3207 SITE _", column: "M", row: 61 },
};

/**
 * Tick boxes in TEF3207. The workbook records a lower case "a" (Wingdings
 * tick) in the cell next to the option label.
 */
export const TEF3207_TICK_CELLS: Record<string, Record<string, string>> = {
  trackType: {
    "PL-CWR": "D14",
    "S&C": "F14",
    "RT60/NR60 S&C": "J14",
    "PL-Jointed": "D16",
    "Rails in excess of 30m (on curve)": "H16",
    "Adj. switch": "K16",
  },
  railType: { BH: "N14", FB: "P14", CEN60: "N16" },
  sleeperType: {
    Concrete: "D19",
    G44: "F19",
    Wood: "H19",
    Steel: "K19",
    Composite: "N19",
  },
  sleeperSpacing: { "24-25": "D22", "26-27": "F22", "28-29": "H22", "30+": "K22" },
  curvature: {
    "Radius 350m or less": "I25",
    "Radius between 351m and 500m": "I26",
    "Radius between 501m and 800m": "I27",
    "Radius between 801m and 1500m": "I28",
    "Radius greater than 1500m (up to and including straight track)": "I29",
    "Curve transition": "I30",
    "Radius unknown": "I31",
  },
  lateralResistancePlates: {
    "No LRPs": "P25",
    "LRPs fitted and effective": "P26",
    "LRPs unfastened/loosened": "P27",
  },
  ballastType: { "non-Granite (Ash etc)": "P30", "Stone ballast": "P31" },
};

export const TEF3207_TICK_CHARACTER = "a";

/** CWR condition ticks occupy column H, jointed track ticks column P. */
export const TEF3207_CONDITION_CWR_COLUMN = "H";
export const TEF3207_CONDITION_JOINTED_COLUMN = "P";
export const TEF3207_CONDITION_FIRST_ROW = 36;

export function cellAddress(ref: CellRef, siteNumber = 1): string {
  const row = ref.rowStep ? ref.row + ref.rowStep * (siteNumber - 1) : ref.row;
  return `${ref.column}${row}`;
}
