# Reolink API SDK Usage Guide

This guide walks through the most common patterns for using the `reolink-api` SDK and CLI to interact with Reolink cameras and NVRs. It supplements the quick start material in the project README and focuses on practical, end-to-end examples.

## Prerequisites

- Node.js **18 or newer** (the SDK relies on the built-in `fetch` implementation introduced in Node 18)
- Network access to a Reolink device that exposes the HTTP/JSON CGI API
- Device credentials with permissions for the operations you plan to run (e.g., PTZ control requires an admin user)

## Installing the SDK

Install the published package just like any other npm dependency:

```bash
npm install reolink-api
```

TypeScript type declarations are bundled with the package, so imports are fully typed without any additional configuration.

## Creating a Client

All programmatic access starts with the `ReolinkClient` class exported from the package root. Construct it with the connection information for your device:

```typescript
import { ReolinkClient } from "reolink-api";

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
import { ReolinkClient, ReolinkHttpError } from "reolink-api";

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

Behind the scenes the snapshot module reuses the client's credentials, mode, token, and fetch implementation to issue a GET request that returns the raw JPEG binary. The helpers validate the JPEG header to guard against API errors that return HTML or JSON payloads.【F:src/reolink.ts†L340-L388】【F:src/snapshot.ts†L1-L87】

## Playback Control

Create a playback controller when you need to start, stop, or seek NVR playback sessions programmatically:

```typescript
const playback = client.createPlaybackController();
await playback.startPlayback(0, "2025-11-10T09:00:00Z");
await playback.seekPlayback(0, "2025-11-10T09:15:00Z");
await playback.stopPlayback(0);
```

The controller validates timestamps, provides friendlier errors for unsupported operations, and exposes `getClient()` for advanced scenarios.【F:src/reolink.ts†L388-L448】【F:src/playback.ts†L1-L200】

## Recording Search and Download

The `record` module wraps `Search` and `Download` CGI commands. Convert ISO timestamps to Unix seconds automatically and work with channel/stream abstractions:

```typescript
import { search, download } from "reolink-api/record";

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

Use `nvrDownload` for NVR-specific download flows; it currently aliases `download` for convenience.【F:src/record.ts†L1-L66】

## Streaming URL Helpers

Generate live or playback streaming URLs without memorising the vendor-specific format:

```typescript
import { rtspUrl, rtmpUrl, flvUrl, nvrPlaybackFlvUrl } from "reolink-api/stream";

const rtsp = rtspUrl({ user: "admin", pass: "pass", host: "cam.local", channel: 0, h265: true });
const rtmp = rtmpUrl({ host: "nvr.local", channel: 0, token: client.getToken(), user: client.getUsername() });
const flv = flvUrl({ host: "nvr.local", channel: 0, user: "admin", pass: "pass" });
const playbackFlv = nvrPlaybackFlvUrl({ host: "nvr.local", channel: 0, start: "2025-01-01T09:00:00Z", token: client.getToken() });
```

Each helper understands both token-based and user/password authentication and handles channel numbering quirks (e.g., RTSP channels start at `01`).【F:src/stream.ts†L1-L93】

## PTZ Control

High-level PTZ helpers cover presets, guard mode, and patrol routes:

```typescript
import {
  getPtzPreset,
  ptzCtrl,
  getPtzGuard,
  setPtzGuard,
  getPtzPatrol,
  setPtzPatrol,
  startPatrol,
  stopPatrol,
} from "reolink-api/ptz";

await getPtzPreset(client, 0);
await ptzCtrl(client, { channel: 0, op: "GotoPreset", presetId: 3 });
await setPtzGuard(client, 0, { benable: 1, timeout: 60 });
await startPatrol(client, 0, 0);
```

The patrol helpers accept both the RLC-823A/S1 preset array format and legacy `points`/`path` payloads, and they normalise error codes into `ReolinkHttpError` instances. Guard helpers automatically include the parameters required by devices that bind guard mode to the current PTZ position.【F:src/ptz.ts†L1-L190】

## AI and Alarm Endpoints

Access AI configuration/state and alarm information through dedicated modules:

```typescript
import { getAiCfg, getAiState } from "reolink-api/ai";
import { getAlarm, getMdState } from "reolink-api/alarm";

const aiConfig = await getAiCfg(client, 0);
const aiState = await getAiState(client, 0);
const alarm = await getAlarm(client);
const motion = await getMdState(client, 0);
```

These helpers call the corresponding CGI commands and return the raw device payloads for inspection or downstream processing.【F:src/ai.ts†L1-L36】【F:src/alarm.ts†L1-L36】

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

If required configuration is missing, the CLI aborts with a helpful message describing the needed environment variables or flags.【F:src/cli.ts†L1-L132】【F:src/cli.ts†L137-L176】

### Command Groups

- `status` – fetch device status (`devinfo`, `ability`, `enc`).【F:src/cli.ts†L41-L60】【F:src/cli.ts†L177-L356】
- `stream` – build RTSP/RTMP/FLV/playback URLs without running an HTTP request.【F:src/cli.ts†L41-L115】【F:src/cli.ts†L357-L482】
- `rec` – search and download recordings via the record helpers.【F:src/cli.ts†L16-L60】【F:src/cli.ts†L483-L612】
- `ptz` – manage presets, guard mode, and patrols.【F:src/cli.ts†L16-L60】【F:src/cli.ts†L613-L800】
- `ai` / `alarm` – inspect AI configuration/state and motion/alarm information.【F:src/cli.ts†L16-L60】【F:src/cli.ts†L801-L893】
- `events listen` – stream motion/AI events using the polling emitter.【F:src/cli.ts†L894-L1000】
- `snap` – capture snapshots to stdout or disk.【F:src/cli.ts†L1001-L1086】
- `playback` – invoke playback controller operations from the shell.【F:src/cli.ts†L1087-L1244】
- Generic – pass any CGI command name followed by an optional JSON payload to reach unsupported endpoints directly.【F:src/cli.ts†L1245-L1412】

Each command outputs structured JSON by default, which makes it easy to integrate the CLI into scripts. Use `--pretty` for human-readable formatting or redirect binary responses (such as snapshots) to files.

## Cleaning Up

Always call `client.close()` when you finish interacting with a device. This stops background pollers and logs out cleanly, preventing lingering sessions on the NVR or camera.【F:src/reolink.ts†L305-L338】

## Further Reading

- Browse the `examples/` directory in the repository for end-to-end TypeScript scripts.
- Review the individual modules in `src/` for the full set of exported helpers and type definitions.
