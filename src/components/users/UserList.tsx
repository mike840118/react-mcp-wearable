import { useMemo, useState } from "react";
import { METRIC_KEYS, mockUsers } from "../../data/mock/users";
import { useAIStore } from "../../store/aiStore";
import { MetricBadge } from "./MetricBadge";

function fmtTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function UserList() {
    const selectedUserId = useAIStore((s) => s.selectedUserId);
    const selectUser = useAIStore((s) => s.selectUser);

    const [keyword, setKeyword] = useState("");

    const rows = useMemo(() => {
        const kw = keyword.trim().toLowerCase();
        return mockUsers.filter((u) => {
            if (!kw) return true;
            return (
                u.name.toLowerCase().includes(kw) ||
                u.dept.toLowerCase().includes(kw) ||
                u.id.toLowerCase().includes(kw)
            );
        });
    }, [keyword]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
            <div style={{ fontWeight: 700 }}>Users</div>

            <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search name / dept / id"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            />

            <div style={{ overflow: "auto", border: "1px solid #eee", borderRadius: 12 }}>
                {rows.map((u) => {
                    const active = u.id === selectedUserId;
                    return (
                        <button
                            key={u.id}
                            type="button"
                            onClick={() => selectUser(u.id)}
                            style={{
                                width: "100%",
                                textAlign: "left",
                                border: "none",
                                background: active ? "#f8fafc" : "white",
                                color: "#111827", // ✅ 防止看不到文字
                                padding: 12,
                                borderBottom: "1px solid #f1f5f9",
                                cursor: "pointer",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                <div style={{ fontWeight: 800 }}>{u.name}</div>
                                <div style={{ fontSize: 12, opacity: 0.7 }}>sync {fmtTime(u.lastSyncAt)}</div>
                            </div>

                            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{u.dept}</div>

                            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                                {METRIC_KEYS.map((k) => (
                                    <MetricBadge
                                        key={k}
                                        metric={k}
                                        level={u.metrics[k].level}
                                        value={u.metrics[k].value ?? null}
                                    />
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div style={{ fontSize: 12, opacity: 0.7 }}>
                Tip：先選使用者，再用右側 AI 查詢（會帶 selectedUserId）
            </div>
        </div>
    );
}
