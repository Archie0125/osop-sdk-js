/**
 * Core TypeScript types for the OSOP protocol v1.0 / v1.1.
 * Aligned with the official osop-spec JSON Schema.
 */

// ---------------------------------------------------------------------------
// Enums / Union Types
// ---------------------------------------------------------------------------

/** The 12 supported OSOP node types. */
export type NodeType =
  | "human"
  | "agent"
  | "api"
  | "cli"
  | "db"
  | "git"
  | "docker"
  | "cicd"
  | "mcp"
  | "system"
  | "infra"
  | "data";

/** Edge connection modes between nodes (v1.0 + v1.1 `switch`). */
export type EdgeMode =
  | "sequential"
  | "conditional"
  | "parallel"
  | "loop"
  | "event"
  | "fallback"
  | "error"
  | "timeout"
  | "spawn"
  | "switch"; // v1.1

/** Execution status of a node or workflow. */
export type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "waiting_approval"
  | "timed_out";

/** Join mode for parallel fan-in edges (v1.1). */
export type JoinMode = "wait_all" | "wait_any" | "wait_n";

// ---------------------------------------------------------------------------
// Shared Sub-structures
// ---------------------------------------------------------------------------

/** An input or output parameter definition. */
export interface IoSpec {
  name: string;
  schema?: string;
  required?: boolean;
  description?: string;
}

/** Retry policy for a node. */
export interface RetryPolicy {
  max_retries?: number;
  strategy?: "fixed" | "exponential_backoff";
  backoff_sec?: number;
}

/** Idempotency configuration. */
export interface IdempotencyPolicy {
  enabled?: boolean;
  key?: string;
}

/** Handoff metadata between nodes. */
export interface HandoffSpec {
  summary_for_next_node?: string;
  expected_output?: string;
  escalation?: string;
}

/** Explain block — human-readable rationale. */
export interface ExplainSpec {
  why?: string;
  what?: string;
  result?: string;
}

/** Runtime environment for a node. */
export interface NodeRuntime {
  provider?: string;
  model?: string;
  os?: string;
  image?: string;
  command?: string;
  endpoint?: string;
  repo?: string;
  action?: string;
  branch?: string;
  engine?: string;
  table?: string;
  environment?: string;
  method?: string;
  url?: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  tools?: string[];
  headers?: Record<string, string>;
  body_template?: string | Record<string, unknown>;
  auth?: { type?: string; secret_ref?: string };
  tool?: string;
  config_path?: string;
  connection?: string;
  source?: Record<string, unknown>;
  destination?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Spawn policy for agent orchestration (OSP-0001). */
export interface SpawnPolicy {
  max_children?: number;
  child_tools?: string[];
  can_spawn_children?: boolean;
}

/** Security configuration for a node. */
export interface SecurityNode {
  permissions?: string[];
  secrets?: string[];
  risk_level?: string;
}

/** Approval gate for a node. */
export interface ApprovalGate {
  required?: boolean;
  approver_role?: string;
}

/** Observability configuration for a node. */
export interface ObservabilityNode {
  log?: boolean;
  metrics?: string[];
}

/** A switch-case entry (v1.1). */
export interface SwitchCase {
  value: unknown;
  to: string;
}

// ---------------------------------------------------------------------------
// Core Graph Types
// ---------------------------------------------------------------------------

/** A node in the OSOP workflow graph. */
export interface OsopNode {
  // Required
  id: string;
  type: NodeType;
  purpose: string;

  // Optional identity
  name?: string;
  subtype?: string;
  role?: string;
  owner?: string;

  // Runtime
  runtime?: NodeRuntime;

  // IO
  inputs?: IoSpec[];
  outputs?: IoSpec[];

  // Quality / resilience
  success_criteria?: string[];
  failure_modes?: string[];
  retry_policy?: RetryPolicy;
  timeout_sec?: number;

  // Idempotency
  idempotency?: IdempotencyPolicy;

  // Handoff & explain
  handoff?: HandoffSpec;
  explain?: ExplainSpec;

  // Observability / security / approval
  observability?: ObservabilityNode;
  security?: SecurityNode;
  approval_gate?: ApprovalGate;

  // Agent hierarchy (OSP-0001)
  parent?: string;
  spawn_policy?: SpawnPolicy;

