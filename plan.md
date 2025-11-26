# Refactoring Plan: Eliminate Code Smells and Improve Organization

## Root Cause

The codebase has accumulated technical debt through ad-hoc feature additions without consistent refactoring. The primary issues are:

1. **HTTPS Agent Setup Duplication**: The same 20-line block for creating insecure HTTPS/Undici agents appears in **4 different locations**:
   - `src/reolink.ts:145-163` (apiInternal method)
   - `src/reolink.ts:240-254` (login method)
   - `src/reolink.ts:433-447` (apiInternalMany method)
   - `src/snapshot.ts:61-80` (snapToBuffer function)

2. **Broken Abstraction in snapshot.ts**: The `snapToBuffer()` function breaks encapsulation by:
   - Extracting all client internals via getters (host, username, password, token, fetchImpl)
   - Reimplementing HTTP request logic that already exists in `ReolinkClient`
   - Using fragile undici detection: `fetchImpl.toString().includes('undici')`
   - This violates DRY and creates maintenance burden

3. **CLI God File**: `src/cli.ts` is 1,118 lines doing everything:
   - Argument parsing (100+ lines)
   - Configuration management
   - Command dispatching for 10+ commands
   - Business logic inline
   - Signal handling

4. **Token Retry Logic Duplication**: The retry-on-token-error pattern is duplicated between `withToken()` (lines 305-347) and `withTokenMany()` (lines 472-514) with nearly identical logic.

5. **URL Authentication Duplication**: In `src/stream.ts`, the same authentication parameter logic appears 3 times:
   ```typescript
   if (token) { return `...token=${token}`; }
   else if (user && pass) { return `...user=${user}&password=${pass}`; }
   else { throw new Error(...); }
   ```

6. **Type Safety Issues**: Many response types are just `{ [key: string]: unknown }` providing no actual type safety.

## Requirements

### Functional Requirements
- ✅ All existing functionality must be preserved
- ✅ All existing tests must pass
- ✅ Public API (exports in package.json) must remain unchanged
- ✅ CLI behavior must remain identical to users

### Non-Functional Requirements
- ✅ Reduce code duplication by ~150+ lines
- ✅ Improve maintainability and testability
- ✅ Maintain TypeScript strict mode compliance
- ✅ No external library dependencies added (keep existing: undici, dotenv, events)
- ✅ Preserve debug logging functionality
- ✅ Maintain ESM module structure

### Quality Requirements
- ✅ Unit test coverage should remain ≥80%
- ✅ All new utilities must have unit tests
- ✅ Refactored code should have simpler test setup

## Implementation Steps

### Phase 1: Extract HTTPS Agent Utility (Highest Priority)

**File to create: `src/utils/https-agent.ts`**

1. Create utility module with single responsibility:
   ```typescript
   export function createFetchOptions(
     insecure: boolean,
     fetchImpl: typeof fetch,
     baseOptions: RequestInit = {}
   ): RequestInit
   ```

2. Logic to implement:
   - Merge baseOptions with agent/dispatcher setup
   - Detect if fetchImpl is undici using reliable method (not toString())
   - Create UndiciAgent with `rejectUnauthorized: false` if undici
   - Create https.Agent with `rejectUnauthorized: false` if standard fetch
   - Return complete RequestInit object

3. Update `package.json` exports:
   ```json
   "./utils/https-agent": {
     "types": "./dist/utils/https-agent.d.ts",
     "import": "./dist/utils/https-agent.js"
   }
   ```

4. Replace in `src/reolink.ts`:
   - `apiInternal()` method: lines 145-163
   - `login()` method: lines 240-254
   - `apiInternalMany()` method: lines 433-447
   
   Replace with:
   ```typescript
   const fetchOptions = createFetchOptions(this.insecure, this.fetchImpl, {
     method,
     headers: { "Content-Type": "application/json" },
     ...(method === "POST" && { body: JSON.stringify([request]) })
   });
   ```

5. Create unit tests: `src/utils/https-agent.test.ts`
   - Test with undici fetch (mock)
   - Test with standard fetch (mock)
   - Test insecure=true creates agent/dispatcher
   - Test insecure=false returns unmodified options

