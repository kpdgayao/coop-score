import { prisma } from "@/lib/db";
import {
  formatCurrency,
  formatShortDate,
  getLoanStatusColor,
  getLoanTypeColor,
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
import { Button } from "@/components/ui/button";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LoansPage() {
  const [totalLoans, pendingLoans, activeLoans, delinquentLoans, loans] =
    await Promise.all([
      prisma.loan.count(),
      prisma.loan.count({ where: { status: "PENDING" } }),
      prisma.loan.count({
        where: { status: { in: ["CURRENT", "RELEASED"] } },
      }),
      prisma.loan.count({
        where: { status: { in: ["DELINQUENT", "DEFAULT"] } },
      }),
      prisma.loan.findMany({
        orderBy: { applicationDate: "desc" },
        include: {
          member: {
            select: { firstName: true, lastName: true, id: true },
          },
        },
      }),
    ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Loan Applications
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and review loan applications
          </p>
        </div>
        <Link href="/loans/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Application
          </Button>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Loans
            </CardTitle>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalLoans.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All time loan records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Applications
            </CardTitle>
            <Clock className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingLoans}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Loans
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeLoans}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently released and active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delinquent
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{delinquentLoans}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Delinquent or defaulted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Loans Table */}
      <Card>
        <CardContent className="pt-6">
          {loans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">No loan applications found</p>
              <Link href="/loans/new" className="mt-3">
                <Button size="sm" variant="outline" className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Create first application
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan ID</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Application Date</TableHead>
                  <TableHead>Term</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <Link
                        href={`/loans/${loan.id}`}
                        className="font-mono text-sm hover:underline"
                      >
                        {loan.id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/members/${loan.member.id}`}
                        className="font-medium hover:underline"
                      >
                        {loan.member.lastName}, {loan.member.firstName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={getLoanTypeColor(loan.loanType)}
                      >
                        {formatEnumLabel(loan.loanType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(loan.principalAmount.toString())}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={getLoanStatusColor(loan.status)}
                      >
                        {formatEnumLabel(loan.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatShortDate(loan.applicationDate)}
                    </TableCell>
                    <TableCell>{loan.termMonths} months</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
