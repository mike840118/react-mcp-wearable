import { mockUsers, type MetricKey } from "../../data/mock/users";
import { genMetricSeries } from "../../data/mock/vitals";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function callTool(toolName: string, args: any) {
  await sleep(300 + Math.random() * 700);

  const userId: string = args?.userId ?? "unknown";

  // ✅ 8 指標快照（左側那種）
  if (toolName === "getMetricSnapshot") {
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) return { ok: false, error: "USER_NOT_FOUND" };
    return { ok: true, userId, metrics: user.metrics };
  }

 if (toolName === "getMetricSeries") {
  const metric: MetricKey = args?.metric;
  const hours: number = args?.hours ?? 24;
  if (!metric) return { ok: false, error: "METRIC_REQUIRED" };

  const user = mockUsers.find((u) => u.id === userId);
  if (!user) return { ok: false, error: "USER_NOT_FOUND" };

  // ✅ 關鍵：如果該指標是 NODATA，就不要生成任何 series
  const metricState = user.metrics[metric];
  if (!metricState || metricState.level === "NODATA" || metricState.value == null) {
    return {
      ok: false,
      userId,
      metric,
      hours,
      series: [],
      error: "NO_DATA",
      reason: `${metric} is NODATA for user=${userId}`,
    };
  }

 if (toolName === "getMetricSeries") {
  const metric: MetricKey = args?.metric;
  const hours: number = args?.hours ?? 24;
  if (!metric) return { ok: false, error: "METRIC_REQUIRED" };

  const user = mockUsers.find((u) => u.id === userId);
  if (!user) return { ok: false, error: "USER_NOT_FOUND" };

  // 如果該指標是 NODATA，就不要生成任何 series
  const metricState = user.metrics[metric];
  if (!metricState || metricState.level === "NODATA" || metricState.value == null) {
    return {
      ok: false,
      userId,
      metric,
      hours,
      series: [],
      error: "NO_DATA",
      reason: `${metric} is NODATA for user=${userId}`,
    };
  }

  // ✅ 有資料才生成 series
  const series = genMetricSeries(userId, metric, hours);
  return {
    ok: true,
    userId,
    metric,
    hours,
    series,
  };
}

}

  // ✅ 你原本的風險工具（保留）
  if (toolName === "calcHeatRisk") {
    // 直接用 HS 指標來模擬
    const user = mockUsers.find((u) => u.id === userId);
    const hs = user?.metrics.HS?.value ?? null;
    if (hs == null) return { level: "NODATA", score: null, reasons: ["No recent sensor data"] };
    const level = hs >= 80 ? "RED" : hs >= 60 ? "YELLOW" : "GREEN";
    return { level, score: Math.round(hs), reasons: ["Derived from HS score"] };
  }

  if (toolName === "calcFatigue") {
    const user = mockUsers.find((u) => u.id === userId);
    const ftg = user?.metrics.FTG?.value ?? null;
    if (ftg == null) return { level: "NODATA", score: null, reasons: ["No sleep/HRV data"] };
    const level = ftg <= 69 ? "RED" : ftg <= 80 ? "YELLOW" : "GREEN"; // demo rule
    return { level, score: Math.round(ftg), reasons: ["Derived from FTG score"] };
  }

  // ✅ 建工單（保留）
  if (toolName === "createIncident") {
    return {
      ticketId: `INC-${new Date().toISOString().slice(0, 10)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      status: "created",
      args,
    };
  }

  return { ok: true, toolName, args };
}
