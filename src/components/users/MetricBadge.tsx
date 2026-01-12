import type { Level, MetricKey } from "../../data/mock/users";

function styleByLevel(level: Level) {
    switch (level) {
        case "GREEN":
            return { background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46" };
        case "YELLOW":
            return { background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e" };
        case "RED":
            return { background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b" };
        case "NODATA":
        default:
            return { background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151" };
    }
}

function fmt(metric: MetricKey, v: number | null | undefined) {
    if (v == null) return "-";
    if (metric === "TEMP") return `${v.toFixed(1)}°C`;
    if (metric === "SPO2") return `${v.toFixed(0)}%`;
    if (metric === "HR") return `${v.toFixed(0)}`;
    if (metric === "HRV") return `${v.toFixed(0)}`;
    if (metric === "STEP") return `${Math.round(v)}`;
    if (metric === "KCKL") return `${Math.round(v)}`;
    // HS / FTG
    return `${v.toFixed(0)}`;
}

export function MetricBadge({
    metric,
    level,
    value,
}: {
    metric: MetricKey;
    level: Level;
    value?: number | null;
}) {
    const s = styleByLevel(level);
    return (
        <span
            style={{
                ...s,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: "nowrap",
            }}
            title={`${metric}${value == null ? "" : `: ${value}`}`}
        >
            <span style={{ opacity: 0.9 }}>{metric}</span>
            <span style={{ fontWeight: 800 }}>{fmt(metric, value ?? null)}</span>
        </span>
    );
}
