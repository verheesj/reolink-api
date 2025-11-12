# Reolink API SDK Usage Guide

This guide walks through the most common patterns for using the `reolink-api` SDK and CLI to interact with Reolink cameras and NVRs. It supplements the quick start material in the project README and focuses on practical, end-to-end examples.

## Prerequisites

- Node.js **18 or newer** (the SDK relies on the built-in `fetch` implementation introduced in Node 18)
- Network access to a Reolink device that exposes the HTTP/JSON CGI API
- Device credentials with permissions for the operations you plan to run (e.g., PTZ control requires an admin user)

## Installing the SDK

Install the published package just like any other npm dependency:

```bash
npm install reolink-nvr-api
```

TypeScript type declarations are bundled with the package, so imports are fully typed without any additional configuration.

## Creating a Client

All programmatic access starts with the `ReolinkClient` class exported from the package root. Construct it with the connection information for your device:

```typescript
import { ReolinkClient } from "reolink-nvr-api";

const client = new ReolinkClient({
  host: "192.168.1.100",
  username: "admin",
  password: "your-password",
  mode: "long",        // optional: "long" (token) or "short" (per request)
  insecure: true,       // optional: ignore TLS certificate errors (default: true)
  debug: false,         // optional: log HTTP payloads to stderr
  // fetch: customFetch // optional: supply your own fetch implementation
});
```

### Connection Modes

- **Long mode** (default) logs in once, stores the issued session token, and automatically refreshes the token as it nears expiry. Every request includes the `token` query parameter.【F:src/reolink.ts†L66-L153】
- **Short mode** skips token management and sends the username/password on each request via query parameters—useful for devices or deployments where sessions are disabled.【F:src/reolink.ts†L52-L119】

Switch between the modes by setting `mode: "short"` in the constructor or passing `--mode short` to the CLI.

### TLS Handling

Many Reolink devices ship with self-signed HTTPS certificates. The SDK mirrors the behaviour of the original `reolink.sh` script by defaulting to `insecure: true`, which injects an HTTPS agent that disables certificate validation. Set `insecure: false` if you have replaced the device certificate with one that chains to a trusted authority.【F:src/reolink.ts†L59-L111】【F:src/snapshot.ts†L16-L64】

### Custom Fetch Implementations

`ReolinkClient` accepts a `fetch` override. Provide a compatible implementation (for example, `node-fetch` in older runtimes or a mocked fetch in tests) through the `fetch` option. The value is stored and reused by helper modules such as snapshot capture.【F:src/reolink.ts†L59-L108】【F:src/snapshot.ts†L16-L64】

## Making API Calls

The client exposes a lightweight wrapper around the JSON CGI commands:

```typescript
await client.login(); // optional: implicitly called on the first request in long mode

const devInfo = await client.api("GetDevInfo");
console.log(devInfo);

await client.close(); // logs out, stops event emitters, and frees resources
```

Key methods:

- `login()` – retrieves a session token (long mode only).【F:src/reolink.ts†L121-L205】
- `api(command, params?)` – executes any CGI command with automatic token refresh and retry on token errors.【F:src/reolink.ts†L72-L177】
- `logout()` – explicitly end the session.【F:src/reolink.ts†L208-L247】
- `close()` – idempotent cleanup that stops event emitters and logs out.【F:src/reolink.ts†L305-L338】

### Error Handling

Failed CGI calls throw `ReolinkHttpError`. The error exposes `code`, `rspCode`, and `detail` fields to help you distinguish HTTP issues from device-level failures.

```typescript
import { ReolinkClient, ReolinkHttpError } from "reolink-nvr-api";

try {
  await client.api("PlaybackStart", { channel: 0, startTime: "2025-01-01T00:00:00Z" });
} catch (error) {
  if (error instanceof ReolinkHttpError) {
    console.error("API error", error.code, error.rspCode, error.detail);
  } else {
    console.error("Unexpected failure", error);
  }
}
```

The playback utilities wrap common "not supported" responses with descriptive messages so that you can fall back to streaming URLs when a device lacks playback control support.【F:src/playback.ts†L1-L116】

## Detecting Device Capabilities

Before invoking feature-specific APIs, you can query the device to determine which capabilities it supports. The `capabilities` module provides helpers to detect and guard against unsupported features:

```typescript
import { detectCapabilities, requireCapability, checkFeature } from "reolink-nvr-api/capabilities";

// Detect all capabilities at once
const caps = await detectCapabilities(client);
console.log("PTZ support:", caps.ptz);
console.log("AI detection:", caps.ai);
console.log("Motion detection:", caps.motionDetection);
console.log("Recording:", caps.recording);

// Guard against missing features
try {
  requireCapability(caps, "ptz");
  // Safe to call PTZ commands
  await ptzCtrl(client, { channel: 0, op: "Left", speed: 32 });
} catch (error) {
  console.error("PTZ not supported on this device");
}

// Quick feature check
if (await checkFeature(client, "ai")) {
  const aiState = await getAiState(client, 0);
  console.log("AI detection state:", aiState);
}
```

