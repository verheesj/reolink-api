/**
 * Snapshot and thumbnail capture utilities
 */

import { promises as fs } from "fs";
import { ReolinkClient } from "./reolink.js";
import { createFetchOptions } from "./utils/https-agent.js";

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

  // Get client properties using public getters
  const host = client.getHost();
  const username = client.getUsername();
  const password = client.getPassword();
  const mode = client.getMode();
  const insecure = client.isInsecure();
  const token = mode === "long" ? client.getToken() : "null";
  const fetchImpl = client.getFetchImpl();

  // Build URL for Snap command
  // Snap is a GET request, not POST, and returns binary JPEG data
  const baseUrl = `https://${host}/cgi-bin/api.cgi`;
  let queryParams: string;

  if (mode === "short") {
    // Short connection mode: include user and password
    const user = encodeURIComponent(username);
    const pass = encodeURIComponent(password);
    queryParams = `cmd=Snap&channel=${channel}&user=${user}&password=${pass}`;
  } else {
    // Long connection mode: use token
    queryParams = `cmd=Snap&channel=${channel}&token=${token}`;
  }

  const target = `${baseUrl}?${queryParams}`;

  if (debug) {
    console.error(`[reolink:snapshot] Fetching snapshot from: ${target}`);
  }

  const fetchOptions = createFetchOptions(insecure, fetchImpl, {
    method: "GET",
  });

  const response = await fetchImpl(target, fetchOptions);

  if (!response.ok) {
    throw new Error(
      `Failed to capture snapshot: HTTP ${response.status} ${response.statusText}`
    );
  }

  // Get binary data as ArrayBuffer
  const arrayBuffer = await response.arrayBuffer();
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

