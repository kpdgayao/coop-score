import { prisma } from "@/lib/db";
import {
  formatCurrency,
  formatShortDate,
  getMemberStatusColor,
  getLoanStatusColor,
  formatEnumLabel,
} from "@/lib/format";
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
import {
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  DollarSign,
  Calendar,
  FileText,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberAIActions } from "@/components/scoring/member-ai-actions";

export const dynamic = "force-dynamic";

interface DimensionScoreData {
  dimension: string;
  score: number;
  weight: number;
  weightedScore: number;
}

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      shareCapital: {
        orderBy: { transactionDate: "desc" },
        take: 10,
      },
      loans: {
        orderBy: { applicationDate: "desc" },
      },
      creditScores: {
        orderBy: { scoreDate: "desc" },
        take: 5,
      },
      activityAttendance: {
        include: { activity: true },
      },
      committeeService: true,
      guarantorOf: {
        include: {
          loan: {
            include: {
              member: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      },
      referralsMade: true,
    },
  });

  if (!member) {
    notFound();
  }

  const latestScore = member.creditScores[0] ?? null;
  const dimensionScores = latestScore
    ? (latestScore.dimensionScores as unknown as DimensionScoreData[])
    : [];
  const latestShareCapital = member.shareCapital[0];
  const attendedCount = member.activityAttendance.filter(
    (a) => a.attended
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold break-words">
                  {member.firstName} {member.middleName ?? ""} {member.lastName}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground font-mono">
                    {member.membershipNumber}
                  </span>
                  <Badge
                    variant="secondary"
                    className={getMemberStatusColor(member.membershipStatus)}
                  >
                    {formatEnumLabel(member.membershipStatus)}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <a href={`/api/reports/member/${member.id}`} download>
                <Button variant="outline" className="gap-2 w-full sm:w-auto">
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              </a>
              <Link href={`/loans/new?memberId=${member.id}&memberName=${encodeURIComponent(`${member.firstName} ${member.lastName}`)}&memberNumber=${member.membershipNumber}`}>
                <Button className="gap-2 w-full sm:w-auto">
                  <FileText className="h-4 w-4" />
                  Apply for Loan
                </Button>
              </Link>
            </div>
          </div>

          {/* Basic Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{member.contactNumber}</span>
            </div>
            {member.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{member.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>
                {member.barangay}, {member.city}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>
                {formatEnumLabel(member.employmentType)}
                {member.employerOrBusiness
                  ? ` - ${member.employerOrBusiness}`
                  : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>{formatCurrency(member.monthlyIncome.toString())} / month</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Member since {formatShortDate(member.membershipDate)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Score & AI Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Credit Score & AI Analysis</h2>
        <MemberAIActions
          memberId={member.id}
          memberName={`${member.firstName} ${member.lastName}`}
          latestScore={
            latestScore
              ? {
                  id: latestScore.id,
                  totalScore: latestScore.totalScore,
                  riskCategory: latestScore.riskCategory,
                  scoringPathway: latestScore.scoringPathway,
                  scoreDate: latestScore.scoreDate.toISOString(),
                  dimensionScores: Array.isArray(dimensionScores) ? dimensionScores : [],
                  recommendations: latestScore.recommendations as {
                    narrative: string;
                    strengths: string[];
                    concerns: string[];
                    recommendation: string;
                    suggested_max_amount: number;
                    conditions: string[];
                    improvement_tips: string[];
                  } | null,
                }
              : null
          }
          scoreHistory={member.creditScores.map((s) => ({
            id: s.id,
            totalScore: s.totalScore,
            riskCategory: s.riskCategory,
            scoreDate: s.scoreDate.toISOString(),
          }))}
        />
      </div>

      {/* Loan History Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Loan History</h2>
        <Card>
          <CardContent className="pt-6">
            {member.loans.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No loan history found.
              </p>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Application Date</TableHead>
                    <TableHead>Maturity Date</TableHead>
                    <TableHead>Term</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.loans.map((loan) => (
                    <TableRow key={loan.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <Link
                          href={`/loans/${loan.id}`}
                          className="hover:underline"
                        >
                          <Badge variant="outline">
                            {loan.loanType.charAt(0) +
                              loan.loanType.slice(1).toLowerCase()}
                          </Badge>
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(loan.principalAmount.toString())}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={getLoanStatusColor(loan.status)}
                        >
                          {loan.status.charAt(0) +
                            loan.status.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatShortDate(loan.applicationDate)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatShortDate(loan.maturityDate)}
                      </TableCell>
                      <TableCell>
                        {loan.termMonths} months
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Share Capital Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Share Capital</h2>
        <Card>
          <CardContent className="pt-6">
            {latestShareCapital && (
              <div className="mb-4 p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Current Balance
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(latestShareCapital.runningBalance.toString())}
                </p>
              </div>
            )}
            {member.shareCapital.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No share capital transactions found.
              </p>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.shareCapital.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="text-muted-foreground">
                        {formatShortDate(tx.transactionDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {tx.transactionType
                            .split("_")
                            .map(
                              (w) =>
                                w.charAt(0) + w.slice(1).toLowerCase()
                            )
                            .join(" ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(tx.amount.toString())}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(tx.runningBalance.toString())}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cooperative Engagement Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Cooperative Engagement</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Activities Attended
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{attendedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                out of {member.activityAttendance.length} total invitations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Committee Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {member.committeeService.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {member.committeeService.filter((c) => c.isActive).length} currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Referrals Made
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {member.referralsMade.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Members referred to the cooperative
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Committee Service Details */}
        {member.committeeService.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Committee Service History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Committee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.committeeService.map((cs) => (
                    <TableRow key={cs.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">
                        {cs.committeeName}
                      </TableCell>
                      <TableCell>
                        {cs.role.charAt(0) + cs.role.slice(1).toLowerCase().replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatShortDate(cs.startDate)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {cs.endDate ? formatShortDate(cs.endDate) : "--"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            cs.isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {cs.isActive ? "Active" : "Ended"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guarantor Service */}
        {member.guarantorOf.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Guarantor Obligations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Loan Type</TableHead>
                    <TableHead>Guaranteed Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.guarantorOf.map((g) => (
                    <TableRow key={g.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <Link
                          href={`/loans/${g.loan.id}`}
                          className="font-medium hover:underline"
                        >
                          {g.loan.member.lastName}, {g.loan.member.firstName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {g.loan.loanType.charAt(0) +
                            g.loan.loanType.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(g.guaranteedAmount.toString())}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            g.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800"
                              : g.status === "CALLED"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {g.status.charAt(0) + g.status.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
