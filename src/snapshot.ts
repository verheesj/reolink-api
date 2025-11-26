/**
 * Snapshot and thumbnail capture utilities
 */

import { promises as fs } from "fs";
import { ReolinkClient } from "./reolink.js";

export interface SnapshotOptions {
  channel?: number;
  quality?: number;
  resolution?: string;
}

/**
 * Capture a snapshot from a camera channel and return as Buffer
 */
export async function snapToBuffer(
  client: ReolinkClient,
  channel: number = 0
): Promise<Buffer> {
  const debug = process.env.DEBUG?.includes("reolink:snapshot") ?? false;

  if (debug) {
    console.error(`[reolink:snapshot] Capturing snapshot for channel ${channel}`);
  }

  // Use the client's apiBinary method which handles authentication and token refresh
  const arrayBuffer = await client.apiBinary("Snap", { channel });
  const buffer = Buffer.from(arrayBuffer);

  // Verify it's a JPEG (starts with FFD8)
  if (buffer.length < 2 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error("Invalid JPEG data received (missing JPEG header)");
  }

  if (debug) {
    console.error(`[reolink:snapshot] Captured snapshot: ${buffer.length} bytes`);
  }

  return buffer;
}

/**
 * Capture a snapshot and save it to a file
 */
export async function snapToFile(
  client: ReolinkClient,
  path: string,
  channel: number = 0
): Promise<void> {
  const debug = process.env.DEBUG?.includes("reolink:snapshot") ?? false;

  if (debug) {
    console.error(`[reolink:snapshot] Capturing snapshot to file: ${path}`);
  }

  const buffer = await snapToBuffer(client, channel);
  await fs.writeFile(path, buffer);

  if (debug) {
    console.error(`[reolink:snapshot] Snapshot saved: ${path}`);
  }
}

