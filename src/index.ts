#!/usr/bin/env node

import { parseArgs } from "util";
import { mkdirSync } from "fs";
import { loadConfig } from "./config.js";
import { runHarness } from "./orchestrator.js";
import type { HarnessConfig } from "./types.js";

const HELP = `
harness — Multi-agent harness for autonomous app development with Claude Code

USAGE:
  harness <project_dir> <prompt> [options]

ARGUMENTS:
  project_dir    Directory for the project (created if it doesn't exist)
  prompt         Description of the app to build

OPTIONS:
  --model        Claude model to use (default: claude-opus-4-6)
  --qa-rounds    Max QA rounds (default: 3)
  --max-turns    Max agent turns per session (default: unlimited)
  --headless     Run Playwright headless (default: true)
  --no-headless  Show browser during QA
  --verbose      Stream agent output to terminal
  --help         Show this help message

EXAMPLES:
  harness ./my-app "Build a task manager with kanban boards"
  harness ./my-app "Build a DAW" --model claude-sonnet-4-6 --verbose
  harness ./my-app "Build a CRM" --no-headless --qa-rounds 5

PROJECT CONFIG:
  Place a .harness.json in your project directory to set defaults:
  {
    "model": "claude-opus-4-6",
    "maxQaRounds": 3,
    "maxContractRounds": 3,
    "headless": true,
    "skillPaths": ["/path/to/custom/skill.md"]
  }
`;

function main(): void {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      model: { type: "string" },
      "qa-rounds": { type: "string" },
      "max-turns": { type: "string" },
      headless: { type: "boolean", default: true },
      "no-headless": { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }

  if (positionals.length < 2) {
    console.error("Error: project_dir and prompt are required.\n");
    console.log(HELP);
    process.exit(1);
  }

  const [projectDir, ...promptParts] = positionals;
  const prompt = promptParts.join(" ");

  // Ensure project dir exists
  mkdirSync(projectDir, { recursive: true });

  const overrides: Partial<HarnessConfig> = {};

  if (values.model) overrides.model = values.model;
  if (values["qa-rounds"]) overrides.maxQaRounds = parseInt(values["qa-rounds"], 10);
  if (values["max-turns"]) overrides.maxTurns = parseInt(values["max-turns"], 10);
  if (values["no-headless"]) overrides.headless = false;
  if (values.verbose) overrides.verbose = true;

  const config = loadConfig(projectDir, prompt, overrides);

  runHarness(config).catch((err) => {
    console.error(`\nHarness failed: ${err.message}`);
    process.exit(1);
  });
}

main();
