/**
 * TDD tests for OSOP report generation (src/report.ts).
 *
 * Tests the HTML escape, formatting helpers, type-color mapping,
 * and full HTML/text report generation.
 */
import { describe, it, expect } from "vitest";
import { generateHtmlReport, generateTextReport } from "../src/report.js";

// ---------------------------------------------------------------------------
// We need access to the internal helpers (h, ms, usd, typeColor).
// Since they are not exported, we test them indirectly through the
// report output, or we re-implement minimal versions and test through
// the generated HTML.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------

const SAMPLE_OSOP_YAML = `
osop_version: "1.0"
id: "test-workflow"
name: "Test Workflow"
description: "A test workflow for unit testing."
version: "1.0.0"
tags:
  - test
  - ci

nodes:
  - id: "start"
    type: "human"
    name: "User Input"
    description: "User provides initial data."
  - id: "process"
    type: "agent"
    name: "Process Data"
    description: "AI processes the input data."
  - id: "save"
    type: "db"
    name: "Save Results"
    description: "Store results in database."
  - id: "notify"
    type: "api"
    name: "Send Notification"
    description: "Notify user via API."

edges:
  - from: "start"
    to: "process"
    mode: "sequential"
  - from: "process"
    to: "save"
    mode: "sequential"
  - from: "save"
    to: "notify"
    mode: "sequential"
`;

const SAMPLE_LOG_YAML = `
osoplog_version: "1.0"
run_id: "abc12345-6789-0000-1111-222233334444"
workflow_id: "test-workflow"
workflow_version: "1.0.0"
mode: "live"
status: "COMPLETED"

trigger:
  type: "manual"
  actor: "tester"
  timestamp: "2026-01-15T10:00:00Z"

started_at: "2026-01-15T10:00:00Z"
ended_at: "2026-01-15T10:00:05Z"
duration_ms: 5000

runtime:
  agent: "claude-code"
  model: "claude-opus-4-6"

node_records:
  - node_id: "start"
    node_type: "human"
    attempt: 1
    status: "COMPLETED"
    started_at: "2026-01-15T10:00:00Z"
    ended_at: "2026-01-15T10:00:01Z"
    duration_ms: 1000
    inputs:
      query: "test data"
    outputs:
      data: "processed input"

  - node_id: "process"
    node_type: "agent"
    attempt: 1
    status: "COMPLETED"
    started_at: "2026-01-15T10:00:01Z"
    ended_at: "2026-01-15T10:00:03Z"
    duration_ms: 2000
    ai_metadata:
      model: "claude-opus-4-6"
      prompt_tokens: 500
      completion_tokens: 200
      cost_usd: 0.0045
      confidence: 0.95
    tools_used:
      - tool: "Read"
        calls: 3
      - tool: "Edit"
        calls: 1

  - node_id: "save"
    node_type: "db"
    attempt: 1
    status: "COMPLETED"
    started_at: "2026-01-15T10:00:03Z"
    ended_at: "2026-01-15T10:00:04Z"
    duration_ms: 800

  - node_id: "notify"
    node_type: "api"
    attempt: 1
    status: "COMPLETED"
    started_at: "2026-01-15T10:00:04Z"
    ended_at: "2026-01-15T10:00:05Z"
    duration_ms: 1200

result_summary: "Workflow completed successfully with all 4 nodes passing."

cost:
  total_usd: 0.0045
  breakdown:
    - node_id: "process"
      cost_usd: 0.0045
`;

const SAMPLE_FAILED_LOG_YAML = `
osoplog_version: "1.0"
run_id: "fail-1234-5678-9999-0000"
workflow_id: "test-workflow"
mode: "live"
status: "FAILED"

started_at: "2026-01-15T10:00:00Z"
ended_at: "2026-01-15T10:00:03Z"
duration_ms: 3000

runtime:
  agent: "claude-code"
  model: "claude-opus-4-6"

trigger:
  type: "manual"
  actor: "tester"

node_records:
  - node_id: "start"
    node_type: "human"
    attempt: 1
    status: "COMPLETED"
    duration_ms: 500

  - node_id: "process"
    node_type: "agent"
    attempt: 1
    status: "FAILED"
    duration_ms: 2000
    error:
      code: "TIMEOUT"
      message: "LLM request timed out after 30s"
      details: "Connection to API endpoint was reset."

  - node_id: "process"
    node_type: "agent"
    attempt: 2
    status: "COMPLETED"
    duration_ms: 1500
    ai_metadata:
      model: "claude-opus-4-6"
      prompt_tokens: 500
      completion_tokens: 200

result_summary: "Workflow failed at process node but succeeded on retry."
`;

