import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/home/footer";
import { FORMAT_LIST } from "@/lib/formats";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Các kiểu vote online",
  description:
    "6 kiểu vote trên Vote Đi: bình chọn nhanh, đấu loại, lịch rảnh, quẹt chọn, xếp hạng, chấm điểm.",
  alternates: { canonical: absoluteUrl("/kieu-vote") },
};

export default function KieuVoteIndexPage() {
  const formats = FORMAT_LIST.filter((f) => f.available);
  return (
    <>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 pb-24">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Các kiểu vote</h1>
        <p className="mt-2 text-muted-foreground">
          Chọn kiểu phù hợp câu hỏi của nhóm. Mỗi kiểu có trang giải thích và mẫu gắn kèm.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {formats.map((f) => (
            <Link key={f.id} href={`/kieu-vote/${f.slug}`} className="glass flex gap-3 rounded-[22px] p-5">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                <f.icon className="size-6" aria-hidden />
              </span>
              <span className="min-w-0">
                <b className="block text-lg font-extrabold">{f.name}</b>
                <span className="mt-1 block text-sm text-muted-foreground">{f.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
