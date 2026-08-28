import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Public opt-out landing page.
 *
 * Reached from the footer of every automated email, so it takes no session and
 * resolves the recipient from an unguessable per-contact token. Processing on
 * load keeps it one click, which is what CAN-SPAM expects and what people
 * actually do.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const outcome = await processUnsubscribe(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-border/60 bg-card p-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight">{outcome.heading}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{outcome.message}</p>
      </div>
    </main>
  );
}

interface Outcome {
  heading: string;
  message: string;
}

async function processUnsubscribe(token: string | undefined): Promise<Outcome> {
  if (!token) {
    return {
      heading: "Link incomplete",
      message:
        "This unsubscribe link is missing its identifier. Reply to any message you received and we'll remove you manually.",
    };
  }

  try {
    const supabase = createAdminClient();

    const { data: contact } = await supabase
      .from("contacts")
      .select("id, email, unsubscribed_at")
      .eq("unsubscribe_token", token)
      .maybeSingle();

    const row = contact as { id: string; email: string | null; unsubscribed_at: string | null } | null;

    if (!row) {
      return {
        heading: "Link not recognized",
        message:
          "We couldn't match this link to a recipient. It may have already been used. Reply to any message you received and we'll remove you manually.",
      };
    }

    if (row.unsubscribed_at) {
      return {
        heading: "Already unsubscribed",
        message: `${row.email || "This address"} is already removed. You won't receive further messages from us.`,
      };
    }

    await supabase
      .from("contacts")
      .update({
        unsubscribed_at: new Date().toISOString(),
        suppression_reason: "unsubscribed",
      })
      .eq("id", row.id);

    return {
      heading: "You're unsubscribed",
      message: `${row.email || "This address"} has been removed. You won't receive further messages from us.`,
    };
  } catch (error) {
    console.error("[Unsubscribe]", error instanceof Error ? error.message : error);
    return {
      heading: "Something went wrong",
      message:
        "We couldn't process this right now. Reply to any message you received and we'll remove you manually.",
    };
  }
}
