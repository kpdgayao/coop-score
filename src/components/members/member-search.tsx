"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface MemberSearchProps {
  currentQuery: string;
  currentStatus: string;
}

const STATUS_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "INACTIVE", label: "Inactive" },
  { key: "TERMINATED", label: "Terminated" },
];

export function MemberSearch({ currentQuery, currentStatus }: MemberSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState(currentQuery);

  const applyFilters = (q: string, status: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status && status !== "ALL") params.set("status", status);
    const qs = params.toString();
    router.push(`/members${qs ? `?${qs}` : ""}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(query, currentStatus);
  };

  return (
    <div className="flex items-center gap-4">
      <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or membership #..."
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => applyFilters(query, currentStatus)}
        />
      </form>
      <div className="flex gap-2">
        {STATUS_FILTERS.map((sf) => (
          <Badge
            key={sf.key}
            variant={currentStatus === sf.key || (!currentStatus && sf.key === "ALL") ? "secondary" : "outline"}
            className={
              (currentStatus === sf.key || (!currentStatus && sf.key === "ALL"))
                ? "bg-emerald-100 text-emerald-800 cursor-pointer"
                : "cursor-pointer"
            }
            onClick={() => applyFilters(query, sf.key)}
          >
            {sf.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
