import React, { useState } from "react";
import { useAIStore } from "../../store/aiStore";

export function ChatPanel() {
    const selectedUserId = useAIStore((s) => s.selectedUserId);
  const chat = useAIStore((s) => s.chat);
  const sendUserMessage = useAIStore((s) => s.sendUserMessage);
  const [text, setText] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflow: "auto", padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
        {chat.map((m) => (
          <div key={m.id} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.6 }}>{m.role}</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
          </div>
        ))}
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const v = text.trim();
          if (!v) return;
          setText("");
          await sendUserMessage(v);
        }}
        style={{ display: "flex", gap: 8, paddingTop: 10 }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`目前選取：${selectedUserId}。輸入：幫我看這三天疲勞/熱風險...`}
          style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />
        <button style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd" }}>
          送出
        </button>
      </form>
    </div>
  );
}