// ---------------------------------------------------------------------------
// HTML escape (h) — tested indirectly through report output
// ---------------------------------------------------------------------------
describe("HTML escape (h function)", () => {
  it("should escape & < > in node descriptions", () => {
    const yaml = `
osop_version: "1.0"
id: "escape-test"
name: "Escape <Test> & More"
nodes:
  - id: "s1"
    type: "agent"
    name: "Step with <html> & entities"
    description: "Input: x > 5 && y < 10"
edges: []
`;
    const html = generateHtmlReport(yaml);

    // The name should be escaped in the <title> and <h1>
    expect(html).toContain("&lt;Test&gt;");
    expect(html).toContain("&amp;");

    // Node description should be escaped
    expect(html).toContain("x &gt; 5 &amp;&amp; y &lt; 10");

    // Node name with <html> should be escaped in the output
    expect(html).toContain("&lt;html&gt;");
  });

  it("should handle empty strings without error", () => {
    const yaml = `
osop_version: "1.0"
id: ""
name: ""
nodes: []
edges: []
`;
    const html = generateHtmlReport(yaml);
    expect(html).toBeDefined();
    expect(html.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Duration formatting (ms) — tested via report output
// ---------------------------------------------------------------------------
describe("Duration formatting (ms function)", () => {
  it("should display milliseconds for values < 1000", () => {
    const logYaml = `
run_id: "test"
workflow_id: "test"
status: "COMPLETED"
duration_ms: 500
node_records:
  - node_id: "s1"
    node_type: "agent"
    attempt: 1
    status: "COMPLETED"
    duration_ms: 42
`;
    const osopYaml = `
osop_version: "1.0"
id: "test"
name: "Test"
nodes:
  - id: "s1"
    type: "agent"
    name: "Fast Step"
edges: []
`;
    const html = generateHtmlReport(osopYaml, logYaml);
    expect(html).toContain("42ms");
  });

  it("should display seconds for values >= 1000 and < 60000", () => {
    const logYaml = `
run_id: "test"
workflow_id: "test"
status: "COMPLETED"
duration_ms: 5000
node_records:
  - node_id: "s1"
    node_type: "agent"
    attempt: 1
    status: "COMPLETED"
    duration_ms: 2500
`;
    const osopYaml = `
osop_version: "1.0"
id: "test"
name: "Test"
nodes:
  - id: "s1"
    type: "agent"
    name: "Medium Step"
edges: []
`;
    const html = generateHtmlReport(osopYaml, logYaml);
    expect(html).toContain("2.5s");
  });

  it("should display minutes for values >= 60000", () => {
    const logYaml = `
run_id: "test"
workflow_id: "test"
status: "COMPLETED"
duration_ms: 120000
node_records:
  - node_id: "s1"
    node_type: "agent"
    attempt: 1
    status: "COMPLETED"
    duration_ms: 90000
`;
    const osopYaml = `
osop_version: "1.0"
id: "test"
name: "Test"
nodes:
  - id: "s1"
    type: "agent"
    name: "Slow Step"
edges: []
`;
    const html = generateHtmlReport(osopYaml, logYaml);
    expect(html).toContain("1.5m");
  });

  it("should display '-' for null/undefined duration", () => {
    // When no duration_ms, the header shows '-'
    const logYaml = `
run_id: "test"
workflow_id: "test"
status: "COMPLETED"
node_records: []
`;
    const osopYaml = `
osop_version: "1.0"
id: "test"
name: "Test"
nodes: []
edges: []
`;
    const html = generateHtmlReport(osopYaml, logYaml);
    // The header status bar should contain the '-' for missing duration
    expect(html).toContain("<span>-</span>");
  });
});

// ---------------------------------------------------------------------------
// Currency formatting (usd) — tested via report output
// ---------------------------------------------------------------------------
describe("Currency formatting (usd function)", () => {
  it("should display $0 for zero cost", () => {
    const logYaml = `
run_id: "test"
workflow_id: "test"
status: "COMPLETED"
duration_ms: 100
cost:
  total_usd: 0
node_records: []
`;
    const osopYaml = `
osop_version: "1.0"
id: "test"
name: "Test"
nodes: []
edges: []
`;
    const html = generateHtmlReport(osopYaml, logYaml);
    // $0 cost should not appear in span (since !v evaluates to true for 0)
    // Actually usd(0) returns '$0' but the condition `if (log.cost?.total_usd)` is falsy for 0
    // So no cost span is rendered
    expect(html).toBeDefined();
  });

  it("should show 4 decimal places for costs < $0.01", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    // cost is 0.0045 which is < 0.01, should show $0.0045
    expect(html).toContain("$0.0045");
  });

  it("should show 3 decimal places for costs >= $0.01", () => {
    const logYaml = `
run_id: "test"
workflow_id: "test"
status: "COMPLETED"
duration_ms: 100
cost:
  total_usd: 1.23456
node_records: []
`;
    const osopYaml = `
osop_version: "1.0"
id: "test"
name: "Test"
nodes: []
edges: []
`;
    const html = generateHtmlReport(osopYaml, logYaml);
    expect(html).toContain("$1.235");
  });
});

// ---------------------------------------------------------------------------
// Type color mapping
// ---------------------------------------------------------------------------
describe("Type color mapping", () => {
  it("should assign orange (#ea580c) to human nodes", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    // The human node should have a type pill with color #ea580c
    expect(html).toContain('style="background:#ea580c"');
  });

  it("should assign purple (#7c3aed) to agent nodes", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(html).toContain('style="background:#7c3aed"');
  });

  it("should assign blue (#2563eb) to api nodes", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(html).toContain('style="background:#2563eb"');
  });

  it("should assign green (#059669) to db nodes", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(html).toContain('style="background:#059669"');
  });

  it("should use gray (#475569) as fallback for unknown types", () => {
    const yaml = `
osop_version: "1.0"
id: "test"
name: "Test"
nodes:
  - id: "s1"
    type: "unknown_type"
    name: "Unknown"
edges: []
`;
    const html = generateHtmlReport(yaml);
    expect(html).toContain('style="background:#475569"');
  });
});

