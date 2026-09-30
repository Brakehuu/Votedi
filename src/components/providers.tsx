"use client";

import { useEffect, useState } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
      closeButton
      toastOptions={{
        className: "votedi-toast",
        duration: 3200,
      }}
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
    <div className="bg-warn/20 px-4 py-3 text-center text-sm text-foreground" role="status">
      {message}
    </div>
  );
}

function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="bg-lose/15 px-4 py-2 text-center text-sm font-semibold text-foreground" role="alert">
      Mất mạng — sẽ tự đồng bộ khi có lại kết nối.
    </div>
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
      <OfflineBanner />
      {children}
      <ToastHost />
      <Analytics />
      <SpeedInsights />
    </ThemeProvider>
  );
}
