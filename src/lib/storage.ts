import { createClient } from "@/lib/supabase/client";

export async function uploadPublicImage(path: string, blob: Blob, contentType: string) {
  const supabase = createClient();
  const { error } = await supabase.storage.from("items").upload(path, blob, {
    contentType,
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from("items").getPublicUrl(path).data.publicUrl;
}

export async function ensureUser() {
  const supabase = createClient();
  const first = await supabase.auth.getUser();
  if (first.data.user) return { supabase, user: first.data.user };
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  const second = await supabase.auth.getUser();
  if (!second.data.user) throw new Error("UNAUTHENTICATED");
  return { supabase, user: second.data.user };
}