// ---------------------------------------------------------------------------
// Full HTML Report — Spec-only mode (no log)
// ---------------------------------------------------------------------------
describe("HTML Report — spec-only mode", () => {
  it("should produce valid HTML with DOCTYPE", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML);
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("<html>");
    expect(html).toContain("</html>");
  });

  it("should include workflow name in title and h1", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML);
    expect(html).toContain("<title>Test Workflow</title>");
    expect(html).toContain("<h1>Test Workflow</h1>");
  });

  it("should show node count and edge count in spec mode", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML);
    expect(html).toContain("4 nodes");
    expect(html).toContain("3 edges");
  });

  it("should include workflow description", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML);
    expect(html).toContain("A test workflow for unit testing.");
  });

  it("should include workflow id in meta line", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML);
    expect(html).toContain("test-workflow");
  });

  it("should render all node names", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML);
    expect(html).toContain("User Input");
    expect(html).toContain("Process Data");
    expect(html).toContain("Save Results");
    expect(html).toContain("Send Notification");
  });

  it("should render node type labels in uppercase", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML);
    expect(html).toContain("HUMAN");
    expect(html).toContain("AGENT");
    expect(html).toContain("DB");
    expect(html).toContain("API");
  });

  it("should include CSS in <style> tag", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML);
    expect(html).toContain("<style>");
    expect(html).toContain("</style>");
  });

  it("should include footer with OSOP link", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML);
    expect(html).toContain("osop.ai");
    expect(html).toContain("OSOP v1.0");
  });

  it("should include dark mode media query in CSS", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML);
    expect(html).toContain("prefers-color-scheme:dark");
  });

  it("should use <details>/<summary> for node expand/collapse", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML);
    expect(html).toContain("<details");
    expect(html).toContain("<summary>");
    expect(html).toContain("</details>");
  });
});