The detection logic queries the `GetAbility` endpoint and recognizes various response formats (uppercase/lowercase keys, alternative names like "Person" for AI). If the device doesn't support `GetAbility` or returns an error, `detectCapabilities` returns an empty object rather than throwing.

Use `requireCapability` to enforce feature requirements and provide clear error messages that list the device's available capabilities when a required feature is missing.

## Monitoring Events

Use `createEventEmitter()` to poll the device for motion and AI detections. The emitter is backed by the `ReolinkEventEmitter` class, which extends Node's `EventEmitter`.

```typescript
const emitter = client.createEventEmitter({ interval: 2000, channels: [0, 1] });

emitter.on("motion", (event) => {
  console.log(`Motion ${event.active ? "started" : "cleared"} on channel ${event.channel}`);
});

emitter.on("ai", (event) => {
  if (event.person) console.log("Person detected!");
});

emitter.start();
```

The emitter keeps track of the previous state per channel and only emits when the device reports a change. Call `stop()` or `client.close()` to tear down polling.【F:src/reolink.ts†L247-L338】【F:src/events.ts†L1-L128】

## Capturing Snapshots

Two helper methods capture JPEG snapshots using the dedicated `Snap` CGI command:

```typescript
const buffer = await client.snapshotToBuffer(0);        // returns a Node.js Buffer
await client.snapshotToFile("snapshot.jpg", 1);         // saves JPEG to disk
```

Behind the scenes the snapshot module reuses the client's credentials, mode, token, and fetch implementation to issue a GET request that returns the raw JPEG binary. The helpers validate the JPEG header to guard against API errors that return HTML or JSON payloads.

## Playback Control

Create a playback controller when you need to start, stop, or seek NVR playback sessions programmatically:

```typescript
const playback = client.createPlaybackController();
await playback.startPlayback(0, "2025-11-10T09:00:00Z");
await playback.seekPlayback(0, "2025-11-10T09:15:00Z");
await playback.stopPlayback(0);
```

The controller validates timestamps, provides friendlier errors for unsupported operations, and exposes `getClient()` for advanced scenarios.

## Recording Search and Download

The `record` module wraps `Search` and `Download` CGI commands. Convert ISO timestamps to Unix seconds automatically and work with channel/stream abstractions:

```typescript
import { search, download } from "reolink-nvr-api/record";

const results = await search(client, {
  channel: 0,
  start: "2025-01-01T00:00:00Z",
  end: "2025-01-01T23:59:59Z",
  streamType: "main",
});

for (const file of results.files ?? []) {
  await download(client, { channel: 0, fileName: file.name });
}
```

Use `nvrDownload` for NVR-specific download flows; it currently aliases `download` for convenience.

## Streaming URL Helpers

Generate live or playback streaming URLs without memorising the vendor-specific format:

```typescript
import { rtspUrl, rtmpUrl, flvUrl, nvrPlaybackFlvUrl } from "reolink-nvr-api/stream";

const rtsp = rtspUrl({ user: "admin", pass: "pass", host: "cam.local", channel: 0, h265: true });
const rtmp = rtmpUrl({ host: "nvr.local", channel: 0, token: client.getToken(), user: client.getUsername() });
const flv = flvUrl({ host: "nvr.local", channel: 0, user: "admin", pass: "pass" });
const playbackFlv = nvrPlaybackFlvUrl({ host: "nvr.local", channel: 0, start: "2025-01-01T09:00:00Z", token: client.getToken() });
```

Each helper understands both token-based and user/password authentication and handles channel numbering quirks (e.g., RTSP channels start at `01`).

## PTZ Control

High-level PTZ helpers cover presets, guard mode, and patrol routes:

```typescript
import {
  getPtzPreset,
  ptzCtrl,
  getPtzGuard,
  setPtzGuard,
  toggleGuardMode,
  getPtzPatrol,
  setPtzPatrol,
  startPatrol,
  stopPatrol,
} from "reolink-nvr-api/ptz";

await getPtzPreset(client, 0);
// Go to preset 3
await ptzCtrl(client, { channel: 0, op: "ToPos", id: 3 });
// Move left at speed 32
await ptzCtrl(client, { channel: 0, op: "Left", speed: 32 });
await setPtzGuard(client, 0, { benable: 1, timeout: 60 });
// Toggle guard mode on/off
await toggleGuardMode(client, 0);
await startPatrol(client, 0, 0);
```

