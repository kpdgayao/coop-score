import { prisma } from "@/lib/db";
import { formatShortDate, getRiskBgColor, getRiskLabel } from "@/lib/format";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, Calculator, AlertTriangle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function getSeverityColor(severity: string): string {
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

export default async function DashboardPage() {
  const [
    totalMembers,
    activeLoans,
    avgScoreResult,
    totalLoansForRate,
    delinquentLoans,
    recentScores,
    recentAlerts,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.loan.count({
      where: { status: { in: ["CURRENT", "RELEASED"] } },
    }),
    prisma.creditScore.aggregate({
      _avg: { totalScore: true },
    }),
    prisma.loan.count({
      where: {
        status: {
          in: ["CURRENT", "RELEASED", "DELINQUENT", "DEFAULT", "PAID"],
        },
      },
    }),
    prisma.loan.count({
      where: { status: { in: ["DELINQUENT", "DEFAULT"] } },
    }),
    prisma.creditScore.findMany({
      take: 10,
      orderBy: { scoreDate: "desc" },
      include: {
        member: { select: { firstName: true, lastName: true, id: true } },
      },
    }),
    prisma.anomalyAlert.findMany({
      take: 5,
      orderBy: { detectedAt: "desc" },
      include: {
        member: { select: { firstName: true, lastName: true, id: true } },
      },
    }),
  ]);

  const avgScore = Math.round(avgScoreResult._avg.totalScore ?? 0);
  const delinquencyRate =
    totalLoansForRate > 0
      ? ((delinquentLoans / totalLoansForRate) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of Oro Integrated Cooperative credit operations
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Members
            </CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalMembers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered cooperative members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Loans
            </CardTitle>
            <FileText className="h-5 w-5 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeLoans.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently released and active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Credit Score
            </CardTitle>
            <Calculator className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgScore}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all scored members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delinquency Rate
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{delinquencyRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Delinquent or defaulted loans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Score Computations */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Score Computations</CardTitle>
          </CardHeader>
          <CardContent>
            {recentScores.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No credit scores computed yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Risk Category</TableHead>
                    <TableHead>Pathway</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentScores.map((score) => (
                    <TableRow key={score.id}>
                      <TableCell>
                        <Link
                          href={`/members/${score.member.id}`}
                          className="font-medium hover:underline"
                        >
                          {score.member.lastName}, {score.member.firstName}
                        </Link>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {score.totalScore}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={getRiskBgColor(score.riskCategory)}
                        >
                          {getRiskLabel(score.riskCategory)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {score.scoringPathway === "THIN_FILE"
                            ? "Thin File"
                            : "Standard"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatShortDate(score.scoreDate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Anomaly Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Anomaly Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No anomaly alerts detected.
              </p>
            ) : (
              <div className="space-y-4">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex flex-col gap-1.5 border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="secondary"
                        className={getSeverityColor(alert.severity)}
                      >
                        {alert.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatShortDate(alert.detectedAt)}
                      </span>
                    </div>
                    <Link
                      href={`/members/${alert.member.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {alert.member.lastName}, {alert.member.firstName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">
                        {alert.alertType.replace(/_/g, " ")}
                      </span>{" "}
                      &mdash;{" "}
                      {alert.description.length > 80
                        ? alert.description.slice(0, 80) + "..."
                        : alert.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
