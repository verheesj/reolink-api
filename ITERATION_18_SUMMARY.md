# Iteration 18: PTZ Preset Groups & Guard Mode (Official Spec Implementation) — Summary

## Overview

Successfully updated the PTZ Guard and Patrol implementation to match the official **Camera HTTP API User Guide v8** specification exactly. This iteration ensures full type safety, proper error handling, and correct API command formatting for RLC-823A/S1 models and other Reolink PTZ-capable devices.

## Key Changes

### 1. TypeScript Interfaces Updated

**`PtzGuardConfig` interface:**
- Added `cmdStr?: 'setPos' | 'toPos'` field
- Added `bSaveCurrentPos?: number` field
- Made `channel: number` required (not optional)

**`PtzPatrolConfig` interface:**
- Added `channel: number` field (required in config)
- Added `running?: number` field
- Added `name?: string` field
- Renamed `PtzPatrolPresetPoint` to `PtzPatrolPreset` for clarity

**`PtzPatrolPreset` interface:**
- `id: number` (preset ID 1-64)
- `speed: number` (1-64)
- `dwellTime: number` (seconds to stay)

### 2. Function Signatures Updated

**`setPtzGuard(channel, options: Partial<PtzGuardConfig>): Promise<void>`**
- Changed from `(channel, enabled, timeout)` to options object format
- Automatically includes `cmdStr: "setPos"` and `bSaveCurrentPos: 1` in request
- Returns `void` instead of API response
- Includes comprehensive error handling with rspCode mapping

**`getPtzGuard(channel): Promise<PtzGuardConfig>`**
- Returns typed `PtzGuardConfig` object (extracted from response)
- Provides default values if response is missing

**`getPtzPatrol(channel): Promise<PtzPatrolConfig[]>`**
- Returns array of `PtzPatrolConfig` objects
- Properly handles both single and array responses
- Converts legacy formats to new structure

**`setPtzPatrol(channel, config: PtzPatrolConfig | PtzPatrol): Promise<void>`**
- Accepts `PtzPatrolConfig` with `channel` included in config
- Returns `void` instead of API response
- Intelligently converts legacy formats (`points`, `path`) to `preset` array format
- Includes comprehensive error handling

**`startPatrol(channel, patrolId): Promise<void>`**
- Uses `op: "StartPatrol"` (capitalized, per v8 spec)
- Returns `void` instead of API response
- Includes error handling with rspCode mapping

**`stopPatrol(channel, patrolId): Promise<void>`**
- Uses `op: "StopPatrol"` (capitalized, per v8 spec)
- Returns `void` instead of API response
- Includes error handling with rspCode mapping

### 3. Error Handling

Added `handlePtzError(rspCode, command)` helper function that maps error codes to descriptive `ReolinkHttpError` messages:

- **0**: Success (should not be called)
- **-1**: "Invalid preset or position"
- **-4**: "Parameter format error"
- **-9**: "Not supported on this model"
- **default**: "Unknown PTZ error {rspCode}"

All PTZ functions now properly catch and map API errors, providing clear feedback to users.

### 4. CLI Commands Enhanced

**Updated `ptz guard set` command:**
```bash
reolink ptz guard set --channel 0 --enable true --timeout 60
```
- Now uses options object format internally
- Automatically includes `cmdStr: "setPos"` and `bSaveCurrentPos: 1`

**New `ptz patrol start` command:**
```bash
reolink ptz patrol start --channel 0 --id 0
```
- Starts a patrol route on specified channel
- Requires `--id` argument for patrol route ID (0-5)

**New `ptz patrol stop` command:**
```bash
reolink ptz patrol stop --channel 0 --id 0
```
- Stops a patrol route on specified channel
- Requires `--id` argument for patrol route ID (0-5)

### 5. ReolinkClient Methods Updated

All convenience methods in `ReolinkClient` updated to match new signatures:

- `getPtzGuard(channel): Promise<PtzGuardConfig>`
- `setPtzGuard(channel, options: Partial<PtzGuardConfig>): Promise<void>`
- `getPtzPatrol(channel): Promise<PtzPatrolConfig[]>`
- `setPtzPatrol(channel, config): Promise<void>`
- `startPatrol(channel, patrolId): Promise<void>`
- `stopPatrol(channel, patrolId): Promise<void>`

### 6. Tests Updated

**`src/ptz-guard.test.ts`:**
- All 22 tests updated to match new function signatures
- Tests verify correct JSON payloads match v8 API spec
- Added tests for error code mapping (rspCode -1, -4, -9)
- Verified `cmdStr: "setPos"` and `bSaveCurrentPos: 1` in guard requests
- Verified `op: "StartPatrol"` and `op: "StopPatrol"` (capitalized) in patrol execution

### 7. Documentation Updated

**`README.md`:**
- Updated all code examples to use new function signatures
- Added examples for `patrol start` and `patrol stop` CLI commands
- Added notes about automatic inclusion of `cmdStr: "setPos"` and `bSaveCurrentPos: 1`
- Clarified RLC-823A/S1 specific requirements

