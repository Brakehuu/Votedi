import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkUnwrapImages from "remark-unwrap-images";
import { createMdxComponents } from "@/components/content/mdx-components";
import type { AssetMeta } from "@/lib/content";
import { SummaryBox } from "@/components/content/article-chrome";

const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [remarkGfm, remarkUnwrapImages],
  },
};

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
          <MDXRemote source={summary} components={components} options={mdxOptions} />
        </SummaryBox>
      ) : null}
      <MDXRemote source={source} components={components} options={mdxOptions} />
    </div>
  );
}
