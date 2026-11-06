import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildComparison } from "../lib/comparison.ts";

const target = join(process.cwd(), "docs", "accessible-commerce-companion", "comparison.md");

writeFileSync(target, buildComparison(), "utf8");
console.log(`wrote ${target}`);
