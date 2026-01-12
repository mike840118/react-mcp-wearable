import type { MetricKey } from "../data/mock/users";

export type Intent =
  | "FETCH_SNAPSHOT"      // 取當下8指標快照（左側那種）
  | "FETCH_SERIES"        // 取某些指標的 24h series
  | "GENERATE_REPORT"     // 產 markdown 報表
  | "CREATE_INCIDENT";    // 建立工單（高風險）

export type ParsedIntent = {
  ok: boolean;
  intents: Intent[];
  metricsWanted: MetricKey[]; // 需要查的指標（可空）
  wantsIncident: boolean;
  reason?: string;
};

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

// ✅ 觸發詞：沒有這些詞就不跑（避免輸入 1 也跑）
const TRIGGER_WORDS: RegExp[] = [
  /幫我/, /請/, /麻煩/,
  /看/, /查/, /查詢/, /分析/, /評估/, /檢查/, /判斷/, /整理/, /產出/, /生成/,
  /摘要/, /報表/, /報告/,
  /\bget\b/, /\bcheck\b/, /\banalyze\b/, /\breport\b/, /\bsummary\b/,
];

// ✅ 報表詞（你選 B：Markdown）
const REPORT_WORDS: RegExp[] = [/報表/, /報告/, /摘要/, /總結/, /\breport\b/, /\bsummary\b/];

// ✅ 工單/通知詞
const INCIDENT_WORDS: RegExp[] = [/工單/, /事件/, /通報/, /通知/, /\bincident\b/, /\bticket\b/, /\balert\b/];

function includesAny(text: string, words: RegExp[]) {
  return words.some((re) => re.test(text));
}

/** 英文指標 + 中文口語 mapping（你說兩種都要） */
const METRIC_PATTERNS: Array<{ key: MetricKey; patterns: RegExp[] }> = [
  { key: "HS",   patterns: [/\bhs\b/i, /heat\s*stress/i, /熱壓力/, /熱風險/, /中暑風險/, /熱中暑/] },
  { key: "FTG",  patterns: [/\bftg\b/i, /fatigue/i, /疲勞/, /疲倦/, /累/] },
  { key: "HR",   patterns: [/\bhr\b/i, /heart\s*rate/i, /心率/, /心跳/] },
  { key: "SPO2", patterns: [/\bspo2\b/i, /blood\s*oxygen/i, /血氧/, /血氧濃度/] },
  { key: "TEMP", patterns: [/\btemp\b/i, /temperature/i, /體溫/, /溫度/] },
  { key: "HRV",  patterns: [/\bhrv\b/i, /rmssd/i, /心率變異/, /心率變異度/] },
  { key: "STEP", patterns: [/\bstep(s)?\b/i, /步數/, /走路/, /活動量/] },
  { key: "KCKL", patterns: [/\bkckl\b/i, /\bkcal\b/i, /卡路里/, /大卡/, /消耗/, /熱量/] },
];

function detectMetrics(text: string): MetricKey[] {
  const hits: MetricKey[] = [];
  for (const m of METRIC_PATTERNS) {
    if (m.patterns.some((p) => p.test(text))) hits.push(m.key);
  }
  return uniq(hits);
}

export function parseIntent(text: string): ParsedIntent {
  const raw = text.trim();
  const t = raw.toLowerCase();

  // ✅ 必須包含觸發詞
  if (!includesAny(t, TRIGGER_WORDS)) {
    return {
      ok: false,
      intents: [],
      metricsWanted: [],
      wantsIncident: false,
      reason: "缺少觸發詞（例如：看/查/分析/報表/摘要）",
    };
  }

  const metricsWanted = detectMetrics(t);
  const wantsReport = includesAny(t, REPORT_WORDS);
  const wantsIncident = includesAny(t, INCIDENT_WORDS);

  const intents: Intent[] = [];

  // 有指定 metric => 取 series
  if (metricsWanted.length > 0) intents.push("FETCH_SERIES");

  // 想要報表 => 一般也會需要 snapshot / series
  if (wantsReport) intents.push("GENERATE_REPORT");

  // 有工單字眼 => 後續判斷是否該建（會走 consent）
  if (wantsIncident) intents.push("CREATE_INCIDENT");

  // 如果只有「報表/摘要」但沒指定 metric：預設拿快照 + 核心指標 series（HR/HRV/HS/FTG）
  if (wantsReport && metricsWanted.length === 0) {
    intents.push("FETCH_SNAPSHOT");
    // 讓報表至少有內容
    metricsWanted.push("HS", "FTG", "HR", "HRV");
  }

  // 有觸發詞但完全沒命中（避免只輸入「看」）
  if (intents.length === 0) {
    return {
      ok: false,
      intents: [],
      metricsWanted: [],
      wantsIncident: false,
      reason: "有觸發詞但缺少目標（例如：HR/心率、SPO2/血氧、TEMP/體溫、報表/摘要）",
    };
  }

  return {
    ok: true,
    intents: uniq(intents),
    metricsWanted: uniq(metricsWanted),
    wantsIncident,
  };
}
