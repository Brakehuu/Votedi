import { buildResultsShareImageResponse } from "@/lib/results-share-image";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  return buildResultsShareImageResponse(slug, { download });
}
