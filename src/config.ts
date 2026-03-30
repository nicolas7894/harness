import { existsSync, readFileSync } from "fs";
import { resolve, join } from "path";
import type { HarnessConfig, HarnessPaths } from "./types.js";

const DEFAULTS: Omit<HarnessConfig, "projectDir" | "prompt"> = {
  model: "claude-opus-4-6",
  maxQaRounds: 3,
  maxContractRounds: 3,
  maxTurns: undefined,
  headless: true,
  skillPaths: [],
  verbose: false,
};

export function loadConfig(
  projectDir: string,
  prompt: string,
  overrides: Partial<HarnessConfig> = {}
): HarnessConfig {
  const absProjectDir = resolve(projectDir);

  // Load project-level overrides from .harness.json if it exists
  const projectConfigPath = join(absProjectDir, ".harness.json");
  let projectConfig: Partial<HarnessConfig> = {};
  if (existsSync(projectConfigPath)) {
    try {
      projectConfig = JSON.parse(readFileSync(projectConfigPath, "utf-8"));
    } catch {
      // Ignore malformed config
    }
  }

  return {
    ...DEFAULTS,
    ...projectConfig,
    ...overrides,
    projectDir: absProjectDir,
    prompt,
  };
}

export function getPaths(config: HarnessConfig): HarnessPaths {
  const base = join(config.projectDir, ".harness");
  return {
    logs: join(base, "logs"),
    qa: join(base, "qa"),
    contracts: join(base, "contracts"),
    prompts: join(base, "prompts"),
    mcpConfig: join(base, "mcp.json"),
    designSkill: join(base, "design_skill.md"),
    qaReport: join(base, "qa", "qa_report.json"),
  };
}
