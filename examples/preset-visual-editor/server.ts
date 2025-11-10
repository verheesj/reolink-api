/**
 * Browser-based preset + zone editor example.
 *
 * Run with: npx tsx examples/preset-visual-editor/server.ts
 */

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PresetsModule,
  type PresetZones,
  type GridArea,
} from "../../src/presets.js";
import { ReolinkClient } from "../../src/reolink.js";
import { ReolinkHttpError } from "../../src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC_DIR = join(__dirname, "public");
const ZONE_STORE_PATH = join(__dirname, "zones-store.json");

const DEFAULT_CHANNEL = Number(process.env.REOLINK_CHANNEL ?? "0");
const SERVER_PORT = Number(process.env.PORT ?? "5173");

interface PresetZonesRecord {
  [key: string]: PresetZones;
}

class ZoneStore {
  private cache: PresetZonesRecord = {};
  private loaded = false;

  constructor(private filePath: string) {}

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await readFile(this.filePath, "utf8");
      this.cache = JSON.parse(raw);
    } catch {
      this.cache = {};
    }
    this.loaded = true;
  }

  private makeKey(channel: number, presetId: number): string {
    return `${channel}:${presetId}`;
  }

  async get(channel: number, presetId: number): Promise<PresetZones | undefined> {
    await this.ensureLoaded();
    return this.cache[this.makeKey(channel, presetId)];
  }

  async set(channel: number, presetId: number, zones: PresetZones): Promise<void> {
    await this.ensureLoaded();
    this.cache[this.makeKey(channel, presetId)] = zones;
    await this.persist();
  }

  async list(channel: number): Promise<Record<string, PresetZones>> {
    await this.ensureLoaded();
    const result: Record<string, PresetZones> = {};
    for (const [key, value] of Object.entries(this.cache)) {
      const [chStr, presetStr] = key.split(":");
      if (Number(chStr) === channel) {
        result[presetStr] = value;
      }
    }
    return result;
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.cache, null, 2), "utf8");
  }
}

async function readJsonBody<T>(req: IncomingMessage): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req
      .on("data", (chunk) => {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      })
      .on("end", () => {
        if (chunks.length === 0) {
          resolve(undefined);
          return;
        }
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          resolve(json as T);
        } catch (error) {
          reject(error);
        }
      })
      .on("error", (error) => reject(error));
  });
}

function sendJson(res: ServerResponse, payload: unknown, status = 200): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res: ServerResponse, error: unknown, status = 500): void {
  console.error("[preset-editor]", error);
  sendJson(
    res,
    {
      error: error instanceof Error ? error.message : String(error),
    },
    status
  );
}

function sendNotFound(res: ServerResponse): void {
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
}

function sanitizeStaticPath(pathname: string): string | undefined {
  const relative = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  const resolved = resolve(PUBLIC_DIR, relative);
  if (!resolved.startsWith(PUBLIC_DIR)) {
    return undefined;
  }
  return resolved;
}

