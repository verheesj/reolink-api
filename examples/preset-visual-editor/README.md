# Browser-based preset visual editor

This example spins up a small Node.js server that proxies PTZ preset commands to your Reolink device and serves a browser UI for painting motion zones per preset.

## Prerequisites

- Node.js 18+
- Network access to your Reolink camera/NVR
- Device credentials with PTZ and motion-zone permissions

## Running the example

```bash
export REOLINK_NVR_HOST=192.168.1.100
export REOLINK_NVR_USER=admin
export REOLINK_NVR_PASS=your-password
npx tsx examples/preset-visual-editor/server.ts
```

Open <http://localhost:5173> in a browser. From there you can:

- List PTZ presets for a channel and create or rename entries
- Paint motion grids using the canvas editor (click-and-drag to toggle cells)
- Save per-preset zones to the local store and push them back to the device
- Trigger a panorama sweep (when supported) to display a stitched reference frame next to the editor

Zones are persisted in `zones-store.json` alongside the script so you can restart the server without losing your layouts.
