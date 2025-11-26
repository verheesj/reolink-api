/**
 * Example: Device status queries
 * 
 * Run with: npx tsx examples/status.ts
 */

import { getAbility, getDevInfo, getEnc } from "../src/endpoints/system.js";
import { ReolinkClient } from "../src/reolink.js";

async function main() {
  const host = process.env.REOLINK_NVR_HOST || "192.168.1.100";
  const username = process.env.REOLINK_NVR_USER || "admin";
  const password = process.env.REOLINK_NVR_PASS || "password";

  const client = new ReolinkClient({
    host,
    username,
    password,
    debug: true,
    insecure: true, // Allow self-signed certificates
  });

  try {
    await client.login();

    console.log("=== Device Information ===");
    const devInfo = await getDevInfo(client);
    console.log(JSON.stringify(devInfo, null, 2));

    console.log("\n=== Device Abilities ===");
    try {
      const ability = await getAbility(client);
      console.log(JSON.stringify(ability, null, 2));
    } catch (error: any) {
      console.log(`Not supported on this device: ${error.detail || error.message}`);
    }

    console.log("\n=== Encoding Configuration (Channel 0) ===");
    try {
      const enc = await getEnc(client, 0);
      console.log(JSON.stringify(enc, null, 2));
    } catch (error: any) {
      console.log(`Not supported on this device: ${error.detail || error.message}`);
    }

    await client.close();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();

