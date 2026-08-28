"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { saveDailySendCap, unsuppressContact } from "@/actions/profile";

export function SendCapForm({ current }: { current: number }) {
  const [value, setValue] = useState(String(current));
  const [pending, startTransition] = useTransition();

  function save() {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error("Enter a number of messages per day, or 0 to pause sending");
      return;
    }
    startTransition(async () => {
      try {
        const saved = await saveDailySendCap(parsed);
        setValue(String(saved));
        toast.success(
          saved === 0 ? "Automated sending paused" : `Daily limit set to ${saved}`
        );
      } catch {
        toast.error("Couldn't save the limit. Try again.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="daily-cap">Messages per day</Label>
      <div className="flex gap-2">
        <Input
          id="daily-cap"
          type="number"
          min={0}
          max={500}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="max-w-32"
        />
        <Button onClick={save} disabled={pending || value === String(current)}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

export function UnsuppressButton({ contactId }: { contactId: string }) {
  const [pending, startTransition] = useTransition();

  function restore() {
    startTransition(async () => {
      try {
        await unsuppressContact(contactId);
        toast.success("Contact restored — they can be messaged again");
      } catch {
        toast.error("Couldn't restore this contact. Try again.");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={restore}
      disabled={pending}
      className="shrink-0 text-xs"
    >
      {pending ? "Restoring..." : "Restore"}
    </Button>
  );
}
