export type RiskLevel = "GREEN" | "YELLOW" | "RED" | "NODATA";

export type UserRow = {
  id: string;
  name: string;
  dept: string;
  lastSyncAt: string; // ISO
  fatigue: { level: RiskLevel; score?: number };
  heat: { level: RiskLevel; score?: number };
};

export const mockUsers: UserRow[] = [
  {
    id: "mike",
    name: "Mike Chen",
    dept: "Factory A / Line 2",
    lastSyncAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    fatigue: { level: "YELLOW", score: 76 },
    heat: { level: "RED", score: 82 },
  },
  {
    id: "amy",
    name: "Amy Lin",
    dept: "Factory A / Line 1",
    lastSyncAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    fatigue: { level: "GREEN", score: 88 },
    heat: { level: "GREEN", score: 24 },
  },
  {
    id: "jack",
    name: "Jack Wu",
    dept: "Warehouse / Night",
    lastSyncAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    fatigue: { level: "NODATA" },
    heat: { level: "NODATA" },
  },
  {
    id: "lisa",
    name: "Lisa Huang",
    dept: "Factory B / Line 3",
    lastSyncAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    fatigue: { level: "RED", score: 64 },
    heat: { level: "YELLOW", score: 61 },
  },
];
