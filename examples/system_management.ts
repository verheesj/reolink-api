/**
 * Example: System Management
 * 
 * Demonstrates how to use the system management commands like
 * getting/setting device name, time, maintenance settings, etc.
 * 
 * Run with: npx tsx examples/system_management.ts
 */

import "dotenv/config";
import {
  checkFirmware,
  getAutoMaint,
  getDevName,
  getHddInfo,
  getTime,
  getUpgradeStatus
} from "../src/endpoints/system.js";
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
    console.log(`Connecting to ${host}...`);
    await client.login();

    // 1. Device Name
    console.log("\n=== Device Name ===");
    // Get name for channel 0 (default)
    const devNameInfo = await getDevName(client);
    console.log("Current Name (Channel 0):", devNameInfo.DevName.name);

    // Uncomment to change device name:
    // await setDevName(client, "My Reolink Camera");
    // console.log("Device name updated!");

    // Example for multi-channel devices (NVRs):
    // const ch1Info = await getDevName(client, 1);
    // console.log("Channel 1 Name:", ch1Info.DevName.name);
    // await setDevName(client, "Backyard Camera", 1);

    // 2. System Time
    console.log("\n=== System Time ===");
    const timeInfo = await getTime(client);
    console.log("Current Time:", timeInfo.Time);

    // Uncomment to set time (example: set to current time):
    /*
    const now = new Date();
    await setTime(client, {
      year: now.getFullYear(),
      mon: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      min: now.getMinutes(),
      sec: now.getSeconds()
    });
    console.log("Time updated!");
    */

    // 3. Auto Maintenance
    console.log("\n=== Auto Maintenance ===");
    const autoMaint = await getAutoMaint(client);
    console.log("Auto Maintenance Schedule:", autoMaint.AutoMaint);

    // 4. HDD Info
    console.log("\n=== HDD Information ===");
    try {
      const hddInfo = await getHddInfo(client);
      console.log("HDD Info:", JSON.stringify(hddInfo.HddInfo, null, 2));
    } catch (e) {
      console.log("Could not fetch HDD info (device might not have HDD)");
    }

    // 5. Firmware
    console.log("\n=== Firmware Status ===");
    try {
      await checkFirmware(client);
      console.log("Firmware check initiated.");

      const upgradeStatus = await getUpgradeStatus(client);
      console.log("Upgrade Status:", upgradeStatus.UpgradeStatus);
    } catch (e) {
      console.log("Firmware check/status not supported or failed.");
    }

    // 6. Reboot
    // Uncomment to reboot the device:
    /*
    console.log("\n=== Rebooting ===");
    await reboot(client);
    console.log("Reboot command sent. Device is restarting...");
    */

    await client.close();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
