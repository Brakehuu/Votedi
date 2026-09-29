"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-start justify-center gap-4 px-4">
      <h1 className="text-3xl font-extrabold">Có lỗi khi tải trang</h1>
      <p className="text-muted-foreground">Thử lại. Nếu mới cài Supabase, hãy chạy migration trước.</p>
      <Button type="button" onClick={() => reset()}>
        Thử lại
      </Button>
    </main>
  );
}
