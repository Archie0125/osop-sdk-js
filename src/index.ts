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

export { renderOsopHtml, renderOsopCli } from "./render-html.js";
export type { RenderOptions } from "./render-html.js";

export { renderSopDocHtml, renderSopDocCli, parseSopFile } from "./render-sop.js";
export type { SopDocument, SopSection, SopWorkflowRef, SopDocRenderOptions } from "./render-sop.js";

export type {
  NodeType,
  EdgeMode,
  OsopNode,
  OsopEdge,
  OsopWorkflow,
  ValidationResult,
  ValidationError,
  ExecutionResult,
  ExecutionNodeResult,
  RenderResult,
  TestResult,
  TestCaseResult,
} from "./types.js";
