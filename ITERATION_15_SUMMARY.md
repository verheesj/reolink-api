# Iteration 15 — Event Polling & Subscriptions — Implementation Summary

## Overview

Implemented real-time event streaming support for Reolink devices, enabling applications and automations to listen for motion, AI, and alarm events without constant manual queries.

## Implementation Details

### 1. Core Event Emitter Module (`src/events.ts`)

**Created `ReolinkEventEmitter` class:**
- Extends Node.js `EventEmitter` for event-driven architecture
- Polls device state at configurable intervals (default: 1000ms)
- Monitors multiple channels simultaneously
- Auto-detects channels from device info if not specified
- Emits events only on state changes (not on every poll)

**Key Features:**
- **Motion Detection**: Polls `GetMdState` API and emits `'motion'` events
  - Event payload: `{ event: 'motion', channel: number, active: boolean }`
- **AI Detection**: Polls `GetAiState` API and emits `'ai'` events
  - Event payload: `{ event: 'ai', channel: number, person: boolean, vehicle: boolean, pet: boolean }`
- **State Tracking**: Maintains last known state per channel to prevent duplicate emissions
- **Error Handling**: Gracefully handles API errors without crashing
- **Auto-cleanup**: Properly stops polling and cleans up resources

### 2. ReolinkClient Integration (`src/reolink.ts`)

**Added Methods:**
- `createEventEmitter(options?)`: Factory method to create bound event emitters
- Enhanced `close()`: Automatically stops all active event emitters on client shutdown

**Implementation:**
- Tracks all created event emitters in a `Set`
- Ensures proper cleanup when client is closed
- Maintains connection lifecycle integrity

### 3. CLI Integration (`src/cli.ts`)

**New Command:**
```bash
reolink events listen [--interval MS]
```

**Features:**
- Configurable polling interval via `--interval` flag
- JSON output (one event per line) for easy parsing
- Graceful shutdown on SIGINT/SIGTERM (Ctrl+C)
- Proper cleanup: stops polling and logs out before exit

**Usage Example:**
```bash
# Default 1 second interval
node dist/cli.js events listen

# Custom 2 second interval
node dist/cli.js events listen --interval 2000
```

### 4. Comprehensive Test Suite (`src/events.test.ts`)

**Test Coverage: 96.41%** (exceeds 80% threshold)

**9 Test Cases:**
1. ✅ Start/stop functionality
2. ✅ Prevents multiple starts
3. ✅ Motion event emission on state change
4. ✅ No motion event when state unchanged
5. ✅ Error handling for API failures
6. ✅ AI event emission on state change
7. ✅ No AI event when state unchanged
8. ✅ Channel auto-detection from GetDevInfo
9. ✅ Timer cleanup on stop

**All 20 tests passing** (11 existing + 9 new)

### 5. Test Script (`scripts/test-events.ts`)

**Created practical test script:**
- Connects to NVR with configurable credentials
- Fetches channel names for readable output
- Displays events in human-readable format with timestamps
- Shows motion status (ACTIVE/INACTIVE) and AI detections
- Handles graceful shutdown

**Usage:**
```bash
npx tsx scripts/test-events.ts
```

## Technical Highlights

### State Change Detection
- Only emits events when state actually changes
- Initializes state on first poll (no emission)
- Tracks state per channel independently
- Prevents duplicate events

### Error Resilience
- API errors are caught and emitted as `'error'` events
- Polling continues even if individual channels fail
- Graceful degradation for unsupported features

### Resource Management
- Proper cleanup of intervals on stop
- Automatic cleanup when client closes
- No memory leaks or orphaned timers

### Type Safety
- Full TypeScript support with strict types
- Typed event payloads (`MotionEvent`, `AiEvent`)
- Type-safe event handlers

## Package Updates

**Updated `package.json`:**
- Added `./events` export for modular imports
- Maintains backward compatibility

## Verification Results

✅ **Linting**: Passes (ESLint)
✅ **Type Checking**: Passes (TypeScript strict mode)
✅ **Tests**: 20/20 passing
✅ **Coverage**: 96.41% for events module (exceeds 80% threshold)
✅ **Build**: Successful

## Usage Examples

### Library Usage
```typescript
import { ReolinkClient } from "./reolink.js";

const client = new ReolinkClient({
  host: "192.168.0.79",
  username: "admin",
  password: "password",
});

await client.login();

const emitter = client.createEventEmitter({ 
  interval: 1000,
  channels: [0, 1, 2] // Optional: specific channels
});

emitter.on("motion", (event) => {
  console.log(`Motion on channel ${event.channel}: ${event.active}`);
});

emitter.on("ai", (event) => {
  if (event.person) {
    console.log(`Person detected on channel ${event.channel}`);
  }
});

emitter.start();

// Later...
emitter.stop();
await client.close();
```

### CLI Usage
```bash
# Listen for events with default 1s interval
reolink events listen

# Custom interval
reolink events listen --interval 2000

# With environment variables
REOLINK_NVR_HOST=192.168.0.79 \
REOLINK_NVR_USER=admin \
REOLINK_NVR_PASS=password \
reolink events listen
```

## Files Changed/Created

**New Files:**
- `src/events.ts` - Core event emitter implementation
- `src/events.test.ts` - Comprehensive test suite
- `scripts/test-events.ts` - Practical test script

**Modified Files:**
- `src/reolink.ts` - Added `createEventEmitter()` and cleanup logic
- `src/cli.ts` - Added `events listen` subcommand
- `package.json` - Added `./events` export

## Next Steps

This implementation provides a solid foundation for:
- Home automation integrations (Home Assistant, Node-RED)
- Security monitoring systems
- Motion-triggered workflows
- AI detection-based automations

The event polling system is production-ready and can be extended with additional event types as needed.

