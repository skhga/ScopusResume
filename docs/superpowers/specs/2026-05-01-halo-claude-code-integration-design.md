# HALO + Claude Code Integration Design

**Date:** 2026-05-01
**Scope:** User-level Claude Code infrastructure (not project-specific)

## Overview

Integrate HALO (Hierarchical Agent Loop Optimization) with Claude Code to collect execution traces, analyze systemic failure patterns across sessions, and feed reports back into Claude Code to fix the agent harness.

HALO loop: Collect traces → analyze patterns → produce report → Claude Code applies fixes → repeat.

## Architecture

```
Claude Code (built-in OTel) ──OTLP──→ OTel Collector (file exporter) ──JSONL──→ HALO Engine ──report──→ Claude Code (fix agent)
```

All components run locally. No cloud services, no external API keys beyond existing OpenAI key for HALO.

## Components

### 1. OpenTelemetry Collector

**Location:** Docker container, `~/.claude/otel-collector-config.yaml`

**Config:**
- Receiver: OTLP HTTP on `localhost:4318`
- Exporter: file exporter writing to `~/.claude/traces/`
- Rotation: 100MB per file, 5 backups
- Pipelines: traces and logs

**Startup:** Run once via Docker, auto-restart on reboot. Lightweight, minimal resource usage.

### 2. Claude Code OTel Configuration

**Location:** `~/.claude/settings.json` (user-level — traces all projects)

**Env vars:**
- `CLAUDE_CODE_ENABLE_TELEMETRY=1`
- `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1`
- `OTEL_TRACES_EXPORTER=otlp`
- `OTEL_LOGS_EXPORTER=otlp`
- `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`

**Spans emitted:**
- `claude_code.interaction` — user prompt, session ID, sequence
- `claude_code.llm_request` — model, tokens, duration, stop reason, errors
- `claude_code.tool` + `claude_code.tool.execution` — tool name, duration, success/failure
- `claude_code.tool.blocked_on_user` — permission wait time, decision
- Nested subagent spans — subagent type, prompt, transcript path

### 3. Format Bridge Script

**Location:** `~/.claude/scripts/claude-traces-to-halo`

**Function:**
- Reads OTel Collector file output (protobuf/JSON wire format)
- Reconstructs full traces from individual spans (grouped by `trace_id`)
- Maps Claude Code span hierarchy to HALO-compatible flat JSONL
- ~100-line Python script, stdlib + `opentelemetry-proto` only

**Mapping:**
| Claude Code Span | HALO Record |
|---|---|
| `claude_code.interaction` | Root — prompt, session, sequence |
| `claude_code.llm_request` | Model call — model, tokens, duration, errors |
| `claude_code.tool` + `.execution` | Tool use — name, input, output, success, error |
| `claude_code.tool.blocked_on_user` | Permission — wait time, decision |
| Nested subagent spans | Child trace — type, prompt, transcript |

### 4. HALO Engine

**Install:** `pip install halo-engine`

**Analysis command:**
```bash
claude-traces-to-halo ~/.claude/traces/ > ~/.claude/halo-traces.jsonl
halo ~/.claude/halo-traces.jsonl \
  -p "Find systemic failure patterns in Claude Code agent sessions."
```

**What HALO analyzes:**
- Tool selection mistakes (wrong tool for the job)
- Hallucinated tool inputs (invalid paths, commands, parameters)
- Premature stopping (agent gives up too early)
- Error/recovery loops (same error repeated across turns)
- Reasoning gaps (incomplete analysis before action)

### 5. Fix Application

Feed HALO report into Claude Code:
```
claude "Here's a HALO analysis: [report]. Suggest changes to my CLAUDE.md and hooks."
```

**Targets for fixes:**
- `~/.claude/CLAUDE.md` — agent behavior instructions
- `~/.claude/settings.json` — hooks, permissions, env vars
- Project-level `.claude/settings.json` — project-specific guardrails
- Custom hook scripts

## Files Created

| File | Purpose |
|---|---|
| `~/.claude/otel-collector-config.yaml` | Collector config |
| `~/.claude/traces/` | Trace output (auto-rotated) |
| `~/.claude/halo-traces.jsonl` | Converted traces for HALO |
| `~/.claude/scripts/claude-traces-to-halo` | Bridge script |

## Workflow

**Frequency:** Run analysis weekly, or on-demand when degradation is noticed.

1. Traces accumulate continuously via collector (zero overhead per session)
2. Run bridge script to convert recent traces
3. Run HALO on converted traces
4. Paste report into Claude Code for fix suggestions
5. Apply fixes to CLAUDE.md, settings, or hooks
6. Monitor next week's traces for improvement

## Success Criteria

- Collector runs stably without manual intervention
- Traces capture complete interaction lifecycle (prompt → model calls → tools → result)
- HALO produces actionable reports identifying real failure patterns
- Fix loop measurably reduces recurring agent errors over time
