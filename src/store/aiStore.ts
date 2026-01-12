// src/store/aiStore.ts
import { create } from "zustand";
import { requiresConsent } from "../services/mcp/toolPolicy";
import { callTool } from "../services/mcp/mcpClient";
import { parseIntent } from "../services/intentParser";

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
    // UI state
    selectedUserId: string;
    selectUser: (userId: string) => void;

    // chat + tool states
    chat: ChatMessage[];
    toolCalls: ToolCall[];
    consentQueue: ConsentRequest[];

    // actions
    sendUserMessage: (text: string) => Promise<void>;
    runTool: (server: ToolCall["server"], toolName: string, args: any) => Promise<any>;
    approveConsent: (toolCallId: string) => Promise<void>;
    rejectConsent: (toolCallId: string) => void;
};

export const useAIStore = create<State>((set, get) => ({
    selectedUserId: "mike",
    selectUser: (userId) => set({ selectedUserId: userId }),

    chat: [
        {
            id: uid(),
            role: "assistant",
            content:
                "先點左側使用者，再問我：\n- 幫我看最近三天疲勞\n- 這個人有沒有熱中暑風險\n- 如果熱風險紅色幫我開工單\n- 幫我產出一段摘要",
            createdAt: Date.now(),
        },
    ],
    toolCalls: [],
    consentQueue: [],

    sendUserMessage: async (text) => {
        const now = Date.now();
        const userId = get().selectedUserId;
        // 1) push user message
        set((s) => ({
            chat: [...s.chat, { id: uid(), role: "user", content: text, createdAt: now }],
        }));

        // 2) parse intent
        const parsed = parseIntent(text);
        const intents = new Set(parsed.intents);

        // 3) run tools based on intent
        let fatigue: any = null;
        let heat: any = null;

        const needFatigue = intents.has("CHECK_FATIGUE") || intents.has("CHECK_BOTH");
        const needHeat = intents.has("CHECK_HEAT") || intents.has("CHECK_BOTH");

        if (!parsed.ok) {
            set((s) => ({
                chat: [
                    ...s.chat,
                    {
                        id: uid(),
                        role: "assistant",
                        content:
                            `我不會執行分析，原因：${parsed.reason ?? "unknown"}\n\n` +
                            `你可以這樣問：\n` +
                            `- 幫我看疲勞\n` +
                            `- 幫我看熱中暑風險\n` +
                            `- 幫我產出摘要/報告\n` +
                            `- 如果紅色幫我開工單`,
                        createdAt: Date.now(),
                    },
                ],
            }));
            return; // ✅ 阻止任何 tool 呼叫
        }

        if (needFatigue) {
            fatigue = await get().runTool("risk-engine", "calcFatigue", {
                userId,
                dateRange: "last3days",
            });
            // 如果 tool 需要 consent，runTool 會回 pending（但我們這兩個不需要）
        }

        if (needHeat) {
            heat = await get().runTool("risk-engine", "calcHeatRisk", {
                userId,
                dateRange: "last3days",
            });
        }

        // 4) generate assistant response text (controlled by frontend)
        const lines: string[] = [];
        lines.push(`分析對象：${userId}`);

        if (fatigue?.pending) {
            lines.push(`- 疲勞：待確認（toolCallId=${fatigue.toolCallId}）`);
        } else if (fatigue) {
            lines.push(`- 疲勞：${fatigue.level}（${fatigue.score ?? "-"}）`);
        }

        if (heat?.pending) {
            lines.push(`- 熱風險：待確認（toolCallId=${heat.toolCallId}）`);
        } else if (heat) {
            lines.push(`- 熱風險：${heat.level}（${heat.score ?? "-"}）`);
        }

        if (!needFatigue && !needHeat) {
            lines.push(`- 目前沒有偵測到「要分析什麼」的關鍵字，我先預設顯示綜合分析。`);
        }

        // 可選：摘要（Demo 版本先用規則組合）
        if (intents.has("GENERATE_SUMMARY")) {
            const parts: string[] = [];
            if (fatigue && !fatigue.pending) parts.push(`疲勞 ${fatigue.level}(${fatigue.score ?? "-"})`);
            if (heat && !heat.pending) parts.push(`熱風險 ${heat.level}(${heat.score ?? "-"})`);
            lines.push("");
            lines.push(`摘要：${parts.length ? parts.join("，") : "資料不足，暫無法生成摘要。"}`);
            lines.push("建議：補水、降低高強度作業、若持續偏高請主管/職護關注。");
        } else {
            lines.push("");
            lines.push("你也可以加一句「幫我產摘要」或「如果紅色幫我開工單」。");
        }

        set((s) => ({
            chat: [
                ...s.chat,
                {
                    id: uid(),
                    role: "assistant",
                    content: lines.join("\n"),
                    createdAt: Date.now(),
                },
            ],
        }));

        // 5) optional action: create incident if user asked AND heat is RED
        const wantsIncident = parsed.wantsIncident || intents.has("CREATE_INCIDENT");
        if (wantsIncident && heat && !heat.pending && heat.level === "RED") {
            await get().runTool("ops-actions", "createIncident", {
                userId,
                type: "HEAT_RISK",
                severity: "HIGH",
                evidence: { fatigue, heat },
                note: "使用者要求建立事件，且熱風險為紅色。",
            });
        }
    },

    runTool: async (server, toolName, args) => {
        const id = uid();
        const startedAt = Date.now();
        const needConsent = requiresConsent(toolName);

        // write tool call
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

        // mark running + remove consent item
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
            chat: [
                ...s.chat,
                { id: uid(), role: "assistant", content: "已取消執行（使用者拒絕）。", createdAt: Date.now() },
            ],
        }));
    },
}));
