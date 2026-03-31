/**
 * OSOP API client for JavaScript/TypeScript.
 */

import type {
  ValidationResult,
  ExecutionResult,
  RenderResult,
  TestResult,
} from "./types.js";

/** Configuration options for the OSOP client. */
export interface OsopClientOptions {
  /** Base URL of the OSOP server. */
  baseUrl: string;
  /** Optional API key for authentication. */
  apiKey?: string;
  /** Request timeout in milliseconds. Default: 30000. */
  timeout?: number;
}

/** Parameters for the validate method. */
export interface ValidateParams {
  /** OSOP YAML content to validate. Provide either content or filePath. */
  content?: string;
  /** Path to an .osop.yaml file. Provide either content or filePath. */
  filePath?: string;
  /** Treat warnings as errors. Default: false. */
  strict?: boolean;
}

/** Parameters for the run method. */
export interface RunParams {
  /** OSOP YAML content to execute. Provide either content or filePath. */
  content?: string;
  /** Path to an .osop.yaml file. Provide either content or filePath. */
  filePath?: string;
  /** Input values for the workflow. */
  inputs?: Record<string, unknown>;
  /** Simulate execution without side effects. Default: false. */
  dryRun?: boolean;
  /** Maximum execution time in seconds. Default: 300. */
  timeoutSeconds?: number;
}

/** Parameters for the render method. */
export interface RenderParams {
  /** OSOP YAML content to render. Provide either content or filePath. */
  content?: string;
  /** Path to an .osop.yaml file. Provide either content or filePath. */
  filePath?: string;
  /** Output format. Default: "mermaid". */
  format?: "mermaid" | "ascii" | "svg";
  /** Graph direction. Default: "TB". */
  direction?: "TB" | "LR";
}

/** Parameters for the test method. */
export interface TestParams {
  /** OSOP YAML content with test cases. Provide either content or filePath. */
  content?: string;
  /** Path to an .osop.yaml file. Provide either content or filePath. */
  filePath?: string;
  /** Run only test cases matching this pattern. */
  filter?: string;
  /** Include detailed output for each test step. Default: false. */
  verbose?: boolean;
}

/**
 * Client for the OSOP API.
 *
 * Provides methods to validate, run, render, and test OSOP workflows
 * against a running OSOP server.
 *
 * @example
 * ```typescript
 * const client = new OsopClient({ baseUrl: "http://localhost:8080" });
 * const result = await client.validate({ filePath: "workflow.osop.yaml" });
 * ```
 */
export class OsopClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeout: number;

  constructor(options: OsopClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.timeout = options.timeout ?? 30_000;
  }

  /**
   * Validate an OSOP workflow against the schema.
   * Returns validation errors and warnings.
   */
  async validate(params: ValidateParams): Promise<ValidationResult> {
    return this.request<ValidationResult>("/api/v1/validate", {
      content: params.content,
      file_path: params.filePath,
      strict: params.strict,
    });
  }

  /**
   * Execute an OSOP workflow with the given inputs.
   * Use dryRun=true to simulate without side effects.
   */
  async run(params: RunParams): Promise<ExecutionResult> {
    return this.request<ExecutionResult>("/api/v1/run", {
      content: params.content,
      file_path: params.filePath,
      inputs: params.inputs,
      dry_run: params.dryRun,
      timeout_seconds: params.timeoutSeconds,
    });
  }

  /**
   * Render an OSOP workflow as a visual diagram.
   * Supports mermaid, ascii, and svg output formats.
   */
  async render(params: RenderParams): Promise<RenderResult> {
    return this.request<RenderResult>("/api/v1/render", {
      content: params.content,
      file_path: params.filePath,
      format: params.format,
      direction: params.direction,
    });
  }

  /**
   * Run test cases defined in an OSOP workflow.
   * Returns pass/fail results for each test case.
   */
  async test(params: TestParams): Promise<TestResult> {
    return this.request<TestResult>("/api/v1/test", {
      content: params.content,
      file_path: params.filePath,
      filter: params.filter,
      verbose: params.verbose,
    });
  }

  private async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new OsopApiError(
          `OSOP API error: ${response.status} ${response.statusText}`,
          response.status,
          errorBody,
        );
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/** Error thrown when the OSOP API returns a non-2xx response. */
export class OsopApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string,
  ) {
    super(message);
    this.name = "OsopApiError";
  }
}
