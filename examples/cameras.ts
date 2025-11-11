/**
 * Example: List all cameras with their capabilities
 * 
 * This example demonstrates:
 * - Detecting the number of channels/cameras
 * - Checking capabilities for each camera (PTZ, AI, Motion, Recording)
 * - Showing encoding configuration for each camera
 * 
 * Run with: npx tsx examples/cameras.ts
 */

import { ReolinkClient } from "../src/reolink.js";
import { getDevInfo, getEnc, getAbility } from "../src/endpoints/system.js";
import { detectCapabilities } from "../src/capabilities.js";
import { getPtzPreset } from "../src/ptz.js";
import { getAiCfg } from "../src/ai.js";

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
    console.log("✓ Connected to Reolink device\n");

    // Get device information
    const devInfo = await getDevInfo(client);
    const channelNum = (devInfo as any)?.DevInfo?.channelNum || 1;

    console.log("=== Device Information ===");
    console.log(`Device Name: ${(devInfo as any)?.DevInfo?.name || "Unknown"}`);
    console.log(`Model: ${(devInfo as any)?.DevInfo?.model || "Unknown"}`);
    console.log(`Firmware: ${(devInfo as any)?.DevInfo?.firmVer || "Unknown"}`);
    console.log(`Hardware: ${(devInfo as any)?.DevInfo?.hardVer || "Unknown"}`);
    console.log(`Number of Channels: ${channelNum}`);

    // Get device-level capabilities
    console.log("\n=== Device Capabilities ===");
    const caps = await detectCapabilities(client);
    console.log(`PTZ Support: ${caps.ptz ? "✓ Yes" : "✗ No"}`);
    console.log(`AI Support: ${caps.ai ? "✓ Yes" : "✗ No"}`);
    console.log(`Motion Detection: ${caps.motionDetection ? "✓ Yes" : "✗ No"}`);
    console.log(`Recording: ${caps.recording ? "✓ Yes" : "✗ No"}`);

    // Get abilities for more detailed info
    try {
      const ability = await getAbility(client);
      console.log("\n=== Raw Device Abilities ===");
      console.log(JSON.stringify(ability, null, 2));
    } catch (error) {
      console.log("\n(GetAbility not supported on this device)");
    }

    // List each camera/channel with its capabilities
    console.log("\n" + "=".repeat(60));
    for (let channel = 0; channel < channelNum; channel++) {
      console.log(`\n=== Channel ${channel} ===`);

      // Check if channel is online
      let isOnline = true;

      // Get encoding configuration
      try {
        const enc = await getEnc(client, channel);
        const encData = (enc as any)?.Enc || {};
        const mainStream = encData?.mainStream || {};
        const subStream = encData?.subStream || {};

        console.log(`Status: ✓ Online`);
        console.log(`\nEncoding Configuration:`);
        console.log(`  Main Stream:`);
        console.log(`    Resolution: ${mainStream.width || "?"}x${mainStream.height || "?"}`);
        console.log(`    Codec: ${mainStream.vType || "?"}`);
        console.log(`    FPS: ${mainStream.frameRate || "?"}`);
        console.log(`    Bitrate: ${mainStream.bitRate || "?"} kbps`);
        
        console.log(`  Sub Stream:`);
        console.log(`    Resolution: ${subStream.width || "?"}x${subStream.height || "?"}`);
        console.log(`    Codec: ${subStream.vType || "?"}`);
        console.log(`    FPS: ${subStream.frameRate || "?"}`);
        console.log(`    Bitrate: ${subStream.bitRate || "?"} kbps`);
      } catch (error: any) {
        isOnline = false;
        console.log(`Status: ✗ Offline (${error.detail || error.message})`);
      }

      // Only check capabilities for online channels
      if (!isOnline) {
        console.log("\n" + "-".repeat(60));
        continue;
      }

      // Check for PTZ presets (per-channel capability check)
      let hasPtz = false;
      try {
        const presets = await getPtzPreset(client, channel);
        if (presets.preset && presets.preset.length > 0) {
          hasPtz = true;
          const enabledPresets = presets.preset.filter((p) => p.enable === 1 && p.name);
          if (enabledPresets.length > 0) {
            console.log(`\nPTZ: ✓ Supported`);
            console.log(`Configured Presets (${enabledPresets.length}):`);
            enabledPresets.forEach((p) => {
              console.log(`  - Preset ${p.id}: ${p.name}`);
            });
          } else {
            console.log(`\nPTZ: ✓ Supported (no presets configured)`);
          }
        }
      } catch (error: any) {
        // PTZ not supported or error
        if (error.rspCode !== -9) {
          // -9 means "not supported", other errors might be transient
          console.log(`\nPTZ: ✗ Not available (${error.detail || error.message})`);
        }
      }

      // Check for AI configuration (per-channel capability check)
      let hasAi = false;
      try {
        const aiCfg = await getAiCfg(client, channel);
        hasAi = true;
        console.log(`\nAI Detection: ✓ Supported`);
        
        // Check for various AI types
        const aiData = (aiCfg as any);
        const hasPersonDetection = aiData?.AiCfg?.person || aiData?.person;
        const hasVehicleDetection = aiData?.AiCfg?.vehicle || aiData?.vehicle;
        const hasPetDetection = aiData?.AiCfg?.pet || aiData?.pet;
        const hasFaceDetection = aiData?.AiCfg?.face || aiData?.face;
        
        console.log(`  Person Detection: ${hasPersonDetection ? "✓" : "✗"}`);
        console.log(`  Vehicle Detection: ${hasVehicleDetection ? "✓" : "✗"}`);
        console.log(`  Pet Detection: ${hasPetDetection ? "✓" : "✗"}`);
        console.log(`  Face Detection: ${hasFaceDetection ? "✓" : "✗"}`);
      } catch (error: any) {
        // AI not supported or error
        if (error.rspCode !== -9) {
          console.log(`\nAI Detection: ✗ Not available (${error.detail || error.message})`);
        }
      }

      // Summary of capabilities for this channel
      console.log(`\nCapabilities Summary:`);
      console.log(`  PTZ: ${hasPtz ? "✓" : "✗"}`);
      console.log(`  AI Detection: ${hasAi ? "✓" : "✗"}`);

      console.log("\n" + "-".repeat(60));
    }

    await client.close();
    console.log("\n✓ Done");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
