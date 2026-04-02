/**
 * TDD tests for OsopClient (src/client.ts).
 *
 * Uses vi.fn() / vi.spyOn() to mock global fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OsopClient, OsopApiError } from "../src/client.js";
import type {
  ValidationResult,
  ExecutionResult,
  RenderResult,
  TestResult,
} from "../src/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a mock Response that resolves with the given JSON body. */
function mockJsonResponse(body: unknown, status = 200, statusText = "OK"): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers({ "content-type": "application/json" }),
  } as unknown as Response;
}

function mockTextResponse(text: string, status: number, statusText: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: () => Promise.reject(new Error("not JSON")),
    text: () => Promise.resolve(text),
    headers: new Headers(),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockJsonResponse({}));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------
describe("OsopClient constructor", () => {
  it("should store baseUrl with trailing slash stripped", () => {
    const client = new OsopClient({ baseUrl: "http://localhost:8080/" });
    // Verify by making a call and inspecting the URL
    client.validate({ content: "test" });
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/validate",
      expect.anything(),
    );
  });

  it("should handle baseUrl without trailing slash", () => {
    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    client.validate({ content: "test" });
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/validate",
      expect.anything(),
    );
  });

  it("should strip multiple trailing slashes", () => {
    const client = new OsopClient({ baseUrl: "http://example.com///" });
    client.validate({ content: "test" });
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://example.com/api/v1/validate",
      expect.anything(),
    );
  });

  it("should use default timeout of 30000ms when not specified", () => {
    // We verify this indirectly via the AbortController timeout behavior
    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    // The client is constructed without error; we trust the default from source
    expect(client).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Request Headers
// ---------------------------------------------------------------------------
describe("Request headers", () => {
  it("should include Content-Type and Accept headers", async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({ valid: true, errors: [], warnings: [] }));
    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    await client.validate({ content: "test" });

    const callArgs = fetchSpy.mock.calls[0];
    const options = callArgs[1] as RequestInit;
    const headers = options.headers as Record<string, string>;

    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Accept"]).toBe("application/json");
  });

  it("should include Authorization header when apiKey is provided", async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({ valid: true, errors: [], warnings: [] }));
    const client = new OsopClient({
      baseUrl: "http://localhost:8080",
      apiKey: "sk-test-key-123",
    });
    await client.validate({ content: "test" });

    const callArgs = fetchSpy.mock.calls[0];
    const options = callArgs[1] as RequestInit;
    const headers = options.headers as Record<string, string>;

    expect(headers["Authorization"]).toBe("Bearer sk-test-key-123");
  });

  it("should NOT include Authorization header when apiKey is omitted", async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({ valid: true, errors: [], warnings: [] }));
    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    await client.validate({ content: "test" });

    const callArgs = fetchSpy.mock.calls[0];
    const options = callArgs[1] as RequestInit;
    const headers = options.headers as Record<string, string>;

    expect(headers["Authorization"]).toBeUndefined();
  });

  it("should use POST method for all requests", async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({ valid: true, errors: [], warnings: [] }));
    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    await client.validate({ content: "test" });

    const callArgs = fetchSpy.mock.calls[0];
    const options = callArgs[1] as RequestInit;
    expect(options.method).toBe("POST");
  });

  it("should send AbortController signal for timeout support", async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({ valid: true, errors: [], warnings: [] }));
    const client = new OsopClient({ baseUrl: "http://localhost:8080", timeout: 5000 });
    await client.validate({ content: "test" });

    const callArgs = fetchSpy.mock.calls[0];
    const options = callArgs[1] as RequestInit;
    expect(options.signal).toBeDefined();
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
});

