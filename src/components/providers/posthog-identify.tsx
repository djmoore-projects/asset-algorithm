"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { identifyUser, resetAnalytics } from "@/lib/analytics";

export function PostHogIdentify() {
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        identifyUser(user.id, {
          email: user.email,
          created_at: user.created_at,
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        identifyUser(session.user.id, {
          email: session.user.email,
          created_at: session.user.created_at,
        });
      } else if (event === "SIGNED_OUT") {
        resetAnalytics();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
