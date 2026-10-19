export function formatAmerican(odds: number): string {
  const rounded = Math.round(odds);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

export function formatEv(evPercent: number): string {
  const sign = evPercent > 0 ? "+" : "";
  return `${sign}${evPercent.toFixed(1)}%`;
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatProb(probability: number): string {
  return `${(probability * 100).toFixed(1)}%`;
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
