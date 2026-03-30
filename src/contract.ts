import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { HarnessConfig, HarnessPaths } from "./types.js";
import { runAgent } from "./agents.js";
import { loadPrompt } from "./template.js";
import { log, logPhase, logSuccess, logWarning } from "./logger.js";

export async function negotiateContract(
  config: HarnessConfig,
  paths: HarnessPaths
): Promise<void> {
  logPhase("PHASE 1.5: CONTRACT NEGOTIATION");

  // Step A: Generator proposes the contract
  const proposePrompt = loadPrompt("contract-propose");

  await runAgent({
    role: "contract-propose",
    prompt: proposePrompt,
    config,
    paths,
  });

  // Step B: Evaluator reviews (up to maxContractRounds)
  const contractReviewPath = join(paths.contracts, "contract_review.md");

  for (let round = 1; round <= config.maxContractRounds; round++) {
    log(`Contract review round ${round}/${config.maxContractRounds}`);

    const reviewPrompt = loadPrompt("contract-review", {
      ROUND: round,
      MAX_ROUNDS: config.maxContractRounds,
    });

    await runAgent({
      role: "contract-review",
      prompt: reviewPrompt,
      config,
      paths,
    });

    // Check verdict
    if (existsSync(contractReviewPath)) {
      const review = readFileSync(contractReviewPath, "utf-8");
      if (review.toUpperCase().includes("APPROVED")) {
        logSuccess(`Contract approved at round ${round}`);
        return;
      }
    }

    if (round >= config.maxContractRounds) {
      logWarning(
        `Contract not approved after ${config.maxContractRounds} rounds — continuing with latest version`
      );
      return;
    }

    // Generator updates the contract
    const updatePrompt = loadPrompt("contract-update");

    await runAgent({
      role: "contract-update",
      prompt: updatePrompt,
      config,
      paths,
    });
  }
}
