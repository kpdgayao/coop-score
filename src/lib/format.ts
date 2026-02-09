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
      return "bg-green-100 text-green-800";
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

export function getMemberStatusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-800";
    case "INACTIVE":
      return "bg-gray-100 text-gray-800";
    case "TERMINATED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function getLoanStatusColor(status: string): string {
  switch (status) {
    case "CURRENT":
    case "RELEASED":
      return "bg-emerald-100 text-emerald-800";
    case "PAID":
      return "bg-blue-100 text-blue-800";
    case "PENDING":
      return "bg-amber-100 text-amber-800";
    case "APPROVED":
      return "bg-green-100 text-green-800";
    case "DELINQUENT":
      return "bg-orange-100 text-orange-800";
    case "DEFAULT":
      return "bg-red-100 text-red-800";
    case "RESTRUCTURED":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function getLoanTypeColor(type: string): string {
  switch (type) {
    case "MICRO":
      return "bg-blue-100 text-blue-800";
    case "REGULAR":
      return "bg-slate-100 text-slate-800";
    case "EMERGENCY":
      return "bg-red-100 text-red-800";
    case "EDUCATIONAL":
      return "bg-purple-100 text-purple-800";
    case "LIVELIHOOD":
      return "bg-emerald-100 text-emerald-800";
    case "HOUSING":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case "ON_TIME":
      return "bg-emerald-100 text-emerald-800";
    case "LATE":
      return "bg-amber-100 text-amber-800";
    case "MISSED":
      return "bg-red-100 text-red-800";
    case "PARTIAL":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case "HIGH":
      return "bg-red-100 text-red-800";
    case "MEDIUM":
      return "bg-amber-100 text-amber-800";
    case "LOW":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function getActivityTypeColor(type: string): string {
  switch (type) {
    case "GENERAL_ASSEMBLY":
      return "bg-blue-100 text-blue-800";
    case "TRAINING":
      return "bg-purple-100 text-purple-800";
    case "SEMINAR":
      return "bg-indigo-100 text-indigo-800";
    case "COMMITTEE_MEETING":
      return "bg-slate-100 text-slate-800";
    case "COMMUNITY_SERVICE":
      return "bg-emerald-100 text-emerald-800";
    case "VOLUNTEER":
      return "bg-green-100 text-green-800";
    case "ELECTION":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function formatEnumLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}
