import { getContact } from "@/actions/contacts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, Linkedin, Star, Building2, User, Brain } from "lucide-react";
import Link from "next/link";

export default async function ContactDetailPage({ params }: { params: Promise<{ contactId: string }> }) {
  const { contactId } = await params;
  const contact = await getContact(contactId);
  const scoreColor = !contact.relationship_score ? "text-muted-foreground" : contact.relationship_score >= 75 ? "text-green-500" : contact.relationship_score >= 50 ? "text-primary" : "text-red-500";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/relationships" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to Relationships</Link>
      <div className="flex items-start justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">{contact.first_name} {contact.last_name}</h1>{contact.title && <p className="text-muted-foreground">{contact.title}</p>}</div>
        {contact.relationship_score && <div className={`flex items-center gap-1 text-lg font-bold ${scoreColor}`}><Star className="h-5 w-5" />{Math.round(contact.relationship_score)}/100</div>}
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Contact Information</CardTitle></CardHeader><CardContent className="space-y-3">
            {contact.email && <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm">{contact.email}</p></div></div>}
            {contact.phone && <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm">{contact.phone}</p></div></div>}
            {contact.linkedin_url && <div className="flex items-center gap-3"><Linkedin className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">LinkedIn</p><p className="text-sm">{contact.linkedin_url}</p></div></div>}
            <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Role Type</p><Badge variant="outline">{contact.role_type || "other"}</Badge></div></div>
          </CardContent></Card>
          {contact.ai_notes && <Card className="border-border/50"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Brain className="h-4 w-4" />AI Notes</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm text-muted-foreground">{contact.ai_notes}</p></CardContent></Card>}
          <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Interaction Timeline</CardTitle></CardHeader><CardContent><div className="flex flex-col items-center justify-center py-8 text-center"><p className="text-sm text-muted-foreground">No interactions recorded yet</p></div></CardContent></Card>
        </div>
        <div className="space-y-6">
          {contact.companies && <Card className="border-border/50"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4" />Company</CardTitle></CardHeader><CardContent><Link href={`/sourcing/${contact.company_id}`} className="text-sm font-medium hover:underline">{(contact.companies as any).name}</Link></CardContent></Card>}
          {contact.tags && (contact.tags as string[]).length > 0 && <Card className="border-border/50"><CardHeader><CardTitle className="text-sm">Tags</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-1">{(contact.tags as string[]).map((tag: string) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</CardContent></Card>}
        </div>
      </div>
    </div>
  );
}