**Expected Impact**: Reduces duplication by ~60 lines, centralizes agent logic

---

### Phase 2: Refactor snapshot.ts to Use Client API

**File to modify: `src/snapshot.ts`**

**Current Problem**: `snapToBuffer()` breaks encapsulation by:
- Calling 7 different getters on client
- Reimplementing HTTP request logic
- Using fragile fetch implementation detection

**Solution**: Make `ReolinkClient` handle binary responses

1. Add method to `ReolinkClient`: `apiBinary()`
   ```typescript
   async apiBinary(
     command: string,
     params: Record<string, unknown> = {}
   ): Promise<ArrayBuffer>
   ```

2. Implementation in `src/reolink.ts`:
   - Build query params same as `api()` method
   - Use `createFetchOptions()` utility from Phase 1
   - Make GET request
   - Return `response.arrayBuffer()` instead of `response.json()`
   - Include token refresh logic via `withTokenBinary()` wrapper

3. Simplify `src/snapshot.ts`:
   ```typescript
   export async function snapToBuffer(
     client: ReolinkClient,
     channel: number = 0
   ): Promise<Buffer> {
     const arrayBuffer = await client.apiBinary("Snap", { channel });
     const buffer = Buffer.from(arrayBuffer);
     
     // Verify JPEG header
     if (buffer.length < 2 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
       throw new Error("Invalid JPEG data received");
     }
     
     return buffer;
   }
   ```

4. Remove all getter calls from snapshot.ts (getHost, getUsername, etc.)

5. Update tests in `src/snapshot.test.ts` to mock `client.apiBinary()`

**Expected Impact**: 
- Reduces snapshot.ts from ~129 lines to ~40 lines
- Eliminates 7 getter dependencies
- Proper encapsulation maintained

---

### Phase 3: Extract URL Authentication Helper

**File to create: `src/utils/url-auth.ts`**

1. Create utility function:
   ```typescript
   export interface AuthOptions {
     token?: string;
     user?: string;
     pass?: string;
   }
   
   export function buildAuthParams(options: AuthOptions): string {
     if (options.token) {
       return `user=${encodeURIComponent(options.user || "")}&token=${options.token}`;
     } else if (options.user && options.pass) {
       return `user=${encodeURIComponent(options.user)}&password=${encodeURIComponent(options.pass)}`;
     } else {
       throw new Error("Authentication requires either token or user/password");
     }
   }
   ```

2. Update `src/stream.ts` functions:
   - `rtmpUrl()`: lines 150-161 → use `buildAuthParams()`
   - `flvUrl()`: lines 203-214 → use `buildAuthParams()`
   - `nvrPlaybackFlvUrl()`: lines 258-264 → use `buildAuthParams()`

