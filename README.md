# OSOP JavaScript/TypeScript SDK

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@osop/sdk)](https://www.npmjs.com/package/@osop/sdk)

**Serves both SOP Doc and The Loop.** Build workflow viewers and optimization tools in JS/TS.

Parse .osop files, validate against schema, render to Mermaid diagrams. Build custom SOP Doc viewers or integrate The Loop into your applications.

Website: [osop.ai](https://osop.ai) | GitHub: [github.com/osop/osop-sdk-js](https://github.com/osop/osop-sdk-js)

## Installation

```bash
npm install @osop/sdk
```

## Quick Start

```typescript
import { OsopClient } from "@osop/sdk";

const client = new OsopClient({
  baseUrl: "http://localhost:8080",
});

// Validate a workflow
const result = await client.validate({
  content: `
    osop: "0.1"
    name: hello-world
    description: A simple workflow
    nodes:
      - id: start
        type: start
      - id: greet
        type: step
        action: echo "Hello, world!"
      - id: end
        type: end
    edges:
      - from: start
        to: greet
      - from: greet
        to: end
  `,
});

console.log(result.valid); // true

// Run a workflow
const execution = await client.run({
  filePath: "deploy.osop.yaml",
  inputs: { environment: "staging" },
  dryRun: true,
});

// Render a diagram
const diagram = await client.render({
  filePath: "deploy.osop.yaml",
  format: "mermaid",
});
```

## API Reference

### `OsopClient`

#### Constructor

```typescript
new OsopClient(options: OsopClientOptions)
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `baseUrl` | `string` | Yes | OSOP server base URL |
| `apiKey` | `string` | No | API key for authentication |
| `timeout` | `number` | No | Request timeout in ms (default: 30000) |

#### Methods

| Method | Description |
|--------|-------------|
| `validate(params)` | Validate a workflow against the OSOP schema |
| `run(params)` | Execute a workflow with inputs |
| `render(params)` | Render a workflow as a diagram |
| `test(params)` | Run test cases defined in a workflow |

## Development

```bash
git clone https://github.com/osop/osop-sdk-js.git
cd osop-sdk-js
npm install
npm run build
npm test
```

## License

Apache License 2.0 — see [LICENSE](LICENSE) for details.
