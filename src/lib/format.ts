export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function getRiskColor(category: string): string {
  switch (category) {
    case "EXCELLENT":
      return "text-score-excellent";
    case "GOOD":
      return "text-score-good";
    case "FAIR":
      return "text-score-fair";
    case "MARGINAL":
      return "text-score-marginal";
    case "HIGH_RISK":
      return "text-score-high-risk";
    default:
      return "text-muted-foreground";
  }
}

export function getRiskBgColor(category: string): string {
  switch (category) {
    case "EXCELLENT":
      return "bg-emerald-100 text-emerald-800";
    case "GOOD":
      return "bg-teal-100 text-teal-800";
    case "FAIR":
      return "bg-amber-100 text-amber-800";
    case "MARGINAL":
      return "bg-orange-100 text-orange-800";
    case "HIGH_RISK":
      return "bg-red-100 text-red-800";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function getRiskLabel(category: string): string {
  switch (category) {
    case "EXCELLENT":
      return "Excellent";
    case "GOOD":
      return "Good";
    case "FAIR":
      return "Fair";
    case "MARGINAL":
      return "Marginal";
    case "HIGH_RISK":
      return "High Risk";
    default:
      return category;
  }
}
