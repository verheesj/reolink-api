#!/usr/bin/env node

/**
 * Reolink API CLI Tool
 * 
 * Command-line interface for the Reolink API client
 */

import { ReolinkClient, ReolinkMode } from "./reolink.js";
import { getAbility, getDevInfo, getEnc } from "./endpoints/system.js";
import {
  rtspUrl,
  rtmpUrl,
  flvUrl,
  nvrPlaybackFlvUrl,
} from "./stream.js";
import { search as searchRecord, download as downloadRecord } from "./record.js";
import { getPtzPreset, ptzCtrl } from "./ptz.js";
import { getAiCfg, getAiState } from "./ai.js";
import { getAlarm, getMdState } from "./alarm.js";
import { detectCapabilities } from "./capabilities.js";
import { snapToBuffer, snapToFile } from "./snapshot.js";

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config: {
    host?: string;
    user?: string;
    pass?: string;
    mode?: ReolinkMode;
    insecure?: boolean;
    debug?: boolean;
    timeout?: number;
    json?: boolean;
    pretty?: boolean;
    help?: boolean;
    command?: string[];
  } = {};

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--host" && i + 1 < args.length) {
      config.host = args[++i];
    } else if (arg === "--user" && i + 1 < args.length) {
      config.user = args[++i];
    } else if (arg === "--pass" && i + 1 < args.length) {
      config.pass = args[++i];
    } else if (arg === "--mode" && i + 1 < args.length) {
      const modeValue = args[++i];
      if (modeValue === "long" || modeValue === "short") {
        config.mode = modeValue;
      }
    } else if (arg === "--insecure") {
      config.insecure = true;
    } else if (arg === "--debug") {
      config.debug = true;
    } else if (arg === "--timeout" && i + 1 < args.length) {
      config.timeout = parseInt(args[++i], 10);
    } else if (arg === "--json") {
      config.json = true;
    } else if (arg === "--pretty") {
      config.pretty = true;
    } else if (arg === "--help" || arg === "help") {
      config.help = true;
    } else if (!arg.startsWith("--")) {
      // Start of command arguments
      config.command = args.slice(i);
      break;
    }
    i++;
  }

  return config;
}

const parsed = parseArgs();

// Read configuration from environment variables or command-line flags
const HOST = parsed.host || process.env.REOLINK_NVR_HOST;
const USER = parsed.user || process.env.REOLINK_NVR_USER;
const PASS = parsed.pass || process.env.REOLINK_NVR_PASS;
const DEBUG = parsed.debug || process.env.DEBUG === "true";
const SHORT_MODE =
  parsed.mode === "short" ||
  process.env.REOLINK_SHORT === "1" ||
  parsed.mode === undefined; // Default to long if not specified
const MODE: ReolinkMode = parsed.mode || (SHORT_MODE ? "short" : "long");
const INSECURE = parsed.insecure ?? true; // Default to insecure
// Timeout support reserved for future implementation
const JSON_OUTPUT = parsed.json !== false; // Default to JSON
const PRETTY = parsed.pretty || JSON_OUTPUT;

// Show help if requested
if (parsed.help || (parsed.command && parsed.command[0] === "help")) {
  console.log(`
Reolink API CLI

Usage: reolink [options] <command> [args...]

Options:
  --host <host>          Device hostname or IP (or REOLINK_NVR_HOST)
  --user <user>          Username (or REOLINK_NVR_USER)
  --pass <pass>          Password (or REOLINK_NVR_PASS)
  --mode <long|short>    Connection mode (default: long)
  --insecure             Allow insecure SSL (default: true)
  --debug                Enable debug logging
  --timeout <ms>         Request timeout in milliseconds
  --json                 Output JSON (default)
  --pretty               Pretty-print JSON (default)
  --help                 Show this help

Commands:
  status <ability|devinfo|enc> [--channel N]
  stream url <rtsp|rtmp|flv> [--channel N] [--codec h264|h265] [--streamType main|sub]
  stream playback [--channel N] [--start ISO_TIMESTAMP] [--streamType main|sub]
  rec search [--channel N] [--start ISO_TIMESTAMP] [--end ISO_TIMESTAMP] [--streamType main|sub]
  rec download [--channel N] [--file FILENAME] [--streamType main|sub]
  ptz list-presets [--channel N]
  ptz goto <id> [--channel N]
  ptz start-patrol <id> [--channel N]
  ptz stop-patrol [--channel N]
  ai cfg [--channel N]
  ai state [--channel N]
  alarm md-state [--channel N]
  alarm alarm
  capabilities              Show device capabilities
  events listen [--interval MS]  Listen for motion/AI events (JSON output)
  snap [--channel N] [--file out.jpg]  Capture snapshot (JPEG)
  <command> [json_payload]  Generic API command

Examples:
  reolink status devinfo
  reolink stream url rtsp --channel 0 --codec h265
  reolink rec search --channel 0 --start "2025-01-01T00:00:00Z" --end "2025-01-01T23:59:59Z"
  reolink ptz list-presets --channel 0
`);
  process.exit(0);
}