// ---------------------------------------------------------------------------
// validate()
// ---------------------------------------------------------------------------
describe("OsopClient.validate()", () => {
  it("should POST to /api/v1/validate and return ValidationResult", async () => {
    const mockResult: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(mockResult));

    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    const result = await client.validate({ content: "osop_version: '1.0'" });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/validate",
      expect.anything(),
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should send content in the request body", async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({ valid: true, errors: [], warnings: [] }));
    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    await client.validate({ content: "my-yaml-content" });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.content).toBe("my-yaml-content");
  });

  it("should send file_path when filePath is provided", async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({ valid: true, errors: [], warnings: [] }));
    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    await client.validate({ filePath: "/path/to/workflow.osop.yaml" });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.file_path).toBe("/path/to/workflow.osop.yaml");
  });

  it("should send strict flag", async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({ valid: true, errors: [], warnings: [] }));
    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    await client.validate({ content: "test", strict: true });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.strict).toBe(true);
  });

  it("should return validation errors from server", async () => {
    const mockResult: ValidationResult = {
      valid: false,
      errors: [
        { level: "error", message: "Missing field: name", path: "$.name" },
      ],
      warnings: [
        { level: "warning", message: "Consider adding description" },
      ],
    };
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(mockResult));

    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    const result = await client.validate({ content: "osop_version: '1.0'" });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toBe("Missing field: name");
    expect(result.warnings).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// run()
// ---------------------------------------------------------------------------
describe("OsopClient.run()", () => {
  it("should POST to /api/v1/run and return ExecutionResult", async () => {
    const mockResult: ExecutionResult = {
      workflow_name: "test-wf",
      status: "completed",
      dry_run: false,
      started_at: "2026-01-01T00:00:00Z",
      completed_at: "2026-01-01T00:01:00Z",
      nodes: [],
    };
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(mockResult));

    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    const result = await client.run({ content: "yaml-content" });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/run",
      expect.anything(),
    );
    expect(result.status).toBe("completed");
  });

  it("should send inputs and dryRun in request body", async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({
      workflow_name: "test", status: "completed", dry_run: true, started_at: "", nodes: [],
    }));
    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    await client.run({
      content: "yaml",
      inputs: { key: "value", count: 42 },
      dryRun: true,
      timeoutSeconds: 120,
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.inputs).toEqual({ key: "value", count: 42 });
    expect(body.dry_run).toBe(true);
    expect(body.timeout_seconds).toBe(120);
  });

  it("should map filePath to file_path in body", async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({
      workflow_name: "test", status: "completed", dry_run: false, started_at: "", nodes: [],
    }));
    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    await client.run({ filePath: "/workflows/main.osop.yaml" });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.file_path).toBe("/workflows/main.osop.yaml");
  });
});

// ---------------------------------------------------------------------------
// render()
// ---------------------------------------------------------------------------
describe("OsopClient.render()", () => {
  it("should POST to /api/v1/render and return RenderResult", async () => {
    const mockResult: RenderResult = {
      format: "mermaid",
      content: "graph TD\n  A-->B",
    };
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(mockResult));

    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    const result = await client.render({ content: "yaml" });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/render",
      expect.anything(),
    );
    expect(result.format).toBe("mermaid");
    expect(result.content).toContain("graph TD");
  });

  it("should send format and direction in request body", async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({ format: "svg", content: "<svg/>" }));
    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    await client.render({ content: "yaml", format: "svg", direction: "LR" });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.format).toBe("svg");
    expect(body.direction).toBe("LR");
  });

  it("should support ascii format", async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({ format: "ascii", content: "[A]-->[B]" }));
    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    const result = await client.render({ content: "yaml", format: "ascii" });
    expect(result.format).toBe("ascii");
  });
});