The patrol helpers accept both the RLC-823A/S1 preset array format and legacy `points`/`path` payloads, and they normalise error codes into `ReolinkHttpError` instances. Guard helpers automatically include the parameters required by devices that bind guard mode to the current PTZ position.

## Preset management, zones, and panorama assist

For richer preset workflows—including per-preset motion/AI zones, privacy masks, and optional panorama capture—instantiate the
`PresetsModule` with an authenticated client. The module wraps every preset-related CGI command, normalises responses, and
provides helpers for reapplying app-stored zones whenever a preset is recalled.

```typescript
import { PresetsModule } from "reolink-nvr-api";

const presets = new PresetsModule(client);

// Create preset 3 using the camera's current PTZ pose
await presets.setPreset(0, 3, "Entrance", true);
await presets.gotoPreset(0, 3, { speed: 32 });

// Persist desired motion/AI zones in your own store, then reapply on demand
await presets.applyZonesForPreset(0, 3, {
  md: { width: 80, height: 60, bits: "0".repeat(4800) },
  ai: {
    people: { width: 80, height: 60, bits: "1".repeat(4800) },
  },
});
```

When switching presets, retrieve the app-stored zones and hand them back to the helper. It will recall the preset, wait for the
camera to settle, and then push privacy masks, motion zones, and any supported AI grids in sequence.

```typescript
await presets.gotoPresetWithZones(
  0,
  5,
  async (id) => database.loadZonesForPreset(id),
  { speed: 24 }
);
```

Guard mode and PTZ checks follow the documented limitations (60-second timeout, feature detection via ability data):

```typescript
await presets.setGuard(0, { enable: true, timeoutSec: 60, setCurrentAsGuard: true });
const state = await presets.getPtzCheckState(0);
if (state !== 2) {
  await presets.ptzCheck(0);
}
```

Pattern (tattern) operations allow recording and replaying PTZ movements:

```typescript
// Get all pattern tracks (up to 6 tracks)
const patterns = await presets.getPattern(0);
// patterns.value.PtzTattern.track is an array of {id, name, enable}

// Set pattern configuration (track ID must be 1-6)
await presets.setPattern(0, {
  PtzTattern: {
    channel: 0,
    track: [
      { id: 1, name: "Sweep", enable: 1 },
      { id: 2, name: "Guard", enable: 0 }
    ]
  }
});
```

### Parameter Validation

The library validates all PTZ/preset parameters per the API specification:

- **Preset IDs**: 0-64 (spec says 1-64, but some devices support preset 0 as "Default")
- **Preset Names**: Maximum 31 characters
- **Patrol IDs**: 0-5
- **Patrol Steps**: Maximum 16 steps per patrol route
- **Pattern Track IDs**: 1-6
- **PTZ Speed**: 1-64

Validation errors provide clear messages:

```typescript
// Throws: "Preset ID must be between 0 and 64, got: 99"
await presets.gotoPreset(0, 99);

// Throws: "Preset name cannot exceed 31 characters"
await presets.setPreset(0, 1, "This is a very long preset name that exceeds the limit");

// Throws: "PTZ speed must be between 1 and 64, got: 0"
await ptzCtrl(client, { channel: 0, op: "Left", speed: 0 });
```

The optional panorama helper reuses the snapshot utilities and returns a buffer you can stitch or save directly. Supply your own
tiling plan if you want to sweep across a preset while end users edit detection zones.

```typescript
const panorama = await presets.buildPanorama(0, { panStep: 15, tiltStep: 10 });
await fs.promises.writeFile("panorama.jpg", panorama.image as Buffer);
```

### Browser-based preset editor example

For teams that prefer a visual workflow, the repository ships with a ready-to-run example server that exposes a browser UI for managing presets, capturing panoramas, and painting motion grids. The script logs into your device, persists per-preset zones on disk, and serves a static web application with a canvas-based editor.

```bash
npx tsx examples/preset-visual-editor/server.ts
# open http://localhost:5173 in your browser
```

The UI lists the PTZ presets for the selected channel, highlights entries that already have stored zone layouts, and lets you toggle grid cells with the mouse or a touch screen. Buttons along the top recall the preset, clear/fill the grid, and push the edited zones back to the camera. When the device supports panorama capture, the helper button triggers the `buildPanorama` sweep and renders the stitched reference image alongside the zone canvas.

## AI and Alarm Endpoints

Access AI configuration/state and alarm information through dedicated modules:

```typescript
import { getAiCfg, getAiState } from "reolink-nvr-api/ai";
import { getAlarm, getMdState } from "reolink-nvr-api/alarm";

const aiConfig = await getAiCfg(client, 0);
const aiState = await getAiState(client, 0);
const alarm = await getAlarm(client);
const motion = await getMdState(client, 0);
```

These helpers call the corresponding CGI commands and return the raw device payloads for inspection or downstream processing.

