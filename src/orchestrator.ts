import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import type { HarnessConfig, HarnessPaths } from "./types.js";
import { getPaths } from "./config.js";
import {
  setupDirectories,
  setupGit,
  setupPlaywright,
  setupDesignSkill,
} from "./setup.js";
import { initLogger, log, logPhase, logSuccess, logError, logWarning, logResult } from "./logger.js";
import { runAgent } from "./agents.js";
import { loadPrompt } from "./template.js";
import { negotiateContract } from "./contract.js";
import { runQALoop } from "./qa.js";

type Phase = "planner" | "contract" | "generator" | "qa";

function detectResumePhase(config: HarnessConfig, paths: HarnessPaths): Phase | null {
  const specExists = existsSync(join(config.projectDir, "spec.md"));
  const featuresExist = existsSync(join(config.projectDir, "feature_list.json"));

  if (!specExists || !featuresExist) return null;

  // Phase 1 done — check contract
  const contractPath = join(paths.contracts, "build_contract.md");
  const reviewPath = join(paths.contracts, "contract_review.md");

  if (!existsSync(contractPath)) return "contract";

  // Contract exists — check if approved or max rounds reached
  if (existsSync(reviewPath)) {
    const review = readFileSync(reviewPath, "utf-8");
    if (!review.toUpperCase().includes("APPROVED")) {
      return "contract";
    }
  } else {
    return "contract";
  }

  // Contract approved — check if generator ran
  const hasGeneratorLog = readdirSync(paths.logs).some((f) => {
    if (!f.startsWith("generator_")) return false;
    const size = statSync(join(paths.logs, f)).size;
    return size > 0;
  });

  if (!hasGeneratorLog) return "generator";

  // Generator ran — QA is next (always re-run QA on resume)
  return "qa";
}

export async function runHarness(config: HarnessConfig): Promise<void> {
  const paths = getPaths(config);
  const startTime = Date.now();

  // Setup
  setupDirectories(paths);
  initLogger(join(paths.logs, "harness.log"));

  log(`Harness starting — model: ${config.model}`);
  log(`Project: ${config.projectDir}`);

  setupGit(config.projectDir);
  setupPlaywright(config, paths.mcpConfig);
  await setupDesignSkill(config, paths.designSkill);

  // Save user prompt for agents to read
  writeFileSync(join(paths.prompts, "user_prompt.txt"), config.prompt);

  // Detect resume point
  const resumeFrom = detectResumePhase(config, paths);

  if (resumeFrom) {
    logWarning(`Resuming — skipping to ${resumeFrom}`);
  }

  // =========================================================================
  // PHASE 1: PLANNER
  // =========================================================================
  if (!resumeFrom) {
    logPhase("PHASE 1: PLANNER");

    const plannerPrompt = loadPrompt("planner");

    await runAgent({
      role: "planner",
      prompt: plannerPrompt,
      config,
      paths,
    });

    // Validate planner output
    const specPath = join(config.projectDir, "spec.md");
    const featureListPath = join(config.projectDir, "feature_list.json");

    if (!existsSync(specPath) || !existsSync(featureListPath)) {
      logError("Planner failed to create required files (spec.md, feature_list.json)");
      process.exit(1);
    }

    const features = JSON.parse(readFileSync(featureListPath, "utf-8"));
    logSuccess(`Plan created with ${features.length} features`);
  } else {
    logSuccess("Phase 1 (Planner) already complete — skipped");
  }

  // =========================================================================
  // PHASE 1.5: CONTRACT NEGOTIATION
  // =========================================================================
  if (!resumeFrom || resumeFrom === "contract") {
    await negotiateContract(config, paths);
  } else {
    logSuccess("Phase 1.5 (Contract) already complete — skipped");
  }

  // =========================================================================
  // PHASE 2: GENERATOR
  // =========================================================================
  if (!resumeFrom || resumeFrom === "contract" || resumeFrom === "generator") {
    logPhase("PHASE 2: GENERATOR (long-running session)");

    const generatorPrompt = loadPrompt("generator");

    await runAgent({
      role: "generator",
      prompt: generatorPrompt,
      config,
      paths,
    });
  } else {
    logSuccess("Phase 2 (Generator) already complete — skipped");
  }

  // =========================================================================
  // PHASE 3: QA LOOP
  // =========================================================================
  const qaResult = await runQALoop(config, paths);

  // =========================================================================
  // SUMMARY
  // =========================================================================
  const totalDuration = Math.round((Date.now() - startTime) / 1000);

  logPhase("FINAL RESULT");

  if (qaResult.report) {
    const s = qaResult.report.scores;
    logResult("Completeness", `${s.feature_completeness}/10`);
    logResult("Functionality", `${s.functionality}/10`);
    logResult("Design", `${s.design_quality}/10`);
    logResult("Code quality", `${s.code_quality}/10`);
    logResult("Bugs", `${qaResult.report.bugs.length}`);
    logResult("QA pass", `${qaResult.passed} (${qaResult.rounds} round(s))`);
  } else {
    logError("No QA report available");
  }

  logResult("Duration", formatDuration(totalDuration));
  logResult("QA reports", paths.qa);
  logResult("Contracts", paths.contracts);
  logResult("Logs", paths.logs);

  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ${seconds % 60}s`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}
