/**
 * System status endpoints
 */

import { ReolinkClient } from "../reolink.js";

/**
 * Response structure from GetAbility command
 * 
 * Contains device capability information including supported features
 * like PTZ, AI detection, motion detection, and recording.
 */
export interface AbilityResponse {
  [key: string]: unknown;
}

/**
 * Response structure from GetDevInfo command
 * 
 * Contains device identification and version information.
 * 
 * @property deviceName - User-assigned device name
 * @property model - Device model number
 * @property hardwareVersion - Hardware version string
 * @property firmwareVersion - Firmware version string
 */
export interface DevInfoResponse {
  deviceName?: string;
  model?: string;
  hardwareVersion?: string;
  firmwareVersion?: string;
  [key: string]: unknown;
}

/**
 * Response structure from GetEnc command
 * 
 * Contains encoding configuration for video streams including
 * codec, bitrate, resolution, and frame rate settings.
 */
export interface EncResponse {
  [key: string]: unknown;
}

/**
 * Response structure from GetChnTypeInfo command
 *
 * Contains encoding configuration for video streams including
 * codec, bitrate, resolution, and frame rate settings.
 */
export interface ChnTypeInfoResponse {
  boardInfo?: string;
  firmVer?: string;
  pakSuffix?: string;
  typeInfo?: string;
}

/**
 * Contains status of a channel
 */
export interface ChannelStatusInfo {
  channel: number;
  name: string;
  online: number;
  sleep: number;
  uid: string;
}

/**
 * Response structure from GetChannelStatus command
 *
 * Contains count and array of status of each camera channel
 */
export interface ChannelStatus {
  count: number;
  status: ChannelStatusInfo[];
}

export interface DevNameResponse {
  DevName: {
    name: string;
  };
}

export interface TimeInfo {
  year: number;
  mon: number;
  day: number;
  hour: number;
  min: number;
  sec: number;
  timeFmt: string;
  dateFmt: string;
}

export interface TimeResponse {
  Time: TimeInfo;
}

export interface AutoMaintInfo {
  day: number;
  hour: number;
  min: number;
}

export interface AutoMaintResponse {
  AutoMaint: AutoMaintInfo;
}

export interface HddInfo {
  capacity: number;
  hddName: string;
  hddNo: number;
  status: number;
  type: string;
}

export interface HddInfoResponse {
  HddInfo: HddInfo[];
}

export interface UpgradeStatusResponse {
  UpgradeStatus: {
    status: number;
    progress: number;
    message: string;
  };
}

export interface AutoUpgradeResponse {
  AutoUpgrade: {
    enable: number;
  };
}

/**
 * Get device capability information
 * 
 * Queries the device's GetAbility endpoint to discover which features
 * are supported (PTZ, AI detection, motion detection, recording, etc.).
 * 
 * @param client - An authenticated ReolinkClient instance
 * @param userName - Optional username for user-specific abilities
 * @returns Promise resolving to device capabilities
 * 
 * @example
 * ```typescript
 * const ability = await getAbility(client);
 * if (ability.Ptz) {
 *   console.log("PTZ control is supported");
 * }
 * ```
 */
export async function getAbility(
  client: ReolinkClient,
  userName?: string
): Promise<AbilityResponse> {
  const params: Record<string, unknown> = {};
  if (userName) {
    params.userName = userName;
  }
  return client.api<AbilityResponse>("GetAbility", params, 0, userName ? "POST" : "GET");
}

/**
 * Get device information (model, firmware, etc.)
 * 
 * Retrieves basic device identification including model number,
 * hardware version, firmware version, and device name.
 * 
 * @param client - An authenticated ReolinkClient instance
 * @returns Promise resolving to device information
 * 
 * @example
 * ```typescript
 * const info = await getDevInfo(client);
 * console.log(`Model: ${info.model}, Firmware: ${info.firmwareVersion}`);
 * ```
 */
