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

