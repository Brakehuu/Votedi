"use client";

import Link from "next/link";
import { POPULAR_TEMPLATE_SLUGS, getTemplate } from "@/lib/templates";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const popular = POPULAR_TEMPLATE_SLUGS.map((s) => getTemplate(s)).filter(Boolean);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-start justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-extrabold">Có lỗi khi tải trang</h1>
      <p className="text-muted-foreground">
        Thử lại. Nếu mới cập nhật database, chạy migration rồi tải lại.
      </p>
      <p className="w-full break-words rounded-2xl bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
        {error.message || "Unknown error"}
        {error.digest ? ` · ${error.digest}` : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Thử lại
        </button>
        <Link href="/" className="btn btn-g">
          Về trang chủ
        </Link>
      </div>
      <div className="mt-4 w-full">
        <p className="text-sm font-bold">Mẫu gợi ý</p>
        <ul className="mt-2 space-y-1">
          {popular.slice(0, 4).map((t) =>
            t ? (
              <li key={t.slug}>
                <Link href={`/mau/${t.slug}`} className="text-sm font-semibold text-primary">
                  {t.emoji} {t.title}
                </Link>
              </li>
            ) : null,
          )}
        </ul>
      </div>
    </main>
  );
}
