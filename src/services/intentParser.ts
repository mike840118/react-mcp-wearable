// src/services/intentParser.ts

export type Intent =
  | "CHECK_FATIGUE"
  | "CHECK_HEAT"
  | "CHECK_BOTH"
  | "GENERATE_SUMMARY"
  | "CREATE_INCIDENT";

export type ParsedIntent = {
  ok: boolean;
  intents: Intent[];
  wantsIncident: boolean;
  reason?: string;
};

function includesAny(text: string, words: RegExp[]) {
  return words.some((re) => re.test(text));
}

/**
 * ✅ 白名單觸發詞：沒有這些詞就一律不觸發任何分析/工具
 * 你可以依產品 UX 自由調整
 */
const TRIGGER_WORDS: RegExp[] = [
  /幫我/,
  /請/,
  /麻煩/,
  /看/,
  /查/,
  /分析/,
  /評估/,
  /判斷/,
  /檢查/,
  /整理/,
  /產出/,
  /生成/,
  /摘要/,
  /報告/,
  /開工單/,
  /建立工單/,
  /通報/,
  /通知/,
];

/** 指標關鍵字（可擴充） */
const FATIGUE_WORDS: RegExp[] = [/疲勞/, /疲倦/, /累/, /hrv/, /rmssd/, /睡眠/, /sleep/];
const HEAT_WORDS: RegExp[] = [/熱/, /中暑/, /熱風險/, /高溫/, /heat/];
const SUMMARY_WORDS: RegExp[] = [/摘要/, /總結/, /報告/, /summary/, /report/];
const INCIDENT_WORDS: RegExp[] = [/工單/, /事件/, /通報/, /通知/, /incident/, /ticket/, /alert/];

export function parseIntent(text: string): ParsedIntent {
  const raw = text.trim();
  const t = raw.toLowerCase();

  // ✅ 1) 一定要包含觸發詞（白名單）
  if (!includesAny(t, TRIGGER_WORDS)) {
    return { ok: false, intents: [], wantsIncident: false, reason: "缺少觸發詞（例如：看/查/分析/摘要/開工單）" };
  }

  const hasFatigue = includesAny(t, FATIGUE_WORDS);
  const hasHeat = includesAny(t, HEAT_WORDS);
  const hasSummary = includesAny(t, SUMMARY_WORDS);
  const hasIncident = includesAny(t, INCIDENT_WORDS);

  const intents: Intent[] = [];

  if (hasFatigue && hasHeat) intents.push("CHECK_BOTH");
  else {
    if (hasFatigue) intents.push("CHECK_FATIGUE");
    if (hasHeat) intents.push("CHECK_HEAT");
  }

  if (hasSummary) intents.push("GENERATE_SUMMARY");
  if (hasIncident) intents.push("CREATE_INCIDENT");

  // ✅ 2) 有觸發詞但沒說要看什麼，也不跑（避免輸入「看」就出資料）
  if (intents.length === 0) {
    return { ok: false, intents: [], wantsIncident: false, reason: "有觸發詞但缺少目標（例如：疲勞/中暑/摘要/工單）" };
  }

  return {
    ok: true,
    intents,
    wantsIncident: hasIncident,
  };
}
