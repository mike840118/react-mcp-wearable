import { create } from "zustand";
import { requiresConsent } from "../services/mcp/toolPolicy";
import { callTool } from "../services/mcp/mcpClient";
import { parseIntent } from "../services/intentParser";
import type { MetricKey } from "../data/mock/users";

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

function stat(series: Array<{ v: number }>) {
  if (!series.length) return null;
  const vs = series.map((p) => p.v);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const avg = vs.reduce((a, b) => a + b, 0) / vs.length;
  const last = vs[vs.length - 1];
  return { min, max, avg, last };
}

function fmtMetric(metric: MetricKey, n: number) {
  if (metric === "TEMP") return `${n.toFixed(1)} °C`;
  if (metric === "SPO2") return `${n.toFixed(0)} %`;
  if (metric === "HR") return `${n.toFixed(0)} bpm`;
  if (metric === "HRV") return `${n.toFixed(0)} ms`;
  if (metric === "STEP") return `${Math.round(n)} steps/10min`;
  if (metric === "KCKL") return `${Math.round(n)} kcal/10min`;
  // HS/FTG
  return `${n.toFixed(0)} /100`;
}

type State = {
  selectedUserId: string;
  selectUser: (userId: string) => void;

  chat: ChatMessage[];
  toolCalls: ToolCall[];
  consentQueue: ConsentRequest[];

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
        "✅ 支援英文縮寫 + 中文口語查詢（可多個一起）\n\n" +
        "例：\n" +
        "- 幫我看 HR\n" +
        "- 幫我看 心率 跟 血氧\n" +
        "- 查 TEMP / HRV\n" +
        "- 幫我產出報表（會用 Markdown）\n" +
        "- 如果熱中暑風險紅色幫我開工單\n",
      createdAt: Date.now(),
    },
  ],
  toolCalls: [],
  consentQueue: [],

  sendUserMessage: async (text) => {
    const now = Date.now();
    const userId = get().selectedUserId;

    set((s) => ({
      chat: [...s.chat, { id: uid(), role: "user", content: text, createdAt: now }],
    }));

    const parsed = parseIntent(text);
    if (!parsed.ok) {
      set((s) => ({
        chat: [
          ...s.chat,
          {
            id: uid(),
            role: "assistant",
            content:
              `我不會執行分析：${parsed.reason ?? "unknown"}\n\n` +
              `你可以試：\n` +
              `- 幫我看 HR / 心率\n` +
              `- 幫我看 SPO2 / 血氧\n` +
              `- 幫我看 TEMP / 體溫\n` +
              `- 幫我產出報表/摘要（Markdown）\n` +
              `- 如果熱中暑風險紅色幫我開工單`,
            createdAt: Date.now(),
          },
        ],
      }));
      return;
    }

    // 1) 需要哪些 metrics
    const metricsWanted = parsed.metricsWanted;

    // 2) 拉 series（可多個）
    const seriesMap: Partial<Record<MetricKey, any>> = {};
    for (const m of metricsWanted) {
      const r = await get().runTool("wearable-data", "getMetricSeries", {
        userId,
        metric: m,
        hours: 24,
      });
    if (r?.ok) seriesMap[m] = r;
else seriesMap[m] = r; // 讓它也保留 error/no_data 資訊
    }

    // 3) 若要求報表 -> 產 Markdown
    const wantsReport = parsed.intents.includes("GENERATE_REPORT");
    if (wantsReport) {
      const lines: string[] = [];
      lines.push(`# Wearable Report`);
      lines.push(`- User: **${userId}**`);
      lines.push(`- Range: **last 24h**`);
      lines.push("");

      for (const m of metricsWanted) {
        const payload = seriesMap[m];
        const s = payload?.series ?? [];
        const st = stat(s);
        if (!st) {
          lines.push(`## ${m}`);
          lines.push(`- No data`);
          lines.push("");
          continue;
        }
        lines.push(`## ${m}`);
        lines.push(`- Last: **${fmtMetric(m, st.last)}**`);
        lines.push(`- Avg: **${fmtMetric(m, st.avg)}**`);
        lines.push(`- Min/Max: **${fmtMetric(m, st.min)}** / **${fmtMetric(m, st.max)}**`);
        lines.push("");
      }

      // 簡單結論（demo規則）
      const hsLast = stat(seriesMap["HS"]?.series ?? [])?.last;
      const ftgLast = stat(seriesMap["FTG"]?.series ?? [])?.last;

      lines.push(`---`);
      lines.push(`## Notes`);
      if (hsLast != null) {
        const hsLevel = hsLast >= 80 ? "RED" : hsLast >= 60 ? "YELLOW" : "GREEN";
        lines.push(`- HS level: **${hsLevel}** (last=${fmtMetric("HS", hsLast)})`);
      }
      if (ftgLast != null) {
        const ftgLevel = ftgLast <= 69 ? "RED" : ftgLast <= 80 ? "YELLOW" : "GREEN";
        lines.push(`- FTG level: **${ftgLevel}** (last=${fmtMetric("FTG", ftgLast)})`);
      }
      lines.push(`- Recommendation: hydrate, reduce intensity, monitor trends.`);

      set((s) => ({
        chat: [
          ...s.chat,
          { id: uid(), role: "assistant", content: lines.join("\n"), createdAt: Date.now() },
        ],
      }));
    } else {
      // 沒要報表：簡短回覆查到哪些指標的 last 值
      const lines: string[] = [];
      lines.push(`查詢對象：${userId}`);
      if (metricsWanted.length === 0) {
        lines.push(`（你可以輸入：HR/心率、SPO2/血氧、TEMP/體溫、HRV、STEP、KCKL、HS、FTG）`);
      } else {
        for (const m of metricsWanted) {
          const st = stat(seriesMap[m]?.series ?? []);
          lines.push(`- ${m}: ${st ? fmtMetric(m, st.last) : "No data"}`);
        }
      }
      set((s) => ({
        chat: [...s.chat, { id: uid(), role: "assistant", content: lines.join("\n"), createdAt: Date.now() }],
      }));
    }

    // 4) 工單：如果使用者有提 & HS（熱風險）偏紅才建議建立
    if (parsed.wantsIncident) {
      // 用 HS last 來判斷（更貼近你 HS）
      const hsLast = stat(seriesMap["HS"]?.series ?? [])?.last;
      const isRed = hsLast != null && hsLast >= 80;

      if (!isRed) {
        set((s) => ({
          chat: [
            ...s.chat,
            {
              id: uid(),
              role: "assistant",
              content: `你提到要開工單，但目前 HS 未達 RED（last=${hsLast == null ? "-" : fmtMetric("HS", hsLast)}），所以我先不建立。`,
              createdAt: Date.now(),
            },
          ],
        }));
        return;
      }

      // 走 consent
      await get().runTool("ops-actions", "createIncident", {
        userId,
        type: "HEAT_STRESS",
        severity: "HIGH",
        evidence: { HS_last: hsLast, metricsWanted },
        note: "User requested incident creation; HS appears RED.",
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
              description: "此操作屬於高風險動作（建立事件/通知/寫入報告），請確認後再執行。",
            },
          ]
        : s.consentQueue,
    }));

    if (needConsent) return { pending: true, toolCallId: id };

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
          t.id === id ? { ...t, status: "error", finishedAt: Date.now(), error: e?.message ?? "Tool failed" } : t
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
          { id: uid(), role: "assistant", content: `已執行 ${tc.toolName}：${JSON.stringify(result)}`, createdAt: Date.now() },
        ],
      }));
    } catch (e: any) {
      set((s) => ({
        toolCalls: s.toolCalls.map((t) =>
          t.id === toolCallId ? { ...t, status: "error", finishedAt: Date.now(), error: e?.message ?? "Tool failed" } : t
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
      chat: [...s.chat, { id: uid(), role: "assistant", content: "已取消執行（使用者拒絕）。", createdAt: Date.now() }],
    }));
  },
}));
