import { existsSync, readFileSync } from "fs";
import type { HarnessConfig, HarnessPaths, QAReport } from "./types.js";
import { runAgent } from "./agents.js";
import { loadPrompt } from "./template.js";
import { log, logPhase, logSuccess, logError } from "./logger.js";

export interface QAResult {
  passed: boolean;
  rounds: number;
  report: QAReport | null;
}

function loadQAReport(path: string): QAReport | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as QAReport;
  } catch {
    return null;
  }
}

function computeAverageScore(report: QAReport): number {
  const s = report.scores;
  return (
    (s.feature_completeness +
      s.functionality +
      s.design_quality +
      s.code_quality) /
    4
  );
}

export async function runQALoop(
  config: HarnessConfig,
  paths: HarnessPaths
): Promise<QAResult> {
  let passed = false;
  let lastReport: QAReport | null = null;

  for (let round = 1; round <= config.maxQaRounds; round++) {
    logPhase(`PHASE 3: QA ROUND ${round}/${config.maxQaRounds}`);

    // Build evaluator prompt with previous report context
    const previousReportSection =
      round > 1 && existsSync(paths.qaReport)
        ? `\n## PREVIOUS QA REPORT (round ${round - 1}):\nRead: ${paths.qaReport}\nVerify previous bugs are fixed AND no regressions.\n`
        : "";

    const qaPrompt = loadPrompt("evaluator", {
      ROUND: round,
      MAX_ROUNDS: config.maxQaRounds,
      QA_REPORT_PATH: paths.qaReport,
      PREVIOUS_REPORT_SECTION: previousReportSection,
    });

    await runAgent({
      role: "evaluator",
      prompt: qaPrompt,
      config,
      paths,
    });

    // Check result
    lastReport = loadQAReport(paths.qaReport);

    if (lastReport?.pass) {
      passed = true;
      logSuccess(`QA PASSED at round ${round}`);
      return { passed, rounds: round, report: lastReport };
    }

    logError(`QA FAILED at round ${round}`);

    // Exit if last round
    if (round >= config.maxQaRounds) {
      log(`Max QA rounds reached (${config.maxQaRounds})`);
      break;
    }

    // Fix round with strategic pivot logic
    logPhase(`FIX ROUND ${round}`);

    let trendInfo = "";
    if (lastReport) {
      const avg = computeAverageScore(lastReport).toFixed(1);
      const trend = lastReport.trend || "unknown";
      trendInfo = `Average score: ${avg}/10 — Trend: ${trend}`;
    }

    const fixPrompt = loadPrompt("fix", {
      ROUND: round,
      MAX_ROUNDS: config.maxQaRounds,
      QA_REPORT_PATH: paths.qaReport,
      TREND_INFO: trendInfo,
    });

    await runAgent({
      role: "fix",
      prompt: fixPrompt,
      config,
      paths,
    });
  }

  return { passed, rounds: config.maxQaRounds, report: lastReport };
}