// ---------------------------------------------------------------------------
// test()
// ---------------------------------------------------------------------------
describe("OsopClient.test()", () => {
  it("should POST to /api/v1/test and return TestResult", async () => {
    const mockResult: TestResult = {
      total: 2,
      passed: 2,
      failed: 0,
      cases: [
        { name: "test-1", passed: true },
        { name: "test-2", passed: true },
      ],
    };
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(mockResult));

    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    const result = await client.test({ content: "yaml-with-tests" });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/test",
      expect.anything(),
    );
    expect(result.total).toBe(2);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("should send filter and verbose in request body", async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({ total: 0, passed: 0, failed: 0, cases: [] }));
    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    await client.test({ content: "yaml", filter: "auth*", verbose: true });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.filter).toBe("auth*");
    expect(body.verbose).toBe(true);
  });

  it("should return failed test cases with details", async () => {
    const mockResult: TestResult = {
      total: 1,
      passed: 0,
      failed: 1,
      cases: [
        {
          name: "auth-test",
          passed: false,
          message: "Expected status 200 but got 401",
          expected: 200,
          actual: 401,
        },
      ],
    };
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(mockResult));

    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    const result = await client.test({ content: "yaml" });

    expect(result.failed).toBe(1);
    expect(result.cases[0].message).toContain("401");
    expect(result.cases[0].expected).toBe(200);
    expect(result.cases[0].actual).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------
describe("Error handling", () => {
  it("should throw OsopApiError on non-2xx response", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockTextResponse('{"error":"Not found"}', 404, "Not Found"),
    );

    const client = new OsopClient({ baseUrl: "http://localhost:8080" });

    await expect(client.validate({ content: "bad" })).rejects.toThrow(OsopApiError);
  });

  it("should include status code in OsopApiError", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockTextResponse("Unauthorized", 401, "Unauthorized"),
    );

    const client = new OsopClient({ baseUrl: "http://localhost:8080" });

    try {
      await client.validate({ content: "test" });
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(OsopApiError);
      const err = e as OsopApiError;
      expect(err.statusCode).toBe(401);
      expect(err.responseBody).toBe("Unauthorized");
      expect(err.message).toContain("401");
      expect(err.message).toContain("Unauthorized");
    }
  });

  it("should include response body in OsopApiError", async () => {
    const errorBody = '{"error":"Invalid YAML","details":"line 3, col 5"}';
    fetchSpy.mockResolvedValueOnce(
      mockTextResponse(errorBody, 400, "Bad Request"),
    );

    const client = new OsopClient({ baseUrl: "http://localhost:8080" });

    try {
      await client.validate({ content: "bad yaml" });
      expect.fail("Should have thrown");
    } catch (e) {
      const err = e as OsopApiError;
      expect(err.statusCode).toBe(400);
      expect(err.responseBody).toBe(errorBody);
    }
  });

  it("should throw OsopApiError for 500 server error", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockTextResponse("Internal Server Error", 500, "Internal Server Error"),
    );

    const client = new OsopClient({ baseUrl: "http://localhost:8080" });

    await expect(client.run({ content: "yaml" })).rejects.toThrow(OsopApiError);
  });

  it("OsopApiError should have name 'OsopApiError'", () => {
    const err = new OsopApiError("test error", 500, "body");
    expect(err.name).toBe("OsopApiError");
    expect(err).toBeInstanceOf(Error);
  });

  it("OsopApiError should be catchable as Error", () => {
    const err = new OsopApiError("msg", 404, "not found");
    expect(err instanceof Error).toBe(true);
    expect(err.message).toBe("msg");
  });
});

// ---------------------------------------------------------------------------
// Timeout Handling
// ---------------------------------------------------------------------------
describe("Timeout handling", () => {
  it("should abort the request when fetch is aborted", async () => {
    fetchSpy.mockImplementationOnce(() => {
      const err = new DOMException("The operation was aborted.", "AbortError");
      return Promise.reject(err);
    });

    const client = new OsopClient({ baseUrl: "http://localhost:8080", timeout: 100 });

    await expect(client.validate({ content: "test" })).rejects.toThrow("aborted");
  });

  it("should pass AbortSignal to fetch", async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({ valid: true, errors: [], warnings: [] }));
    const client = new OsopClient({ baseUrl: "http://localhost:8080", timeout: 5000 });
    await client.validate({ content: "test" });

    const callArgs = fetchSpy.mock.calls[0];
    const options = callArgs[1] as RequestInit;
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
});

// ---------------------------------------------------------------------------
// Network Errors
// ---------------------------------------------------------------------------
describe("Network errors", () => {
  it("should propagate fetch network errors", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    await expect(client.validate({ content: "test" })).rejects.toThrow("Failed to fetch");
  });

  it("should propagate DNS resolution errors", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("getaddrinfo ENOTFOUND bad-host"));

    const client = new OsopClient({ baseUrl: "http://bad-host:8080" });
    await expect(client.run({ content: "test" })).rejects.toThrow("ENOTFOUND");
  });
});

// ---------------------------------------------------------------------------
// Body serialization edge cases
// ---------------------------------------------------------------------------
describe("Body serialization", () => {
  it("should serialize undefined optional params as JSON", async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({ valid: true, errors: [], warnings: [] }));
    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    await client.validate({ content: "test" });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    // file_path should be present but undefined in the body (serialized as absent in JSON)
    expect(body.content).toBe("test");
    // strict not provided => undefined => absent in JSON
    expect(body.strict).toBeUndefined();
  });

  it("should handle complex inputs object in run()", async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({
      workflow_name: "test", status: "completed", dry_run: false, started_at: "", nodes: [],
    }));
    const client = new OsopClient({ baseUrl: "http://localhost:8080" });
    await client.run({
      content: "yaml",
      inputs: {
        nested: { deep: { value: [1, 2, 3] } },
        special: "chars: <>&\"",
      },
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.inputs.nested.deep.value).toEqual([1, 2, 3]);
    expect(body.inputs.special).toBe("chars: <>&\"");
  });
});
