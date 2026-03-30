import { existsSync, mkdirSync, writeFileSync, copyFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import type { HarnessConfig, HarnessPaths } from "./types.js";
import { log, logSuccess, logWarning } from "./logger.js";

export function setupDirectories(paths: HarnessPaths): void {
  for (const dir of [paths.logs, paths.qa, paths.contracts, paths.prompts]) {
    mkdirSync(dir, { recursive: true });
  }
}

export function setupGit(projectDir: string): void {
  if (existsSync(join(projectDir, ".git"))) return;

  execSync("git init", { cwd: projectDir, stdio: "pipe" });

  const gitignore = join(projectDir, ".gitignore");
  if (!existsSync(gitignore)) {
    writeFileSync(gitignore, ".harness/\nnode_modules/\n");
  }

  execSync("git add .gitignore && git commit -m 'init: harness setup'", {
    cwd: projectDir,
    stdio: "pipe",
  });

  logSuccess("Git initialized");
}

export function setupPlaywright(
  config: HarnessConfig,
  mcpConfigPath: string
): void {
  const mcpConfig = {
    mcpServers: {
      playwright: {
        command: "npx",
        args: [
          "-y",
          "@playwright/mcp@latest",
          ...(config.headless ? ["--headless"] : []),
        ],
      },
    },
  };

  writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));

  try {
    execSync("npx @playwright/mcp@latest --help", {
      stdio: "pipe",
      timeout: 15_000,
    });
  } catch {
    log("Installing Playwright...");
    execSync("npx playwright install chromium", { stdio: "pipe" });
  }

  logSuccess("Playwright ready");
}

const SKILL_SEARCH_PATHS = [
  (projectDir: string) =>
    join(projectDir, ".claude", "skills", "frontend-design", "SKILL.md"),
  (projectDir: string) =>
    join(projectDir, ".claude", "skills", "frontend-design.md"),
  () =>
    join(
      process.env.HOME || "~",
      ".claude",
      "skills",
      "frontend-design",
      "SKILL.md"
    ),
  () =>
    join(process.env.HOME || "~", ".claude", "skills", "frontend-design.md"),
  () => "/mnt/skills/public/frontend-design/SKILL.md",
];

const SKILL_GITHUB_URL =
  "https://raw.githubusercontent.com/anthropics/claude-code/main/plugins/frontend-design/skills/frontend-design/SKILL.md";

export async function setupDesignSkill(
  config: HarnessConfig,
  destPath: string
): Promise<void> {
  // 1. Check local paths
  for (const pathFn of SKILL_SEARCH_PATHS) {
    const skillPath = pathFn(config.projectDir);
    if (existsSync(skillPath)) {
      copyFileSync(skillPath, destPath);
      logSuccess(`Design skill loaded from ${skillPath}`);
      return;
    }
  }

  // 2. Check custom skill paths from config
  for (const customPath of config.skillPaths) {
    if (existsSync(customPath)) {
      copyFileSync(customPath, destPath);
      logSuccess(`Design skill loaded from ${customPath}`);
      return;
    }
  }

  // 3. Download from GitHub
  try {
    const response = await fetch(SKILL_GITHUB_URL);
    if (response.ok) {
      writeFileSync(destPath, await response.text());
      logSuccess("Design skill downloaded from GitHub");
      return;
    }
  } catch {
    // Network error, continue
  }

  // 4. Fallback
  writeFileSync(destPath, "No design skill available.\n");
  logWarning("Design skill not found — continuing without it");
}
