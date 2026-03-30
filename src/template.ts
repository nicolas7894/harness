import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, "..", "prompts");

export function loadPrompt(
  name: string,
  variables: Record<string, string | number> = {}
): string {
  const filePath = join(PROMPTS_DIR, `${name}.md`);
  let content = readFileSync(filePath, "utf-8");

  for (const [key, value] of Object.entries(variables)) {
    content = content.replaceAll(`{{${key}}}`, String(value));
  }

  return content;
}
