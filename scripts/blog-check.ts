import { formatCheckReport, validateContent } from "../src/lib/content/validate";

const issues = validateContent();
console.log("=== Vote Đi · blog:check ===\n");
console.log(formatCheckReport(issues));
const errors = issues.filter((i) => i.level === "error");
process.exit(errors.length ? 1 : 0);
