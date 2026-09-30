import { FORMAT_LIST } from "@/lib/formats";
import { TEMPLATES, POPULAR_TEMPLATE_SLUGS, getTemplate } from "@/lib/templates";
import { listContent } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

export function jsonLd(data: Record<string, unknown> | Record<string, unknown>[]) {
  return {
    __html: JSON.stringify(data),
  };
}

export function breadcrumbList(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqPage(faqs: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function organizationGraph() {
  return {
    "@type": "Organization",
    name: "Vote Đi",
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icon.svg"),
  };
}

export function websiteGraph() {
  return {
    "@type": "WebSite",
    name: "Vote Đi",
    url: absoluteUrl("/"),
    inLanguage: "vi",
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/mau")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function popularTemplates() {
  return POPULAR_TEMPLATE_SLUGS.map((slug) => getTemplate(slug)).filter(Boolean);
}

export function formatPublicPaths() {
  return FORMAT_LIST.filter((f) => f.available).map((f) => `/kieu-vote/${f.slug}`);
}

export function templatePublicPaths() {
  return TEMPLATES.map((t) => `/mau/${t.slug}`);
}

export function contentPublicPaths() {
  return [
    ...listContent("blog").map((d) => `/blog/${d.slug}`),
    ...listContent("huong-dan").map((d) => `/huong-dan/${d.slug}`),
  ];
}
