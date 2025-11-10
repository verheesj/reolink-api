/**
 * Example: Streaming URL generation
 * 
 * Run with: npx tsx examples/streaming.ts
 */

import { ReolinkClient } from "../src/reolink.js";
import { rtspUrl, rtmpUrl, flvUrl, nvrPlaybackFlvUrl } from "../src/stream.js";

async function main() {
  const host = process.env.REOLINK_NVR_HOST || "192.168.1.100";
  const username = process.env.REOLINK_NVR_USER || "admin";
  const password = process.env.REOLINK_NVR_PASS || "password";

  const client = new ReolinkClient({
    host,
    username,
    password,
  });

  try {
    await client.login();
    const token = client.getToken();

    console.log("=== RTSP URLs ===");
    console.log("H.264:", rtspUrl({ user: username, pass: password, host, channel: 0, h265: false }));
    console.log("H.265:", rtspUrl({ user: username, pass: password, host, channel: 0, h265: true }));

    console.log("\n=== RTMP URLs ===");
    console.log("Main stream:", rtmpUrl({ token, user: username, host, channel: 0, streamType: "main" }));
    console.log("Sub stream:", rtmpUrl({ token, user: username, host, channel: 0, streamType: "sub" }));

    console.log("\n=== FLV URLs ===");
    console.log("Main stream:", flvUrl({ token, user: username, host, channel: 0, streamType: "main" }));

    console.log("\n=== Playback FLV URL ===");
    const playbackUrl = nvrPlaybackFlvUrl({
      host,
      channel: 0,
      start: new Date().toISOString(),
      type: "main",
      token,
      user: username,
    });
    console.log(playbackUrl);

    await client.close();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();

