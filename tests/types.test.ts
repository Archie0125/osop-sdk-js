/**
 * TDD tests for OSOP SDK type definitions (src/types.ts).
 *
 * These tests verify that the TypeScript types compile correctly and that
 * runtime values conform to the expected shapes.
 */
import { describe, it, expect } from "vitest";
import type {
  NodeType,
  EdgeMode,
  JoinMode,
  ExecutionStatus,
  OsopNode,
  OsopEdge,
  OsopWorkflow,
  IoSpec,
  RetryPolicy,
  IdempotencyPolicy,
  HandoffSpec,
  ExplainSpec,
  NodeRuntime,
  SpawnPolicy,
  SecurityNode,
  ApprovalGate,
  ObservabilityNode,
  SwitchCase,
  OsopTrigger,
  OsopTestCase,
  OsopMessageContract,
  ValidationError,
  ValidationResult,
  ExecutionNodeResult,
  ExecutionResult,
  RenderResult,
  TestCaseResult,
  TestResult,
} from "../src/types.js";

// ---------------------------------------------------------------------------
// NodeType
// ---------------------------------------------------------------------------
describe("NodeType", () => {
  const ALL_NODE_TYPES: NodeType[] = [
    "human", "agent", "api", "cli", "db", "git",
    "docker", "cicd", "mcp", "system", "infra", "data",
  ];

  it("should have exactly 12 valid values", () => {
    expect(ALL_NODE_TYPES).toHaveLength(12);
  });

  it("should include all expected node types", () => {
    const expected = [
      "human", "agent", "api", "cli", "db", "git",
      "docker", "cicd", "mcp", "system", "infra", "data",
    ];
    for (const t of expected) {
      expect(ALL_NODE_TYPES).toContain(t);
    }
  });

  it("each value should be a non-empty lowercase string", () => {
    for (const t of ALL_NODE_TYPES) {
      expect(typeof t).toBe("string");
      expect(t.length).toBeGreaterThan(0);
      expect(t).toBe(t.toLowerCase());
    }
  });

  it("should have no duplicates", () => {
    const unique = new Set(ALL_NODE_TYPES);
    expect(unique.size).toBe(ALL_NODE_TYPES.length);
  });
});

// ---------------------------------------------------------------------------
// EdgeMode
// ---------------------------------------------------------------------------
describe("EdgeMode", () => {
  const ALL_EDGE_MODES: EdgeMode[] = [
    "sequential", "conditional", "parallel", "loop", "event",
    "fallback", "error", "timeout", "spawn", "switch",
  ];

  it("should have exactly 10 valid values", () => {
    expect(ALL_EDGE_MODES).toHaveLength(10);
  });

  it("should include all expected edge modes", () => {
    const expected = [
      "sequential", "conditional", "parallel", "loop", "event",
      "fallback", "error", "timeout", "spawn", "switch",
    ];
    for (const m of expected) {
      expect(ALL_EDGE_MODES).toContain(m);
    }
  });

  it("should have no duplicates", () => {
    const unique = new Set(ALL_EDGE_MODES);
    expect(unique.size).toBe(ALL_EDGE_MODES.length);
  });
});

// ---------------------------------------------------------------------------
// JoinMode
// ---------------------------------------------------------------------------
describe("JoinMode", () => {
  const ALL_JOIN_MODES: JoinMode[] = ["wait_all", "wait_any", "wait_n"];

  it("should have exactly 3 valid values", () => {
    expect(ALL_JOIN_MODES).toHaveLength(3);
  });

  it("should include wait_all, wait_any, wait_n", () => {
    expect(ALL_JOIN_MODES).toContain("wait_all");
    expect(ALL_JOIN_MODES).toContain("wait_any");
    expect(ALL_JOIN_MODES).toContain("wait_n");
  });
});

// ---------------------------------------------------------------------------
// ExecutionStatus
// ---------------------------------------------------------------------------
describe("ExecutionStatus", () => {
  const ALL_STATUSES: ExecutionStatus[] = [
    "pending", "running", "completed", "failed",
    "skipped", "waiting_approval", "timed_out",
  ];

  it("should have exactly 7 valid values", () => {
    expect(ALL_STATUSES).toHaveLength(7);
  });

  it("should have no duplicates", () => {
    const unique = new Set(ALL_STATUSES);
    expect(unique.size).toBe(ALL_STATUSES.length);
  });
});

