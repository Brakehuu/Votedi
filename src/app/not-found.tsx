import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-start justify-center gap-4 px-4">
      <h1 className="text-3xl font-extrabold">Không thấy trang này</h1>
      <p className="text-muted-foreground">Phòng có thể đã sai link, hoặc chưa được tạo.</p>
      <Link href="/" className={buttonVariants()}>
        Về trang chủ
      </Link>
    </main>
  );
}
