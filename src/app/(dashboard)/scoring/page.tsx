import { prisma } from "@/lib/db";
import { formatShortDate, getRiskBgColor, getRiskLabel } from "@/lib/format";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
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
import { Button } from "@/components/ui/button";
import { Calculator, Play, UserCheck } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const RISK_CATEGORIES = [
  {
    key: "EXCELLENT",
    label: "Excellent",
    range: "750-850",
    color: "bg-emerald-500",
    bgColor: "bg-emerald-50 border-emerald-200",
    textColor: "text-emerald-700",
  },
  {
    key: "GOOD",
    label: "Good",
    range: "650-749",
    color: "bg-teal-500",
    bgColor: "bg-teal-50 border-teal-200",
    textColor: "text-teal-700",
  },
  {
    key: "FAIR",
    label: "Fair",
    range: "550-649",
    color: "bg-amber-500",
    bgColor: "bg-amber-50 border-amber-200",
    textColor: "text-amber-700",
  },
  {
    key: "MARGINAL",
    label: "Marginal",
    range: "450-549",
    color: "bg-orange-500",
    bgColor: "bg-orange-50 border-orange-200",
    textColor: "text-orange-700",
  },
  {
    key: "HIGH_RISK",
    label: "High Risk",
    range: "300-449",
    color: "bg-red-500",
    bgColor: "bg-red-50 border-red-200",
    textColor: "text-red-700",
  },
];

export default async function ScoringPage() {
  const [distribution, recentScores] = await Promise.all([
    Promise.all(
      RISK_CATEGORIES.map(async (cat) => {
        const count = await prisma.creditScore.count({
          where: {
            riskCategory: cat.key as "EXCELLENT" | "GOOD" | "FAIR" | "MARGINAL" | "HIGH_RISK",
            id: {
              in: await prisma.creditScore
                .findMany({
                  where: {
                    riskCategory: cat.key as "EXCELLENT" | "GOOD" | "FAIR" | "MARGINAL" | "HIGH_RISK",
                  },
                  distinct: ["memberId"],
                  orderBy: { scoreDate: "desc" },
                  select: { id: true },
                })
                .then((scores) => scores.map((s) => s.id)),
            },
          },
        });
        return { ...cat, count };
      })
    ),
    prisma.creditScore.findMany({
      take: 20,
      orderBy: { scoreDate: "desc" },
      include: {
        member: {
          select: { firstName: true, lastName: true, id: true },
        },
      },
    }),
  ]);

  const totalScored = distribution.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Credit Scoring Engine
          </h1>
          <p className="text-sm text-muted-foreground">
            Cooperative-context credit intelligence powered by AI
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" size="sm">
            <UserCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Score Individual</span>
            <span className="sm:hidden">Score</span>
          </Button>
          <Button className="gap-2" size="sm">
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Run Batch Scoring</span>
            <span className="sm:hidden">Batch</span>
          </Button>
        </div>
      </div>

      {/* Score Distribution */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Score Distribution</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          {distribution.map((cat) => (
            <Card key={cat.key} className={`border ${cat.bgColor}`}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`h-3 w-3 rounded-full ${cat.color}`} />
                  <span className={`text-sm font-semibold ${cat.textColor}`}>
                    {cat.label}
                  </span>
                </div>
                <div className={`text-3xl font-bold ${cat.textColor}`}>
                  {cat.count}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {cat.range} score range
                </p>
                {totalScored > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {((cat.count / totalScored) * 100).toFixed(1)}% of scored members
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Computations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Computations</CardTitle>
          <CardDescription>
            Last 20 credit score calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentScores.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No credit scores have been computed yet. Run batch scoring to
              generate scores for all members.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Risk Category</TableHead>
                  <TableHead>Pathway</TableHead>
                  <TableHead>Model</TableHead>
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
                    <TableCell className="font-bold text-lg">
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
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      v{score.modelVersion}
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
    </div>
  );
}
