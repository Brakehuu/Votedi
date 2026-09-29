import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { Be_Vietnam_Pro } from "next/font/google";
import { Mesh, SiteHeader } from "@/components/site-header";
import { Providers } from "@/components/providers";
import { faqs } from "@/lib/faq";
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
    template: "%s · Vote Đi",
  },
  description: siteDescription,
  keywords: [
    "bình chọn mẫu áo",
    "vote logo",
    "bình chọn online",
    "đấu loại trực tiếp",
    "world cup",
    "chọn mẫu nhóm",
    "Vote Đi",
  ],
  applicationName: "Vote Đi",
  authors: [{ name: "Vote Đi" }],
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
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebApplication",
                  name: "Vote Đi",
                  applicationCategory: "LifestyleApplication",
                  operatingSystem: "Web",
                  offers: { "@type": "Offer", price: "0", priceCurrency: "VND" },
                  description: siteDescription,
                  inLanguage: "vi",
                },
                {
                  "@type": "FAQPage",
                  mainEntity: faqs.map((item) => ({
                    "@type": "Question",
                    name: item.q,
                    acceptedAnswer: { "@type": "Answer", text: item.a },
                  })),
                },
              ],
            }),
          }}
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
