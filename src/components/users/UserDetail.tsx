import React, { useMemo } from "react";
import { mockUsers } from "../../data/mock/users";
import { useAIStore } from "../../store/aiStore";
import { RiskBadge } from "./RiskBadge";
import { genVitalsSeries } from "../../data/mock/vitals";
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

export function UserDetail() {
    const selectedUserId = useAIStore((s) => s.selectedUserId);
    const user = mockUsers.find((u) => u.id === selectedUserId) ?? mockUsers[0];

    const series = useMemo(() => genVitalsSeries(selectedUserId, 24), [selectedUserId]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{user.name}</div>
                    <div style={{ opacity: 0.75 }}>{user.dept}</div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, opacity: 0.7 }}>Fatigue</span>
                        <RiskBadge level={user.fatigue.level} score={user.fatigue.score ?? null} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, opacity: 0.7 }}>Heat</span>
                        <RiskBadge level={user.heat.level} score={user.heat.score ?? null} />
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
                <Kpi title="Avg HR" value={avg(series.map((p) => p.hr)).toFixed(0)} unit="bpm" />
                <Kpi title="Avg HRV (RMSSD)" value={avg(series.map((p) => p.hrv)).toFixed(0)} unit="ms" />
                <Kpi title="Max HR" value={Math.max(...series.map((p) => p.hr)).toFixed(0)} unit="bpm" />
                <Kpi title="Min HRV" value={Math.min(...series.map((p) => p.hrv)).toFixed(0)} unit="ms" />
            </div>

            {/* Charts */}
            <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateRows: "1fr 1fr", gap: 10 }}>
                <ChartCard title="Heart Rate (last 24h)">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={series}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="t" tickFormatter={fmtHour} minTickGap={30} />
                            <YAxis domain={[40, 150]} />
                            <Tooltip labelFormatter={(v) => fmtHour(Number(v))} />
                            <Line type="monotone" dataKey="hr" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="HRV RMSSD (last 24h)">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={series}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="t" tickFormatter={fmtHour} minTickGap={30} />
                            <YAxis domain={[0, 140]} />
                            <Tooltip labelFormatter={(v) => fmtHour(Number(v))} />
                            <Line type="monotone" dataKey="hrv" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
}

function Kpi({ title, value, unit }: { title: string; value: string; unit: string }) {
    return (
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{title}</div>
            <div style={{ fontWeight: 800, fontSize: 18, marginTop: 4 }}>
                {value} <span style={{ fontSize: 12, opacity: 0.7 }}>{unit}</span>
            </div>
        </div>
    );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, minHeight: 0 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
            <div style={{ height: "calc(100% - 26px)" }}>{children}</div>
        </div>
    );
}

function avg(xs: number[]) {
    if (!xs.length) return 0;
    return xs.reduce((a, b) => a + b, 0) / xs.length;
}
