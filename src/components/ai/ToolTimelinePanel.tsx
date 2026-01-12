import { useState } from "react";
import { useAIStore } from "../../store/aiStore";

function ms(n?: number) {
    if (n == null) return "-";
    return `${Math.max(0, Math.floor(n))}ms`;
}

export function ToolTimelinePanel() {
    const toolCalls = useAIStore((s) => s.toolCalls);
    const [openId, setOpenId] = useState<string | null>(null);

    return (
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Tool Timeline</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflow: "auto" }}>
                {toolCalls.map((t) => {
                    const duration = (t.finishedAt ?? Date.now()) - t.startedAt;
                    const isOpen = openId === t.id;

                    return (
                        <div key={t.id} style={{ padding: 10, border: "1px solid #eee", borderRadius: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>
                                        {t.server} · {t.toolName}
                                    </div>
                                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                                        status: {t.status} · {ms(duration)}
                                    </div>
                                </div>

                                <button
                                    onClick={() => setOpenId(isOpen ? null : t.id)}
                                    style={{ border: "1px solid #ddd", borderRadius: 10, padding: "6px 10px" }}
                                >
                                    {isOpen ? "收合" : "展開"}
                                </button>
                            </div>

                            {isOpen && (
                                <div style={{ marginTop: 10, fontSize: 12 }}>
                                    <div style={{ opacity: 0.7, marginBottom: 4 }}>args</div>
                                    <pre style={{ margin: 0, padding: 10, background: "#fafafa", borderRadius: 10, overflow: "auto" }}>
                                        {JSON.stringify(t.args, null, 2)}
                                    </pre>

                                    <div style={{ opacity: 0.7, margin: "10px 0 4px" }}>result</div>
                                    <pre style={{ margin: 0, padding: 10, background: "#fafafa", borderRadius: 10, overflow: "auto" }}>
                                        {JSON.stringify(t.result ?? (t.error ? { error: t.error } : null), null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