3. Simplify each URL builder:
   ```typescript
   export function rtmpUrl(options: RtmpUrlOptions): string {
     const { host, channel, streamType = "main" } = options;
     const streamTypeNum = streamType === "main" ? "0" : "1";
     const authParams = buildAuthParams(options);
     return `rtmp://${host}:1935/bcs/channel${channel}_${streamTypeNum}.bcs?channel=${channel}&stream=${streamTypeNum}&${authParams}`;
   }
   ```

4. Create unit tests: `src/utils/url-auth.test.ts`

**Expected Impact**: Removes ~30 lines of duplication

---

### Phase 4: Deduplicate Token Retry Logic

**File to modify: `src/reolink.ts`**

1. Extract shared retry wrapper:
   ```typescript
   private async withRetry<T>(
     operation: () => Promise<T>,
     retryCount: number = 0
   ): Promise<T> {
     if (this.closed) {
       throw new Error("Client is closed");
     }
     
     if (this.mode === "short") {
       return operation();
     }
     
     await this.ensureToken();
     
     try {
       return await operation();
     } catch (error) {
       if (error instanceof ReolinkHttpError) {
         const isTokenError =
           error.code === 401 ||
           error.rspCode === -1 ||
           error.detail.toLowerCase().includes("token") ||
           error.detail.toLowerCase().includes("session");
           
         if (isTokenError && retryCount === 0) {
           if (this.debug) {
             console.error("Token error detected, re-logging in and retrying...");
           }
           this.token = "null";
           this.tokenExpiryTime = 0;
           return this.withRetry(operation, retryCount + 1);
         }
       }
       throw error;
     }
   }
   ```

2. Refactor `withToken()` to use `withRetry()`:
   ```typescript
   private async withToken<T>(
     command: string,
     params: Record<string, unknown> = {},
     action: 0 | 1 = 0,
     retryCount = 0,
     method: "POST" | "GET" = "POST"
   ): Promise<T> {
     return this.withRetry(
       () => this.apiInternal<T>(command, params, action, method),
       retryCount
     );
   }
   ```

3. Refactor `withTokenMany()` to use `withRetry()`:
   ```typescript
   private async withTokenMany<T>(
     requests: ReolinkRequest[],
     retryCount = 0
   ): Promise<ReolinkResponse<T>[]> {
     const normalized = requests.map(/* ... */);
     return this.withRetry(
       () => this.apiInternalMany<T>(normalized),
       retryCount
     );
   }
   ```

4. Update tests to verify retry behavior still works

**Expected Impact**: Removes ~40 lines of duplication, centralizes retry logic

---

### Phase 5: Split CLI into Modules

**Files to create:**
- `src/cli/parser.ts` - Argument parsing
- `src/cli/config.ts` - Configuration management
- `src/cli/commands/status.ts` - Status commands
- `src/cli/commands/stream.ts` - Stream commands
- `src/cli/commands/recording.ts` - Recording commands
- `src/cli/commands/ptz.ts` - PTZ commands
- `src/cli/commands/ai.ts` - AI commands
- `src/cli/commands/alarm.ts` - Alarm commands
- `src/cli/commands/snapshot.ts` - Snapshot command
- `src/cli/commands/playback.ts` - Playback commands
- `src/cli/commands/events.ts` - Events listening
- `src/cli/commands/generic.ts` - Generic API command
- `src/cli/index.ts` - Main orchestration (replaces current cli.ts)

**Structure for each command module:**
```typescript
export interface CommandContext {
  client: ReolinkClient;
  args: string[];
  options: {
    json: boolean;
    pretty: boolean;
    debug: boolean;
  };
}

