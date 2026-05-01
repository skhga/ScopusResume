# HALO + Claude Code Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up a persistent HALO observability pipeline that collects Claude Code OTel traces, converts them to HALO-compatible JSONL, and enables systematic agent failure analysis.

**Architecture:** Claude Code's built-in OTel exporter sends traces to a local Docker OTel Collector which writes JSON files. A Python bridge script flattens the OTLP resource/scope/span hierarchy into HALO's canonical SpanRecord JSONL. The HALO CLI then analyzes the traces and produces a report that can be fed back into Claude Code to fix the agent harness.

**Tech Stack:** Docker (OTel Collector), Python 3.13 (bridge script, pydantic), halo-engine 0.1.2

---

### Task 1: OTel Collector Docker Setup

**Files:**
- Create: `~/.claude/otel-collector-config.yaml`
- Create: `~/.claude/scripts/start-otel-collector.sh`

- [ ] **Step 1: Write the collector config**

Write `~/.claude/otel-collector-config.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

exporters:
  file:
    path: /traces/traces
    rotation:
      max_megabytes: 100
      max_backups: 5
    format: json

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [file]
    logs:
      receivers: [otlp]
      exporters: [file]
```

- [ ] **Step 2: Write the startup script**

Write `~/.claude/scripts/start-otel-collector.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="claude-otel-collector"
TRACES_DIR="$HOME/.claude/traces"
CONFIG="$HOME/.claude/otel-collector-config.yaml"

mkdir -p "$TRACES_DIR"

# Stop existing container if running
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p 127.0.0.1:4318:4318 \
  -v "$CONFIG:/etc/otelcol/config.yaml:ro" \
  -v "$TRACES_DIR:/traces:rw" \
  otel/opentelemetry-collector-contrib:latest

echo "OTel Collector started (container: $CONTAINER_NAME)"
echo "Traces directory: $TRACES_DIR"
echo "OTLP endpoint: http://localhost:4318"
```

- [ ] **Step 3: Make script executable and start collector**

```bash
chmod +x ~/.claude/scripts/start-otel-collector.sh
~/.claude/scripts/start-otel-collector.sh
```

- [ ] **Step 4: Verify collector is running and healthy**

```bash
docker ps --filter name=claude-otel-collector
# Expected: container listed with status "Up"
```

- [ ] **Step 5: Commit**

```bash
# These are user-level infra files, not project files. No commit needed.
echo "OTel collector files live at ~/.claude/ — no git commit required."
```

---

### Task 2: Claude Code OTel Settings

**Files:**
- Modify: `~/.claude/settings.json`

- [ ] **Step 1: Read current settings**

Verify current `~/.claude/settings.json` contains existing env vars:
```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "...",
    ...
  }
}
```

- [ ] **Step 2: Add OTel env vars**

Add these keys to the existing `"env"` block in `~/.claude/settings.json`:

```json
"CLAUDE_CODE_ENABLE_TELEMETRY": "1",
"CLAUDE_CODE_ENHANCED_TELEMETRY_BETA": "1",
"OTEL_TRACES_EXPORTER": "otlp",
"OTEL_LOGS_EXPORTER": "otlp",
"OTEL_EXPORTER_OTLP_PROTOCOL": "http/protobuf",
"OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4318"
```

