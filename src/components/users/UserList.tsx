import { useMemo, useState } from "react";
import { mockUsers } from "../../data/mock/users";
import { useAIStore } from "../../store/aiStore";
import { RiskBadge } from "./RiskBadge";

function fmtTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function UserList() {
    const selectedUserId = useAIStore((s) => s.selectedUserId);
    const selectUser = useAIStore((s) => s.selectUser);

    const [keyword, setKeyword] = useState("");
    const [risk, setRisk] = useState<"ALL" | "RED" | "YELLOW" | "GREEN" | "NODATA">("ALL");

    const rows = useMemo(() => {
        const kw = keyword.trim().toLowerCase();
        return mockUsers
            .filter((u) => {
                const okKw = !kw || u.name.toLowerCase().includes(kw) || u.dept.toLowerCase().includes(kw) || u.id.includes(kw);
                if (!okKw) return false;
                if (risk === "ALL") return true;
                // 用 heat 優先當篩選（你也可改成取 max(fatigue, heat)）
                return u.heat.level === risk;
            })
            .sort((a, b) => (a.id === "mike" ? -1 : 0) - (b.id === "mike" ? -1 : 0));
    }, [keyword, risk]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
            <div style={{ fontWeight: 700 }}>Users</div>

            <div style={{ display: "flex", gap: 8 }}>
                <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="搜尋姓名/部門/ID"
                    style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                />
                <select
                    value={risk}
                    onChange={(e) => setRisk(e.target.value as any)}
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                >
                    <option value="ALL">All</option>
                    <option value="RED">Heat=RED</option>
                    <option value="YELLOW">Heat=YELLOW</option>
                    <option value="GREEN">Heat=GREEN</option>
                    <option value="NODATA">Heat=NO DATA</option>
                </select>
            </div>

            <div style={{ overflow: "auto", border: "1px solid #eee", borderRadius: 12 }}>
                {rows.map((u) => {
                    const active = u.id === selectedUserId;
                    return (
                        <button
                            key={u.id}
                            onClick={() => selectUser(u.id)}
                            type="button"
                            style={{
                                width: "100%",
                                textAlign: "left",
                                border: "none",
                                background: active ? "#f8fafc" : "white",
                                color: "#111827",          // ✅ 新增：文字顏色（深色）
                                fontSize: 14,              // ✅ 可選：避免被全域樣式影響
                                padding: 12,
                                borderBottom: "1px solid #f1f5f9",
                                cursor: "pointer",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                <div style={{ fontWeight: 700 }}>{u.name}</div>
                                <div style={{ fontSize: 12, opacity: 0.7 }}>sync {fmtTime(u.lastSyncAt)}</div>
                            </div>

                            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{u.dept}</div>

                            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontSize: 12, opacity: 0.7 }}>Fatigue</span>
                                    <RiskBadge level={u.fatigue.level} score={u.fatigue.score ?? null} />
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontSize: 12, opacity: 0.7 }}>Heat</span>
                                    <RiskBadge level={u.heat.level} score={u.heat.score ?? null} />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div style={{ fontSize: 12, opacity: 0.7 }}>
                Tip：先點選左側使用者，再用右側 AI 分析（tool args 會帶 selectedUserId）
            </div>
        </div>
    );
}
