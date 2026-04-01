/**
 * OSOP JavaScript/TypeScript SDK
 *
 * Official SDK for programmatic access to OSOP workflow operations.
 *
 * @packageDocumentation
 */

export { OsopClient } from "./client.js";
export type { OsopClientOptions } from "./client.js";

export { generateHtmlReport, generateTextReport } from "./report.js";
export type { ReportOptions } from "./report.js";

export type {
  NodeType,
  EdgeMode,
  OsopNode,
  OsopEdge,
  OsopInput,
  OsopOutput,
  OsopWorkflow,
  ValidationResult,
  ValidationError,
  ExecutionResult,
  ExecutionNodeResult,
  RenderResult,
  TestResult,
  TestCaseResult,
} from "./types.js";
