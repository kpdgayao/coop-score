"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  TrendingDown,
  Users,
  Shield,
  BarChart2,
  RefreshCw,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/format";

interface AnomalyAlertProps {
  alert: {
    id: string;
    alertType: string;
    severity: string;
    description: string;
    status: string;
    detectedAt: string | Date;
    member: {
      firstName: string;
      lastName: string;
      membershipNumber: string;
    };
  };
  onReview?: (id: string) => void;
}

const alertIcons: Record<string, typeof AlertTriangle> = {
  WITHDRAWAL_SPIKE: TrendingDown,
  ATTENDANCE_DROP: BarChart2,
  HOUSEHOLD_CLUSTER: Users,
  GUARANTOR_CONCENTRATION: Shield,
  MANUFACTURED_PATTERN: BarChart2,
  RAPID_LOAN_CYCLING: RefreshCw,
  OTHER: AlertTriangle,
};

const severityColors: Record<string, string> = {
  LOW: "bg-blue-100 text-blue-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-red-100 text-red-800",
};

export function AnomalyAlertCard({ alert, onReview }: AnomalyAlertProps) {
  const Icon = alertIcons[alert.alertType] || AlertTriangle;

  return (
    <Card className="border-l-4 border-l-amber-400">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-50 rounded-lg">
            <Icon className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">
                {alert.member.firstName} {alert.member.lastName}
              </span>
              <Badge variant="outline" className="text-[10px]">
                #{alert.member.membershipNumber}
              </Badge>
              <Badge className={severityColors[alert.severity] || "bg-muted"}>
                {alert.severity}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {alert.description}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {formatShortDate(alert.detectedAt)}
              </span>
              {alert.status === "NEW" && onReview && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onReview(alert.id)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Review
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