  // v1.1 — sub-workflow reference
  workflow_ref?: string;
  workflow_inputs?: Record<string, unknown>;
}

/** An edge connecting two nodes. */
export interface OsopEdge {
  from: string;
  to: string;
  mode?: EdgeMode;
  when?: string;
  label?: string;
  spawn_count?: number;

  // v1.1 — foreach iteration
  for_each?: string;
  iterator_var?: string;

  // v1.1 — join mode
  join_mode?: JoinMode;
  join_count?: number;

  // v1.1 — switch/case
  cases?: SwitchCase[];
  default_to?: string;
}

// ---------------------------------------------------------------------------
// Workflow-level Types
// ---------------------------------------------------------------------------

/** Trigger definition. */
export interface OsopTrigger {
  type: "cron" | "webhook" | "git_push" | "manual" | "event";
  config?: Record<string, unknown>;
}

/** Test case defined within a workflow. */
export interface OsopTestCase {
  id: string;
  type: "unit" | "integration" | "e2e" | "simulation";
  target_node?: string;
  run?: string;
  input?: Record<string, unknown>;
  expect?: Record<string, unknown>;
  mocks?: Record<string, unknown>;
  failure_injection?: Record<string, unknown>;
}

/** Message contract between nodes. */
export interface OsopMessageContract {
  id: string;
  producer: string;
  consumer: string;
  kind: "task" | "result" | "state" | "error" | "event";
  format: "json" | "text";
  schema_ref?: string;
  semantics?: Record<string, unknown>;
}

/** A complete OSOP workflow definition (v1.0 + v1.1). */
export interface OsopWorkflow {
  // Required
  osop_version: string;
  id: string;
  name: string;

  // Optional identity
  description?: string;
  owner?: string;
  visibility?: "public" | "private";
  tags?: string[];
  status?: "draft" | "active" | "deprecated" | "template";
  usage?: "plan" | "execution" | "template" | "reference";
  workflow_type?: { primary: string; secondary?: string[] };
  extends?: string;

  // Metadata & schemas
  metadata?: Record<string, unknown>;
  schemas?: Record<string, Record<string, unknown>>;

  // Roles & access
  roles?: string[];

  // Triggers & variables
  triggers?: OsopTrigger[];
  variables?: Record<string, unknown>;
  imports?: string[];
  env?: Record<string, string>;

  // Platform & conformance
  platforms?: string[];
  conformance_level?: 0 | 1 | 2 | 3;

  // Graph
  nodes: OsopNode[];
  edges: OsopEdge[];

  // Contracts & tests
  message_contracts?: OsopMessageContract[];
  tests?: OsopTestCase[];

  // Views
  views?: string[];

  // Security & observability
  security?: Record<string, unknown>;
  observability?: Record<string, unknown>;

  // Evolution & ledger
  evolution?: Record<string, unknown>;
  ledger?: Record<string, unknown>;

  // v1.1 — workflow-level timeout
  timeout_sec?: number;
}

// ---------------------------------------------------------------------------
// API Response Types (unchanged)
// ---------------------------------------------------------------------------

/** A single validation error or warning. */
export interface ValidationError {
  level: "error" | "warning";
  message: string;
  path?: string;
  line?: number;
  column?: number;
}

/** Result of a validate operation. */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/** Result of a single node's execution. */
export interface ExecutionNodeResult {
  node_id: string;
  status: ExecutionStatus;
  started_at?: string;
  completed_at?: string;
  outputs?: Record<string, unknown>;
  error?: string;
}

/** Result of a workflow execution. */
export interface ExecutionResult {
  workflow_name: string;
  status: ExecutionStatus;
  dry_run: boolean;
  started_at: string;
  completed_at?: string;
  nodes: ExecutionNodeResult[];
  outputs?: Record<string, unknown>;
  error?: string;
}

/** Result of a render operation. */
export interface RenderResult {
  format: "mermaid" | "ascii" | "svg";
  content: string;
}

/** Result of a single test case. */
export interface TestCaseResult {
  name: string;
  passed: boolean;
  message?: string;
  expected?: unknown;
  actual?: unknown;
}

/** Result of running all test cases. */
export interface TestResult {
  total: number;
  passed: number;
  failed: number;
  cases: TestCaseResult[];
}
