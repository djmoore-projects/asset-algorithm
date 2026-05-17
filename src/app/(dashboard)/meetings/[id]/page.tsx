import { getMeeting } from "@/actions/meetings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, MapPin, Video, Users, Building2, Brain, ListChecks } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeeting(id);
  const aiPrep = meeting.ai_prep as any;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/meetings" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to Meetings</Link>
      <div className="flex items-start justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">{meeting.title}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground"><span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{format(new Date(meeting.scheduled_at), "EEEE, MMMM d, yyyy")}</span><span className="flex items-center gap-1"><Clock className="h-4 w-4" />{format(new Date(meeting.scheduled_at), "h:mm a")}</span>{meeting.duration_minutes && <span>{meeting.duration_minutes} min</span>}</div>
        </div>
        <Badge>{meeting.status}</Badge>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          {meeting.description && <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{meeting.description}</p></CardContent></Card>}
          {aiPrep?.talking_points && (
            <Card className="border-border/50 border-primary/20"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Brain className="h-4 w-4 text-primary" />AI Meeting Prep</CardTitle></CardHeader><CardContent className="space-y-4">
              {aiPrep.research && <div><p className="text-xs font-medium uppercase text-muted-foreground">Research</p><p className="mt-1 text-sm">{aiPrep.research}</p></div>}
              <div><p className="text-xs font-medium uppercase text-muted-foreground">Talking Points</p><ul className="mt-1 space-y-1">{aiPrep.talking_points.map((point: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm"><ListChecks className="mt-0.5 h-3 w-3 shrink-0 text-primary" />{point}</li>)}</ul></div>
            </CardContent></Card>
          )}
          {meeting.outcome && <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Outcome</CardTitle></CardHeader><CardContent><p className="text-sm">{meeting.outcome}</p></CardContent></Card>}
        </div>
        <div className="space-y-6">
          <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader><CardContent className="space-y-3">
            <div><p className="text-xs text-muted-foreground">Type</p><Badge variant="outline">{meeting.meeting_type}</Badge></div>
            {meeting.location && <div><p className="text-xs text-muted-foreground">Location</p><p className="flex items-center gap-1 text-sm"><MapPin className="h-3 w-3" />{meeting.location}</p></div>}
            {meeting.meeting_url && <div><p className="text-xs text-muted-foreground">Meeting Link</p><a href={meeting.meeting_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline"><Video className="h-3 w-3" />Join Meeting</a></div>}
          </CardContent></Card>
          {meeting.contacts && <Card className="border-border/50"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4" />Contact</CardTitle></CardHeader><CardContent><p className="text-sm font-medium">{(meeting.contacts as any).first_name} {(meeting.contacts as any).last_name}</p></CardContent></Card>}
          {meeting.companies && <Card className="border-border/50"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4" />Company</CardTitle></CardHeader><CardContent><p className="text-sm font-medium">{(meeting.companies as any).name}</p></CardContent></Card>}
        </div>
      </div>
    </div>
  );
}