export async function getDevInfo(client: ReolinkClient): Promise<DevInfoResponse> {
  return client.api<DevInfoResponse>("GetDevInfo", {});
}

/**
 * Set device name
 * 
 * Sets the user-assigned device name.
 * 
 * @param client - An authenticated ReolinkClient instance
 * @param name - The new device name
 * @param channel - Channel number (default: 0)
 * @returns Promise resolving to the response
 * 
 * @example
 * ```typescript
 * await setDevName(client, "My Camera");
 * ```
 */
export async function setDevName(client: ReolinkClient, name: string, channel: number = 0): Promise<void> {
  await client.api("SetDevName", {
    channel,
    DevName: {
      name: name
    }
  });
}

/**
 * Get encoding configuration
 * 
 * Retrieves video encoding settings including codec type (H.264/H.265),
 * bitrate, resolution, frame rate, and other stream parameters.
 * 
 * @param client - An authenticated ReolinkClient instance
 * @param channel - Camera channel number (0-based, default: 0)
 * @param action - Action type: 1 = return initial+range+value, 0 = value only (default: 1)
 * @returns Promise resolving to encoding configuration
 * 
 * @example
 * ```typescript
 * const enc = await getEnc(client, 0);
 * console.log("Encoding configuration:", enc);
 * ```
 */
export async function getEnc(
  client: ReolinkClient,
  channel = 0,
  action = 1
): Promise<EncResponse> {
  return client.api<EncResponse>("GetEnc", {
    channel,
    action,
  });
}

/**
 * Get channel information (model, firmware, etc.)
 *
 * Retrieves basic device identification including model number,
 * hardware version, firmware version, and device name.
 *
 * @param client - An authenticated ReolinkClient instance
 * @param channel - Camera channel number (0-based, default: 0)
 * @returns Promise resolving to device information
 *
 * @example
 * ```typescript
 * const info = await getChannelInfo(client, channel);
 * console.log(`Model: ${info.typeInfo}, Firmware: ${info.firmVer}`);
 * ```
 */
export async function getChannelInfo(client: ReolinkClient, channel = 0): Promise<ChnTypeInfoResponse> {
  return client.api<ChnTypeInfoResponse>("GetChnTypeInfo", {
    channel,
  });
}

/**
 * Get channel status
 *
 * Retrieves basic status information of an NVR's camera channels
 *
 * @param client - An authenticated ReolinkClient instance
 * @returns Promise resolving to device information
 *
 * @example
 * ```typescript
 * const response = await getChannelStatus(client);
 * console.log(`Channels: ${response.count}, ${JSON.stringify(response.channels)}`);
 * ```
 */
export async function getChannelStatus(client: ReolinkClient): Promise<ChannelStatus> {
  return client.api<ChannelStatus>("GetChannelstatus", {});
}

/**
 * Get device name
 * 
 * Retrieves the user-assigned device name.
 * 
 * @param client - An authenticated ReolinkClient instance
 * @param channel - Channel number (default: 0)
 * @returns Promise resolving to device name
 */
export async function getDevName(client: ReolinkClient, channel: number = 0): Promise<DevNameResponse> {
  return client.api<DevNameResponse>("GetDevName", { channel });
}

/**
 * Get system time
 * 
 * Retrieves the current system time and date format settings.
 * 
 * @param client - An authenticated ReolinkClient instance
 * @returns Promise resolving to system time information
 */
export async function getTime(client: ReolinkClient): Promise<TimeResponse> {
  return client.api<TimeResponse>("GetTime", {});
}

/**
 * Set system time
 * 
 * Sets the system time.
 * 
 * @param client - An authenticated ReolinkClient instance
 * @param timeInfo - Time information to set
 * @returns Promise resolving to the response
 */
export async function setTime(client: ReolinkClient, timeInfo: Partial<TimeInfo>): Promise<void> {
  await client.api("SetTime", { Time: timeInfo });
}

