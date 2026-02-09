"use client";

import { useState } from "react";
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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const LOAN_TYPES = [
  { value: "MICRO", label: "Micro" },
  { value: "REGULAR", label: "Regular" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "EDUCATIONAL", label: "Educational" },
  { value: "LIVELIHOOD", label: "Livelihood" },
  { value: "HOUSING", label: "Housing" },
];

export default function NewLoanPage() {
  const [loanType, setLoanType] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [termMonths, setTermMonths] = useState("");
  const [purpose, setPurpose] = useState("");
  const [maturityDate, setMaturityDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(
      "Loan application submitted! (This is a placeholder - submission logic not yet implemented.)"
    );
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/loans">
        <Button variant="ghost" size="sm" className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to Loans
        </Button>
      </Link>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          New Loan Application
        </h1>
        <p className="text-muted-foreground">
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
              <Input
                id="member"
                placeholder="Search member by name or membership number..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Start typing to search for a cooperative member
              </p>
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
                  placeholder="0.00"
                  min="0"
                  max="100"
                  step="0.01"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Term and Maturity Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="maturityDate">Maturity Date</Label>
                <Input
                  id="maturityDate"
                  type="date"
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                  required
                />
              </div>
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

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <Button type="submit">Submit Application</Button>
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