function contentType(pathname: string): string {
  const ext = extname(pathname);
  switch (ext) {
    case ".html":
      return "text/html";
    case ".js":
      return "text/javascript";
    case ".css":
      return "text/css";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function ensureGrid(area: GridArea): GridArea {
  if (!area || typeof area.width !== "number" || typeof area.height !== "number") {
    throw new Error("Invalid grid area payload");
  }
  if (area.bits.length !== area.width * area.height) {
    throw new Error("Grid bits length mismatch");
  }
  return area;
}

async function main(): Promise<void> {
  const host = process.env.REOLINK_NVR_HOST || "192.168.1.100";
  const username = process.env.REOLINK_NVR_USER || "admin";
  const password = process.env.REOLINK_NVR_PASS || "password";

  const client = new ReolinkClient({ host, username, password });
  const presets = new PresetsModule(client);
  const zonesStore = new ZoneStore(ZONE_STORE_PATH);

  console.log(`[preset-editor] Connecting to ${host} as ${username}`);
  await client.login();
  console.log("[preset-editor] Logged in.");

  const server = createServer(async (req, res) => {
    if (!req.url) {
      sendNotFound(res);
      return;
    }

    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = requestUrl.pathname;

    if (pathname.startsWith("/api/")) {
      try {
        if (pathname === "/api/presets" && req.method === "GET") {
          const channel = Number(
            requestUrl.searchParams.get("channel") ?? DEFAULT_CHANNEL
          );
          const list = await presets.listPresets(channel);
          const stored = await zonesStore.list(channel);
          sendJson(res, { presets: list, storedZones: stored });
          return;
        }

        if (pathname === "/api/presets" && req.method === "POST") {
          const body = await readJsonBody<{
            channel: number;
            id: number;
            name: string;
            enable?: boolean;
          }>(req);
          if (!body) {
            throw new Error("Missing request body");
          }
          await presets.setPreset(body.channel, body.id, body.name, body.enable);
          sendJson(res, { status: "ok" });
          return;
        }

        if (pathname === "/api/presets/goto" && req.method === "POST") {
          const body = await readJsonBody<{
            channel: number;
            id: number;
            speed?: number;
            settleMs?: number;
          }>(req);
          if (!body) {
            throw new Error("Missing request body");
          }

          await presets.gotoPresetWithZones(
            body.channel,
            body.id,
            async (presetId) => zonesStore.get(body.channel, presetId),
            { speed: body.speed, settleMs: body.settleMs }
          );

          sendJson(res, { status: "ok" });
          return;
        }

        if (pathname === "/api/zones" && req.method === "GET") {
          const channel = Number(
            requestUrl.searchParams.get("channel") ?? DEFAULT_CHANNEL
          );
          const presetId = requestUrl.searchParams.get("presetId");
          const stored =
            presetId !== null
              ? await zonesStore.get(channel, Number(presetId))
              : undefined;

          let deviceMd: GridArea | undefined;
          try {
            deviceMd = await presets.getMdZone(channel);
          } catch (error) {
            console.warn("[preset-editor] Unable to fetch device MD zone", error);
          }

          sendJson(res, { stored, deviceMd });
          return;
        }

        if (pathname === "/api/zones" && req.method === "POST") {
          const body = await readJsonBody<{
            channel: number;
            presetId: number;
            zones: PresetZones;
            apply?: boolean;
          }>(req);
          if (!body) {
            throw new Error("Missing request body");
          }
          if (body.zones.md) {
            ensureGrid(body.zones.md);
          }
          if (body.zones.ai) {
            for (const area of Object.values(body.zones.ai)) {
              if (area) ensureGrid(area);
            }
          }
          await zonesStore.set(body.channel, body.presetId, body.zones);
          if (body.apply) {
            await presets.applyZonesForPreset(body.channel, body.presetId, body.zones);
          }
          sendJson(res, { status: "ok" });
          return;
        }

        if (pathname === "/api/panorama" && req.method === "GET") {
          const channel = Number(
            requestUrl.searchParams.get("channel") ?? DEFAULT_CHANNEL
          );
          const panStep = Number(requestUrl.searchParams.get("panStep") ?? "15");
          const tiltStep = Number(requestUrl.searchParams.get("tiltStep") ?? "15");
          const settleMs = requestUrl.searchParams.get("settleMs");
          const maxTiles = requestUrl.searchParams.get("maxTiles");

          const plan = {
            panStep,
            tiltStep,
            ...(settleMs ? { settleMs: Number(settleMs) } : {}),
            ...(maxTiles ? { maxTiles: Number(maxTiles) } : {}),
          };
          try {
            const result = await presets.buildPanorama(channel, plan);
            let base64: string;
            if (Buffer.isBuffer(result.image)) {
              base64 = `data:image/jpeg;base64,${result.image.toString("base64")}`;
            } else if (typeof (result.image as any).toDataURL === "function") {
              base64 = (result.image as any).toDataURL("image/png");
            } else {
              throw new Error("Unknown panorama image type");
            }

            sendJson(res, { image: base64, tiles: result.tiles });
          } catch (error) {
            if (error instanceof ReolinkHttpError && error.code === -26) {
              sendJson(res, { supported: false }, 200);
              return;
            }
            throw error;
          }
          return;
        }

        sendNotFound(res);
        return;
      } catch (error) {
        sendError(res, error);
        return;
      }
    }

    const targetPath =
      pathname === "/" ? join(PUBLIC_DIR, "index.html") : sanitizeStaticPath(pathname);

    if (!targetPath || !existsSync(targetPath)) {
      sendNotFound(res);
      return;
    }

    res.writeHead(200, { "Content-Type": contentType(targetPath) });
    createReadStream(targetPath).pipe(res);
  });

  server.listen(SERVER_PORT, () => {
    console.log(`Preset editor available at http://localhost:${SERVER_PORT}`);
  });

  const shutdown = async () => {
    console.log("[preset-editor] Shutting down...");
    server.close();
    await client.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("[preset-editor] Failed to start", error);
  process.exit(1);
});
