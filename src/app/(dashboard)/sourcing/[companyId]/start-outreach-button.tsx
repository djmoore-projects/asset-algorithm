"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCampaign } from "@/actions/outreach";
import { updateCompany } from "@/actions/companies";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
}

interface StartOutreachButtonProps {
  companyId: string;
  companyName: string;
  contacts: Contact[];
}

export function StartOutreachButton({
  companyId,
  companyName,
  contacts,
}: StartOutreachButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStartOutreach() {
    setLoading(true);
    try {
      // Create the campaign
      const campaign = await createCampaign({
        name: `${companyName} Outreach`,
        target_company_ids: [companyId],
        target_contact_ids: contacts.map((c) => c.id),
        channels: ["email"],
        status: "draft",
      });

      // Update company status to contacted
      await updateCompany(companyId, { status: "contacted" });

      toast.success("Outreach campaign created");
      router.push(`/outreach/campaigns/${campaign.id}`);
    } catch (err) {
      toast.error("Failed to start outreach");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleStartOutreach}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Send className="mr-2 h-3.5 w-3.5" />
      )}
      Start Outreach
    </Button>
  );
}