### 8. Test Script Updated

**`scripts/test-ptz-guard.ts`:**
- Updated to use new `setPtzGuard` signature with options object
- Added `channel` field to patrol configuration
- Added tests for `patrol start` and `patrol stop` functionality
- Enhanced error messages and test summary

## API Command Mapping

| SDK Method | CGI Command | Key Fields |
|------------|-------------|------------|
| `getPtzGuard` | `GetPtzGuard` | `{ channel }` |
| `setPtzGuard` | `SetPtzGuard` | `{ cmdStr:"setPos", benable, timeout, bSaveCurrentPos:1 }` |
| `getPtzPatrol` | `GetPtzPatrol` | `{ channel }` |
| `setPtzPatrol` | `SetPtzPatrol` | `{ id, enable, preset:[{id,speed,dwellTime}] }` |
| `startPatrol` | `PtzCtrl` | `{ op:"StartPatrol", id }` |
| `stopPatrol` | `PtzCtrl` | `{ op:"StopPatrol", id }` |

## RLC-823A/S1 Specific Notes

1. **Guard Mode:**
   - Binds to the current PTZ position (no preset ID needed)
   - Move PTZ to desired position, then call `setPtzGuard()`
   - SDK automatically includes `cmdStr: "setPos"` and `bSaveCurrentPos: 1`

2. **Patrol Routes:**
   - Use `preset` array with `{ id, speed, dwellTime }` format
   - Do NOT use `points` with `presetId`/`stayTime` (legacy format)
   - `channel` field must be included in `PtzPatrolConfig` object

3. **Patrol Execution:**
   - Use `StartPatrol` and `StopPatrol` operations (capitalized)
   - Executed via `PtzCtrl` command with `op` and `id` parameters

## Backward Compatibility

The implementation maintains backward compatibility by:

- Auto-converting legacy `points`/`path` formats to `preset` array format
- Supporting both `PtzPatrolConfig` and legacy `PtzPatrol` types
- Handling boolean `enable` values and converting to numbers
- Gracefully handling missing or null preset arrays

## Verification

✅ **All tests passing:** 68 tests (6 test files)
✅ **Lint checks:** Passing
✅ **Type checks:** Passing
✅ **Build:** Successful

## Files Modified

1. `src/ptz.ts` - Core PTZ functions and interfaces
2. `src/reolink.ts` - ReolinkClient convenience methods
3. `src/cli.ts` - CLI command handlers
4. `src/ptz-guard.test.ts` - Unit tests
5. `README.md` - Documentation
6. `scripts/test-ptz-guard.ts` - Test script

## Example Usage

### SDK Usage

```typescript
import { ReolinkClient } from "reolink-api";

const client = new ReolinkClient({
  host: "192.168.1.100",
  username: "admin",
  password: "password",
});

await client.login();

// Get guard mode status
const guard = await client.getPtzGuard(0);
console.log(guard); // { benable: 1, timeout: 60, channel: 0, ... }

// Enable guard mode (automatically includes cmdStr: "setPos" and bSaveCurrentPos: 1)
await client.setPtzGuard(0, {
  benable: 1,
  timeout: 60,
});

// Get patrol configuration
const patrol = await client.getPtzPatrol(0);
console.log(patrol); // Array of PtzPatrolConfig objects

// Set patrol configuration (RLC-823A/S1 format)
await client.setPtzPatrol(0, {
  channel: 0,
  id: 0,
  enable: 1,
  preset: [
    { id: 0, speed: 32, dwellTime: 10 },
    { id: 1, speed: 32, dwellTime: 10 },
  ],
});

// Start patrol route
await client.startPatrol(0, 0);

// Stop patrol route
await client.stopPatrol(0, 0);

await client.close();
```

### CLI Usage

```bash
# Get guard mode status
reolink ptz guard get --channel 0

# Set guard mode
reolink ptz guard set --channel 0 --enable true --timeout 60

# Get patrol configuration
reolink ptz patrol get --channel 0

# Set patrol configuration from JSON file
reolink ptz patrol set --channel 0 --file patrol.json

# Start patrol route
reolink ptz patrol start --channel 0 --id 0

# Stop patrol route
reolink ptz patrol stop --channel 0 --id 0
```

## Error Handling

The implementation provides clear error messages for common issues:

- **rspCode -1**: "Invalid preset or position" - Check that preset IDs exist
- **rspCode -4**: "Parameter format error" - Verify format matches device requirements
- **rspCode -9**: "Not supported on this model" - Feature not available on this device

All errors are thrown as `ReolinkHttpError` instances with detailed information.

## Next Steps

The implementation is complete and ready for use. Future enhancements could include:

- Support for additional PTZ operations (zoom, focus, etc.)
- Enhanced patrol route management (pause, resume, speed control)
- Guard mode scheduling
- Multi-channel patrol coordination

---

**Implementation Date:** 2025-01-XX
**Specification Version:** Camera HTTP API User Guide v8
**Status:** ✅ Complete

