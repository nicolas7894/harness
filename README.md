# Harness

Multi-agent harness for long-running autonomous app development with Claude Code.

Inspired by Anthropic's [Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps).

## Architecture

```
User prompt
    │
    ▼
┌─────────┐
│ Planner │  Expands prompt into full product spec
└────┬────┘
     ▼
┌──────────────────────┐
│ Contract negotiation │  Generator proposes, Evaluator reviews
│  (up to 3 rounds)    │  Agreement on what "done" means
└────┬─────────────────┘
     ▼
┌───────────┐
│ Generator │  Builds entire app in one long-running session
└────┬──────┘
     ▼
┌────────────────────────────────┐
│ QA loop (up to 3 rounds)      │
│                                │
│  Evaluator ──► PASS ──► Done  │
│      │                         │
│     FAIL                       │
│      │                         │
│  REFINE or PIVOT?              │
│      │                         │
│  Generator (fix) ──► Re-test  │
└────────────────────────────────┘
```

### Agents

| Agent | Role | Duration |
|-------|------|----------|
| **Planner** | Expands a short prompt into a full spec with design language, feature list, and AI opportunities | ~5 min |
| **Generator** | Builds the entire app, feature by feature, in one continuous session with auto-compaction | 1–3 hours |
| **Evaluator** | Tests the running app via Playwright MCP (DOM snapshots + visual screenshots) | ~10 min |

### Key design decisions

- **No sprint decomposition** — Opus 4.6 handles long sessions natively with auto-compaction
- **Contract negotiation** — Generator and Evaluator agree on testable "done" criteria before any code is written
- **Dual verification** — QA uses both `browser_snapshot` (DOM) and `browser_take_screenshot` (visual) to catch functional AND design bugs
- **Strategic pivot** — Fix rounds choose between REFINE (patch bugs) or PIVOT (rethink architecture) based on score trends
- **File-based communication** — Agents communicate via files in the git repo, not direct message passing

## Prerequisites

- **Node.js** >= 20
- **Claude Code CLI** — installed and authenticated (`claude` command available)
- **git**

## Install

```bash
git clone https://github.com/yourname/harness.git
cd harness
npm install
npm link   # makes `harness` available globally
```

Or run directly without installing:

```bash
npx tsx src/index.ts ./my-project "Build a task manager"
```

## Usage

```bash
harness <project_dir> <prompt> [options]
```

### Basic examples

```bash
# Build an app with Opus (default)
harness ./my-app "Build a commercial proposal builder with PDF export"

# Use Sonnet for faster/cheaper runs
harness ./my-app "Build a todo app" --model claude-sonnet-4-6

# Stream agent output to terminal
harness ./my-app "Build a DAW" --verbose

# Show browser during QA (useful for debugging)
harness ./my-app "Build a CRM" --no-headless
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--model` | `claude-opus-4-6` | Claude model to use |
| `--qa-rounds` | `3` | Maximum QA rounds |
| `--max-turns` | unlimited | Max agent turns per session (cost safety net) |
| `--headless` | `true` | Run Playwright without visible browser |
| `--no-headless` | | Show browser window during QA |
| `--verbose` | `false` | Stream all agent output to terminal |

### Project-level config

Place a `.harness.json` in your project directory:

```json
{
  "model": "claude-opus-4-6",
  "maxQaRounds": 3,
  "maxContractRounds": 3,
  "headless": true,
  "skillPaths": ["/path/to/custom/skill.md"]
}
```

### Reference files

Place any reference files in the project directory before running. The Planner reads them as context:

```bash
mkdir my-project
cp brochure-template.html my-project/
cp pricing-grid.md my-project/
harness ./my-project "Build a proposal builder based on these references"
```

## Design skill

The harness automatically loads the [frontend design skill](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md) to guide visual design. It searches in this order:

1. `<project>/.claude/skills/frontend-design/SKILL.md`
2. `<project>/.claude/skills/frontend-design.md`
3. `~/.claude/skills/frontend-design/SKILL.md`
4. `~/.claude/skills/frontend-design.md`
5. `/mnt/skills/public/frontend-design/SKILL.md`
6. Download from GitHub (automatic)

## Output

After a run, your project directory contains:

```
my-project/
├── .harness/
│   ├── logs/           # Full agent logs (planner, generator, QA, fix)
│   ├── qa/
│   │   └── qa_report.json   # Structured QA report with scores
│   ├── contracts/
│   │   ├── build_contract.md     # Negotiated contract
│   │   └── contract_review.md    # Evaluator's review
│   └── prompts/        # Rendered prompts (for debugging)
├── spec.md             # Product specification
├── feature_list.json   # Feature list with acceptance criteria
├── claude-progress.txt # Agent progress log
├── init.sh             # Startup script
└── src/                # The built application
```

## Customizing prompts

All agent prompts live in `prompts/` as Markdown files with `{{VARIABLE}}` placeholders. Edit them to tune agent behavior without touching TypeScript:

| Prompt | Agent | What to tune |
|--------|-------|--------------|
| `planner.md` | Planner | Scope ambition, design direction, AI integration |
| `contract-propose.md` | Generator | Contract format, testable behavior style |
| `contract-review.md` | Evaluator | Review strictness, what to check |
| `generator.md` | Generator | Code quality standards, AI agent patterns |
| `evaluator.md` | Evaluator | Testing rigor, scoring calibration |
| `fix.md` | Generator | REFINE vs PIVOT thresholds |

## Cost estimates

| Model | Typical duration | Typical cost |
|-------|-----------------|--------------|
| `claude-opus-4-6` | 2–4 hours | $100–200 |
| `claude-sonnet-4-6` | 30–90 min | $15–40 |

Use `--max-turns` as a cost safety net:

```bash
harness ./my-app "Build X" --max-turns 200
```

## License

MIT
