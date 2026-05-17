"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getICPConfig() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("profiles")
    .select("icp_config")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data?.icp_config || null;
}

export async function saveICPConfig(config: Record<string, any>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("profiles")
    .update({ icp_config: config })
    .eq("id", user.id);

  if (error) throw error;
  revalidatePath("/settings/icp");
  revalidatePath("/scanner");
}