The merged `"env"` block should be:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "sk-eb837f9ba0704a60abb40ee98a63e6a6",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-4-6",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-v4-flash",
    "ANTHROPIC_SMALL_FAST_MODEL": "deepseek-v4-flash",
    "CLAUDE_CODE_SUBAGENT_MODEL": "deepseek-v4-pro",
    "API_TIMEOUT_MS": "600000",
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "CLAUDE_CODE_ENHANCED_TELEMETRY_BETA": "1",
    "OTEL_TRACES_EXPORTER": "otlp",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/protobuf",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4318"
  }
}
```

- [ ] **Step 3: Validate JSON is well-formed**

```bash
python3 -c "import json; json.load(open('$HOME/.claude/settings.json')); print('Valid JSON')"
# Expected: Valid JSON
```

- [ ] **Step 4: Restart Claude Code and verify telemetry is active**

After restarting Claude Code, check that the collector is receiving data:

```bash
# Run a quick Claude Code session, then:
ls -la ~/.claude/traces/
# Expected: trace files present (may be empty initially if no session activity)
```

---

### Task 3: Format Bridge Script

**Files:**
- Create: `~/.claude/scripts/claude-traces-to-halo`

- [ ] **Step 1: Create the bridge script**

Write `~/.claude/scripts/claude-traces-to-halo`:

```python
#!/usr/bin/env python3
"""Convert OTel Collector file-exporter output to HALO-compatible SpanRecord JSONL.

Reads the OTel Collector's file exporter JSON output (OTLP wire format:
ResourceSpans → ScopeSpans → Spans), extracts individual spans, flattens
resource/scope context into each span, and writes one SpanRecord per line.

Usage:
    claude-traces-to-halo ~/.claude/traces/ > traces.jsonl
    claude-traces-to-halo ~/.claude/traces/ --since 2026-05-01 > traces.jsonl
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def parse_iso_ns(ts: str) -> datetime:
    """Parse an ISO 8601 timestamp with nanosecond precision into a datetime."""
    ts = ts.strip()
    if ts.endswith("Z"):
        ts = ts[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(ts)
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)


def parse_otlp_timestamp(ts_str: str) -> str:
    """Convert OTLP nanosecond-unix string to ISO 8601."""
    try:
        ns = int(ts_str)
        dt = datetime.fromtimestamp(ns / 1e9, tz=timezone.utc)
        return dt.isoformat()
    except (ValueError, OSError):
        return ts_str


def status_from_span(span: dict[str, Any]) -> dict[str, str]:
    """Extract OTel span status."""
    s = span.get("status", {})
    code_map = {0: "STATUS_CODE_UNSET", 1: "STATUS_CODE_OK", 2: "STATUS_CODE_ERROR"}
    code = s.get("code", 0)
    if isinstance(code, str):
        code_str = code
    else:
        code_str = code_map.get(code, "STATUS_CODE_UNSET")
    return {"code": code_str, "message": s.get("message", "")}


def kind_from_span(span: dict[str, Any]) -> str:
    """Map OTel span kind integer to string."""
    kind_map = {
        0: "SPAN_KIND_UNSPECIFIED",
        1: "SPAN_KIND_INTERNAL",
        2: "SPAN_KIND_SERVER",
        3: "SPAN_KIND_CLIENT",
        4: "SPAN_KIND_PRODUCER",
        5: "SPAN_KIND_CONSUMER",
    }
    k = span.get("kind", 1)
    return kind_map.get(k, "SPAN_KIND_INTERNAL") if isinstance(k, int) else str(k)


def build_span_record(
    span: dict[str, Any],
    resource_attrs: dict[str, Any],
    scope_name: str,
    scope_version: str,
) -> dict[str, Any]:
    """Build a HALO SpanRecord from an OTLP span + resource/scope context."""
    attrs = {}
    for attr in span.get("attributes", []):
        key = attr.get("key", "")
        val = attr.get("value", {})
        # OTLP AnyValue: pick the typed field
        if "stringValue" in val:
            attrs[key] = val["stringValue"]
        elif "intValue" in val:
            attrs[key] = int(val["intValue"])
        elif "doubleValue" in val:
            attrs[key] = float(val["doubleValue"])
        elif "boolValue" in val:
            attrs[key] = val["boolValue"]
        elif "arrayValue" in val:
            attrs[key] = val["arrayValue"]
        elif "kvlistValue" in val:
            attrs[key] = val["kvlistValue"]
        else:
            attrs[key] = str(val)

    return {
        "trace_id": span.get("traceId", ""),
        "span_id": span.get("spanId", ""),
        "parent_span_id": span.get("parentSpanId", ""),
        "trace_state": span.get("traceState", ""),
        "name": span.get("name", ""),
        "kind": kind_from_span(span),
        "start_time": parse_otlp_timestamp(span.get("startTimeUnixNano", "0")),
        "end_time": parse_otlp_timestamp(span.get("endTimeUnixNano", "0")),
        "status": status_from_span(span),
        "resource": {"attributes": resource_attrs},
        "scope": {"name": scope_name, "version": scope_version},
        "attributes": attrs,
    }


def flatten_resource_attrs(resource: dict[str, Any]) -> dict[str, Any]:
    """Convert OTLP key-value list to dict."""
    attrs: dict[str, Any] = {}
    for attr in resource.get("attributes", []):
        key = attr.get("key", "")
        val = attr.get("value", {})
        if "stringValue" in val:
            attrs[key] = val["stringValue"]
        elif "intValue" in val:
            attrs[key] = int(val["intValue"])
        elif "doubleValue" in val:
            attrs[key] = float(val["doubleValue"])
        elif "boolValue" in val:
            attrs[key] = val["boolValue"]
        else:
            attrs[key] = str(val)
    return attrs


def process_file(filepath: Path, since: datetime | None) -> list[dict[str, Any]]:
    """Read one OTel Collector output file and return HALO span records."""
    records: list[dict[str, Any]] = []
    with open(filepath) as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                batch = json.loads(line)
            except json.JSONDecodeError:
                continue

            for resource_span in batch.get("resourceSpans", []):
                resource = resource_span.get("resource", {})
                resource_attrs = flatten_resource_attrs(resource)

                for scope_span in resource_span.get("scopeSpans", []):
                    scope = scope_span.get("scope", {})
                    scope_name = scope.get("name", "")
                    scope_version = scope.get("version", "")

                    for span in scope_span.get("spans", []):
                        record = build_span_record(
                            span, resource_attrs, scope_name, scope_version
                        )
                        if since is not None:
                            ts = parse_iso_ns(record["start_time"])
                            if ts < since:
                                continue
                        records.append(record)
    return records


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: claude-traces-to-halo <traces-dir> [--since YYYY-MM-DD]", file=sys.stderr)
        sys.exit(1)

    traces_dir = Path(sys.argv[1])
    since: datetime | None = None

    for i, arg in enumerate(sys.argv):
        if arg == "--since" and i + 1 < len(sys.argv):
            since = datetime.fromisoformat(sys.argv[i + 1]).replace(tzinfo=timezone.utc)

    if not traces_dir.exists():
        print(f"Traces directory not found: {traces_dir}", file=sys.stderr)
        sys.exit(1)

    trace_files = sorted(traces_dir.glob("traces*"))
    if not trace_files:
        print(f"No trace files found in {traces_dir}", file=sys.stderr)
        sys.exit(1)

    for fp in trace_files:
        records = process_file(fp, since)
        for record in records:
            json.dump(record, sys.stdout, ensure_ascii=False)
            sys.stdout.write("\n")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Make script executable**

```bash
chmod +x ~/.claude/scripts/claude-traces-to-halo
```

- [ ] **Step 3: Test with a sample OTLP JSON batch**

```bash
# Create a minimal test fixture
mkdir -p /tmp/halo-test
cat > /tmp/halo-test/traces_sample << 'OTLPEOF'
{"resourceSpans":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"claude-code"}}]},"scopeSpans":[{"scope":{"name":"anthropic.claude-code","version":"1.0.0"},"spans":[{"traceId":"abcdef1234567890abcdef1234567890","spanId":"span001","parentSpanId":"","name":"claude_code.interaction","kind":1,"startTimeUnixNano":"1714600000000000000","endTimeUnixNano":"1714600005000000000","status":{"code":1},"attributes":[{"key":"user_prompt","value":{"stringValue":"test prompt"}},{"key":"interaction.sequence","value":{"intValue":"1"}}]},{"traceId":"abcdef1234567890abcdef1234567890","spanId":"span002","parentSpanId":"span001","name":"claude_code.llm_request","kind":3,"startTimeUnixNano":"1714600001000000000","endTimeUnixNano":"1714600004000000000","status":{"code":1},"attributes":[{"key":"model","value":{"stringValue":"claude-sonnet-4-6"}},{"key":"input_tokens","value":{"intValue":"1500"}},{"key":"output_tokens","value":{"intValue":"300"}}]}]}]}]}
OTLPEOF

~/.claude/scripts/claude-traces-to-halo /tmp/halo-test/
# Expected: 2 JSON lines printed to stdout, each a valid SpanRecord
```

- [ ] **Step 4: Verify output matches HALO SpanRecord schema**

```bash
python3 -c "
import json, sys
from pathlib import Path
from engine.traces.models.canonical_span import SpanRecord

# Read the bridge output and validate each line
lines = '''$(~/.claude/scripts/claude-traces-to-halo /tmp/halo-test/)'''.strip().split('\n')
for line in lines:
    if line.strip():
        record = SpanRecord.model_validate_json(line)
        print(f'OK: {record.name} (trace_id={record.trace_id[:8]}...)')
print('All records pass SpanRecord validation.')
"
```

- [ ] **Step 5: Commit**

```bash
# User-level script — no project commit needed.
echo "Bridge script installed at ~/.claude/scripts/claude-traces-to-halo"
```

---

### Task 4: End-to-End Verification

**Files:** None (verification only)

- [ ] **Step 1: Generate a real trace by running a Claude Code session**

Start a new Claude Code session and run at least one interaction that involves tool calls:

```
claude "Read the file at ~/.claude/settings.json and tell me how many env vars are set"
```

- [ ] **Step 2: Check collector received the trace**

```bash
ls -la ~/.claude/traces/
# Expected: trace files with non-zero size
```

- [ ] **Step 3: Convert traces to HALO format**

```bash
~/.claude/scripts/claude-traces-to-halo ~/.claude/traces/ > /tmp/halo-test-traces.jsonl
wc -l /tmp/halo-test-traces.jsonl
# Expected: > 0 lines
head -1 /tmp/halo-test-traces.jsonl | python3 -m json.tool | head -20
# Expected: well-formed SpanRecord JSON
```

- [ ] **Step 4: Run HALO on the collected traces**

```bash
export OPENAI_API_KEY=<your-openai-key>
halo /tmp/halo-test-traces.jsonl \
  -p "Summarize what happened in these traces. Are there any errors or unusual patterns?"
# Expected: HALO streams a structured analysis report to stdout
```

- [ ] **Step 5: Verify the full loop works**

The HALO output should describe the Claude Code session it analyzed — confirming traces were captured, converted, and ingested correctly.

---

### Task 5: Workflow Documentation

**Files:**
- Modify: `~/.claude/CLAUDE.md` (append HALO workflow section)

- [ ] **Step 1: Add HALO workflow to CLAUDE.md**

Append to `~/.claude/CLAUDE.md`:

```markdown
## HALO Trace Analysis

OTel traces are collected continuously from all Claude Code sessions via a local OTel Collector.

### Weekly Analysis

```bash
# Convert recent traces (last 7 days)
~/.claude/scripts/claude-traces-to-halo ~/.claude/traces/ --since $(date -v-7d +%Y-%m-%d) > /tmp/halo-weekly.jsonl

# Run HALO
export OPENAI_API_KEY=...
halo /tmp/halo-weekly.jsonl -p "Find systemic failure patterns: tool mistakes, hallucinated inputs, premature stopping, error loops, reasoning gaps."

# Feed report into Claude Code to apply fixes
```

### On-Demand Analysis

Same workflow but with a narrower `--since` window or specific trace files.

### Infrastructure

- **Collector:** Docker container `claude-otel-collector`, auto-restarts
- **Config:** `~/.claude/otel-collector-config.yaml`
- **Traces:** `~/.claude/traces/` (100MB rotation, 5 backups)
- **Start/Restart:** `~/.claude/scripts/start-otel-collector.sh`
```

- [ ] **Step 2: Verify CLAUDE.md is still valid**

```bash
cat ~/.claude/CLAUDE.md
```
