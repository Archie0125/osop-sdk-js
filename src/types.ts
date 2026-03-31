/**
 * Core TypeScript types for the OSOP protocol.
 */

/** The 12 supported OSOP node types. */
export type NodeType =
  | "start"
  | "end"
  | "step"
  | "decision"
  | "fork"
  | "join"
  | "loop"
  | "retry"
  | "approval"
  | "webhook"
  | "timer"
  | "subprocess";

/** Edge connection modes between nodes. */
export type EdgeMode = "default" | "conditional" | "error" | "timeout";

/** Execution status of a node or workflow. */
export type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "waiting_approval"
  | "timed_out";

/** An input parameter definition. */
export interface OsopInput {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required?: boolean;
  default?: unknown;
  description?: string;
}

/** An output parameter definition. */
export interface OsopOutput {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
}

/** A node in the OSOP workflow graph. */
export interface OsopNode {
  id: string;
  type: NodeType;
  description?: string;
  action?: string;
  condition?: string;
  inputs?: OsopInput[];
  outputs?: OsopOutput[];

  // Retry-specific
  max_attempts?: number;
  backoff?: "linear" | "exponential";
  delay?: string;

  // Approval-specific
  approvers?: string[];

  // Webhook-specific
  url?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;

  // Timer-specific
  duration?: string;
  cron?: string;

  // Loop-specific
  for_each?: string;
  while?: string;
  max_iterations?: number;

  // Subprocess-specific
  workflow?: string;

  // Metadata
  timeout?: string;
  metadata?: Record<string, unknown>;
}

/** An edge connecting two nodes. */
export interface OsopEdge {
  from: string;
  to: string;
  mode?: EdgeMode;
  condition?: string;
  description?: string;
}

/** Workflow metadata. */
export interface OsopMetadata {
  owner?: string;
  tags?: string[];
  [key: string]: unknown;
}

/** A complete OSOP workflow definition. */
export interface OsopWorkflow {
  osop: string;
  name: string;
  description: string;
  metadata?: OsopMetadata;
  inputs?: OsopInput[];
  nodes: OsopNode[];
  edges: OsopEdge[];
  tests?: OsopTestCase[];
}

/** A test case defined within a workflow. */
export interface OsopTestCase {
  name: string;
  description?: string;
  inputs?: Record<string, unknown>;
  expected_status?: ExecutionStatus;
  expected_outputs?: Record<string, unknown>;
}

// --- API Response Types ---

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
