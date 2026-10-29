# Model Selection Reference

## Per-Agent Model Selection

Before spawning an agent, determine which model to use. Check these layers in order — first match wins:

**Layer 0 — Persistent Config (`.squad/config.json`):** On session start, read `.squad/config.json`. If `agentModelOverrides.{agentName}` exists, use that model for this specific agent. Otherwise, if `defaultModel` exists, use it for ALL agents. This layer survives across sessions — the user set it once and it sticks.

- **When user says "always use X" / "use X for everything" / "default to X":** Write `defaultModel` to `.squad/config.json`. Acknowledge: `✅ Model preference saved: {model} — all future sessions will use this until changed.`
- **When user says "use X for {agent}":** Write to `agentModelOverrides.{agent}` in `.squad/config.json`. Acknowledge: `✅ {Agent} will always use {model} — saved to config.`
- **When user says "switch back to automatic" / "clear model preference":** Remove `defaultModel` (and optionally `agentModelOverrides`) from `.squad/config.json`. Acknowledge: `✅ Model preference cleared — returning to automatic selection.`

**Layer 1 — Session Directive:** Did the user specify a model for this session? ("use opus for this session", "save costs"). If yes, use that model. Session-wide directives persist until the session ends or contradicted.

**Layer 2 — Charter Preference:** Does the agent's charter have a `## Model` section with `Preferred` set to a specific model (not `auto`)? If yes, use that model.

**Layer 3 — Task-Aware Auto-Selection:** Use the governing principle: **cost first, unless code is being written.** Match the agent's task to determine output type, then select accordingly:

| Task Output | Model | Tier | Rule |
|-------------|-------|------|------|
| Writing code (implementation, refactoring, test code, bug fixes) | `claude-sonnet-5.5` | Standard | Quality and accuracy matter for code. Prefer Sonnet; Luna is second choice. |
| Writing prompts or agent designs (structured text that functions like code) | `claude-sonnet-5.5` | Standard | Prompts are executable — treat like code. |
| NOT writing code (docs, planning, triage, logs, changelogs, mechanical ops) | `gpt-6-luna` | Fast | Cost first. Luna handles non-code tasks. |
| Visual/design work requiring image analysis | `gpt-6-astra` | Premium | Vision capability required. Overrides cost rule. |

**Role-to-model mapping** (applying cost-first principle):

| Role | Default Model | Why | Override When |
|------|--------------|-----|---------------|
| Core Dev / Backend / Frontend | `claude-sonnet-5.5` | Writes code — quality first | — |
| Tester / QA | `claude-sonnet-5.5` | Writes test code — quality first | Simple test scaffolding → `claude-haiku-5.5` |
| Lead / Architect | auto (per-task) | Mixed: code review needs quality, planning needs cost | Architecture proposals → premium; triage/planning → `claude-haiku-5.5` |
| Prompt Engineer | auto (per-task) | Mixed: prompt design is like code, research is not | Prompt architecture → `claude-sonnet-5.5`; research/analysis → `claude-haiku-5.5` |
| Copilot SDK Expert | `claude-sonnet-5.5` | Technical analysis that often touches code | Pure research → `gpt-6-luna` |
| Designer / Visual | `gpt-6-astra` | Vision-capable model required | — (never downgrade — vision is non-negotiable) |
| DevRel / Writer | `gpt-6-luna` | Docs and writing — not code | — |
| Scribe / Logger | `gpt-6-luna` | Mechanical file ops — cheapest possible | — (never bump Scribe) |
| Git / Release | `gpt-6-luna` | Mechanical ops — changelogs, tags, version bumps | — (never bump mechanical ops) |

**Task complexity adjustments** (apply at most ONE — no cascading):
- **Bump UP to premium:** architecture proposals, reviewer gates, security audits, multi-agent coordination (output feeds 3+ agents)
- **Bump DOWN to fast/cheap:** typo fixes, renames, boilerplate, scaffolding, changelogs, version bumps
- **Switch to analytical diversity (`gemini-4-argon`):** code reviews where a second perspective helps, security reviews, architecture reviews after a rejection

**Layer 4 — Default:** If nothing else matched, use `gpt-6-luna` for non-code work and `claude-sonnet-5.5` for code or prompts. Cost wins when in doubt, unless code is being produced.

**Model currency:** Use the latest version of each model family or type available in the current platform catalog. Minimums: Sonnet, Opus, and Haiku use 5.5 or newer; GPT Astra uses 6 or newer (`gpt-6-astra`), Sol uses 6.1 or newer, and Luna uses 6 or newer. Use Luna wherever Terra was previously selected. These minimums also apply to persistent preferences, charter preferences, examples, and fallback choices. Validate resolved model IDs before spawning; report unavailable or below-minimum preferences rather than silently substituting an older version.

**Fallback chains — when a model is unavailable:**

If a spawn fails because the selected model is unavailable (plan restriction, org policy, rate limit, deprecation, or any other reason), silently retry with the next model in the chain. Do NOT tell the user about fallback attempts. Maximum 3 retries before using the platform default fallback.

```
Premium:  gpt-6-astra → claude-opus-5.5 → claude-sonnet-5.5 → (omit model param)
Standard: claude-sonnet-5.5 → gpt-6-luna → gemini-4-argon → (omit model param)
Fast:     gpt-6-luna → claude-haiku-5.5 → (omit model param)
```

`(omit model param)` = call the `task` tool WITHOUT the `model` parameter only when the platform default is verified to meet the model currency policy. If the default is unknown or below the minimum, report that no compliant fallback is available instead.

**Fallback rules:**
- If the user specified a provider ("use Claude"), fall back within that provider only before using the platform default fallback
- Never fall back UP in tier — a fast/cheap task should not land on a premium model
- Log fallbacks to the orchestration log for debugging, but never surface to the user unless asked

**Passing the model to spawns:**

Pass the resolved model as the `model` parameter on every `task` tool call:

```
agent_type: "general-purpose"
model: "{resolved_model}"
mode: "background"
name: "{name}"
description: "{emoji} {Name}: {brief task summary}"
prompt: |
  ...
```

Pass the resolved model explicitly rather than assuming the platform default meets the minimum model versions.

If you've exhausted the fallback chain and reached the platform default fallback, omit the `model` parameter entirely.

**Spawn output format — show the model choice:**

When spawning, include the model in your acknowledgment:

```
🔧 Runtime Engineer (claude-sonnet-5.5) — refactoring auth module
🎨 Experience Engineer (gpt-6-astra · vision) — designing color system
📋 Scribe (gpt-6-luna · fast) — logging session
⚡ Lead (gpt-6-astra · bumped for architecture) — reviewing proposal
📝 Docs Engineer (gpt-6-luna · fast) — updating docs
```

Include tier annotation only when the model was bumped or a specialist was chosen. Default-tier spawns just show the model name.

**Valid models (current platform catalog):**

Premium: `gpt-6-astra`, `claude-opus-5.5`
Standard: `claude-sonnet-5.5`, `gpt-6-luna`, `gemini-4-argon`
Fast/Cheap: `gpt-6-luna`, `claude-haiku-5.5`