if (!HOST || !USER || !PASS) {
  console.error("Error: Missing required configuration");
  console.error("Please set: REOLINK_NVR_HOST, REOLINK_NVR_USER, REOLINK_NVR_PASS");
  console.error("Or use: --host, --user, --pass flags");
  process.exit(1);
}

// Create client instance
const client = new ReolinkClient({
  host: HOST,
  username: USER,
  password: PASS,
  mode: MODE,
  insecure: INSECURE,
  debug: DEBUG,
});

// Login and get token (only in long mode)
let loggedIn = false;

async function main() {
  try {
    // Only login in long mode
    if (MODE === "long") {
      const token = await client.login();
      if (!token) {
        console.error("Error: Failed to login");
        process.exit(1);
      }
      loggedIn = true;
    }

    // Process command-line arguments (skip flags)
    const args = parsed.command || [];
    
    if (args.length === 0) {
      // No commands provided, just exit after login
      return;
    }

    // Process commands sequentially
    let i = 0;
    while (i < args.length) {
      const cmd = args[i];
      i++;

      try {
        let result: unknown;

        // Handle status subcommands
        if (cmd === "status") {
          if (i >= args.length) {
            console.error("Error: status command requires a subcommand (ability|devinfo|enc)");
            process.exit(1);
          }
          const subcmd = args[i];
          i++;

          // Parse options for status commands
          let channel = 0;
          while (i < args.length && args[i].startsWith("--")) {
            if (args[i] === "--channel" && i + 1 < args.length) {
              channel = parseInt(args[i + 1], 10);
              i += 2;
            } else {
              i++;
            }
          }

          if (subcmd === "ability") {
            result = await getAbility(client);
          } else if (subcmd === "devinfo") {
            result = await getDevInfo(client);
          } else if (subcmd === "enc") {
            result = await getEnc(client, channel);
          } else {
            console.error(`Error: Unknown status subcommand: ${subcmd}`);
            process.exit(1);
          }
        } else if (cmd === "stream") {
          if (i >= args.length) {
            console.error("Error: stream command requires a subcommand (url|playback)");
            process.exit(1);
          }
          const subcmd = args[i];
          i++;

          // Parse common options
          let channel = 0;
          let streamType: "main" | "sub" = "main";
          let codec: "h264" | "h265" = "h264";
          let start = "";

          while (i < args.length && args[i].startsWith("--")) {
            if (args[i] === "--channel" && i + 1 < args.length) {
              channel = parseInt(args[i + 1], 10);
              i += 2;
            } else if (args[i] === "--streamType" && i + 1 < args.length) {
              streamType = args[i + 1] as "main" | "sub";
              i += 2;
            } else if (args[i] === "--codec" && i + 1 < args.length) {
              codec = args[i + 1] as "h264" | "h265";
              i += 2;
            } else if (args[i] === "--start" && i + 1 < args.length) {
              start = args[i + 1];
              i += 2;
            } else {
              i++;
            }
          }

          if (subcmd === "url") {
            if (i >= args.length) {
              console.error("Error: stream url requires a type (rtsp|rtmp|flv)");
              process.exit(1);
            }
            const urlType = args[i];
            i++;

            if (urlType === "rtsp") {
              result = {
                url: rtspUrl({
                  user: USER!,
                  pass: PASS!,
                  host: HOST!,
                  channel,
                  h265: codec === "h265",
                }),
              };
            } else if (urlType === "rtmp") {
              const token = MODE === "long" ? client.getToken() : undefined;
              result = {
                url: rtmpUrl({
                  token: token !== "null" ? token : undefined,
                  user: USER!,
                  pass: PASS!,
                  host: HOST!,
                  channel,
                  streamType,
                }),
              };
            } else if (urlType === "flv") {
              const token = MODE === "long" ? client.getToken() : undefined;
              result = {
                url: flvUrl({
                  token: token !== "null" ? token : undefined,
                  user: USER!,
                  pass: PASS!,
                  host: HOST!,
                  channel,
                  streamType,
                }),
              };
            } else {
              console.error(`Error: Unknown stream URL type: ${urlType}`);
              process.exit(1);
            }
          } else if (subcmd === "playback") {
            if (!start) {
              console.error("Error: stream playback requires --start timestamp");
              process.exit(1);
            }
            const token = MODE === "long" ? client.getToken() : undefined;
            result = {
              url: nvrPlaybackFlvUrl({
                host: HOST!,
                channel,
                start,
                type: streamType,
                token: token !== "null" ? token : undefined,
                user: USER!,
                pass: PASS!,
              }),
            };
          } else {
            console.error(`Error: Unknown stream subcommand: ${subcmd}`);
            process.exit(1);
          }
        } else if (cmd === "rec") {
          if (i >= args.length) {
            console.error("Error: rec command requires a subcommand (search|download)");
            process.exit(1);
          }
          const subcmd = args[i];
          i++;

          // Parse common options
          let channel = 0;
          let start = "";
          let end = "";
          let fileName = "";
          let streamType: "main" | "sub" = "main";

          while (i < args.length && args[i].startsWith("--")) {
            if (args[i] === "--channel" && i + 1 < args.length) {
              channel = parseInt(args[i + 1], 10);
              i += 2;
            } else if (args[i] === "--start" && i + 1 < args.length) {
              start = args[i + 1];
              i += 2;
            } else if (args[i] === "--end" && i + 1 < args.length) {
              end = args[i + 1];
              i += 2;
            } else if (args[i] === "--file" && i + 1 < args.length) {
              fileName = args[i + 1];
              i += 2;
            } else if (args[i] === "--streamType" && i + 1 < args.length) {
              streamType = args[i + 1] as "main" | "sub";
              i += 2;
            } else {
              i++;
            }
          }

          if (subcmd === "search") {
            if (!start || !end) {
              console.error("Error: rec search requires --start and --end timestamps");
              process.exit(1);
            }
            result = await searchRecord(client, {
              channel,
              start,
              end,
              streamType,
            });
          } else if (subcmd === "download") {
            if (!fileName) {
              console.error("Error: rec download requires --file <filename>");
              process.exit(1);
            }
            result = await downloadRecord(client, {
              channel,
              fileName,
              streamType,
            });
          } else {
            console.error(`Error: Unknown rec subcommand: ${subcmd}`);
            process.exit(1);
          }
        } else if (cmd === "ptz") {
          if (i >= args.length) {
            console.error(
              "Error: ptz command requires a subcommand (list-presets|goto|start-patrol|stop-patrol)"
            );
            process.exit(1);
          }
          const subcmd = args[i];
          i++;

          // Parse common options
          let channel = 0;
          let presetId = 0;
          let patrolId = 0;

          while (i < args.length && args[i].startsWith("--")) {
            if (args[i] === "--channel" && i + 1 < args.length) {
              channel = parseInt(args[i + 1], 10);
              i += 2;
            } else {
              i++;
            }
          }

          // Parse positional arguments
          if (subcmd === "goto" && i < args.length) {
            presetId = parseInt(args[i], 10);
            i++;
          } else if (subcmd === "start-patrol" && i < args.length) {
            patrolId = parseInt(args[i], 10);
            i++;
          }

          if (subcmd === "list-presets") {
            result = await getPtzPreset(client, channel);
          } else if (subcmd === "goto") {
            if (presetId === 0) {
              console.error("Error: ptz goto requires a preset ID");
              process.exit(1);
            }
            result = await ptzCtrl(client, {
              channel,
              op: "GotoPreset",
              presetId,
            });
          } else if (subcmd === "start-patrol") {
            if (patrolId === 0) {
              console.error("Error: ptz start-patrol requires a patrol ID");
              process.exit(1);
            }
            result = await ptzCtrl(client, {
              channel,
              op: "Start",
              presetId: patrolId,
            });
          } else if (subcmd === "stop-patrol") {
            result = await ptzCtrl(client, {
              channel,
              op: "Stop",
            });
          } else {
            console.error(`Error: Unknown ptz subcommand: ${subcmd}`);
            process.exit(1);
          }
        } else if (cmd === "ai") {
          if (i >= args.length) {
            console.error("Error: ai command requires a subcommand (cfg|state)");
            process.exit(1);
          }
          const subcmd = args[i];
          i++;

          // Parse options
          let channel = 0;
          while (i < args.length && args[i].startsWith("--")) {
            if (args[i] === "--channel" && i + 1 < args.length) {
              channel = parseInt(args[i + 1], 10);
              i += 2;
            } else {
              i++;
            }
          }

          if (subcmd === "cfg") {
            result = await getAiCfg(client, channel);
          } else if (subcmd === "state") {
            result = await getAiState(client, channel);
          } else {
            console.error(`Error: Unknown ai subcommand: ${subcmd}`);
            process.exit(1);
          }
        } else if (cmd === "alarm") {
          if (i >= args.length) {
            console.error("Error: alarm command requires a subcommand (md-state|alarm)");
            process.exit(1);
          }
          const subcmd = args[i];
          i++;

          // Parse options
          let channel = 0;
          while (i < args.length && args[i].startsWith("--")) {
            if (args[i] === "--channel" && i + 1 < args.length) {
              channel = parseInt(args[i + 1], 10);
              i += 2;
            } else {
              i++;
            }
          }

          if (subcmd === "md-state") {
            result = await getMdState(client, channel);
          } else if (subcmd === "alarm") {
            result = await getAlarm(client);
          } else {
            console.error(`Error: Unknown alarm subcommand: ${subcmd}`);
            process.exit(1);
          }
        } else if (cmd === "capabilities" || cmd === "caps") {
          result = await detectCapabilities(client);
        } else if (cmd === "snap" || cmd === "snapshot") {
          // Parse channel and file options
          let channel = 0;
          let outputFile: string | undefined;
          let quiet = false;

          while (i < args.length && args[i].startsWith("--")) {
            if (args[i] === "--channel" && i + 1 < args.length) {
              channel = parseInt(args[i + 1], 10);
              i += 2;
            } else if (args[i] === "--file" && i + 1 < args.length) {
              outputFile = args[i + 1];
              i += 2;
            } else if (args[i] === "--quiet") {
              quiet = true;
              i++;
            } else {
              i++;
            }
          }

          if (outputFile) {
            // Save to file
            if (!quiet) {
              console.error(`Capturing snapshot from channel ${channel} to ${outputFile}...`);
            }
            await snapToFile(client, outputFile, channel);
            if (!quiet) {
              console.error(`Snapshot saved to ${outputFile}`);
            }
            // Don't output anything to stdout when writing to file
            return; // Exit early
          } else {
            // Write binary to stdout
            const buffer = await snapToBuffer(client, channel);
            // Write binary data to stdout (for piping)
            process.stdout.write(buffer);
            return; // Exit early, don't output JSON
          }
        } else if (cmd === "events") {
          if (i >= args.length) {
            console.error("Error: events command requires a subcommand (listen)");
            process.exit(1);
          }
          const subcmd = args[i];
          i++;

          if (subcmd === "listen") {
            // Parse interval option
            let interval = 1000;
            while (i < args.length && args[i].startsWith("--")) {
              if (args[i] === "--interval" && i + 1 < args.length) {
                interval = parseInt(args[i + 1], 10);
                i += 2;
              } else {
                i++;
              }
            }

            // Create event emitter and start listening
            const emitter = client.createEventEmitter({ interval });

            // Handle events
            emitter.on("motion", (event) => {
              console.log(JSON.stringify(event));
            });

            emitter.on("ai", (event) => {
              console.log(JSON.stringify(event));
            });

            emitter.on("error", (error) => {
              console.error(JSON.stringify({ error: error.message }));
            });

            // Start polling
            emitter.start();

            // Handle graceful shutdown
            const shutdown = async () => {
              emitter.stop();
              await client.close();
              process.exit(0);
            };

            process.on("SIGINT", shutdown);
            process.on("SIGTERM", shutdown);

            // Keep process alive - don't call cleanup here, shutdown handler will do it
            // Return early to prevent normal cleanup flow
            return;
          } else {
            console.error(`Error: Unknown events subcommand: ${subcmd}`);
            process.exit(1);
          }
        } else {
          // Generic API command
          // Check if next argument looks like a JSON payload
          let payload: Record<string, unknown> = {};
          if (i < args.length && args[i].includes("{") && args[i].includes("}")) {
            try {
              payload = JSON.parse(args[i]);
              i++;
            } catch (e) {
              // If parsing fails, treat it as empty payload
              payload = {};
            }
          }
          result = await client.api(cmd, payload);
        }

        if (PRETTY) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(JSON.stringify(result));
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error(error.message);
        } else {
          console.error(`Error: ${String(error)}`);
        }
        process.exit(1);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(`Error: ${String(error)}`);
    }
    process.exit(1);
  }
}

// Setup exit handler to logout on script exit (only in long mode)
async function cleanup() {
  if (loggedIn && MODE === "long") {
    try {
      await client.close();
    } catch (error) {
      // Ignore logout errors on exit
    }
  }
}

// Handle cleanup on signals
async function handleExit(_signal?: string) {
  await cleanup();
  process.exit(0);
}

process.on("SIGINT", () => handleExit("SIGINT"));
process.on("SIGTERM", () => handleExit("SIGTERM"));

// Run main function
main()
  .then(async () => {
    await cleanup();
  })
  .catch(async (error) => {
    console.error(`Fatal error: ${error}`);
    await cleanup();
    process.exit(1);
  });