// ---------------------------------------------------------------------------
// OsopNode
// ---------------------------------------------------------------------------
describe("OsopNode", () => {
  it("should create a valid node with required fields only", () => {
    const node: OsopNode = {
      id: "step-1",
      type: "agent",
      purpose: "Analyze the input data",
    };
    expect(node.id).toBe("step-1");
    expect(node.type).toBe("agent");
    expect(node.purpose).toBe("Analyze the input data");
  });

  it("should accept all optional identity fields", () => {
    const node: OsopNode = {
      id: "step-2",
      type: "human",
      purpose: "Review results",
      name: "Human Review",
      subtype: "review",
      role: "reviewer",
      owner: "team-lead",
    };
    expect(node.name).toBe("Human Review");
    expect(node.subtype).toBe("review");
    expect(node.role).toBe("reviewer");
    expect(node.owner).toBe("team-lead");
  });

  it("should accept runtime configuration", () => {
    const node: OsopNode = {
      id: "llm-step",
      type: "agent",
      purpose: "Generate text",
      runtime: {
        provider: "openai",
        model: "gpt-4",
        temperature: 0.7,
        max_tokens: 1000,
        system_prompt: "You are a helpful assistant.",
      },
    };
    expect(node.runtime?.provider).toBe("openai");
    expect(node.runtime?.model).toBe("gpt-4");
    expect(node.runtime?.temperature).toBe(0.7);
  });

  it("should accept IO specs", () => {
    const node: OsopNode = {
      id: "api-step",
      type: "api",
      purpose: "Fetch data from API",
      inputs: [
        { name: "url", schema: "string", required: true, description: "API endpoint" },
      ],
      outputs: [
        { name: "response", schema: "object", required: true },
      ],
    };
    expect(node.inputs).toHaveLength(1);
    expect(node.inputs![0].name).toBe("url");
    expect(node.outputs).toHaveLength(1);
  });

  it("should accept retry policy", () => {
    const node: OsopNode = {
      id: "flaky-step",
      type: "api",
      purpose: "Call unreliable API",
      retry_policy: {
        max_retries: 3,
        strategy: "exponential_backoff",
        backoff_sec: 2,
      },
      timeout_sec: 30,
    };
    expect(node.retry_policy?.max_retries).toBe(3);
    expect(node.retry_policy?.strategy).toBe("exponential_backoff");
  });

  it("should accept idempotency config", () => {
    const node: OsopNode = {
      id: "idem-step",
      type: "cli",
      purpose: "Run idempotent command",
      idempotency: { enabled: true, key: "unique-key-123" },
    };
    expect(node.idempotency?.enabled).toBe(true);
    expect(node.idempotency?.key).toBe("unique-key-123");
  });

  it("should accept handoff and explain specs", () => {
    const node: OsopNode = {
      id: "handoff-step",
      type: "agent",
      purpose: "Process and hand off",
      handoff: {
        summary_for_next_node: "Processed 100 records",
        expected_output: "JSON array of results",
        escalation: "contact@example.com",
      },
      explain: {
        why: "Data needs transformation before storage",
        what: "Converts CSV to JSON",
        result: "Transformed 100 rows successfully",
      },
    };
    expect(node.handoff?.summary_for_next_node).toBe("Processed 100 records");
    expect(node.explain?.why).toBe("Data needs transformation before storage");
  });

  it("should accept observability, security, and approval gate", () => {
    const node: OsopNode = {
      id: "secure-step",
      type: "cli",
      purpose: "Deploy to production",
      observability: { log: true, metrics: ["latency", "error_rate"] },
      security: {
        permissions: ["deploy:prod"],
        secrets: ["DEPLOY_KEY"],
        risk_level: "high",
      },
      approval_gate: { required: true, approver_role: "tech-lead" },
    };
    expect(node.observability?.log).toBe(true);
    expect(node.security?.permissions).toContain("deploy:prod");
    expect(node.approval_gate?.required).toBe(true);
  });

  it("should accept agent hierarchy fields (OSP-0001)", () => {
    const node: OsopNode = {
      id: "child-agent",
      type: "agent",
      purpose: "Sub-task execution",
      parent: "coordinator",
      spawn_policy: {
        max_children: 5,
        child_tools: ["read", "write"],
        can_spawn_children: false,
      },
    };
    expect(node.parent).toBe("coordinator");
    expect(node.spawn_policy?.max_children).toBe(5);
  });

  it("should accept v1.1 workflow_ref and workflow_inputs", () => {
    const node: OsopNode = {
      id: "sub-workflow",
      type: "system",
      purpose: "Run sub-workflow",
      workflow_ref: "common/data-pipeline.osop",
      workflow_inputs: { source: "s3://bucket/data", format: "parquet" },
    };
    expect(node.workflow_ref).toBe("common/data-pipeline.osop");
    expect(node.workflow_inputs?.source).toBe("s3://bucket/data");
  });
});

