# Reolink API SDK - Copilot Instructions

## Architecture Overview

This is a TypeScript SDK for Reolink NVR/camera devices, evolved from a bash script (`reolink.sh`) into a production-ready Node.js library with CLI. The codebase follows a **modular architecture** with feature-specific files and a unified client interface.

**Core Pattern**: Single `ReolinkClient` class manages authentication/sessions while feature modules (`stream.ts`, `ptz.ts`, `events.ts`, etc.) export standalone functions that take the client as first parameter.

```typescript
// Core client handles auth, token refresh, and low-level API calls
const client = new ReolinkClient({ host, username, password, mode: "long" });
await client.login(); // Automatic in long mode

// Feature modules provide high-level operations
import { snapToFile } from "./snapshot.js";
await snapToFile(client, "snapshot.jpg", 0);
```

## Authentication & Connection Modes

**Two modes** with different authentication flows:
- **Long mode (default)**: Token-based sessions with automatic refresh. Client stores token and lease time, refreshes 60s before expiry. Retry logic re-authenticates on token errors (-1, 401, "token"/"session" in error detail).
- **Short mode**: Per-request user/pass authentication, no session management.

Mode selection impacts URL construction:
```typescript
// Long: ?cmd=Snap&token=xyz
// Short: ?cmd=Snap&user=admin&password=pass
```

**Login flow** (`src/reolink.ts:login()`): Direct POST to `?cmd=Login&token=null`, receives `Token.name` and `Token.leaseTime`, calculates `tokenExpiryTime`.

## API Request/Response Pattern

All Reolink API calls follow consistent structure:

**Request**: `POST https://{host}/cgi-bin/api.cgi?cmd={Cmd}&token={token}` with body `[{cmd, action, param}]`
**Response**: `[{code: 0, value: {...}}]` on success, `[{code: N, error: {rspCode, detail}}]` on failure

The `api<T>(command, params)` method in `ReolinkClient` handles this automatically with TypeScript generics for response typing.

**Special case**: Snapshot API (`Snap`) uses GET request and returns binary JPEG data, not JSON (see `src/snapshot.ts`).

## Module Exports & Package Structure

`package.json` defines **granular exports** for tree-shaking:
```json
"exports": {
  ".": "./dist/reolink.js",           // Main client
  "./stream": "./dist/stream.js",      // Streaming URLs
  "./ptz": "./dist/ptz.js",           // PTZ control
  "./events": "./dist/events.js",      // Event polling
  // ... per-feature exports
}
```

When adding new features, update `exports` map for modular imports.

## Testing Conventions

**Vitest** with 80% coverage threshold. Test files colocated with source (`*.test.ts`).

**Testing patterns** observed in codebase:
1. **Mock `global.fetch`** for HTTP client testing (see `reolink.test.ts`)
2. **Fake timers** for polling/intervals (see `events.test.ts`)
3. **Mock ReolinkClient** with `vi.fn()` for unit testing feature modules
4. **Binary data**: Use `Buffer.from([0xff, 0xd8])` for JPEG headers in snapshot tests
5. **Async timer advancement**: Use `vi.advanceTimersByTimeAsync()` not `advanceTimersToNextTimer()`

Example test structure:
```typescript
describe("FeatureModule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it("should handle success case", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [...] });
    const result = await functionUnderTest();
    expect(result).toMatchObject({ ... });
  });
});
```

## CLI Architecture

`src/cli.ts` is the command dispatcher (~773 lines). Structure:
1. **Argument parsing** with custom `parseArgs()` (flags: `--host`, `--user`, `--pass`, `--mode`, `--channel`, etc.)
2. **Environment variable fallbacks** (`REOLINK_NVR_HOST`, `REOLINK_NVR_USER`, `REOLINK_NVR_PASS`)
3. **Command routing** via switch on first non-flag argument
4. **Client lifecycle**: Create, login (auto in long mode), execute command, close

**Binary output pattern** (snapshot command): Write binary to stdout, logs to stderr, use `process.stdout.write()` + `process.exit(0)` to avoid JSON contamination.

## Key Implementation Details

### Channel Indexing Inconsistencies
- **RTSP**: Channels start at `01` (padded), e.g., `h264Preview_01_main` for channel 0
- **RTMP/FLV**: Channels start at `0`, e.g., `channel0_0.bcs`
- **API calls**: Use zero-based indexing
- See `src/stream.ts` for URL generation functions handling this correctly

### Error Handling
Custom `ReolinkHttpError` class with structured fields:
- `code`: HTTP or API response code
- `rspCode`: Reolink-specific error code (-1 = auth fail, -9 = not supported)
- `detail`: Human-readable error message
- Used throughout for consistent error reporting

### Event Emitter Pattern
`ReolinkEventEmitter` (extends Node.js `EventEmitter`) polls device state at intervals, emits events **only on state changes** to prevent spam. Maintains `lastStates` Map per channel. Always cleanup on `stop()` (clear interval, remove listeners).

### Snapshot Binary Handling
Validate JPEG magic bytes (`0xFF 0xD8`) after fetch. Convert `ArrayBuffer` → `Buffer` for Node.js compatibility. Use `fetch` with custom HTTPS agent for `insecure` mode (ignore SSL errors).

### Iteration Summaries
`ITERATION_*_SUMMARY.md` files document feature evolution. Reference these for historical context when modifying features (e.g., ITERATION_16 covers snapshot implementation decisions).

## Common Tasks

**Add new API command**:
1. Create function in appropriate feature module (or new file)
2. Define TypeScript interfaces for params/response
3. Call `client.api<ResponseType>(command, params)`
4. Add export to `package.json` if new module
5. Write tests with 80%+ coverage
6. Add CLI command handler if user-facing

**Add streaming URL type**:
Update `src/stream.ts` with new function following existing patterns (handle auth mode, channel indexing, timestamps).

**Extend event types**:
Add to `ReolinkEvent` union type in `events.ts`, implement polling logic in `checkChannel()` method.

## DevOps

**Scripts**:
- `npm run build` - TypeScript compilation to `dist/`
- `npm test` - Run Vitest suite
- `npm run test:coverage` - Generate coverage report (HTML in `coverage/`)
- `npm run lint` - ESLint with TypeScript parser
- `npm run typecheck` - TSC with `--noEmit`

**Node.js**: Requires >=18.0.0 (uses ES2022, native fetch)
**Module system**: ESM only (`.js` extensions in imports required)

**Scripts directory**: Contains practical test scripts (`test-events.ts`, `test-snapshots.ts`, etc.) using `tsx` for execution. Run with `npx tsx scripts/filename.ts`.

## Debugging

Set `debug: true` in client options or use `--debug` CLI flag to log request/response JSON to stderr (matches bash script behavior). For module-specific debug, use `DEBUG=reolink:module` env var pattern (see snapshot module).

## Device Compatibility

Not all commands work on all devices (firmware/model dependent). Playback control commands (`PlaybackStart`, `PlaybackSeek`) may return error code -9 on some NVRs. Use `detectCapabilities()` from `capabilities.ts` to check feature support before use. Document known limitations in README warnings (see playback section example).
