/**
 * Field and section definitions derived from the source workbook
 * `TRACK QUALITY PACK.xlsx`. These declarations are the single source of truth
 * for form rendering, server-side validation and Excel cell mapping.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "time"
  | "select"
  | "yesno";

export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  options?: readonly string[];
  required?: boolean;
  help?: string;
  /** Field identifier this value is inherited from (shared data model). */
  sharedFrom?: string;
}

export interface FieldGroup {
  id: string;
  title: string;
  fields: readonly FieldDef[];
}

/** Option lists taken from the hidden `DATA` and `Sheet1` worksheets. */
export const OPTIONS = {
  tgs: [
    "C. GRANT",
    "J. CANNING",
    "L. PEARCE",
    "S. HANSON",
    "L. WELLS",
    "D. RUSSELL",
    "N. BEAUMONT",
    "N. McCABE",
    "G. HIRST",
  ],
  assistant: [
    "C. GRANT",
    "J. CANNING",
    "L. PEARCE",
    "S. HANSON",
    "L.WELLS",
    "D. RUSSELL",
    "N. BEAUMONT",
    "N. McCABE",
    "G. HIRST",
    "J. SESTER",
    "J. McGUIRE",
    "D. BAKER",
  ],
  yesNoNa: ["YES", "NO", "N/A"],
  yesNo: ["YES", "NO"],
  machineType: [
    "PL TAMPER",
    "S+C TAMPER",
    "TANDEM TAMP",
    "STONEBLOWER",
    "MULTI PURPOSE STONEBLOWER",
    "REGULATOR",
    "N/A",
  ],
  post: ["TGS", "STO", "TEAM LEADER", "WORKS DELIVERY SUPERVISOR"],
  trackSectionManager: [
    "CHOOSE TRACK SECTION MANAGER",
    "DONCASTER EAST TRACK SECTION MANAGER",
    "DONCASTER WEST TRACK SECTION MANAGER",
    "GRANTHAM TRACK SECTION MANAGER",
  ],
  lineSpeed: Array.from({ length: 30 }, (_, i) => String((i + 1) * 5)),
} as const;

/* -------------------------------------------------------------------------- */
/* TQS Form                                                                    */
/* -------------------------------------------------------------------------- */

export const TQS_PACK_GROUPS: readonly FieldGroup[] = [
  {
    id: "header",
    title: "Pack header",
    fields: [
      { id: "tgs", label: "TGS", type: "select", options: OPTIONS.tgs, required: true },
      { id: "assistant", label: "Assist", type: "select", options: OPTIONS.assistant },
      { id: "location", label: "Location", type: "text", required: true },
    ],
  },
  {
    id: "workTime",
    title: "Work time",
    fields: [
      { id: "weekNo", label: "Week No", type: "text" },
      { id: "day", label: "Day", type: "text" },
      { id: "date", label: "Date", type: "date", required: true },
      { id: "itemNo", label: "Item No", type: "text" },
      { id: "plannedWorksiteStart", label: "Planned worksite start", type: "time" },
      { id: "plannedWorksiteEnd", label: "Planned worksite ended", type: "time" },
      { id: "actualWorksiteStart", label: "Actual worksite start", type: "time" },
      { id: "actualWorksiteEnd", label: "Actual worksite ended", type: "time" },
      { id: "tgsComments", label: "TGS comments", type: "textarea" },
      {
        id: "additionalWorksPostTamping",
        label: "Additional works post tamping",
        type: "textarea",
      },
    ],
  },
  {
    id: "otmShared",
    title: "OTM details (pack level)",
    fields: [
      {
        id: "trackSectionManager",
        label: "Track section manager",
        type: "select",
        options: OPTIONS.trackSectionManager,
      },
      { id: "designApplied", label: "Design?", type: "select", options: OPTIONS.yesNo },
    ],
  },
];

