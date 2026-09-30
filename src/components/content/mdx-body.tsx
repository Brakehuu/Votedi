import { MDXRemote } from "next-mdx-remote/rsc";
import { createMdxComponents } from "@/components/content/mdx-components";
import type { AssetMeta } from "@/lib/content";
import { SummaryBox } from "@/components/content/article-chrome";

export function MdxBody({
  source,
  assetMap = {},
  summary,
}: {
  source: string;
  assetMap?: Record<string, AssetMeta>;
  summary?: string | null;
}) {
  const components = createMdxComponents(assetMap);
  return (
    <div className="blog-prose">
      {summary ? (
        <SummaryBox>
          <MDXRemote source={summary} components={components} />
        </SummaryBox>
      ) : null}
      <MDXRemote source={source} components={components} />
    </div>
  );
}
