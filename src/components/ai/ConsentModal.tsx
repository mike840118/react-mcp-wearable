import { useAIStore } from "../../store/aiStore";

export function ConsentModal() {
    const queue = useAIStore((s) => s.consentQueue);
    const approve = useAIStore((s) => s.approveConsent);
    const reject = useAIStore((s) => s.rejectConsent);

    const current = queue[0];
    if (!current) return null;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.25)",
                display: "grid",
                placeItems: "center",
                padding: 20,
                zIndex: 50,
            }}
        >
            <div style={{ width: "min(520px, 100%)", background: "#fff", borderRadius: 16, padding: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{current.title}</div>
                <div style={{ opacity: 0.8, whiteSpace: "pre-wrap" }}>{current.description}</div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                    <button
                        onClick={() => reject(current.toolCallId)}
                        style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd" }}
                    >
                        取消
                    </button>
                    <button
                        onClick={() => approve(current.toolCallId)}
                        style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd" }}
                    >
                        確認執行
                    </button>
                </div>
            </div>
        </div>
    );
}
