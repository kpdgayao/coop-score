import { prisma } from "@/lib/db";
import { formatShortDate, getRiskBgColor, getRiskLabel, getSeverityColor } from "@/lib/format";
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
import { ScoreDistributionChart } from "@/components/charts/score-distribution-chart";
import { AnomalyAlertCard } from "@/components/ai/anomaly-alert-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    totalMembers,
    activeLoans,
    avgScoreResult,
    totalLoansForRate,
    delinquentLoans,
    recentScores,
    recentAlerts,
    scoreDistribution,
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
        member: { select: { firstName: true, lastName: true, id: true, membershipNumber: true } },
      },
    }),
    // Score distribution for chart
    Promise.all(
      (["EXCELLENT", "GOOD", "FAIR", "MARGINAL", "HIGH_RISK"] as const).map(async (cat) => {
        const count = await prisma.creditScore.count({
          where: {
            riskCategory: cat,
            id: {
              in: await prisma.creditScore
                .findMany({
                  where: { riskCategory: cat },
                  distinct: ["memberId"],
                  orderBy: { scoreDate: "desc" },
                  select: { id: true },
                })
                .then((scores) => scores.map((s) => s.id)),
            },
          },
        });
        return { category: cat, count };
      })
    ),
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
        <Link href="/members">
          <Card className="hover:shadow-md hover:border-primary/20 transition-all cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Members
              </CardTitle>
              <Users className="h-5 w-5 text-green-700" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalMembers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Registered cooperative members
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/loans">
          <Card className="hover:shadow-md hover:border-primary/20 transition-all cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Loans
              </CardTitle>
              <FileText className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeLoans.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Currently released and active
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/scoring">
          <Card className="hover:shadow-md hover:border-primary/20 transition-all cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Credit Score
              </CardTitle>
              <Calculator className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{avgScore}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all scored members
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/loans">
          <Card className="hover:shadow-md hover:border-primary/20 transition-all cursor-pointer h-full">
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
        </Link>
      </div>

      {/* Score Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ScoreDistributionChart data={scoreDistribution} />
        </CardContent>
      </Card>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Score Computations */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Score Computations</CardTitle>
          </CardHeader>
          <CardContent>
            {recentScores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Calculator className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">No credit scores computed yet</p>
                <p className="text-xs mt-1">Run batch scoring to generate scores for all members</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                      <TableRow key={score.id} className="hover:bg-muted/50 transition-colors">
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
              </div>
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
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">No anomaly alerts detected</p>
                <p className="text-xs mt-1">The system monitors member behavior patterns</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAlerts.map((alert) => (
                  <AnomalyAlertCard
                    key={alert.id}
                    alert={{
                      id: alert.id,
                      alertType: alert.alertType,
                      severity: alert.severity,
                      description: alert.description,
                      status: alert.status,
                      detectedAt: alert.detectedAt,
                      member: {
                        firstName: alert.member.firstName,
                        lastName: alert.member.lastName,
                        membershipNumber: alert.member.membershipNumber,
                      },
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
