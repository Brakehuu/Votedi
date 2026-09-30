import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/home/footer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { FORMAT_LIST, findFormat } from "@/lib/formats";
import { breadcrumbList, jsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { templatesByFormat } from "@/lib/templates";

export function generateStaticParams() {
  return FORMAT_LIST.filter((f) => f.available).map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const f = findFormat(slug);
  if (!f) return { title: "Không tìm thấy" };
  return {
    title: `${f.name} online cho nhóm`,
    description: f.description,
    alternates: { canonical: absoluteUrl(`/kieu-vote/${f.slug}`) },
    openGraph: {
      title: `${f.name} | Vote Đi`,
      description: f.description,
      url: absoluteUrl(`/kieu-vote/${f.slug}`),
      images: [{ url: absoluteUrl(`/kieu-vote/${f.slug}/opengraph-image`) }],
    },
  };
}

const HOW: Record<string, string[]> = {
  quick: [
    "Mỗi người chạm chọn tối đa số lựa chọn bạn cho phép.",
    "Kết quả đếm phiếu theo thời gian thực (hoặc sau khi vote / chốt, tùy cài đặt).",
    "Hòa thì bốc ngẫu nhiên hoặc ưu tiên lựa chọn của chủ phòng.",
  ],
  bracket: [
    "Vòng loại (tuỳ chọn): mọi người chọn vài mẫu yêu thích.",
    "Knockout: các mẫu đấu cặp trên sơ đồ đến khi còn vô địch.",
    "Có thể xếp hạt giống theo vòng loại hoặc ngẫu nhiên.",
  ],
  schedule: [
    "Chủ phòng chọn khoảng ngày và chế độ (ngày / buổi / khung giờ / chuyến).",
    "Mọi người đánh dấu Rảnh / Có thể / Bận.",
    "Hệ thống xếp khung điểm cao nhất (Rảnh = 1, Có thể = ½).",
  ],
  swipe: [
    "Quẹt phải = thích (1), trái = bỏ qua (0), lên = rất thích (2, tối đa 3 lần).",
    "Quẹt hết → chờ mọi người; lựa chọn cả nhóm thích có nhãn Match.",
    "Có thể quẹt lại khi phòng còn mở.",
  ],
  ranking: [
    "Kéo thả thứ tự bạn thích (hạng 1 được nhiều điểm nhất).",
    "Điểm Borda cộng từ mọi người; hiện hạng trung bình.",
    "Top 3 hiện kiểu bục podium khi chốt.",
  ],
  rating: [
    "Chấm 1–5 sao từng lựa chọn.",
    "Điểm trung bình 1 chữ số thập phân; hòa ưu tiên nhiều lượt hơn.",
    "Tuỳ chọn giám khảo với tỉ trọng riêng.",
  ],
};

export default async function KieuVoteDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = findFormat(slug);
  if (!f || !f.available) notFound();
  const samples = templatesByFormat(f.id).slice(0, 6);
  const how = HOW[f.id] ?? [f.hint({})];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd([
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: f.name,
            description: f.description,
            url: absoluteUrl(`/kieu-vote/${f.slug}`),
          },
          {
            "@context": "https://schema.org",
            ...breadcrumbList([
              { name: "Trang chủ", path: "/" },
              { name: "Kiểu vote", path: "/kieu-vote" },
              { name: f.name, path: `/kieu-vote/${f.slug}` },
            ]),
          },
        ])}
      />
      <main className="mx-auto w-full max-w-2xl px-4 py-10 pb-24">
        <Breadcrumbs
          items={[
            { label: "Trang chủ", href: "/" },
            { label: "Kiểu vote", href: "/kieu-vote" },
            { label: f.name },
          ]}
        />
        <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <f.icon className="size-7" aria-hidden />
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {f.name} online cho nhóm
        </h1>
        <p className="mt-3 text-muted-foreground">{f.description}</p>
        <p className="mt-1 text-sm text-muted-foreground">Dùng cho: {f.useFor}</p>
        <Link href={`/tao-phong?kieu=${f.id}`} className="btn btn-primary mt-6 inline-flex min-h-12">
          Tạo phòng kiểu này
        </Link>

        <section className="mt-12">
          <h2 className="text-xl font-extrabold">Cách tính kết quả</h2>
          <ul className="mt-4 space-y-2">
            {how.map((line) => (
              <li key={line} className="glass rounded-[16px] p-3 text-sm">
                {line}
              </li>
            ))}
          </ul>
        </section>

        {samples.length ? (
          <section className="mt-12">
            <h2 className="text-xl font-extrabold">Mẫu dùng kiểu này</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {samples.map((t) => (
                <Link key={t.slug} href={`/mau/${t.slug}`} className="glass rounded-[18px] p-4">
                  <span className="text-2xl">{t.emoji}</span>
                  <b className="mt-1 block font-bold">{t.title}</b>
                  <span className="line-clamp-2 text-sm text-muted-foreground">{t.intro}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
