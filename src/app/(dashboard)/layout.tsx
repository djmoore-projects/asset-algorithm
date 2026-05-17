import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AICommandBar } from "@/components/layout/ai-command-bar";
import { AIChatPanel } from "@/components/ai/chat-panel";
import { ErrorBoundary } from "@/components/shared/error-boundary";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          user={{
            email: user.email,
            user_metadata: user.user_metadata as { full_name?: string },
          }}
        />
        <main className="flex-1 overflow-y-auto p-6"><ErrorBoundary>{children}</ErrorBoundary></main>
      </div>
      <AICommandBar />
      <AIChatPanel />
    </div>
  );
}
