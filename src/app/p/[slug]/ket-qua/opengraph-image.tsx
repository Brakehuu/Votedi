import { buildResultsShareImageResponse } from "@/lib/results-share-image";

export const alt = "Kết quả Vote Đi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return buildResultsShareImageResponse(slug);
}
