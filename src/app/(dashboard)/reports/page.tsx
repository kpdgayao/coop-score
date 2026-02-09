import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Users,
} from "lucide-react";

const REPORTS = [
  {
    title: "Portfolio at Risk (PAR)",
    description:
      "Analyze the percentage of the loan portfolio that is at risk of default, broken down by aging buckets (30, 60, 90+ days past due).",
    icon: AlertTriangle,
    iconColor: "text-red-500",
    bgColor: "bg-red-50",
  },
  {
    title: "Score Distribution by Tenure",
    description:
      "Examine how credit scores distribute across different membership tenure groups to identify scoring patterns and model calibration.",
    icon: BarChart3,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    title: "Engagement vs Default Correlation",
    description:
      "Analyze the relationship between cooperative engagement scores and loan default rates to validate the scoring model's engagement dimension.",
    icon: TrendingUp,
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-50",
  },
  {
    title: "Delinquency Aging Report",
    description:
      "Detailed breakdown of delinquent loans by aging period, member demographics, loan type, and geographic distribution within Cagayan de Oro.",
    icon: Users,
    iconColor: "text-amber-500",
    bgColor: "bg-amber-50",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Generate analytical reports for credit operations and portfolio monitoring
        </p>
      </div>

      {/* Report Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.title}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-lg ${report.bgColor}`}
                  >
                    <Icon className={`h-6 w-6 ${report.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {report.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
