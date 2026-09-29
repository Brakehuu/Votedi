import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="aspect-square" />
        <Skeleton className="aspect-square" />
        <Skeleton className="aspect-square" />
        <Skeleton className="aspect-square" />
      </div>
    </main>
  );
}