// ---------------------------------------------------------------------------
// OsopEdge
// ---------------------------------------------------------------------------
describe("OsopEdge", () => {
  it("should create a minimal edge with from and to", () => {
    const edge: OsopEdge = { from: "step-1", to: "step-2" };
    expect(edge.from).toBe("step-1");
    expect(edge.to).toBe("step-2");
    expect(edge.mode).toBeUndefined();
  });

  it("should accept mode, when, and label", () => {
    const edge: OsopEdge = {
      from: "check",
      to: "deploy",
      mode: "conditional",
      when: "result == 'pass'",
      label: "Tests passed",
    };
    expect(edge.mode).toBe("conditional");
    expect(edge.when).toBe("result == 'pass'");
    expect(edge.label).toBe("Tests passed");
  });

  it("should accept spawn_count for spawn mode", () => {
    const edge: OsopEdge = {
      from: "coordinator",
      to: "worker",
      mode: "spawn",
      spawn_count: 3,
    };
    expect(edge.spawn_count).toBe(3);
  });

  it("should accept v1.1 for_each and iterator_var", () => {
    const edge: OsopEdge = {
      from: "split",
      to: "process",
      mode: "parallel",
      for_each: "items",
      iterator_var: "item",
    };
    expect(edge.for_each).toBe("items");
    expect(edge.iterator_var).toBe("item");
  });

  it("should accept v1.1 join_mode and join_count", () => {
    const edge: OsopEdge = {
      from: "parallel-tasks",
      to: "aggregate",
      mode: "parallel",
      join_mode: "wait_n",
      join_count: 2,
    };
    expect(edge.join_mode).toBe("wait_n");
    expect(edge.join_count).toBe(2);
  });

  it("should accept v1.1 switch cases and default_to", () => {
    const edge: OsopEdge = {
      from: "router",
      to: "default-handler",
      mode: "switch",
      cases: [
        { value: "high", to: "priority-handler" },
        { value: "low", to: "batch-handler" },
      ],
      default_to: "default-handler",
    };
    expect(edge.cases).toHaveLength(2);
    expect(edge.cases![0].value).toBe("high");
    expect(edge.default_to).toBe("default-handler");
  });

  it("should support all EdgeMode values", () => {
    const modes: EdgeMode[] = [
      "sequential", "conditional", "parallel", "loop", "event",
      "fallback", "error", "timeout", "spawn", "switch",
    ];
    for (const mode of modes) {
      const edge: OsopEdge = { from: "a", to: "b", mode };
      expect(edge.mode).toBe(mode);
    }
  });
});

