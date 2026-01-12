export type VitalPoint = {
  t: number; // timestamp ms
  hr: number;
  hrv: number; // RMSSD (ms)
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function genVitalsSeries(userId: string, hours = 24): VitalPoint[] {
  // 10 分鐘一點
  const step = 10 * 60 * 1000;
  const total = Math.floor((hours * 60) / 10);
  const now = Date.now();

  // 用 userId 讓每個人趨勢不同
  const seed = Array.from(userId).reduce((a, c) => a + c.charCodeAt(0), 0);
  const baseHr = 68 + (seed % 9); // 68~76
  const baseHrv = 42 + (seed % 12); // 42~53

  const points: VitalPoint[] = [];
  for (let i = total; i >= 0; i--) {
    const t = now - i * step;

    // 模擬日內波動 + 隨機噪聲
    const dayWave = Math.sin((t / (1000 * 60 * 60)) * (Math.PI / 12)); // 24h 週期
    const noise1 = (Math.random() - 0.5) * 6;
    const noise2 = (Math.random() - 0.5) * 8;

    // 讓 mike 更偏「熱風險高」：HR略高、HRV略低
    const mikeBoost = userId === "mike" ? 6 : 0;
    const mikeHrvDown = userId === "mike" ? -6 : 0;

    const hr = clamp(baseHr + mikeBoost + dayWave * 8 + noise1, 50, 135);
    const hrv = clamp(baseHrv + mikeHrvDown - dayWave * 6 + noise2, 10, 120);

    points.push({ t, hr: Math.round(hr), hrv: Math.round(hrv) });
  }
  return points;
}
