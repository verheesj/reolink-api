<div align="center">

# 🎥 Reolink NVR API

**A comprehensive TypeScript SDK and CLI for Reolink NVR and IP Camera devices**

[![npm version](https://badge.fury.io/js/reolink-nvr-api.svg)](https://www.npmjs.com/package/reolink-nvr-api)
[![npm downloads](https://img.shields.io/npm/dm/reolink-nvr-api.svg)](https://www.npmjs.com/package/reolink-nvr-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Features](#-features) • [Installation](#-installation) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Examples](#-examples) • [CLI](#-cli-tool)

</div>

---

## ✨ Features

### 🔐 **Authentication & Sessions**
- Token-based session management with automatic refresh
- Short-lived request authentication
- Secure credential handling
- SSL/TLS support with self-signed certificate handling

### 📹 **Camera Control**
- **PTZ Control** - Pan, tilt, zoom, presets, and patrol routes
- **Snapshots** - Capture high-quality JPEG images
- **Live Streaming** - Generate RTSP, RTMP, and FLV URLs
- **Playback** - Time-based video playback control

### 🤖 **AI & Detection**
- Person detection monitoring
- Vehicle detection support
- Pet detection capabilities
- Motion detection state polling
- Real-time event notifications

### 📊 **Device Management**
- Device information and capabilities
- System configuration (Name, Time, Maintenance)
- HDD management and formatting
- Firmware upgrade and status monitoring
- Encoding configuration (resolution, codec, FPS, bitrate)
- Multi-channel support for NVRs
- Channel status monitoring

### 🎬 **Recording & Playback**
- Record search by time range
- Video download capabilities
- Playback stream control (start, stop, seek)
- Support for main and sub-streams

### 🛠️ **Developer Experience**
- **Full TypeScript support** with comprehensive type definitions
- **Modular exports** - Import only what you need
- **Event-driven architecture** for real-time monitoring
- **Well-tested** with extensive unit tests
- **Detailed documentation** and examples

---

## 📦 Installation

```bash
npm install reolink-nvr-api
```

**Requirements:** Node.js >= 18.0.0

---

## 🚀 Quick Start

### Basic Usage

### SDK Usage

```typescript
import { ReolinkClient } from 'reolink-nvr-api';

const client = new ReolinkClient({
  host: '192.168.1.100',
  username: 'admin',
  password: 'your-password',
  mode: 'long' // Token-based session with auto-refresh
});

await client.login();

// Get device information
const info = await client.getDevInfo();
console.log('Device:', info.name);

// Capture a snapshot
const jpeg = await client.snap(0); // channel 0
fs.writeFileSync('snapshot.jpg', Buffer.from(jpeg));

// PTZ control
await client.ptzCtrl(0, { cmd: 'Right', speed: 32 });

// Get RTSP stream URL
const rtspUrl = client.rtspUrl(0, { codec: 'h265', streamType: 'main' });
console.log('Stream:', rtspUrl);

await client.close();
```

### CLI Usage

Set environment variables:

### PTZ Control

```typescript
import { ptzCtrl, getPtzPreset } from "reolink-nvr-api/ptz";

// Get available presets
const presets = await getPtzPreset(client, 0);
console.log(presets);

// Move to preset
await ptzCtrl(client, {
  channel: 0,
  op: "GotoPreset",
  presetId: 1,
});

// Pan right
await ptzCtrl(client, {
  channel: 0,
  op: "Right",
  speed: 20,
});

// Stop movement
await ptzCtrl(client, { channel: 0, op: "Stop" });
```

### Event Monitoring

```typescript
import { ReolinkEventEmitter } from "reolink-nvr-api/events";

const emitter = new ReolinkEventEmitter(client, {
  channels: [0, 1], // Monitor channels 0 and 1
  interval: 1000,   // Poll every second
});

emitter.on("motion", (channel, state) => {
  console.log(`Motion detected on channel ${channel}:`, state);
});

emitter.on("ai", (channel, state) => {
  console.log(`AI detection on channel ${channel}:`, state);
});

emitter.start();
```

### Streaming URLs

```typescript
import { rtspUrl, rtmpUrl, flvUrl } from "reolink-nvr-api/stream";

// Generate RTSP URL
const rtsp = rtspUrl({
  user: "admin",
  pass: "password",
  host: "192.168.1.100",
  channel: 0,
  h265: true, // Use H.265 codec
});

// Generate FLV URL
const flv = flvUrl({
  token: client.getToken(),
  user: "admin",
  host: "192.168.1.100",
  channel: 0,
  streamType: "main",
});
```

---

## 📚 Documentation

### Core Modules

| Module | Description | Import |
|--------|-------------|--------|
| **Client** | Main API client | `reolink-nvr-api` |
| **PTZ** | Pan-Tilt-Zoom control | `reolink-nvr-api/ptz` |
| **Snapshot** | Image capture | `reolink-nvr-api/snapshot` |
| **Stream** | URL generation | `reolink-nvr-api/stream` |
| **Events** | Event monitoring | `reolink-nvr-api/events` |
| **Playback** | Video playback | `reolink-nvr-api/playback` |
| **Record** | Search & download | `reolink-nvr-api/record` |
| **AI** | AI detection | `reolink-nvr-api/ai` |
| **Alarm** | Motion detection | `reolink-nvr-api/alarm` |

### Detailed Documentation

For comprehensive API documentation, see [USAGE.md](./USAGE.md)

---

## 💡 Examples

The repository includes several practical examples:

### 📸 **Snapshot Capture**
```bash
npx tsx examples/streaming.ts
```
Demonstrates generating streaming URLs for RTSP, RTMP, FLV, and playback.

### 🎮 **PTZ Control**
```bash
npx tsx examples/ptz.ts
```
Shows PTZ movement, presets, guard mode, and patrol routes.

### 📊 **Device Status**
```bash
npx tsx examples/status.ts
```
Queries device information, abilities, and encoding configuration.

### ⚙️ **System Management**
```bash
npx tsx examples/system_management.ts
```
Demonstrates getting/setting device name, time, maintenance settings, HDD info, and firmware status.

### 📹 **Camera Enumeration**
```bash
npx tsx examples/cameras.ts
```
Lists all cameras with their capabilities, encoding settings, and status.

### 🛠️ **Extra Tools**

The `extras/` directory contains advanced tools not included in the main package:

- **360° Panorama** (`extras/panorama/`) - Capture full panoramas using PTZ cameras

---

## 🖥️ CLI Tool

The package includes a powerful command-line interface:

### Installation

```bash
# Global install
npm install -g reolink-nvr-api

# Or use with npx
npx reolink-nvr-api [command]
```

### Configuration

Set environment variables in a `.env` file or use command-line flags:

```bash
# .env file
REOLINK_NVR_HOST=192.168.1.100
REOLINK_NVR_USER=admin
REOLINK_NVR_PASS=password
```

### Common Commands

```bash
# Device information
reolink status devinfo
reolink status ability
reolink status enc --channel 0

# Capture snapshot
reolink snap --channel 0 --file snapshot.jpg

# PTZ control
reolink ptz list-presets --channel 0
reolink ptz goto 1 --channel 0

# Stream URLs
reolink stream url rtsp --channel 0 --codec h265
reolink stream url flv --channel 0

# Event listening
reolink events listen --interval 1000

# Record search
reolink rec search --channel 0 --start "2025-01-01T00:00:00Z" --end "2025-01-01T23:59:59Z"

# Check device capabilities
reolink capabilities
```

### CLI Help

```bash
reolink --help
```

---

## 🔧 API Client Options

```typescript
const client = new ReolinkClient({
  host: "192.168.1.100",        // Device IP or hostname
  username: "admin",             // Username
  password: "password",          // Password
  mode: "long",                  // "long" (session) or "short" (per-request)
  insecure: true,               // Allow self-signed certificates
  debug: false,                  // Enable debug logging
  timeout: 30000,                // Request timeout (ms)
});
```

---

## 🏗️ Advanced Usage

### Custom API Calls

```typescript
// Direct API call
const response = await client.api("GetDevInfo", {});

// With parameters
const enc = await client.api("GetEnc", {
  channel: 0,
  action: 1,
});
```

### Playback Control

```typescript
const controller = client.createPlaybackController();

// Start playback
await controller.startPlayback(0, "2025-01-01T09:00:00Z");

// Seek to different time
await controller.seekPlayback(0, "2025-01-01T09:15:00Z");

// Stop playback
await controller.stopPlayback(0);
```

### Guard Mode & Patrol

```typescript
import { getPtzGuard, setPtzGuard, startPatrol } from "reolink-nvr-api/ptz";

// Enable guard mode
await setPtzGuard(client, 0, {
  benable: 1,
  timeout: 60, // Return to guard position after 60s
});

// Start patrol route
await startPatrol(client, 0, 0); // channel 0, patrol route 0
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details

---

## ⚠️ Device Compatibility

This SDK has been tested with various Reolink NVR and camera models. Some features may not be available on all devices:

- **Playback control** (`PlaybackStart`, `PlaybackStop`, `PlaybackSeek`) may not be supported on some NVR models
- **PTZ features** require PTZ-capable cameras
- **AI detection** requires cameras with AI capabilities
- Check device capabilities using `getAbility()` or the CLI command `reolink capabilities`

---

## 🙏 Acknowledgments

Built with TypeScript and tested with Vitest. Inspired by the need for a modern, type-safe Reolink API client.

---

<div align="center">

**[⬆ Back to Top](#-reolink-nvr-api)**

Made with ❤️ for the Reolink community

</div>

Set environment variables:

```bash
export REOLINK_NVR_HOST=192.168.1.100
export REOLINK_NVR_USER=admin
export REOLINK_NVR_PASS=your-password
```

Then run CLI commands:

```bash
npx reolink-nvr-api status devinfo
npx reolink-nvr-api stream url rtsp --channel 0
npx reolink-nvr-api snap --channel 0 > snapshot.jpg
```

Or use command-line flags:

```bash
npx reolink-nvr-api --host 192.168.1.100 --user admin --pass password status devinfo
```

## CLI Commands

### Status & Information

```bash
# Device information
npx reolink-nvr-api status devinfo

# Device capabilities
npx reolink-nvr-api status ability

# Encoding configuration
npx reolink-nvr-api status enc --channel 0
```

### Streaming

```bash
# Generate RTSP URL
npx reolink-nvr-api stream url rtsp --channel 0 --codec h265

# Generate RTMP URL
npx reolink-nvr-api stream url rtmp --channel 0 --streamType main

# Generate FLV URL
npx reolink-nvr-api stream url flv --channel 0

# Playback stream
npx reolink-nvr-api stream playback --channel 0 --start "2025-01-01T09:00:00Z"
```

### Snapshots

```bash
# Capture snapshot to file
npx reolink-nvr-api snap --channel 0 > snapshot.jpg

# Snapshot with debug output
npx reolink-nvr-api --debug snap --channel 0 > snapshot.jpg
```

### Recording Management

```bash
# Search recordings
npx reolink-nvr-api rec search --channel 0 --start "2025-01-01T00:00:00Z" --end "2025-01-01T23:59:59Z"

# Download recording
npx reolink-nvr-api rec download --channel 0 --file "Mp4Record%202025-01-01_..."
```

### PTZ Control

```bash
# List PTZ presets
reolink ptz list-presets --channel 0

# Go to preset
reolink ptz goto 3 --channel 0

# Start patrol
reolink ptz start-patrol 1 --channel 0

# Stop patrol
reolink ptz stop-patrol --channel 0

# Get guard mode status
reolink ptz guard get --channel 0

# Set guard mode (with timeout)
# Note: For RLC-823A/S1, guard binds to current PTZ position (move PTZ first)
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

### AI & Alarm

```bash
# Get AI configuration
reolink ai cfg --channel 0

# Get AI state
reolink ai state --channel 0

# Get motion detection state
reolink alarm md-state --channel 0

# Get alarm information
reolink alarm alarm
```

### Snapshot Capture

```bash
# Capture snapshot to file
reolink snap --channel 0 --file snapshot.jpg

# Capture snapshot and pipe to stdout (for preview or processing)
reolink snap --channel 0 | file -  # Shows JPEG image data

# Quiet mode (suppress logs)
reolink snap --channel 0 --file snapshot.jpg --quiet
```

### Playback Control

```bash
# Start playback from a specific time
reolink playback start --channel 0 --start "2025-11-10T09:00:00Z"

# Seek to a different time in current playback
reolink playback seek --channel 0 --time "2025-11-10T09:15:00Z"

# Stop playback (all channels)
reolink playback stop

# Stop playback on specific channel
reolink playback stop --channel 0
```

### Generic API Commands

```bash
# Call any API command directly
reolink GetEnc '{"channel": 0, "action": 1}'
```

## Connection Modes

### Long Connection Mode (Default)

Uses token-based sessions with automatic refresh:

```typescript
const client = new ReolinkClient({
  host: "192.168.1.100",
  username: "admin",
  password: "password",
  mode: "long", // default
});
```

### Short Connection Mode

Per-request authentication (no session):

```typescript
const client = new ReolinkClient({
  host: "192.168.1.100",
  username: "admin",
  password: "password",
  mode: "short",
});
```

CLI: Use `--mode short` or set `REOLINK_SHORT=1`

## API Reference

### ReolinkClient

#### Constructor

```typescript
new ReolinkClient(options: ReolinkOptions)
```

Options:
- `host: string` - Device hostname or IP
- `username: string` - Login username
- `password: string` - Login password
- `mode?: "long" | "short"` - Connection mode (default: "long")
- `insecure?: boolean` - Allow insecure SSL (default: true)
- `debug?: boolean` - Enable debug logging
- `fetch?: typeof fetch` - Custom fetch implementation

#### Methods

- `login(): Promise<string>` - Login and get session token
- `logout(): Promise<void>` - Logout and invalidate token
- `api<T>(command: string, params?: Record<string, unknown>): Promise<T>` - Make API call
- `snapshotToBuffer(channel?: number): Promise<Buffer>` - Capture snapshot as Buffer
- `snapshotToFile(path: string, channel?: number): Promise<void>` - Capture snapshot to file
- `close(): Promise<void>` - Close client and logout (idempotent)
- `getToken(): string` - Get current token
- `isClosed(): boolean` - Check if client is closed

### Error Handling

All API errors throw `ReolinkHttpError`:

```typescript
import { ReolinkHttpError } from "reolink-api";

try {
  await client.api("SomeCommand");
} catch (error) {
  if (error instanceof ReolinkHttpError) {
    console.error(`Error code: ${error.code}`);
    console.error(`Response code: ${error.rspCode}`);
    console.error(`Detail: ${error.detail}`);
  }
}
```

## Playback Control

Control NVR/IPC playback streams programmatically:

**⚠️ Device Compatibility Note:** Playback control commands (`PlaybackStart`, `PlaybackStop`, `PlaybackSeek`) are not supported on all Reolink devices. Some NVR models may return error code -9 ("not support") even though they support playback via the web UI. This is a device/firmware limitation. If playback control is not supported on your device, consider using RTSP/FLV streaming URLs or record download functionality instead.

```typescript
import { ReolinkClient } from "reolink-api";

const client = new ReolinkClient({
  host: "192.168.1.100",
  username: "admin",
  password: "password",
});

await client.login();

const controller = client.createPlaybackController();

// Start playback from a specific time
await controller.startPlayback(0, "2025-11-10T09:00:00Z");

// Seek to a different time
await controller.seekPlayback(0, "2025-11-10T09:15:00Z");

// Stop playback on specific channel
await controller.stopPlayback(0);

// Stop all playback
await controller.stopPlayback();

await client.close();
```

Or use the standalone class:

```typescript
import { ReolinkPlaybackController } from "reolink-api/playback";

const controller = new ReolinkPlaybackController(client);
await controller.startPlayback(0, "2025-11-10T09:00:00Z");
```

## PTZ Guard & Patrol

Control PTZ guard mode (home position) and patrol configurations:

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

// Enable guard mode with timeout (RLC-823A/S1: guard binds to current camera position)
// Note: cmdStr: "setPos" and bSaveCurrentPos: 1 are automatically included
await client.setPtzGuard(0, {
  benable: 1,
  timeout: 60,
});

// Toggle guard mode
await client.toggleGuardMode(0);

// Get patrol configuration
const patrol = await client.getPtzPatrol(0);
console.log(patrol); // Array of PtzPatrolConfig objects

// Set patrol configuration (RLC-823A/S1 format)
// Note: On RLC-823A/S1 models, use preset array with id/speed/dwellTime
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

**⚠️ Device Compatibility Note:** Guard and patrol modes are not supported on all Reolink devices. Some models may return error code -9 ("not support"). Check device capabilities with `reolink capabilities`.

**📝 RLC-823A/S1 Specific Notes:**
- Guard mode: Binds to the current PTZ position (no preset ID needed). Move PTZ to desired position, then call `setPtzGuard()`. The SDK automatically includes `cmdStr: "setPos"` and `bSaveCurrentPos: 1` in the request.
- Patrol routes: Use `preset` array with `{ id, speed, dwellTime }` format (not `points` with `presetId`/`stayTime`). The `channel` field must be included in the `PtzPatrolConfig` object.
- Patrol execution: Use `StartPatrol` and `StopPatrol` operations (capitalized) via `PtzCtrl` command.

## Examples

See the `examples/` directory for runnable TypeScript examples:

- `status.ts` - Device status queries
- `streaming.ts` - Streaming URL generation
- `records.ts` - Record search and download
- `ptz.ts` - PTZ control examples

Run examples with:

```bash
npx tsx examples/status.ts
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint
npm run lint

# Format code
npm run format

# Type check
npm run typecheck
```

## License

ISC

## References

- Reolink Camera HTTP API User Guide v7/v8
- Reolink CGI API Documentation