// ---------------------------------------------------------------------------
// OsopWorkflow
// ---------------------------------------------------------------------------
describe("OsopWorkflow", () => {
  it("should create a minimal valid workflow", () => {
    const wf: OsopWorkflow = {
      osop_version: "1.0",
      id: "my-workflow",
      name: "My Workflow",
      nodes: [
        { id: "step-1", type: "agent", purpose: "Do something" },
      ],
      edges: [],
    };
    expect(wf.osop_version).toBe("1.0");
    expect(wf.id).toBe("my-workflow");
    expect(wf.name).toBe("My Workflow");
    expect(wf.nodes).toHaveLength(1);
    expect(wf.edges).toHaveLength(0);
  });

  it("should accept all optional identity and metadata fields", () => {
    const wf: OsopWorkflow = {
      osop_version: "1.1",
      id: "full-workflow",
      name: "Full Workflow",
      description: "A comprehensive workflow",
      owner: "team@example.com",
      visibility: "public",
      tags: ["production", "data-pipeline"],
      status: "active",
      usage: "execution",
      workflow_type: { primary: "data-pipeline", secondary: ["etl"] },
      extends: "base-workflow",
      metadata: { custom_key: "value" },
      schemas: { input: { type: "object" } },
      roles: ["admin", "operator"],
      nodes: [],
      edges: [],
    };
    expect(wf.visibility).toBe("public");
    expect(wf.tags).toContain("production");
    expect(wf.status).toBe("active");
    expect(wf.workflow_type?.primary).toBe("data-pipeline");
  });

  it("should accept triggers and variables", () => {
    const wf: OsopWorkflow = {
      osop_version: "1.0",
      id: "triggered-wf",
      name: "Triggered Workflow",
      triggers: [
        { type: "cron", config: { schedule: "0 * * * *" } },
        { type: "webhook" },
      ],
      variables: { env: "production", batch_size: 100 },
      imports: ["common/utils.osop"],
      env: { NODE_ENV: "production" },
      nodes: [],
      edges: [],
    };
    expect(wf.triggers).toHaveLength(2);
    expect(wf.triggers![0].type).toBe("cron");
    expect(wf.variables?.batch_size).toBe(100);
  });

  it("should accept platform and conformance fields", () => {
    const wf: OsopWorkflow = {
      osop_version: "1.0",
      id: "platform-wf",
      name: "Platform Workflow",
      platforms: ["kubernetes", "aws"],
      conformance_level: 3,
      nodes: [],
      edges: [],
    };
    expect(wf.platforms).toContain("kubernetes");
    expect(wf.conformance_level).toBe(3);
  });

  it("should accept test cases", () => {
    const wf: OsopWorkflow = {
      osop_version: "1.0",
      id: "tested-wf",
      name: "Tested Workflow",
      nodes: [{ id: "s1", type: "agent", purpose: "test" }],
      edges: [],
      tests: [
        {
          id: "test-1",
          type: "unit",
          target_node: "s1",
          input: { data: "hello" },
          expect: { status: "completed" },
        },
      ],
    };
    expect(wf.tests).toHaveLength(1);
    expect(wf.tests![0].type).toBe("unit");
  });

  it("should accept message contracts", () => {
    const wf: OsopWorkflow = {
      osop_version: "1.0",
      id: "contract-wf",
      name: "Contract Workflow",
      nodes: [
        { id: "producer", type: "agent", purpose: "produce" },
        { id: "consumer", type: "agent", purpose: "consume" },
      ],
      edges: [{ from: "producer", to: "consumer" }],
      message_contracts: [
        {
          id: "mc-1",
          producer: "producer",
          consumer: "consumer",
          kind: "task",
          format: "json",
          schema_ref: "schemas/task.json",
        },
      ],
    };
    expect(wf.message_contracts).toHaveLength(1);
    expect(wf.message_contracts![0].kind).toBe("task");
  });

  it("should accept v1.1 workflow-level timeout_sec", () => {
    const wf: OsopWorkflow = {
      osop_version: "1.1",
      id: "timeout-wf",
      name: "Timeout Workflow",
      timeout_sec: 600,
      nodes: [],
      edges: [],
    };
    expect(wf.timeout_sec).toBe(600);
  });

  it("should accept security and observability at workflow level", () => {
    const wf: OsopWorkflow = {
      osop_version: "1.0",
      id: "secure-wf",
      name: "Secure Workflow",
      security: { audit_log: true, encryption: "aes-256" },
      observability: { tracing: true, provider: "datadog" },
      nodes: [],
      edges: [],
    };
    expect(wf.security).toBeDefined();
    expect(wf.observability).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// API Response Types
// ---------------------------------------------------------------------------
describe("ValidationResult", () => {
  it("should represent a valid result", () => {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should represent a result with errors and warnings", () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        { level: "error", message: "Missing required field: id", path: "$.id", line: 1, column: 1 },
      ],
      warnings: [
        { level: "warning", message: "Deprecated field: version" },
      ],
    };
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].path).toBe("$.id");
    expect(result.warnings).toHaveLength(1);
  });
});

describe("ExecutionResult", () => {
  it("should represent a completed execution", () => {
    const result: ExecutionResult = {
      workflow_name: "test-wf",
      status: "completed",
      dry_run: false,
      started_at: "2026-01-01T00:00:00Z",
      completed_at: "2026-01-01T00:01:00Z",
      nodes: [
        { node_id: "s1", status: "completed", outputs: { result: "ok" } },
      ],
      outputs: { final: "done" },
    };
    expect(result.status).toBe("completed");
    expect(result.nodes).toHaveLength(1);
  });

  it("should represent a failed execution with error", () => {
    const result: ExecutionResult = {
      workflow_name: "test-wf",
      status: "failed",
      dry_run: false,
      started_at: "2026-01-01T00:00:00Z",
      nodes: [
        { node_id: "s1", status: "failed", error: "Connection timeout" },
      ],
      error: "Workflow failed at node s1",
    };
    expect(result.status).toBe("failed");
    expect(result.error).toContain("s1");
  });
});

describe("RenderResult", () => {
  it("should represent a mermaid render", () => {
    const result: RenderResult = {
      format: "mermaid",
      content: "graph TD\n  A-->B",
    };
    expect(result.format).toBe("mermaid");
    expect(result.content).toContain("graph TD");
  });
});

describe("TestResult", () => {
  it("should represent test results", () => {
    const result: TestResult = {
      total: 3,
      passed: 2,
      failed: 1,
      cases: [
        { name: "test-1", passed: true },
        { name: "test-2", passed: true },
        { name: "test-3", passed: false, message: "Expected 200, got 500", expected: 200, actual: 500 },
      ],
    };
    expect(result.total).toBe(3);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.cases[2].passed).toBe(false);
  });
});
