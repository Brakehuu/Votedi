"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { reportError } from "@/lib/errors";

/** Chỉ mount trên trang cần auth (tạo phòng / phòng / phòng của tôi). */
export function AuthBootstrap() {
  const [message, setMessage] = useState<string | null>(() =>
    isSupabaseConfigured() ? null : "Thiếu biến môi trường Supabase. Thêm file .env.local rồi chạy lại.",
  );

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    void import("@/lib/supabase/client").then(async ({ createClient }) => {
      if (cancelled) return;
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user || cancelled) return;
      const { error } = await supabase.auth.signInAnonymously();
      if (!cancelled && error) setMessage(reportError(error));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!message) return null;
  return (
    <div className="bg-warn/20 px-4 py-3 text-center text-sm text-foreground" role="status">
      {message}
    </div>
  );
}
