import { prisma } from "@/lib/db";
import {
  formatCurrency,
  formatDate,
  formatShortDate,
  getLoanStatusColor,
  getPaymentStatusColor,
  formatEnumLabel,
} from "@/lib/format";
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
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LoanAIActions } from "@/components/ai/loan-ai-actions";

export const dynamic = "force-dynamic";

interface NarrativeAssessmentData {
  score: number;
  risk_level: string;
  flags: string[];
  reasoning: string;
  purpose_category: string;
  alignment_with_profile: string;
}

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          membershipNumber: true,
        },
      },
      payments: {
        orderBy: { dueDate: "asc" },
      },
      guarantors: {
        include: {
          guarantor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              membershipNumber: true,
            },
          },
        },
      },
      interviews: {
        orderBy: { startedAt: "desc" },
        include: {
          conductedBy: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!loan) {
    notFound();
  }

  const narrative = loan.narrativeAssessment as NarrativeAssessmentData | null;

  // Get a valid user ID for conducting interviews
  const firstUser = await prisma.user.findFirst({ select: { id: true } });

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/loans">
        <Button variant="ghost" size="sm" className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to Loans
        </Button>
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge
                  variant="secondary"
                  className="text-base px-3 py-1"
                >
                  {loan.loanType.charAt(0) +
                    loan.loanType.slice(1).toLowerCase()}{" "}
                  Loan
                </Badge>
                <Badge
                  variant="secondary"
                  className={getLoanStatusColor(loan.status)}
                >
                  {loan.status.charAt(0) + loan.status.slice(1).toLowerCase()}
                </Badge>
              </div>
              <div className="text-2xl sm:text-3xl font-bold">
                {formatCurrency(loan.principalAmount.toString())}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Applicant:{" "}
                <Link
                  href={`/members/${loan.member.id}`}
                  className="font-medium hover:underline text-foreground"
                >
                  {loan.member.firstName} {loan.member.lastName}
                </Link>{" "}
                <span className="font-mono">({loan.member.membershipNumber})</span>
              </p>
            </div>
            <div className="text-sm text-muted-foreground font-mono">
              ID: {loan.id.slice(0, 8)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loan Details Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Purpose</p>
              <p className="font-medium mt-1 break-words line-clamp-3">{loan.purpose}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Interest Rate</p>
              <p className="font-medium mt-1">
                {(Number(loan.interestRate) * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Term</p>
              <p className="font-medium mt-1">{loan.termMonths} months</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Application Date</p>
              <p className="font-medium mt-1">
                {formatDate(loan.applicationDate)}
              </p>
            </div>
            {loan.approvalDate && (
              <div>
                <p className="text-sm text-muted-foreground">Approval Date</p>
                <p className="font-medium mt-1">
                  {formatDate(loan.approvalDate)}
                </p>
              </div>
            )}
            {loan.releaseDate && (
              <div>
                <p className="text-sm text-muted-foreground">Release Date</p>
                <p className="font-medium mt-1">
                  {formatDate(loan.releaseDate)}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Maturity Date</p>
              <p className="font-medium mt-1">
                {formatDate(loan.maturityDate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Features: Narrative Analysis & Loan Interview */}
      <LoanAIActions
        loanId={loan.id}
        memberId={loan.member.id}
        memberName={`${loan.member.firstName} ${loan.member.lastName}`}
        existingNarrative={narrative}
        conductedById={firstUser?.id ?? ""}
      />

      {/* Payment Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Schedule</CardTitle>
          <CardDescription>
            {loan.payments.length} scheduled payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loan.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No payment schedule generated yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount Due</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Penalty</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loan.payments.map((payment, index) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      {formatShortDate(payment.dueDate)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.amountDue.toString())}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(payment.amountPaid.toString())}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCurrency(payment.principal.toString())}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCurrency(payment.interest.toString())}
                    </TableCell>
                    <TableCell>
                      {Number(payment.penalty) > 0 ? (
                        <span className="text-red-600 font-medium">
                          {formatCurrency(payment.penalty.toString())}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={getPaymentStatusColor(payment.status)}
                      >
                        {payment.status === "ON_TIME"
                          ? "On Time"
                          : payment.status.charAt(0) +
                            payment.status.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Guarantors */}
      <Card>
        <CardHeader>
          <CardTitle>Guarantors</CardTitle>
        </CardHeader>
        <CardContent>
          {loan.guarantors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No guarantors assigned to this loan.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guarantor</TableHead>
                  <TableHead>Membership #</TableHead>
                  <TableHead>Guaranteed Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loan.guarantors.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <Link
                        href={`/members/${g.guarantor.id}`}
                        className="font-medium hover:underline"
                      >
                        {g.guarantor.lastName}, {g.guarantor.firstName}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {g.guarantor.membershipNumber}
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
          )}
        </CardContent>
      </Card>

      {/* Interviews */}
      {loan.interviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Loan Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Conducted By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Topics Covered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loan.interviews.map((interview) => (
                  <TableRow key={interview.id}>
                    <TableCell className="text-muted-foreground">
                      {formatShortDate(interview.startedAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {interview.conductedBy.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          interview.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : interview.status === "IN_PROGRESS"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {interview.status === "IN_PROGRESS"
                          ? "In Progress"
                          : interview.status.charAt(0) +
                            interview.status.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {interview.topicsCovered.map((topic, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
