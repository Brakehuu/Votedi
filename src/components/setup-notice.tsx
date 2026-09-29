import { Card } from "@/components/ui/card";

export function SetupNotice({ detail }: { detail?: string }) {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-16">
      <Card className="space-y-3 p-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Chưa kết nối được Supabase</h1>
        <p className="text-muted-foreground">
          Chạy file <span className="font-semibold text-foreground">supabase/migrations/0001_init.sql</span> trong
          SQL editor, bật Anonymous sign-in, rồi tải lại trang.
        </p>
        {detail ? <p className="text-sm break-words text-muted-foreground">{detail}</p> : null}
      </Card>
    </main>
  );
}
