import { useMemo, useState } from "react";
import { METRIC_KEYS, mockUsers } from "../../data/mock/users";
import type { MetricKey } from "../../data/mock/users";
import { useAIStore } from "../../store/aiStore";
import { MetricBadge } from "./MetricBadge";
import { genMetricSeries } from "../../data/mock/vitals";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

function fmtHour(t: number) {
    const d = new Date(t);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function yDomain(metric: MetricKey): [number, number] {
    switch (metric) {
        case "HR":
            return [40, 150];
        case "HRV":
            return [0, 140];
        case "SPO2":
            return [85, 100];
        case "TEMP":
            return [35, 40];
        case "STEP":
            return [0, 900];
        case "KCKL":
            return [0, 70];
        case "HS":
        case "FTG":
            return [0, 100];
    }
}

export function UserDetail() {
    const selectedUserId = useAIStore((s) => s.selectedUserId);
    const user = mockUsers.find((u) => u.id === selectedUserId) ?? mockUsers[0];

    const [metric, setMetric] = useState<MetricKey>("HR");
    const metricState = user.metrics[metric];
    const hasData = metricState.level !== "NODATA" && metricState.value != null;
    const series = useMemo(() => genMetricSeries(selectedUserId, metric, 24), [selectedUserId, metric]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{user.name}</div>
                    <div style={{ opacity: 0.75 }}>{user.dept}</div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {METRIC_KEYS.map((k) => (
                        <MetricBadge key={k} metric={k} level={user.metrics[k].level} value={user.metrics[k].value ?? null} />
                    ))}
                </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 800 }}>Metric Chart</div>
                <select
                    value={metric}
                    onChange={(e) => setMetric(e.target.value as MetricKey)}
                    style={{ padding: 8, borderRadius: 10, border: "1px solid #ddd" }}
                >
                    {METRIC_KEYS.map((k) => (
                        <option key={k} value={k}>
                            {k}
                        </option>
                    ))}
                </select>
                <div style={{ fontSize: 12, opacity: 0.7 }}>last 24h</div>
            </div>

            <div style={{ flex: 1, minHeight: 0, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>{metric}</div>
                <div style={{ height: "calc(100% - 28px)" }}>
                    {!hasData ? (
                        <div
                            style={{
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#6b7280",
                                fontSize: 14,
                                border: "1px dashed #e5e7eb",
                                borderRadius: 12,
                            }}
                        >
                            No data available<br />
                            <span style={{ fontSize: 12 }}>
                                Device not synced or permission missing
                            </span>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={series}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="t" tickFormatter={fmtHour} minTickGap={30} />
                                <YAxis domain={yDomain(metric)} />
                                <Tooltip labelFormatter={(v) => fmtHour(Number(v))} />
                                <Line type="monotone" dataKey="v" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}

                </div>
            </div>
        </div>
    );
}
