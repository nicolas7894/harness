import { spawn } from "child_process";
import { createWriteStream } from "fs";
import { join } from "path";
import type { AgentResult, AgentRole, HarnessConfig, HarnessPaths } from "./types.js";
import { log, logSuccess } from "./logger.js";

export interface RunAgentOptions {
  role: AgentRole;
  prompt: string;
  config: HarnessConfig;
  paths: HarnessPaths;
}

export async function runAgent(options: RunAgentOptions): Promise<AgentResult> {
  const { role, prompt, config, paths } = options;
  const startTime = Date.now();
  const logFile = join(paths.logs, `${role}_${Date.now()}.log`);

  log(`Agent: ${role}`);

  const args = [
    "--model", config.model,
    "--print",
    "--dangerously-skip-permissions",
  ];

  if (config.maxTurns) {
    args.push("--max-turns", String(config.maxTurns));
  }

  args.push("-p", prompt);

  return new Promise<AgentResult>((resolve, reject) => {
    const proc = spawn("claude", args, {
      cwd: config.projectDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CLAUDECODE: "" },
    });

    const logStream = createWriteStream(logFile);

    proc.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      if (config.verbose) {
        process.stdout.write(text);
      }
      logStream.write(text);
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      if (config.verbose) {
        process.stderr.write(text);
      }
      logStream.write(text);
    });

    proc.on("close", (code) => {
      logStream.end();
      const duration = Math.round((Date.now() - startTime) / 1000);
      logSuccess(`${role} completed in ${formatDuration(duration)}`);

      resolve({
        exitCode: code ?? 1,
        duration,
        logFile,
      });
    });

    proc.on("error", (err) => {
      logStream.end();
      reject(new Error(`Failed to spawn claude: ${err.message}`));
    });
  });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}
