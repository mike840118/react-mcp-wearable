import type { MetricKey } from "./users";

export type MetricPoint = { t: number; v: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function genMetricSeries(userId: string, metric: MetricKey, hours = 24): MetricPoint[] {
  const step = 10 * 60 * 1000; // 10min
  const total = Math.floor((hours * 60) / 10);
  const now = Date.now();

  const seed = Array.from(userId).reduce((a, c) => a + c.charCodeAt(0), 0);
  const wave = (t: number) => Math.sin((t / (1000 * 60 * 60)) * (Math.PI / 12)); // 24h cycle

  const points: MetricPoint[] = [];
  for (let i = total; i >= 0; i--) {
    const t = now - i * step;
    const w = wave(t);
    const n1 = Math.random() - 0.5;

    let v = 0;
    const mike = userId === "mike" ? 1 : 0;

    switch (metric) {
      case "HR": {
        const base = 68 + (seed % 9) + mike * 6;
        v = clamp(base + w * 10 + n1 * 6, 45, 140);
        break;
      }
      case "HRV": {
        const base = 42 + (seed % 12) - mike * 6;
        v = clamp(base - w * 8 + n1 * 10, 10, 120);
        break;
      }
      case "SPO2": {
        const base = 97 + (seed % 2);
        v = clamp(base - Math.max(0, w) * 1.2 + n1 * 0.8 - mike * 0.5, 88, 100);
        break;
      }
      case "TEMP": {
        const base = 36.7 + ((seed % 5) * 0.05) + mike * 0.25;
        v = clamp(base + Math.max(0, w) * 0.6 + n1 * 0.15, 35.5, 39.5);
        break;
      }
      case "STEP": {
        const base = 80 + (seed % 80);
        v = clamp(base + Math.max(0, w) * 200 + n1 * 60 + mike * 40, 0, 800);
        break;
      }
      case "KCKL": {
        const base = 6 + (seed % 6);
        v = clamp(base + Math.max(0, w) * 18 + n1 * 4 + mike * 2, 0, 60);
        break;
      }
      case "HS": {
        const base = 30 + (seed % 15) + mike * 25;
        v = clamp(base + Math.max(0, w) * 35 + n1 * 8, 0, 100);
        break;
      }
      case "FTG": {
        const base = 40 + (seed % 15) + mike * 18;
        v = clamp(base + (-w) * 25 + n1 * 10, 0, 100);
        break;
      }
    }

    points.push({ t, v: Math.round(v * 10) / 10 });
  }

  return points;
}
