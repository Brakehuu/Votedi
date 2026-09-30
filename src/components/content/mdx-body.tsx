import { MDXRemote } from "next-mdx-remote/rsc";
import { TemplateCta, MdxLink } from "@/components/content/mdx-components";
import { slugifyHeading } from "@/lib/content";

const components = {
  TemplateCta,
  a: MdxLink,
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = String(props.children ?? "");
    const id = slugifyHeading(text);
    return (
      <h2 id={id} {...props}>
        {props.children}
      </h2>
    );
  },
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = String(props.children ?? "");
    const id = slugifyHeading(text);
    return (
      <h3 id={id} {...props}>
        {props.children}
      </h3>
    );
  },
};

export function MdxBody({ source }: { source: string }) {
  return (
    <div className="prose prose-neutral max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-a:text-primary">
      <MDXRemote source={source} components={components} />
    </div>
  );
}