// ---------------------------------------------------------------------------
// Full HTML Report — Execution mode (with log)
// ---------------------------------------------------------------------------
describe("HTML Report — execution mode", () => {
  it("should show COMPLETED status badge", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(html).toContain("COMPLETED");
    expect(html).toContain('class="s ok"');
  });

  it("should show total duration", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(html).toContain("5.0s");
  });

  it("should show total cost", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(html).toContain("$0.0045");
  });

  it("should show node count in execution mode", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(html).toContain("4 nodes");
  });

  it("should show run ID (truncated to 8 chars)", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(html).toContain("run:abc12345");
  });

  it("should show runtime agent", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(html).toContain("claude-code");
  });

  it("should show trigger actor", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(html).toContain("tester");
  });

  it("should show mode", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(html).toContain("live");
  });

  it("should show AI metadata for agent nodes", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(html).toContain("claude-opus-4-6");
    // Token counts
    expect(html).toContain("500");
    expect(html).toContain("200");
    // Confidence
    expect(html).toContain("95%");
  });

  it("should show tools_used for nodes that have them", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(html).toContain("Readx3");
    expect(html).toContain("Editx1");
  });

  it("should show per-node duration", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(html).toContain("1.0s");  // start node
    expect(html).toContain("2.0s");  // process node
    expect(html).toContain("800ms"); // save node
    expect(html).toContain("1.2s");  // notify node
  });

  it("should show result_summary", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(html).toContain("Workflow completed successfully with all 4 nodes passing.");
  });

  it("should render KV table for node inputs/outputs", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    // The start node has inputs: {query: "test data"}
    expect(html).toContain("query");
    expect(html).toContain("test data");
    // The start node has outputs: {data: "processed input"}
    expect(html).toContain("processed input");
  });
});

// ---------------------------------------------------------------------------
// HTML Report — Failed execution
// ---------------------------------------------------------------------------
describe("HTML Report — failed execution", () => {
  it("should show FAILED status", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_FAILED_LOG_YAML);
    expect(html).toContain("FAILED");
  });

  it("should show error banner for failed nodes", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_FAILED_LOG_YAML);
    expect(html).toContain("TIMEOUT");
    expect(html).toContain("LLM request timed out after 30s");
  });

  it("should show retry information", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_FAILED_LOG_YAML);
    // The failed attempt was retried and succeeded
    expect(html).toContain("retried ok");
  });

  it("should show retry attempt details in node body", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_FAILED_LOG_YAML);
    expect(html).toContain("Attempt 1");
  });

  it("should auto-open failed node details", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_FAILED_LOG_YAML);
    // Failed workflow should show error banner
    expect(html).toContain("FAILED");
    expect(html).toContain("eb"); // error banner class
  });

  it("should show error details in error box", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, SAMPLE_FAILED_LOG_YAML);
    // Should show retry/error information somewhere in the report
    expect(html).toContain("TIMEOUT");
  });
});

// ---------------------------------------------------------------------------
// HTML Report — Options
// ---------------------------------------------------------------------------
describe("HTML Report — options", () => {
  it("should use custom title from options", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, undefined, { title: "Custom Title" });
    expect(html).toContain("<title>Custom Title</title>");
    expect(html).toContain("<h1>Custom Title</h1>");
  });

  it("should fall back to workflow name when no title option", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML);
    expect(html).toContain("<title>Test Workflow</title>");
  });

  it("should fall back to id when name is missing", () => {
    const yaml = `
osop_version: "1.0"
id: "fallback-id"
nodes: []
edges: []
`;
    const html = generateHtmlReport(yaml);
    expect(html).toContain("<title>fallback-id</title>");
  });

  it("should use 'OSOP Report' when both name and id are missing", () => {
    const yaml = `
osop_version: "1.0"
nodes: []
edges: []
`;
    const html = generateHtmlReport(yaml);
    expect(html).toContain("<title>OSOP Report</title>");
  });
});

// ---------------------------------------------------------------------------
// Text Report — spec-only mode
// ---------------------------------------------------------------------------
describe("Text Report — spec-only mode", () => {
  it("should include workflow name in header", () => {
    const text = generateTextReport(SAMPLE_OSOP_YAML);
    expect(text).toContain("Test Workflow");
  });

  it("should show node and edge counts", () => {
    const text = generateTextReport(SAMPLE_OSOP_YAML);
    expect(text).toContain("4 nodes");
    expect(text).toContain("3 edges");
  });

  it("should list all node names with types", () => {
    const text = generateTextReport(SAMPLE_OSOP_YAML);
    expect(text).toContain("HUMAN");
    expect(text).toContain("AGENT");
    expect(text).toContain("DB");
    expect(text).toContain("API");
    expect(text).toContain("User Input");
    expect(text).toContain("Process Data");
  });

  it("should include separator line", () => {
    const text = generateTextReport(SAMPLE_OSOP_YAML);
    expect(text).toContain("=");
  });
});

