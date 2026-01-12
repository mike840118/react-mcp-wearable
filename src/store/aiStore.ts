import { create } from "zustand";
import { requiresConsent } from "../services/mcp/toolPolicy";
import { callTool } from "../services/mcp/mcpClient";

export type ToolStatus = "running" | "success" | "error" | "needs_consent";

export type ToolCall = {
  id: string;
  toolName: string;
  server: "wearable-data" | "risk-engine" | "ops-actions";
  args: unknown;
  status: ToolStatus;
  startedAt: number;
  finishedAt?: number;
  result?: unknown;
  error?: string;
  requiresConsent?: boolean;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export type ConsentRequest = {
  toolCallId: string;
  title: string;
  description: string;
};

function uid() {
  return Math.random().toString(16).slice(2);
}

type State = {
  chat: ChatMessage[];
  toolCalls: ToolCall[];
  consentQueue: ConsentRequest[];
selectedUserId: string;
selectUser: (userId: string) => void;
  sendUserMessage: (text: string) => Promise<void>;
  runTool: (server: ToolCall["server"], toolName: string, args: any) => Promise<any>;
  approveConsent: (toolCallId: string) => Promise<void>;
  rejectConsent: (toolCallId: string) => void;
};

export const useAIStore = create<State>((set, get) => ({
  chat: [
    {
      id: uid(),
      role: "assistant",
      content:
        "你可以問我：『幫我看 Mike 這三天疲勞/熱風險，偏高就準備工單草稿』",
      createdAt: Date.now(),
      
    },
  ],
  selectedUserId: "mike",
selectUser: (userId) => set({ selectedUserId: userId }),
  toolCalls: [],
  consentQueue: [],

  sendUserMessage: async (text) => {
    const now = Date.now();
    set((s) => ({
      chat: [...s.chat, { id: uid(), role: "user", content: text, createdAt: now }],
    }));

    // ✅ 簡化版 agent flow：
    // 1) 算疲勞 2) 算熱風險 3) 回覆建議 4) 若 RED -> 準備開工單（需 consent）
    const fatigue = await get().runTool("risk-engine", "calcFatigue", {
      userId: get().selectedUserId,
      dateRange: "last3days",
    });

    const heat = await get().runTool("risk-engine", "calcHeatRisk", {
      userId: get().selectedUserId,
      dateRange: "last3days",
    });

    set((s) => ({
      chat: [
        ...s.chat,
        {
          id: uid(),
          role: "assistant",
          content: [
            `我看了最近三天的指標：`,
            `- 疲勞：${fatigue.level}（${fatigue.score}）`,
            `- 熱風險：${heat.level}（${heat.score}）`,
            ``,
            `建議：今天降低高強度工作、補水與休息，若持續偏高建議主管關注。`,
          ].join("\n"),
          createdAt: Date.now(),
        },
      ],
    }));

    if (heat.level === "RED") {
      // 這個 tool 會進 needs_consent，等待使用者在 modal 按確認才真的執行
      await get().runTool("ops-actions", "createIncident", {
        userId: get().selectedUserId,
        type: "HEAT_RISK",
        severity: "HIGH",
        evidence: { fatigue, heat },
        note: "熱風險紅色，建議建立事件追蹤。",
      });
    }
  },

  runTool: async (server, toolName, args) => {
    const id = uid();
    const startedAt = Date.now();
    const needConsent = requiresConsent(toolName);

    set((s) => ({
      toolCalls: [
        {
          id,
          server,
          toolName,
          args,
          status: needConsent ? "needs_consent" : "running",
          startedAt,
          requiresConsent: needConsent,
        },
        ...s.toolCalls,
      ],
      consentQueue: needConsent
        ? [
            ...s.consentQueue,
            {
              toolCallId: id,
              title: `需要確認：${toolName}`,
              description: "此操作屬於高風險動作（例如建立事件/通知/寫入報告），請確認後再執行。",
            },
          ]
        : s.consentQueue,
    }));

    if (needConsent) {
      return { pending: true, toolCallId: id };
    }

    try {
      const result = await callTool(toolName, args);
      set((s) => ({
        toolCalls: s.toolCalls.map((t) =>
          t.id === id ? { ...t, status: "success", finishedAt: Date.now(), result } : t
        ),
      }));
      return result;
    } catch (e: any) {
      set((s) => ({
        toolCalls: s.toolCalls.map((t) =>
          t.id === id
            ? { ...t, status: "error", finishedAt: Date.now(), error: e?.message ?? "Tool failed" }
            : t
        ),
      }));
      throw e;
    }
  },

  approveConsent: async (toolCallId) => {
    const tc = get().toolCalls.find((t) => t.id === toolCallId);
    if (!tc) return;

    set((s) => ({
      toolCalls: s.toolCalls.map((t) => (t.id === toolCallId ? { ...t, status: "running" } : t)),
      consentQueue: s.consentQueue.filter((c) => c.toolCallId !== toolCallId),
    }));

    try {
      const result = await callTool(tc.toolName, tc.args);
      set((s) => ({
        toolCalls: s.toolCalls.map((t) =>
          t.id === toolCallId ? { ...t, status: "success", finishedAt: Date.now(), result } : t
        ),
        chat: [
          ...s.chat,
          {
            id: uid(),
            role: "assistant",
            content: `已執行 ${tc.toolName}：${JSON.stringify(result)}`,
            createdAt: Date.now(),
          },
        ],
      }));
    } catch (e: any) {
      set((s) => ({
        toolCalls: s.toolCalls.map((t) =>
          t.id === toolCallId
            ? { ...t, status: "error", finishedAt: Date.now(), error: e?.message ?? "Tool failed" }
            : t
        ),
      }));
    }
  },

  rejectConsent: (toolCallId) => {
    set((s) => ({
      consentQueue: s.consentQueue.filter((c) => c.toolCallId !== toolCallId),
      toolCalls: s.toolCalls.map((t) =>
        t.id === toolCallId ? { ...t, status: "error", finishedAt: Date.now(), error: "User rejected" } : t
      ),
      chat: [...s.chat, { id: uid(), role: "assistant", content: `已取消執行（使用者拒絕）。`, createdAt: Date.now() }],
    }));
  },
}));