export async function handleStatusCommand(ctx: CommandContext): Promise<unknown>
```

**Refactoring Steps:**

1. **Create `src/cli/parser.ts`**:
   - Move `parseArgs()` function
   - Return structured config object
   - Add tests for argument parsing edge cases

2. **Create `src/cli/config.ts`**:
   - Move environment variable reading
   - Export `loadConfig()` function
   - Validate required fields
   - Add tests for config loading

3. **Create command modules** (one per command group):
   - Extract command logic from main switch/if chain
   - Each module exports `handle*Command()` function
   - Accepts `CommandContext`
   - Returns result or throws error

4. **Create `src/cli/index.ts`**:
   - Import all command handlers
   - Main orchestration flow:
     ```typescript
     async function main() {
       const parsed = parseArgs();
       const config = loadConfig(parsed);
       const client = new ReolinkClient(config);
       
       if (config.mode === "long") await client.login();
       
       const ctx = { client, args: parsed.command, options: { ... } };
       const result = await dispatch(ctx);
       
       if (result !== undefined) {
         console.log(formatOutput(result, ctx.options));
       }
       
       await client.close();
     }
     ```

5. **Update `package.json`**:
   - Keep bin pointing to `./dist/cli/index.js`
   - No need to export CLI internals (not in exports map)

6. **Update tests**:
   - Create `src/cli/parser.test.ts`
   - Create `src/cli/config.test.ts`
   - Create tests for each command handler
   - Update `src/cli.test.ts` to test main orchestration

**Expected Impact**: 
- Reduces main CLI file from 1,118 lines to ~150 lines
- Each command module is 50-150 lines
- Much easier to test individual commands
- Clear separation of concerns

---

### Phase 6: Improve Type Safety (Lower Priority)

**Files to modify:**
- `src/ai.ts`
- `src/alarm.ts`
- Other response types

**Approach:**

1. Create discriminated union for common response patterns:
   ```typescript
   export interface ReolinkApiResponse<TData> {
     [key: string]: TData | unknown;
   }
   ```

2. Update response types with specific shapes where known:
   ```typescript
   export interface AiStateResponse {
     AiState?: {
       channel: number;
       people?: { alarmState: number };
       vehicle?: { alarmState: number };
       pet?: { alarmState: number };
     };
     [key: string]: unknown; // Allow additional fields
   }
   ```

3. Document in JSDoc which fields are device/firmware specific

**Expected Impact**: Better IntelliSense, catch more errors at compile time

---

### Phase 7: Standardize Debug Logging (Lower Priority)

**File to create: `src/utils/logger.ts`**

1. Create simple logger:
   ```typescript
   export interface Logger {
     debug(message: string, ...args: unknown[]): void;
     error(message: string, ...args: unknown[]): void;
   }
   
   export function createLogger(namespace: string, enabled: boolean): Logger
   ```

2. Update `ReolinkClient` to accept optional logger
3. Replace `console.error()` calls with logger
4. Support DEBUG environment variable: `DEBUG=reolink:*`

**Expected Impact**: Consistent, controllable logging

---

## Testing Strategy

### Unit Tests (per phase)
- Phase 1: Test HTTPS agent utility with mocked fetch implementations
- Phase 2: Test client.apiBinary() method, update snapshot tests
- Phase 3: Test URL auth parameter building
- Phase 4: Test retry logic still works correctly
- Phase 5: Test each command handler independently

### Integration Tests
- Ensure CLI still works end-to-end (manual testing)
- Test with real device if available
- Verify all examples in `examples/` directory still work

### Regression Testing
- Run full test suite after each phase
- Check test coverage doesn't decrease
- Verify `npm run build` succeeds
- Verify `npm run lint` passes
- Test CLI help, status, snap commands manually

---

## Rollout Plan

### Iteration 1 (Highest ROI)
1. Phase 1: Extract HTTPS agent utility (~2 hours)
2. Phase 2: Refactor snapshot.ts (~2 hours)
3. Test and verify (~1 hour)

**Deliverable**: ~90 lines removed, better encapsulation

### Iteration 2 (Medium ROI)
1. Phase 3: Extract URL auth helper (~1 hour)
2. Phase 4: Deduplicate token retry (~2 hours)
3. Test and verify (~1 hour)

**Deliverable**: ~70 more lines removed, cleaner logic

### Iteration 3 (Largest refactor)
1. Phase 5: Split CLI into modules (~6 hours)
2. Test and verify (~2 hours)

**Deliverable**: Much more maintainable CLI

### Iteration 4 (Polish, optional)
1. Phase 6: Improve type safety (~3 hours)
2. Phase 7: Standardize logging (~2 hours)

**Deliverable**: Better DX, easier debugging

---

## Success Metrics

- ✅ **Code Reduction**: Remove 150+ lines of duplication
- ✅ **Test Coverage**: Maintain ≥80% coverage
- ✅ **Build Success**: All builds pass without errors
- ✅ **API Compatibility**: No breaking changes to exports
- ✅ **Performance**: No measurable performance degradation
- ✅ **Maintainability**: Reduced complexity in hot paths (HTTPS setup, snapshot, CLI)

---

## Risks and Mitigations

### Risk 1: Breaking Changes
**Mitigation**: 
- Keep public API unchanged
- Extensive testing before/after each phase
- Git commits per phase for easy rollback

### Risk 2: Test Maintenance Burden
**Mitigation**:
- Refactored code should be easier to test
- Mocking becomes simpler with better separation
- Add tests incrementally with refactoring

### Risk 3: Time Investment
**Mitigation**:
- Prioritize phases by ROI (Phases 1-2 first)
- Each phase is independently valuable
- Can stop after any phase

### Risk 4: Regression Bugs
**Mitigation**:
- Run full test suite after each change
- Manual testing of CLI commands
- Keep debug logging to verify behavior

---

## Notes

- All phases are independent and can be completed separately
- Phases 1-4 have highest ROI with minimal risk
- Phase 5 (CLI split) is largest but has clearest benefit for long-term maintenance
- Phases 6-7 are nice-to-have improvements
- No external dependencies needed (except dev dependencies already in place)
- Maintains ESM module structure throughout
