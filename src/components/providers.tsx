"use client";

import { useEffect, useState } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { Toaster } from "sonner";

const Analytics = dynamic(
  () => import("@vercel/analytics/react").then((m) => m.Analytics),
  { ssr: false },
);
const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((m) => m.SpeedInsights),
  { ssr: false },
);

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
      <OfflineBanner />
      {children}
      <ToastHost />
      <Analytics />
      <SpeedInsights />
    </ThemeProvider>
  );
}
