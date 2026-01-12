
import type { RiskLevel } from "../../data/mock/users";

function styleByLevel(level: RiskLevel) {
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

function label(level: RiskLevel) {
    if (level === "NODATA") return "NO DATA";
    return level;
}

export function RiskBadge({ level, score }: { level: RiskLevel; score?: number | null }) {
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
                fontWeight: 600,
                whiteSpace: "nowrap",
            }}
            title={score == null ? undefined : `score: ${score}`}
        >
            {label(level)}
            {score == null ? null : <span style={{ opacity: 0.8 }}>{score}</span>}
        </span>
    );
}
