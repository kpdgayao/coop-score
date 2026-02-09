import { prisma } from "@/lib/db";
import { formatShortDate, getActivityTypeColor, formatEnumLabel } from "@/lib/format";
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
import { Calendar, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const activities = await prisma.coopActivity.findMany({
    orderBy: { date: "desc" },
    include: {
      attendance: {
        select: { attended: true },
      },
    },
  });

  const totalActivities = activities.length;

  // Calculate average attendance rate
  let totalAttendanceRate = 0;
  let activitiesWithAttendance = 0;
  for (const activity of activities) {
    if (activity.attendance.length > 0) {
      const attended = activity.attendance.filter((a) => a.attended).length;
      totalAttendanceRate += (attended / activity.attendance.length) * 100;
      activitiesWithAttendance++;
    }
  }
  const avgAttendanceRate =
    activitiesWithAttendance > 0
      ? (totalAttendanceRate / activitiesWithAttendance).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Cooperative Activities
        </h1>
        <p className="text-sm text-muted-foreground">
          Track cooperative events, trainings, and member participation
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 max-w-lg">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Activities
            </CardTitle>
            <Calendar className="h-5 w-5 text-green-700" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalActivities}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Recorded activities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Attendance Rate
            </CardTitle>
            <Users className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgAttendanceRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average across all activities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activities Table */}
      <Card>
        <CardContent className="pt-6">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No activities recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>CETF Funded</TableHead>
                  <TableHead>Attendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => {
                  const attendedCount = activity.attendance.filter(
                    (a) => a.attended
                  ).length;
                  const totalInvited = activity.attendance.length;
                  return (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">
                        {activity.title}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={getActivityTypeColor(activity.activityType)}
                        >
                          {formatEnumLabel(activity.activityType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatEnumLabel(activity.category)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatShortDate(activity.date)}
                      </TableCell>
                      <TableCell>
                        {activity.cetfFunded ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Yes
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{attendedCount}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          / {totalInvited}
                        </span>
                        {totalInvited > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({((attendedCount / totalInvited) * 100).toFixed(0)}%)
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
