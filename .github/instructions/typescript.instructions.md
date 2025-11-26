---
applyTo: "**/*.ts"
description: TypeScript coding standards for reolink-api Project
---

# TypeScript Guidelines for reolink-api

## Type Safety
- Use explicit type annotations for all function parameters and return types
- Prefer `interface` over `type` for object shapes (already standard in this codebase)
- Avoid `any` - use `unknown` with type guards instead (ESLint warns on `any`)
- Export shared interfaces and types from `types.ts` or module-specific files
- Use TypeScript's strict mode (already enabled in tsconfig.json)

## Module Imports
- **CRITICAL**: All ES module imports MUST include `.js` extension (required for Node.js ESM)
- Example: `import { ReolinkClient } from './reolink.js'`
- Never use relative imports without extensions - builds will fail
- Use dynamic imports with `.js` extension: `await import('./snapshot.js')`

## Async/Await
- Use `async/await` over `.then()` chains
- Always handle errors with try/catch blocks for user-facing functions
- Use `Promise.all()` for parallel operations when appropriate
- Example:
  ```typescript
  try {
    const result = await client.api("GetDevInfo");
    return result;
  } catch (error) {
    if (error instanceof ReolinkHttpError) {
      throw new Error(`API call failed: ${error.message}`);
    }
    throw error;
  }
  ```

## Error Handling
- Use typed errors - `ReolinkHttpError` for HTTP failures, `ReolinkResponseError` for API errors
- Provide clear, actionable error messages
- Never swallow errors silently - always throw or log
- For CLI operations, write errors to stderr, not stdout
- Token errors (rspCode: -1 or HTTP 401) should trigger automatic re-login

## API Client Patterns
- All feature modules accept `ReolinkClient` as first parameter or call `client.api(...)`
- Use zero-based channel numbering for API calls
- RTSP URLs use 01-padded channel numbers (e.g., channel 0 → `channels=01`)
- Binary responses (snapshots) return `ArrayBuffer` - convert to `Buffer` for Node.js operations
- Respect authentication modes: `long` (token session) vs `short` (per-request credentials)

## Code Organization
- Feature modules in `src/` (e.g., `stream.ts`, `ptz.ts`, `snapshot.ts`, `events.ts`)
- Keep functions focused and single-purpose
- Export public interfaces from module files or `types.ts`
- Update `package.json` exports map when adding new public modules
- Tests co-located with source files (`*.test.ts`)

## Testing Standards
- Use Vitest for all tests
- Mock `global.fetch` or `client.fetch` for HTTP calls
- Use `vi.useFakeTimers()` and `vi.advanceTimersByTimeAsync()` for time-dependent code
- Test coverage target: 80% (lines, functions, branches, statements)
- Common patterns:
  - JPEG magic bytes: `Buffer.from([0xff, 0xd8])`
  - Mock successful response: `{ code: 0, value: { ... } }`
  - Mock error response: `{ code: 1, error: { rspCode: -1, detail: "error" } }`

## Documentation
- Add JSDoc comments for all exported functions, classes, and interfaces
- Include `@param` and `@returns` tags with descriptions
- Document expected channel numbers, enum values, and special behaviors
- Keep comments concise and relevant
- Example:
  ```typescript
  /**
   * Get PTZ preset positions for a channel
   * 
   * @param client - Reolink API client instance
   * @param channel - Camera channel (0-based)
   * @returns Array of preset positions with id, name, and coordinates
   */
  export async function getPtzPreset(client: ReolinkClient, channel: number): Promise<PtzPreset[]>
  ```

## Code Style
- Follow existing Prettier config (2 spaces, semicolons, double quotes, 100 char width)
- Use arrow functions for callbacks and small utilities
- Prefer const over let when variables won't be reassigned
- Use template literals for string interpolation
- Run `npm run format` before committing

## CLI Patterns
- Parse CLI args, fallback to environment variables (`REOLINK_NVR_HOST`, etc.)
- Create client, login if needed, execute command, close client
- Binary commands (snap) write to stdout, logs to stderr
- Use `--debug` flag for request/response dumps
- Exit with proper error codes on failure
