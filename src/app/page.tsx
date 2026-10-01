import type { Metadata } from "next";
import { BlogSection } from "@/components/home/blog-section";
import { FaqSection } from "@/components/home/faq-section";
import { FeaturesSection } from "@/components/home/features-section";
import { FormatsSection } from "@/components/home/formats-section";
import { HomeCta } from "@/components/home/home-cta";
import { HomeHero } from "@/components/home/hero";
import { HomeVideoGate } from "@/components/home/home-video-gate";
import { MobileBar } from "@/components/home/mobile-bar";
import { RevealInit } from "@/components/home/reveal-init";
import { SiteFooter } from "@/components/home/footer";
import { StepsSection } from "@/components/home/steps-section";
import { TemplatesSection } from "@/components/home/templates-section";
import { UsesMarquee } from "@/components/home/uses-marquee";
import { listContent } from "@/lib/content";
import { faqs } from "@/lib/faq";
import { HOME_VIDEO, videoObjectJsonLd } from "@/lib/home-video";
import {
  faqPage,
  jsonLd,
  organizationGraph,
  webApplicationGraph,
  websiteGraph,
} from "@/lib/seo";
import { absoluteUrl, siteDescription, siteTitle } from "@/lib/site";
import "./home.css";

export const metadata: Metadata = {
  title: { absolute: siteTitle },
  description: siteDescription,
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: absoluteUrl("/"),
    images: [{ url: absoluteUrl("/opengraph-image") }],
  },
};

export default function HomePage() {
  const posts = listContent("blog").slice(0, 3);

  const graph: Record<string, unknown>[] = [
    organizationGraph(),
    websiteGraph(),
    webApplicationGraph(),
    faqPage(faqs),
  ];
  if (HOME_VIDEO.enabled) {
    graph.push(videoObjectJsonLd(HOME_VIDEO));
  }

  return (
    <div className="home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@graph": graph,
        })}
      />
      <RevealInit />
      <main>
        <HomeHero />
        <UsesMarquee />
        <StepsSection />
        <FormatsSection />
        <TemplatesSection />
        <FeaturesSection />
        <BlogSection posts={posts} />
        <FaqSection />
        <HomeVideoGate />
        <HomeCta />
      </main>
      <SiteFooter />
      <MobileBar />
    </div>
  );
}