## Command-Line Interface

The `reolink` executable included with the package exposes the same functionality from the terminal.

### Configuration

Set environment variables or pass flags:

```bash
export REOLINK_NVR_HOST=192.168.1.100
export REOLINK_NVR_USER=admin
export REOLINK_NVR_PASS=your-password
# export REOLINK_SHORT=1      # optional: force short mode

reolink status devinfo
```

Equivalent flags:

```bash
reolink --host 192.168.1.100 --user admin --pass your-password status devinfo
```

Common global options:

- `--mode long|short` – select connection mode
- `--insecure` – allow self-signed certificates (on by default)
- `--debug` – log HTTP requests/responses
- `--json` / `--pretty` – control JSON output formatting

If required configuration is missing, the CLI aborts with a helpful message describing the needed environment variables or flags.

### Command Groups

#### Status Commands

Fetch device information and configuration:

```bash
# Get device information
reolink status devinfo

# Get device capabilities
reolink status ability

# Get encoder configuration for channel 0
reolink status enc --channel 0
```

#### Stream Commands

Generate streaming URLs (output is JSON, not an actual stream):

```bash
# Get RTSP URL for H.265 main stream on channel 0
reolink stream url rtsp --channel 0 --codec h265

# Get RTMP URL for sub stream
reolink stream url rtmp --channel 0 --streamType sub

# Get FLV URL
reolink stream url flv --channel 0

# Get playback FLV URL for a specific timestamp
reolink stream playback --channel 0 --start "2025-01-01T09:00:00Z"
```

#### Recording Commands

Search and download recordings:

```bash
# Search for recordings in a time range
reolink rec search --channel 0 --start "2025-01-01T00:00:00Z" --end "2025-01-01T23:59:59Z"

# Download a specific recording file
reolink rec download --channel 0 --file "rec_file.mp4" --streamType main
```

#### PTZ Commands

Control pan-tilt-zoom cameras:

```bash
# List all presets for channel 0
reolink ptz list-presets --channel 0

# Go to preset 3
reolink ptz goto 3 --channel 0

# Get guard mode configuration
reolink ptz guard get --channel 0

# Enable guard mode with 60-second timeout
reolink ptz guard set --channel 0 --enable true --timeout 60

# Get patrol configuration
reolink ptz patrol get --channel 0

# Start patrol route 0
reolink ptz patrol start --channel 0 --id 0

# Stop patrol route 0
reolink ptz patrol stop --channel 0 --id 0
```

#### AI and Alarm Commands

Monitor AI detections and alarm state:

```bash
# Get AI configuration
reolink ai cfg --channel 0

# Get current AI detection state
reolink ai state --channel 0

# Get motion detection state
reolink alarm md-state --channel 0

# Get alarm status
reolink alarm alarm
```

#### Event Listening

Stream real-time motion and AI events:

```bash
# Listen for events (outputs JSON events to stdout)
reolink events listen --interval 2000

# Events are output as JSON lines:
# {"type":"motion","channel":0,"active":true,"timestamp":"2025-01-01T12:34:56Z"}
# {"type":"ai","channel":0,"person":true,"vehicle":false,"timestamp":"2025-01-01T12:35:01Z"}
```

#### Snapshot Commands

Capture JPEG snapshots:

```bash
# Capture snapshot and save to file
reolink snap --channel 0 --file snapshot.jpg

# Capture snapshot to stdout (for piping)
reolink snap --channel 0 > snapshot.jpg

# Quiet mode (no stderr output)
reolink snap --channel 0 --file out.jpg --quiet
```

#### Playback Commands

Control NVR playback streams:

```bash
# Start playback from a specific timestamp
reolink playback start --channel 0 --start "2025-01-01T09:00:00Z"

# Seek to a different time
reolink playback seek --channel 0 --time "2025-01-01T09:15:00Z"

# Stop playback
reolink playback stop --channel 0
```

#### Capabilities Command

Detect what features the device supports:

```bash
reolink capabilities
# or
reolink caps
```

#### Generic API Commands

Call any CGI command directly with optional JSON payload:

```bash
# Call GetDevInfo
reolink GetDevInfo

# Call with parameters
reolink SetEnc '{"channel":0,"mainStream":{"bitRate":4096}}'
```

Each command outputs structured JSON by default, which makes it easy to integrate the CLI into scripts. Use `--pretty` for human-readable formatting or redirect binary responses (such as snapshots) to files.

## Cleaning Up

Always call `client.close()` when you finish interacting with a device. This stops background pollers and logs out cleanly, preventing lingering sessions on the NVR or camera.

## Further Reading

- Browse the `examples/` directory in the repository for end-to-end TypeScript scripts.
- Review the individual modules in `src/` for the full set of exported helpers and type definitions.
