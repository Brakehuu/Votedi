import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { Be_Vietnam_Pro } from "next/font/google";
import { Mesh, SiteHeader } from "@/components/site-header";
import { Providers } from "@/components/providers";
import { organizationGraph, websiteGraph, jsonLd } from "@/lib/seo";
import { siteDescription, siteTitle, siteUrl } from "@/lib/site";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | Vote Đi",
  },
  description: siteDescription,
  keywords: [
    "bình chọn online",
    "tạo vote nhóm",
    "vote áo lớp",
    "chọn lịch rảnh",
    "Vote Đi",
  ],
  applicationName: "Vote Đi",
  authors: [{ name: "Vote Đi" }],
  alternates: { canonical: siteUrl },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: siteUrl,
    siteName: "Vote Đi",
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${beVietnam.variable} h-full`}>
      <body
        suppressHydrationWarning
        className="min-h-full bg-background font-sans text-foreground antialiased"
      >
        <Script
          id="votedi-ld-json"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={jsonLd({
            "@context": "https://schema.org",
            "@graph": [organizationGraph(), websiteGraph()],
          })}
        />
        <Providers>
          <Mesh />
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
