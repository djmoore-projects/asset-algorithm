"use client";

import { useEffect, useState, useRef } from "react";
import { useUIStore } from "@/stores/ui-store";
import { useAIStore } from "@/stores/ai-store";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  BarChart3,
  Bot,
  Building2,
  Calendar,
  FileSearch,
  Kanban,
  Mail,
  MessageSquare,
  Search,
  Send,
  Target,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";

const QUICK_ACTIONS = [
  { label: "Go to Dashboard", icon: BarChart3, href: "/dashboard" },
  { label: "Go to Sourcing", icon: Target, href: "/sourcing" },
  { label: "Go to Pipeline", icon: Kanban, href: "/pipeline" },
  { label: "Go to Outreach", icon: Mail, href: "/outreach" },
  { label: "Go to Relationships", icon: Users, href: "/relationships" },
  { label: "Go to Meetings", icon: Calendar, href: "/meetings" },
  { label: "Go to Advisory", icon: FileSearch, href: "/advisory" },
  { label: "Go to Analytics", icon: BarChart3, href: "/analytics" },
];

const AI_PROMPTS = [
  { label: "Show my pipeline summary", icon: Bot },
  { label: "Draft a cold email for a prospect", icon: MessageSquare },
  { label: "Analyze my deal flow metrics", icon: BarChart3 },
  { label: "Generate a call script", icon: Mail },
  { label: "Run a valuation analysis", icon: FileSearch },
];

export function AICommandBar() {
  const { commandBarOpen, setCommandBarOpen, setAIPanelOpen } = useUIStore();
  const { addMessage, setContext } = useAIStore();
  const router = useRouter();
  const [search, setSearch] = useState("");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandBarOpen(!commandBarOpen);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [commandBarOpen, setCommandBarOpen]);

  function handleNavigate(href: string) {
    router.push(href);
    setCommandBarOpen(false);
    setSearch("");
  }

  function handleAIPrompt(prompt: string) {
    setCommandBarOpen(false);
    setAIPanelOpen(true);
    addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      timestamp: new Date().toISOString(),
    });
    setSearch("");
  }

  function handleSubmitSearch() {
    if (search.trim()) {
      handleAIPrompt(search.trim());
    }
  }

  return (
    <CommandDialog open={commandBarOpen} onOpenChange={setCommandBarOpen}>
      <CommandInput
        placeholder="Search, navigate, or ask AI anything..."
        value={search}
        onValueChange={setSearch}
        onKeyDown={(e) => {
          if (e.key === "Enter" && search.trim()) {
            e.preventDefault();
            handleSubmitSearch();
          }
        }}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4">
            <Bot className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Press Enter to ask AI: &ldquo;{search}&rdquo;
            </p>
          </div>
        </CommandEmpty>

        {!search && (
          <>
            <CommandGroup heading="Navigation">
              {QUICK_ACTIONS.map((action) => (
                <CommandItem
                  key={action.href}
                  onSelect={() => handleNavigate(action.href)}
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  {action.label}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="AI Quick Actions">
              {AI_PROMPTS.map((prompt) => (
                <CommandItem
                  key={prompt.label}
                  onSelect={() => handleAIPrompt(prompt.label)}
                >
                  <prompt.icon className="mr-2 h-4 w-4" />
                  {prompt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
