function pickRiskByUser(userId: string) {
  if (userId === "mike") return { heat: { level: "RED", score: 82 }, fatigue: { level: "YELLOW", score: 76 } };
  if (userId === "lisa") return { heat: { level: "YELLOW", score: 61 }, fatigue: { level: "RED", score: 64 } };
  if (userId === "amy") return { heat: { level: "GREEN", score: 24 }, fatigue: { level: "GREEN", score: 88 } };
  return { heat: { level: "NODATA" as const }, fatigue: { level: "NODATA" as const } };
}

export async function callTool(toolName: string, args: any) {
  await new Promise((r) => setTimeout(r, 350 + Math.random() * 700));

  const userId = args?.userId ?? "unknown";
  const picked = pickRiskByUser(userId);

  if (toolName === "calcHeatRisk") {
    if (picked.heat.level === "NODATA") return { level: "NODATA", score: null, reasons: ["No recent sensor data"] };
    return { level: picked.heat.level, score: picked.heat.score, reasons: ["High temp+humidity", "HR elevated"] };
  }

  if (toolName === "calcFatigue") {
    if (picked.fatigue.level === "NODATA") return { level: "NODATA", score: null, reasons: ["No sleep/HRV data"] };
    return { level: picked.fatigue.level, score: picked.fatigue.score, reasons: ["HRV down", "Sleep short"] };
  }

  if (toolName === "createIncident") {
    return { ticketId: `INC-${new Date().toISOString().slice(0, 10)}-${Math.floor(Math.random() * 9000 + 1000)}`, status: "created", args };
  }

  return { ok: true, toolName, args };
}
