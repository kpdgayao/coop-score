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
import {
  STANDARD_WEIGHTS,
  THIN_FILE_WEIGHTS,
  PROGRESSIVE_LADDER,
} from "@/lib/scoring/types";
import { formatCurrency } from "@/lib/format";

const DIMENSION_LABELS: Record<string, string> = {
  repaymentHistory: "Repayment History",
  capitalBuildup: "Capital Build-up",
  cooperativeEngagement: "Cooperative Engagement",
  membershipMaturity: "Membership Maturity",
  loanUtilization: "Loan Utilization",
  guarantorNetwork: "Guarantor Network",
  demographics: "Demographics",
};

const SCORE_RANGES = [
  {
    range: "750 - 850",
    category: "Excellent",
    color: "bg-emerald-100 text-emerald-800",
    description: "Premium borrower, lowest risk",
  },
  {
    range: "650 - 749",
    category: "Good",
    color: "bg-green-100 text-green-800",
    description: "Reliable borrower, standard terms",
  },
  {
    range: "550 - 649",
    category: "Fair",
    color: "bg-amber-100 text-amber-800",
    description: "Moderate risk, may need additional review",
  },
  {
    range: "450 - 549",
    category: "Marginal",
    color: "bg-orange-100 text-orange-800",
    description: "Elevated risk, restricted access",
  },
  {
    range: "300 - 449",
    category: "High Risk",
    color: "bg-red-100 text-red-800",
    description: "Highest risk, requires intervention",
  },
];

export default function SettingsPage() {
  const standardEntries = Object.entries(STANDARD_WEIGHTS) as [string, number][];
  const thinFileEntries = Object.entries(THIN_FILE_WEIGHTS) as [string, number][];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure the credit scoring model parameters and thresholds
        </p>
      </div>

      {/* Scoring Model Weights */}
      <Card>
        <CardHeader>
          <CardTitle>Scoring Model Weights</CardTitle>
          <CardDescription>
            Dimension weights used in Standard and Thin-File scoring pathways.
            Thin-File pathway applies to members without loan history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dimension</TableHead>
                <TableHead className="text-center">Standard Weight</TableHead>
                <TableHead className="text-center">Thin-File Weight</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standardEntries.map(([key, standardWeight]) => {
                const thinFileWeight =
                  thinFileEntries.find(([k]) => k === key)?.[1] ?? 0;
                return (
                  <TableRow key={key}>
                    <TableCell className="font-medium">
                      {DIMENSION_LABELS[key] ?? key}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-16 sm:w-24 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(standardWeight / 30) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono w-10 text-right">
                          {standardWeight}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-16 sm:w-24 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-600 rounded-full"
                            style={{ width: `${(thinFileWeight / 30) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono w-10 text-right">
                          {thinFileWeight}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="text-center font-bold font-mono">
                  {standardEntries.reduce((sum, [, w]) => sum + w, 0)}%
                </TableCell>
                <TableCell className="text-center font-bold font-mono">
                  {thinFileEntries.reduce((sum, [, w]) => sum + w, 0)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Score Range Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Score Range Thresholds</CardTitle>
          <CardDescription>
            Credit score ranges mapped to risk categories (scale: 300-850)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Score Range</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SCORE_RANGES.map((range) => (
                <TableRow key={range.category}>
                  <TableCell className="font-mono font-medium">
                    {range.range}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={range.color}>
                      {range.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {range.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Progressive Lending Ladder */}
      <Card>
        <CardHeader>
          <CardTitle>Progressive Lending Ladder</CardTitle>
          <CardDescription>
            Stage-based loan ceilings for thin-file members to build credit
            history progressively
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead>Loan Ceiling</TableHead>
                <TableHead>Requirements</TableHead>
                <TableHead>Graduation Criteria</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PROGRESSIVE_LADDER.map((stage) => (
                <TableRow key={stage.stage}>
                  <TableCell>
                    <Badge variant="secondary" className="font-medium">
                      {stage.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(stage.loanCeiling.min)} &ndash;{" "}
                    {formatCurrency(stage.loanCeiling.max)}
                  </TableCell>
                  <TableCell>
                    <ul className="list-disc list-inside text-sm space-y-0.5">
                      {stage.requirements.map((req, i) => (
                        <li key={i} className="text-muted-foreground">
                          {req}
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell>
                    <ul className="list-disc list-inside text-sm space-y-0.5">
                      {stage.graduationCriteria.map((crit, i) => (
                        <li key={i} className="text-muted-foreground">
                          {crit}
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
