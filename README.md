# Reolink API SDK

A robust Node.js/TypeScript SDK and CLI for interacting with Reolink NVR and camera devices via their HTTP/JSON CGI API.

## Features

- ✅ **Type-safe API client** with full TypeScript support
- ✅ **Long and short connection modes** (token-based sessions or per-request auth)
- ✅ **Automatic token refresh** for seamless long sessions
- ✅ **Comprehensive CLI** with intuitive commands
- ✅ **Streaming URL helpers** for RTSP, RTMP, FLV, and playback
- ✅ **Record search and download** for VOD workflows
- ✅ **PTZ control** for presets and patrol
- ✅ **AI and alarm state** monitoring
- ✅ **Snapshot capture** for fast image capture
- ✅ **Event polling** for real-time motion/AI detection
- ✅ **Well-tested** with unit tests

## Quick Start

### Installation

```bash
npm install reolink-api
```

### Basic Usage

```typescript
import { ReolinkClient } from "reolink-api";

const client = new ReolinkClient({
  host: "192.168.1.100",
  username: "admin",
  password: "your-password",
});

// Login (automatic in long mode)
await client.login();

// Get device info
const devInfo = await client.api("GetDevInfo");
console.log(devInfo);

// Close session
await client.close();
```

### CLI Usage

Set environment variables:

```bash
export REOLINK_NVR_HOST=192.168.1.100
export REOLINK_NVR_USER=admin
export REOLINK_NVR_PASS=your-password
```

Or use command-line flags:

```bash
node dist/cli.js --host 192.168.1.100 --user admin --pass your-password status devinfo
```

## CLI Commands

### Status Commands

```bash
# Get device information
reolink status devinfo

# Get device capabilities
reolink status ability

# Get encoding configuration
reolink status enc --channel 0
```

### Streaming URLs

```bash
# Generate RTSP URL
reolink stream url rtsp --channel 0 --codec h265

# Generate RTMP URL
reolink stream url rtmp --channel 0 --streamType main

# Generate FLV URL
reolink stream url flv --channel 0

# Generate playback URL
reolink stream playback --channel 0 --start "2025-01-01T09:00:00Z"
```

### Record Search & Download

```bash
# Search for recordings
reolink rec search --channel 0 --start "2025-01-01T00:00:00Z" --end "2025-01-01T23:59:59Z"

# Download a recording
reolink rec download --channel 0 --file "Mp4Record%202025-01-01_..."
```

### PTZ Control

```bash
# List presets
reolink ptz list-presets --channel 0

# Go to preset
reolink ptz goto 3 --channel 0

# Start patrol
reolink ptz start-patrol 1 --channel 0

# Stop patrol
reolink ptz stop-patrol --channel 0
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

