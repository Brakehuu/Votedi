"use client";

import { useEffect, useState } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { reportError } from "@/lib/errors";

function ToastHost() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="top-center"
      richColors
    />
  );
}

function AuthBanner() {
  const [message, setMessage] = useState<string | null>(() =>
    isSupabaseConfigured() ? null : "Thiếu biến môi trường Supabase. Thêm file .env.local rồi chạy lại.",
  );

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) return;
      const { error } = await supabase.auth.signInAnonymously();
      if (error) setMessage(reportError(error));
    });
  }, []);

  if (!message) return null;
  return (
    <div className="bg-warn/20 px-4 py-3 text-center text-sm text-foreground">{message}</div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      scriptProps={{ suppressHydrationWarning: true }}
    >
      <AuthBanner />
      {children}
      <ToastHost />
    </ThemeProvider>
  );
}
