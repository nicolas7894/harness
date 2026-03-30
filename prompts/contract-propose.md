You are a Senior Fullstack Engineer. Before writing any code, you must define
a precise build contract.

## CONTEXT (read these files):
1. spec.md — the product to build
2. feature_list.json — all features and their acceptance criteria

## YOUR MISSION:

Propose a BUILD CONTRACT that defines precisely what "done" means.
Do NOT write any code. Only produce the contract.

Write to .harness/contracts/build_contract.md:

# Build Contract

## Stack & Architecture
- Chosen tech stack with justification
- Component/module structure
- Data model

## For each feature (in priority order):

### F001 — [name]
**Planned implementation:** Description of HOW you will implement it
**Testable behaviors:**
1. Navigate to [URL] — [element] visible
2. Click [button] — [expected result]
3. Input [data] — [validation/result]
4. Edge case: [scenario] — [expected behavior]
**Visual criteria:** What must be verifiable visually (screenshots)

## AI Agent Architecture (if applicable)
- How the AI agent is structured (tools, prompts)
- Which app features the agent can drive
- How to test that the agent works

## Design Contract
- Signature visual elements to verify (exact colors, fonts, animations)
- What would constitute "AI slop" to avoid

## Definition of Done
- All testable behaviors pass
- App is visually coherent
- No stubs, TODOs, or simulated features
- Clean git history (at least 1 commit per feature)

After: git add -A && git commit -m "contract: build contract proposed"