export const TQS_SITE_GROUPS: readonly FieldGroup[] = [
  {
    id: "trackDetails",
    title: "Track details",
    fields: [
      { id: "levelCrossing1Name", label: "Level crossing 1 - name", type: "text" },
      {
        id: "levelCrossing1Lxa",
        label: "Level crossing 1 - LXA",
        type: "select",
        options: OPTIONS.yesNoNa,
      },
      { id: "levelCrossing2Name", label: "Level crossing 2 - name", type: "text" },
      {
        id: "levelCrossing2Lxa",
        label: "Level crossing 2 - LXA",
        type: "select",
        options: OPTIONS.yesNoNa,
      },
      { id: "worksiteMileageFrom", label: "Worksite mileage from", type: "text", required: true },
      { id: "worksiteMileageTo", label: "Worksite mileage to", type: "text", required: true },
      { id: "tpatGupat", label: "TPAT / GUPAT", type: "text" },
      { id: "elr", label: "ELR", type: "text", required: true },
      { id: "trackId", label: "Track ID(s)", type: "text", required: true },
      { id: "line", label: "Line", type: "text", required: true },
      { id: "plannedStartTampMileage", label: "Planned start tamp mileage", type: "text" },
      { id: "plannedEndTampMileage", label: "Planned end tamp mileage", type: "text" },
      { id: "actualStartTampMileage", label: "Actual start tamp mileage", type: "text" },
      { id: "actualEndTampMileage", label: "Actual end tamp mileage", type: "text" },
      {
        id: "lineSpeed",
        label: "Line speed (mph)",
        type: "select",
        options: OPTIONS.lineSpeed,
        required: true,
      },
    ],
  },
  {
    id: "otmDetails",
    title: "OTM details",
    fields: [
      {
        id: "machineType",
        label: "Machine type",
        type: "select",
        options: OPTIONS.machineType,
      },
      { id: "headCode", label: "Head code", type: "text" },
      { id: "preSdTop", label: "Pre SD - TOP", type: "number" },
      { id: "preSdLine", label: "Pre SD - LINE", type: "number" },
      { id: "designSdTop", label: "Design SD - TOP", type: "number" },
      { id: "designSdLine", label: "Design SD - LINE", type: "number" },
      { id: "postSdTop", label: "Post SD - TOP", type: "number" },
      { id: "postSdLine", label: "Post SD - LINE", type: "number" },
      { id: "maxSlue", label: "Max slue (mm)", type: "number" },
      { id: "maxLift", label: "Max lift (mm)", type: "number" },
      { id: "stoneUsed", label: "Stone used", type: "text" },
      { id: "trackCat", label: "Track cat", type: "text" },
      { id: "railTemp", label: "Rail temp (°C)", type: "number" },
      { id: "scUnits", label: "S+C units / point No(s)", type: "text" },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* TEF3071 (per site)                                                          */
/* -------------------------------------------------------------------------- */

export const TEF3071_WORK_TYPES = [
  { id: "plainLineMeasurement", label: "Plain line tamping; measurement and compensation method", part: "Part B" },
  { id: "plainLineDesign", label: "Plain line tamping; applying a design", part: "Part B" },
  { id: "plainLineAtg", label: "Plain line tamping; absolute track geometry (ATG) location", part: "LNW ATG forms to be used" },
  { id: "dts", label: "DTS", part: "Part B" },
  { id: "scSingleMachine", label: "S&C tamping; single machine", part: "Part B (for each affected TID)" },
  { id: "scMultipleMachines", label: "S&C tamping; multiple machines", part: "Part B (for each affected TID)" },
  { id: "plainLineStoneblowing", label: "Plain line stoneblowing", part: "Part B" },
  { id: "scStoneblowing", label: "S&C stoneblowing with multi-purpose stoneblower", part: "Part C (for each affected TID)" },
] as const;

export const TEF3071_CHECKLIST = [
  { id: "trackDesign", label: "Track design", detail: "Designed with lifts and slues that comply with design limits for the opening speed" },
  { id: "twist", label: "Twist", detail: "Track is free of 3m twists that equal or exceed 10mm (1 in 300 or worse)" },
  { id: "crossLevel", label: "Cross level", detail: "Track is within maintenance tolerance for the planned opening speed" },
  { id: "verticalGeometry", label: "Vertical track geometry", detail: "Peak running 35m vertical SD is below the maximum band value for the planned opening speed" },
  { id: "lateralGeometry", label: "Lateral track geometry", detail: "Peak running 35m lateral SD is below the maximum band value for the planned opening speed" },
  { id: "voiding", label: "Voiding", detail: "Any voiding is within maintenance limits" },
  { id: "ballast", label: "Ballast", detail: "Ballast is topped-up and boxed-in to full profile" },
  { id: "stEquipment", label: "S&T equipment", detail: "S&T components are free from damage and securely attached" },
  { id: "adjustmentSwitches", label: "Adjustment switches", detail: "Adjustment switch rail tips and cut-outs are correctly supported and rail straps are secure" },
  { id: "conductorRail", label: "Conductor rail", detail: "Conductor rail checked and undamaged" },
  { id: "oleEquipment", label: "OLE equipment", detail: "Bonds and bond connections to track are not damaged" },
  { id: "oleAdjustments", label: "OLE adjustments", detail: "Have planned OLE adjustments and measurements been completed?" },
  { id: "designImplementation", label: "Design implementation", detail: "Was a design implemented by someone other than the TQS?" },
] as const;

export const TEF3071_RAMP_POSITIONS = ["0m", "5m", "10m", "15m", "20m", "25m", "30m"] as const;

/** Columns captured for each work-in-progress ramp check row. */
export const TEF3071_RAMP_COLUMNS: readonly {
  id: string;
  label: string;
  type: FieldType;
  options?: readonly string[];
}[] = [
  { id: "designCant", label: "Design cant", type: "number" },
  { id: "actualCant", label: "Actual cant", type: "number" },
  { id: "error", label: "Error [+/-]", type: "number" },
  { id: "verticalDatum", label: "Vertical datum [+/-]", type: "text" },
  { id: "structureClearance", label: "Structure clearance", type: "select", options: OPTIONS.yesNoNa },
  { id: "passingClearance", label: "Passing clearance", type: "select", options: OPTIONS.yesNoNa },
];

export const TEF3071_GROUPS: readonly FieldGroup[] = [
  {
    id: "locationDetail",
    title: "Part A - Location detail",
    fields: [
      { id: "location", label: "Location", type: "text", sharedFrom: "pack.location" },
      { id: "elr", label: "ELR", type: "text", sharedFrom: "site.elr" },
      { id: "line", label: "Line(s)", type: "text", sharedFrom: "site.line" },
      { id: "trackId", label: "Track ID(s)", type: "text", sharedFrom: "site.trackId" },
      { id: "mileageFrom", label: "Mileage from", type: "text", sharedFrom: "site.actualStartTampMileage" },
      { id: "mileageTo", label: "Mileage to", type: "text", sharedFrom: "site.actualEndTampMileage" },
      { id: "publishedSpeed", label: "Published speed (PSR)", type: "text", sharedFrom: "site.lineSpeed" },
      { id: "esrTsrProtected", label: "Site protected by ESR/TSR?", type: "select", options: OPTIONS.yesNo },
      { id: "esrTsrSpeed", label: "If yes, what speed? (mph)", type: "text" },
      { id: "plannedOpeningSpeed", label: "Planned opening line speed", type: "text", sharedFrom: "site.lineSpeed" },
    ],
  },
  {
    id: "partASignOff",
    title: "Part A - Sign off",
    fields: [
      { id: "partCompleted", label: "Part completed", type: "text" },
      { id: "partCompletedBy", label: "Completed by (name)", type: "text", sharedFrom: "pack.tgs" },
      { id: "inspectionDate", label: "Date of inspection", type: "date", sharedFrom: "pack.date" },
      { id: "inspectionTime", label: "Time of inspection", type: "time", sharedFrom: "pack.actualWorksiteEnd" },
      { id: "reopenSpeed", label: "Track safe to re-open at (mph)", type: "text", sharedFrom: "site.lineSpeed" },
      { id: "tampingLeaderName", label: "Tamping leader (name) - ATG routes", type: "text" },
      { id: "tgsName", label: "TGS (name)", type: "text", sharedFrom: "pack.tgs" },
      { id: "tgsSignature", label: "TGS signature", type: "text" },
      { id: "tgsSignatureDate", label: "TGS signature date", type: "date", sharedFrom: "pack.date" },
      { id: "additionalWorks", label: "Additional work required", type: "textarea", sharedFrom: "pack.additionalWorksPostTamping" },
      { id: "workEnteredIntoEllipse", label: "Work entered into Ellipse?", type: "select", options: OPTIONS.yesNo },
      { id: "smtName", label: "Name of SM[T]", type: "text" },
      { id: "smtDate", label: "SM[T] date", type: "date" },
    ],
  },
  {
    id: "preWork",
    title: "Part B - Pre-work site record",
    fields: [
      { id: "preMaxVerticalSd", label: "Maximum recorded 35m vertical SD value", type: "number", sharedFrom: "site.preSdTop" },
      { id: "preMaxLateralSd", label: "Maximum recorded 35m lateral SD value", type: "number", sharedFrom: "site.preSdLine" },
    ],
  },
  {
    id: "postWork",
    title: "Part B - Post-work site record",
    fields: [
      { id: "postMaxTwist", label: "Maximum twist (mm)", type: "number" },
      { id: "postMaxCrossLevelError", label: "Maximum cross level error (mm)", type: "number" },
      { id: "postMaxVerticalSd", label: "Maximum recorded 35m vertical SD value", type: "number", sharedFrom: "site.postSdTop" },
      { id: "postMaxLateralSd", label: "Maximum recorded 35m lateral SD value", type: "number", sharedFrom: "site.postSdLine" },
      { id: "liftApplied", label: "Amount of lift applied (mm)", type: "number", sharedFrom: "site.maxLift" },
      { id: "slueApplied", label: "Amount of slue applied (mm)", type: "number", sharedFrom: "site.maxSlue" },
      { id: "designImplementedByName", label: "Design implemented by (name)", type: "text" },
      { id: "designImplementedByPost", label: "Post", type: "select", options: OPTIONS.post },
      { id: "postWorkComments", label: "Comments (mitigation / additional works)", type: "textarea", sharedFrom: "pack.additionalWorksPostTamping" },
    ],
  },
  {
    id: "partBSignOff",
    title: "Part B - Sign off",
    fields: [
      { id: "partBInspectionDate", label: "Date of inspection", type: "date", sharedFrom: "pack.date" },
      { id: "partBInspectionTime", label: "Time of inspection", type: "time", sharedFrom: "pack.actualWorksiteEnd" },
      { id: "partBPlannedOpeningSpeed", label: "Safe to re-open at planned opening speed of (mph)", type: "text", sharedFrom: "site.lineSpeed" },
      { id: "partBMitigatedSpeed", label: "Mitigated opening speed (mph)", type: "text" },
      { id: "partBReducedSpeed", label: "Reduced opening speed (mph)", type: "text" },
      { id: "partBTgsName", label: "TGS (name)", type: "text", sharedFrom: "pack.tgs" },
      { id: "partBSignature", label: "Signed", type: "text" },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* TEF3207 (per site)                                                          */
/* -------------------------------------------------------------------------- */

export const TEF3207_TICK_GROUPS = [
  {
    id: "trackType",
    title: "Track type",
    single: false,
    options: ["PL-CWR", "S&C", "RT60/NR60 S&C", "PL-Jointed", "Rails in excess of 30m (on curve)", "Adj. switch"],
  },
  { id: "railType", title: "Rail type", single: false, options: ["BH", "FB", "CEN60"] },
  {
    id: "sleeperType",
    title: "Sleeper/bearer type",
    single: false,
    options: ["Concrete", "G44", "Wood", "Steel", "Composite"],
  },
  {
    id: "sleeperSpacing",
    title: "Number of sleepers/bearers per 60ft (18m)",
    single: true,
    options: ["24-25", "26-27", "28-29", "30+"],
  },
  {
    id: "curvature",
    title: "Track curvature",
    single: true,
    options: [
      "Radius 350m or less",
      "Radius between 351m and 500m",
      "Radius between 501m and 800m",
      "Radius between 801m and 1500m",
      "Radius greater than 1500m (up to and including straight track)",
      "Curve transition",
      "Radius unknown",
    ],
  },
  {
    id: "lateralResistancePlates",
    title: "Lateral resistance plates",
    single: true,
    options: ["No LRPs", "LRPs fitted and effective", "LRPs unfastened/loosened"],
  },
  { id: "ballastType", title: "Ballast type", single: true, options: ["non-Granite (Ash etc)", "Stone ballast"] },
] as const;

export const TEF3207_CWR_CONDITIONS = [
  "Undisturbed, fully ballasted and consolidated",
  "Re-railed only (no other disturbance or deficiency)",
  "Tamped/lined with slues/lifts up to 25mm",
  "Tamped/lined with slues/lifts > 25mm",
  "Mechanised stoneblown",
  "Tamped or stoneblown S&C",
  "Manual correction to top and line - less than 8 beds",
  "Manual correction to top and line - 8 beds or more",
  "Ballast disturbance beyond sleeper end only (up to 3 beds), fully consolidated under sleepers",
  "Ballast disturbance beyond sleeper end only (more than 3 beds), fully consolidated under sleepers",
  "Ballast generally full between sleepers and on shoulders, but not consolidated (less than 8 beds)",
  "Ballast generally full between sleepers and on shoulders, but not consolidated (8 beds or more)",
  "No ballast shoulder: level with sleeper top (no other disturbance or deficiency)",
  "Severe shortage of ballast between sleepers, extending 8 or more consecutive beds",
  "Severe shortage of ballast at sleeper ends, extending 3 or more consecutive beds",
  "Severe shortage of ballast between sleepers and at sleeper ends, extending 8 or more consecutive beds",
  "3 or more consecutive sleepers voided at 15mm or more, or 3 or more consecutive slurried beds",
] as const;

export const TEF3207_JOINTED_CONDITIONS = [
  "Undisturbed, fully ballasted and consolidated",
  "Re-railed only (no other disturbance or deficiency)",
  "Tamped/lined with slues/lifts up to 25mm",
  "Tamped/lined with slues/lifts > 25mm",
  "Mechanised stoneblown",
  "Manual correction to top and line",
  "Ballast disturbance beyond sleeper end only with fully consolidated ballast, profile fully restored",
  "Ballast generally full between sleepers and on shoulders, but not consolidated (less than 8 beds)",
  "Ballast generally full between sleepers and on shoulders, but not consolidated (8 beds or more)",
  "Severe shortage of ballast between sleepers, extending 8 beds or more",
  "Severe shortage of ballast at sleeper ends, extending 3 beds or more",
  "Severe shortage of ballast between sleepers and at sleeper ends, extending 8 beds or more",
  "3 or more consecutive sleepers voided at 15mm or more, or 3 or more consecutive slurried beds",
  "Rails in excess of 30m, on curves with radii 500m to 351m, without lateral resistance plates",
  "Rails in excess of 30m, on curves with radii 350m to 300m, without lateral resistance plates",
] as const;

export const TEF3207_GROUPS: readonly FieldGroup[] = [
  {
    id: "siteDetails",
    title: "Site details",
    fields: [
      { id: "disturbedState", label: "Disturbed / undisturbed", type: "select", options: ["Disturbed", "Undisturbed"] },
      { id: "workUndertaken", label: "If disturbed, describe work undertaken", type: "textarea", sharedFrom: "site.machineType" },
      { id: "recordDate", label: "Date", type: "date", sharedFrom: "pack.date" },
      { id: "siteRailTemperature", label: "Site rail temperature (°C)", type: "number", sharedFrom: "site.railTemp" },
      { id: "locationName", label: "Location name", type: "text", sharedFrom: "pack.location" },
      { id: "smtArea", label: "SM[T] area", type: "text", sharedFrom: "pack.trackSectionManager" },
      { id: "elr", label: "ELR", type: "text", sharedFrom: "site.elr" },
      { id: "trackIdLine", label: "Line (Track ID)", type: "text", sharedFrom: "site.trackId" },
      { id: "line", label: "Line", type: "text", sharedFrom: "site.line" },
      { id: "pointNumbers", label: "Point No(s)", type: "text", sharedFrom: "site.scUnits" },
      { id: "mileageFrom", label: "Mileage from", type: "text", sharedFrom: "site.actualStartTampMileage" },
      { id: "mileageTo", label: "Mileage to", type: "text", sharedFrom: "site.actualEndTampMileage" },
    ],
  },
  {
    id: "signOff",
    title: "Sign off",
    fields: [
      { id: "comments", label: "Additional comments", type: "textarea", sharedFrom: "pack.additionalWorksPostTamping" },
      { id: "personInChargeName", label: "Person in charge of work - name", type: "text", sharedFrom: "pack.tgs" },
      { id: "personInChargePost", label: "Post", type: "select", options: OPTIONS.post },
      { id: "personInChargeSignature", label: "Signature", type: "text" },
      { id: "supervisorName", label: "Supervisor name", type: "text" },
      { id: "supervisorSignature", label: "Signature", type: "text" },
      { id: "supervisorDate", label: "Date", type: "date", sharedFrom: "pack.date" },
    ],
  },
];
