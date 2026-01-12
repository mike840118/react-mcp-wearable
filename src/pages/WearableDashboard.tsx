import React from "react";
import { ChatPanel } from "../components/ai/ChatPanel";
import { ToolTimelinePanel } from "../components/ai/ToolTimelinePanel";
import { ConsentModal } from "../components/ai/ConsentModal";
import { UserList } from "../components/users/UserList";
import { UserDetail } from "../components/users/UserDetail";

export default function WearableDashboard() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1.6fr 1.2fr",
        gap: 12,
        padding: 12,
        height: "100vh",
        boxSizing: "border-box",
      }}
    >
      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, minHeight: 0 }}>
        <UserList />
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, minHeight: 0 }}>
        <UserDetail />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <ChatPanel />
        </div>
        <ToolTimelinePanel />
      </div>

      <ConsentModal />
    </div>
  );
}
