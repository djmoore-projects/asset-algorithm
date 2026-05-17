import { getMeetings } from "@/actions/meetings";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users } from "lucide-react";
import Link from "next/link";
import { format, isPast, isToday } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-500",
  confirmed: "bg-green-500/10 text-green-500",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-red-500/10 text-red-500",
};

export default async function MeetingsPage() {
  const meetings = await getMeetings();
  const upcoming = meetings.filter(
    (m: any) => !isPast(new Date(m.scheduled_at)) || isToday(new Date(m.scheduled_at))
  );
  const past = meetings.filter(
    (m: any) => isPast(new Date(m.scheduled_at)) && !isToday(new Date(m.scheduled_at))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meetings</h1>
        <p className="text-sm text-muted-foreground">
          Upcoming and past meetings with AI-powered prep
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium">No upcoming meetings</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Meetings will appear here when scheduled
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((meeting: any) => (
              <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
                <Card className="cursor-pointer border-border/50 transition-colors hover:border-border hover:bg-muted/20">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <span className="text-xs font-medium">
                        {format(new Date(meeting.scheduled_at), "MMM")}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {format(new Date(meeting.scheduled_at), "d")}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{meeting.title}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(meeting.scheduled_at), "h:mm a")}
                        </span>
                        {meeting.duration_minutes && (
                          <span>{meeting.duration_minutes} min</span>
                        )}
                        {meeting.contacts && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {meeting.contacts.first_name} {meeting.contacts.last_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge className={STATUS_COLORS[meeting.status] || ""}>
                      {meeting.status}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Past
          </h2>
          <div className="space-y-2">
            {past.slice(0, 10).map((meeting: any) => (
              <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
                <Card className="cursor-pointer border-border/50 opacity-70 transition-colors hover:opacity-100">
                  <CardContent className="flex items-center gap-4 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(meeting.scheduled_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {meeting.status}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