/**
 * Get auto maintenance settings
 * 
 * Retrieves the automatic maintenance (reboot) schedule.
 * 
 * @param client - An authenticated ReolinkClient instance
 * @returns Promise resolving to auto maintenance settings
 */
export async function getAutoMaint(client: ReolinkClient): Promise<AutoMaintResponse> {
  return client.api<AutoMaintResponse>("GetAutoMaint", {});
}

/**
 * Set auto maintenance settings
 * 
 * Sets the automatic maintenance (reboot) schedule.
 * 
 * @param client - An authenticated ReolinkClient instance
 * @param autoMaintInfo - Auto maintenance settings
 * @returns Promise resolving to the response
 */
export async function setAutoMaint(client: ReolinkClient, autoMaintInfo: AutoMaintInfo): Promise<void> {
  await client.api("SetAutoMaint", { AutoMaint: autoMaintInfo });
}

/**
 * Get HDD information
 * 
 * Retrieves information about installed hard drives.
 * 
 * @param client - An authenticated ReolinkClient instance
 * @returns Promise resolving to HDD information
 */
export async function getHddInfo(client: ReolinkClient): Promise<HddInfoResponse> {
  return client.api<HddInfoResponse>("GetHddInfo", {});
}

/**
 * Format HDD
 * 
 * Formats the specified hard drive.
 * 
 * @param client - An authenticated ReolinkClient instance
 * @param hddNo - HDD number to format
 * @returns Promise resolving to the response
 */
export async function formatHdd(client: ReolinkClient, hddNo: number): Promise<void> {
  await client.api("Format", { HddInfo: { hddNo } });
}

/**
 * Reboot device
 * 
 * Reboots the device.
 * 
 * @param client - An authenticated ReolinkClient instance
 * @returns Promise resolving to the response
 */
export async function reboot(client: ReolinkClient): Promise<void> {
  await client.api("Reboot", {});
}

/**
 * Restore device
 * 
 * Restores the device to factory settings.
 * 
 * @param client - An authenticated ReolinkClient instance
 * @returns Promise resolving to the response
 */
export async function restore(client: ReolinkClient): Promise<void> {
  await client.api("Restore", {});
}

/**
 * Check for firmware update
 * 
 * Checks if a new firmware version is available.
 * 
 * @param client - An authenticated ReolinkClient instance
 * @returns Promise resolving to the response
 */
export async function checkFirmware(client: ReolinkClient): Promise<void> {
  await client.api("CheckFirmware", {});
}

/**
 * Upgrade firmware online
 * 
 * Starts the online firmware upgrade process.
 * 
 * @param client - An authenticated ReolinkClient instance
 * @returns Promise resolving to the response
 */
export async function upgradeOnline(client: ReolinkClient): Promise<void> {
  await client.api("UpgradeOnline", {});
}

/**
 * Get upgrade status
 * 
 * Retrieves the status of the firmware upgrade process.
 * 
 * @param client - An authenticated ReolinkClient instance
 * @returns Promise resolving to upgrade status
 */
export async function getUpgradeStatus(client: ReolinkClient): Promise<UpgradeStatusResponse> {
  return client.api<UpgradeStatusResponse>("UpgradeStatus", {});
}

/**
 * Get auto upgrade settings
 * 
 * Retrieves the automatic firmware upgrade settings.
 * 
 * @param client - An authenticated ReolinkClient instance
 * @returns Promise resolving to auto upgrade settings
 */
export async function getAutoUpgrade(client: ReolinkClient): Promise<AutoUpgradeResponse> {
  return client.api<AutoUpgradeResponse>("GetAutoUpgrade", {});
}

/**
 * Set auto upgrade settings
 * 
 * Sets the automatic firmware upgrade settings.
 * 
 * @param client - An authenticated ReolinkClient instance
 * @param enable - 1 to enable, 0 to disable
 * @returns Promise resolving to the response
 */
export async function setAutoUpgrade(client: ReolinkClient, enable: number): Promise<void> {
  await client.api("SetAutoUpgrade", { AutoUpgrade: { enable } });
}
