"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const LOAN_TYPES = [
  { value: "MICRO", label: "Micro" },
  { value: "REGULAR", label: "Regular" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "EDUCATIONAL", label: "Educational" },
  { value: "LIVELIHOOD", label: "Livelihood" },
  { value: "HOUSING", label: "Housing" },
];

interface MemberResult {
  id: string;
  firstName: string;
  lastName: string;
  membershipNumber: string;
}

export default function NewLoanPage() {
  return (
    <Suspense>
      <NewLoanForm />
    </Suspense>
  );
}

function NewLoanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loanType, setLoanType] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberResult | null>(null);
  const [memberResults, setMemberResults] = useState<MemberResult[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("2.0");
  const [termMonths, setTermMonths] = useState("12");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill member from query params (when coming from member profile)
  useEffect(() => {
    const memberId = searchParams.get("memberId");
    const memberName = searchParams.get("memberName");
    const memberNumber = searchParams.get("memberNumber");
    if (memberId && memberName && memberNumber) {
      const [firstName, ...rest] = memberName.split(" ");
      const lastName = rest.join(" ");
      const member: MemberResult = {
        id: memberId,
        firstName,
        lastName,
        membershipNumber: memberNumber,
      };
      setSelectedMember(member);
      setMemberSearch(`${firstName} ${lastName} (${memberNumber})`);
    }
  }, [searchParams]);

  const searchMembers = async (q: string) => {
    setMemberSearch(q);
    setSelectedMember(null);
    if (q.length < 2) {
      setMemberResults([]);
      return;
    }
    setSearchingMembers(true);
    try {
      const res = await fetch(`/api/members?q=${encodeURIComponent(q)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setMemberResults(data);
      }
    } catch {
      // ignore
    }
    setSearchingMembers(false);
  };

  const selectMember = (member: MemberResult) => {
    setSelectedMember(member);
    setMemberSearch(`${member.firstName} ${member.lastName} (${member.membershipNumber})`);
    setMemberResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      setError("Please select a member from the search results.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMember.id,
          loanType,
          principalAmount: parseFloat(principalAmount),
          interestRate: parseFloat(interestRate) / 100,
          termMonths: parseInt(termMonths),
          purpose,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }

      const loan = await res.json();
      toast.success("Loan application submitted successfully");
      router.push(`/loans/${loan.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit loan application.";
      setError(msg);
      toast.error(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          New Loan Application
        </h1>
        <p className="text-sm text-muted-foreground">
          Submit a new loan application for a cooperative member
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
          <CardDescription>
            Fill in the loan application information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Member Search */}
            <div className="space-y-2">
              <Label htmlFor="member">Member</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="member"
                  placeholder="Search member by name or membership number..."
                  value={memberSearch}
                  onChange={(e) => searchMembers(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
              {/* Search Results Dropdown */}
              {memberResults.length > 0 && !selectedMember && (
                <div className="border rounded-lg shadow-sm bg-white divide-y">
                  {memberResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => selectMember(m)}
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/50 flex justify-between items-center gap-2 min-h-[44px]"
                    >
                      <span className="font-medium truncate">{m.lastName}, {m.firstName}</span>
                      <span className="text-muted-foreground font-mono text-xs shrink-0">{m.membershipNumber}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedMember && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Selected: {selectedMember.firstName} {selectedMember.lastName} ({selectedMember.membershipNumber})
                </p>
              )}
              {searchingMembers && (
                <p className="text-xs text-muted-foreground">Searching...</p>
              )}
            </div>

            {/* Loan Type */}
            <div className="space-y-2">
              <Label htmlFor="loanType">Loan Type</Label>
              <Select value={loanType} onValueChange={setLoanType} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select loan type" />
                </SelectTrigger>
                <SelectContent>
                  {LOAN_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount and Rate Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="principalAmount">Principal Amount (PHP)</Label>
                <Input
                  id="principalAmount"
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  placeholder="2.0"
                  min="0"
                  max="100"
                  step="0.01"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Term */}
            <div className="space-y-2">
              <Label htmlFor="termMonths">Term (Months)</Label>
              <Input
                id="termMonths"
                type="number"
                placeholder="12"
                min="1"
                max="360"
                value={termMonths}
                onChange={(e) => setTermMonths(e.target.value)}
                required
              />
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea
                id="purpose"
                placeholder="Describe the purpose of the loan..."
                rows={4}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 pt-4">
              <Button type="submit" disabled={submitting || !selectedMember}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
              <Link href="/loans">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
