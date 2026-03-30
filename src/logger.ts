import { appendFileSync, mkdirSync } from "fs";
import { dirname } from "path";

let logFilePath: string | null = null;

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

export function initLogger(path: string): void {
  logFilePath = path;
  mkdirSync(dirname(path), { recursive: true });
}

function write(message: string): void {
  if (logFilePath) {
    appendFileSync(logFilePath, message + "\n");
  }
}

export function log(message: string): void {
  const line = `${DIM}[${timestamp()}]${RESET} ${message}`;
  console.log(line);
  write(`[${timestamp()}] ${message}`);
}

export function logPhase(phase: string): void {
  const line = `\n${BOLD}${CYAN}━━━ ${phase} ━━━${RESET}`;
  console.log(line);
  write(`\n━━━ ${phase} ━━━`);
}

export function logSuccess(message: string): void {
  const line = `${DIM}[${timestamp()}]${RESET} ${GREEN}✓${RESET} ${message}`;
  console.log(line);
  write(`[${timestamp()}] ✓ ${message}`);
}

export function logError(message: string): void {
  const line = `${DIM}[${timestamp()}]${RESET} ${RED}✗${RESET} ${message}`;
  console.error(line);
  write(`[${timestamp()}] ✗ ${message}`);
}

export function logWarning(message: string): void {
  const line = `${DIM}[${timestamp()}]${RESET} ${YELLOW}⚠${RESET} ${message}`;
  console.log(line);
  write(`[${timestamp()}] ⚠ ${message}`);
}

export function logResult(label: string, value: string): void {
  const line = `  ${DIM}${label.padEnd(12)}:${RESET} ${value}`;
  console.log(line);
  write(`  ${label.padEnd(12)}: ${value}`);
}