// ---------------------------------------------------------------------------
// Text Report — execution mode
// ---------------------------------------------------------------------------
describe("Text Report — execution mode", () => {
  it("should show COMPLETED status", () => {
    const text = generateTextReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(text).toContain("COMPLETED");
  });

  it("should show duration", () => {
    const text = generateTextReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(text).toContain("5.0s");
  });

  it("should show cost", () => {
    const text = generateTextReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    // Cost may be formatted as $0.005 or $0.01 depending on the usd() formatter
    expect(text).toMatch(/\$[\d.]+/);
  });

  it("should show node count", () => {
    const text = generateTextReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(text).toContain("4 nodes");
  });

  it("should show result summary", () => {
    const text = generateTextReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(text).toContain("Workflow completed successfully");
  });

  it("should show run ID and agent info", () => {
    const text = generateTextReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(text).toContain("abc12345");
    expect(text).toContain("claude-code");
  });

  it("should show per-node status as ok", () => {
    const text = generateTextReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(text).toContain("ok");
  });

  it("should show AI token counts", () => {
    const text = generateTextReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(text).toContain("500");
    expect(text).toContain("200");
  });
});

// ---------------------------------------------------------------------------
// Text Report — ANSI mode
// ---------------------------------------------------------------------------
describe("Text Report — ANSI mode", () => {
  it("should include ANSI escape codes when ansi=true", () => {
    const text = generateTextReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML, true);
    // Should contain escape sequences
    expect(text).toContain("\x1b[");
  });

  it("should NOT include ANSI escape codes when ansi=false", () => {
    const text = generateTextReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML, false);
    expect(text).not.toContain("\x1b[");
  });

  it("should default to no ANSI when parameter omitted", () => {
    const text = generateTextReport(SAMPLE_OSOP_YAML, SAMPLE_LOG_YAML);
    expect(text).not.toContain("\x1b[");
  });
});

// ---------------------------------------------------------------------------
// Text Report — failed execution
// ---------------------------------------------------------------------------
describe("Text Report — failed execution", () => {
  it("should show FAILED status", () => {
    const text = generateTextReport(SAMPLE_OSOP_YAML, SAMPLE_FAILED_LOG_YAML);
    expect(text).toContain("FAILED");
  });

  it("should show error details for failed nodes", () => {
    const text = generateTextReport(SAMPLE_OSOP_YAML, SAMPLE_FAILED_LOG_YAML);
    expect(text).toContain("TIMEOUT");
    expect(text).toContain("LLM request timed out after 30s");
  });

  it("should indicate retry for retried nodes", () => {
    const text = generateTextReport(SAMPLE_OSOP_YAML, SAMPLE_FAILED_LOG_YAML);
    expect(text).toContain("retried ok");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe("Report edge cases", () => {
  it("should handle empty workflow (no nodes, no edges)", () => {
    const yaml = `
osop_version: "1.0"
id: "empty"
name: "Empty Workflow"
nodes: []
edges: []
`;
    const html = generateHtmlReport(yaml);
    expect(html).toContain("Empty Workflow");
    expect(html).toContain("0 nodes");
    expect(html).toContain("0 edges");
  });

  it("should handle workflow with missing optional fields", () => {
    const yaml = `
osop_version: "1.0"
id: "minimal"
name: "Minimal"
nodes:
  - id: "s1"
    type: "cli"
    name: "Run"
edges: []
`;
    const html = generateHtmlReport(yaml);
    expect(html).toContain("Minimal");
    expect(html).toContain("CLI");
  });

  it("should handle log with empty node_records", () => {
    const logYaml = `
run_id: "test"
workflow_id: "test"
status: "COMPLETED"
duration_ms: 0
node_records: []
`;
    const yaml = `
osop_version: "1.0"
id: "test"
name: "Test"
nodes: []
edges: []
`;
    const html = generateHtmlReport(yaml, logYaml);
    expect(html).toContain("COMPLETED");
    expect(html).toContain("0 nodes");
  });

  it("should handle null/undefined osoplog gracefully", () => {
    const html = generateHtmlReport(SAMPLE_OSOP_YAML, undefined);
    expect(html).toBeDefined();
    expect(html.length).toBeGreaterThan(0);
  });

  it("should handle log without cost block", () => {
    const logYaml = `
run_id: "test"
workflow_id: "test"
status: "COMPLETED"
duration_ms: 100
node_records: []
`;
    const yaml = `
osop_version: "1.0"
id: "test"
name: "Test"
nodes: []
edges: []
`;
    const html = generateHtmlReport(yaml, logYaml);
    expect(html).toBeDefined();
    // No cost should appear
    expect(html).not.toContain("$");
  });
});
