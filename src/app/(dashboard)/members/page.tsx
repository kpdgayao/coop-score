import { prisma } from "@/lib/db";
import {
  formatCurrency,
  formatShortDate,
  getRiskBgColor,
  getRiskLabel,
} from "@/lib/format";
import {
  Card,
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
import { Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MemberSearch } from "@/components/members/member-search";

export const dynamic = "force-dynamic";

function getStatusColor(status: string): string {
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

function formatEmployment(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { membershipNumber: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status && status !== "ALL") {
    where.membershipStatus = status;
  }

  const members = await prisma.member.findMany({
    take: 50,
    orderBy: { lastName: "asc" },
    where,
    include: {
      creditScores: {
        take: 1,
        orderBy: { scoreDate: "desc" },
        select: { totalScore: true, riskCategory: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground">
            Manage cooperative members
          </p>
        </div>
        <Link href="/members/new">
          <Button className="gap-2 w-full sm:w-auto">
            <UserPlus className="h-4 w-4" />
            New Member
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <MemberSearch currentQuery={q ?? ""} currentStatus={status ?? "ALL"} />

      {/* Members Table */}
      <Card>
        <CardContent className="pt-6">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No members found{q ? ` matching "${q}"` : ""}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membership #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Employment</TableHead>
                  <TableHead>Monthly Income</TableHead>
                  <TableHead>Membership Date</TableHead>
                  <TableHead>Credit Score</TableHead>
                  <TableHead>Risk Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const latestScore = member.creditScores[0];
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Link
                          href={`/members/${member.id}`}
                          className="font-mono text-sm hover:underline"
                        >
                          {member.membershipNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/members/${member.id}`}
                          className="font-medium hover:underline"
                        >
                          {member.lastName}, {member.firstName}
                          {member.middleName ? ` ${member.middleName.charAt(0)}.` : ""}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={getStatusColor(member.membershipStatus)}
                        >
                          {member.membershipStatus.charAt(0) +
                            member.membershipStatus.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatEmployment(member.employmentType)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(member.monthlyIncome.toString())}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatShortDate(member.membershipDate)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {latestScore ? latestScore.totalScore : (
                          <span className="text-muted-foreground font-normal">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {latestScore ? (
                          <Badge
                            variant="secondary"
                            className={getRiskBgColor(latestScore.riskCategory)}
                          >
                            {getRiskLabel(latestScore.riskCategory)}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Not scored
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
