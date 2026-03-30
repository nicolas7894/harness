export interface HarnessConfig {
  model: string;
  maxQaRounds: number;
  maxContractRounds: number;
  maxTurns?: number;
  headless: boolean;
  projectDir: string;
  prompt: string;
  skillPaths: string[];
  verbose: boolean;
}

export interface QAScores {
  feature_completeness: number;
  functionality: number;
  design_quality: number;
  code_quality: number;
}

export interface QAReport {
  round: number;
  timestamp: string;
  scores: QAScores;
  features_tested: FeatureResult[];
  contract_criteria_coverage: {
    total: number;
    tested: number;
    passed: number;
    failed: number;
  };
  design_assessment: {
    design_language_adherence: string;
    ai_slop_detected: boolean;
    visual_issues: string[];
  };
  ai_features_assessment: {
    agent_functional: boolean;
    tools_tested: string[];
    issues: string[];
  };
  pass: boolean;
  bugs: string[];
  recommendations: string[];
  trend: "improving" | "stagnant" | "regressing";
}

export interface FeatureResult {
  id: string;
  criteria_results: {
    criterion: string;
    status: "PASS" | "FAIL";
    details: string;
    verified_by: "snapshot" | "screenshot" | "both";
  }[];
}

export interface AgentResult {
  exitCode: number;
  duration: number;
  logFile: string;
}

export interface HarnessPaths {
  logs: string;
  qa: string;
  contracts: string;
  prompts: string;
  mcpConfig: string;
  designSkill: string;
  qaReport: string;
}

export type AgentRole =
  | "planner"
  | "contract-propose"
  | "contract-review"
  | "contract-update"
  | "generator"
  | "evaluator"
  | "fix";
