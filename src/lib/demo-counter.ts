export const DEMO_DAILY_LIMIT = 25;

export function todayKey() {
  return `mokizador-gens-${new Date().toISOString().slice(0, 10)}`;
}

export function getUsedCount(): number {
  const stored = Number(localStorage.getItem(todayKey()) ?? "0");
  return Number.isFinite(stored) ? stored : 0;
}

export function trackGeneration() {
  const next = getUsedCount() + 1;
  localStorage.setItem(todayKey(), String(next));
  return next;
}
