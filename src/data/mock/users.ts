export type Level = "GREEN" | "YELLOW" | "RED" | "NODATA";

export type UserRow = {
  id: string;
  name: string;
  dept: string;
  lastSyncAt: string; // ISO
  // 8 metrics summary shown on the left list
  metrics: {
    HS: { level: Level; value?: number | null };      // heat risk score 0~100
    FTG: { level: Level; value?: number | null };     // fatigue score 0~100
    HR: { level: Level; value?: number | null };      // bpm
    SPO2: { level: Level; value?: number | null };    // %
    TEMP: { level: Level; value?: number | null };    // °C
    HRV: { level: Level; value?: number | null };     // ms
    STEP: { level: Level; value?: number | null };    // steps
    KCKL: { level: Level; value?: number | null };    // kcal
  };
};

const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

export const mockUsers: UserRow[] = [
  {
    id: "mike",
    name: "Mike Chen",
    dept: "Factory A / Line 2",
    lastSyncAt: iso(8 * 60 * 1000),
    metrics: {
      HS: { level: "RED", value: 82 },
      FTG: { level: "YELLOW", value: 76 },
      HR: { level: "YELLOW", value: 98 },
      SPO2: { level: "GREEN", value: 97 },
      TEMP: { level: "YELLOW", value: 37.6 },
      HRV: { level: "YELLOW", value: 32 },
      STEP: { level: "GREEN", value: 6420 },
      KCKL: { level: "GREEN", value: 380 },
    },
  },
  {
    id: "amy",
    name: "Amy Lin",
    dept: "Factory A / Line 1",
    lastSyncAt: iso(22 * 60 * 1000),
    metrics: {
      HS: { level: "GREEN", value: 24 },
      FTG: { level: "GREEN", value: 88 },
      HR: { level: "GREEN", value: 72 },
      SPO2: { level: "GREEN", value: 99 },
      TEMP: { level: "GREEN", value: 36.8 },
      HRV: { level: "GREEN", value: 58 },
      STEP: { level: "GREEN", value: 8120 },
      KCKL: { level: "GREEN", value: 460 },
    },
  },
  {
    id: "lisa",
    name: "Lisa Huang",
    dept: "Factory B / Line 3",
    lastSyncAt: iso(40 * 60 * 1000),
    metrics: {
      HS: { level: "YELLOW", value: 61 },
      FTG: { level: "RED", value: 64 },
      HR: { level: "YELLOW", value: 92 },
      SPO2: { level: "GREEN", value: 96 },
      TEMP: { level: "YELLOW", value: 37.4 },
      HRV: { level: "RED", value: 24 },
      STEP: { level: "YELLOW", value: 3200 },
      KCKL: { level: "YELLOW", value: 210 },
    },
  },
  {
    id: "jack",
    name: "Jack Wu",
    dept: "Warehouse / Night",
    lastSyncAt: iso(3 * 60 * 60 * 1000),
    metrics: {
      HS: { level: "NODATA", value: null },
      FTG: { level: "NODATA", value: null },
      HR: { level: "NODATA", value: null },
      SPO2: { level: "NODATA", value: null },
      TEMP: { level: "NODATA", value: null },
      HRV: { level: "NODATA", value: null },
      STEP: { level: "NODATA", value: null },
      KCKL: { level: "NODATA", value: null },
    },
  },
];

export const METRIC_KEYS = ["HS", "FTG", "HR", "SPO2", "TEMP", "HRV", "STEP", "KCKL"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];
