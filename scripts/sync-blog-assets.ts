/**
 * Chép ảnh/asset từ content/{blog|huong-dan}/<slug>/ sang public/{kind}/<slug>/.
 * Bỏ qua .mdx/.md. Chạy ở predev + prebuild.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const KINDS = ["blog", "huong-dan"] as const;

function emptyDir(dir: string) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, name), { recursive: true, force: true });
  }
}

function copyAssets(kind: (typeof KINDS)[number]) {
  const srcRoot = path.join(ROOT, "content", kind);
  const destRoot = path.join(ROOT, "public", kind);
  if (!fs.existsSync(srcRoot)) return 0;

  fs.mkdirSync(destRoot, { recursive: true });
  // Remove generated dirs that no longer exist in content
  if (fs.existsSync(destRoot)) {
    for (const name of fs.readdirSync(destRoot)) {
      const srcDir = path.join(srcRoot, name);
      if (!fs.existsSync(srcDir) || !fs.statSync(srcDir).isDirectory()) {
        fs.rmSync(path.join(destRoot, name), { recursive: true, force: true });
      }
    }
  }

  let count = 0;
  for (const entry of fs.readdirSync(srcRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const from = path.join(srcRoot, slug);
    const to = path.join(destRoot, slug);
    emptyDir(to);
    fs.mkdirSync(to, { recursive: true });
    for (const file of fs.readdirSync(from)) {
      if (/\.mdx?$/i.test(file)) continue;
      if (file.startsWith(".")) continue;
      const srcFile = path.join(from, file);
      if (!fs.statSync(srcFile).isFile()) continue;
      fs.copyFileSync(srcFile, path.join(to, file));
      count += 1;
    }
  }
  return count;
}

function main() {
  let total = 0;
  for (const kind of KINDS) total += copyAssets(kind);
  console.log(`[sync-blog-assets] Đã chép ${total} file sang public/blog và public/huong-dan.`);
}

main();
