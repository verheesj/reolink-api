/**
 * System status endpoints
 */

import { ReolinkClient } from "../reolink.js";

export interface AbilityResponse {
  [key: string]: unknown;
}

export interface DevInfoResponse {
  deviceName?: string;
  model?: string;
  hardwareVersion?: string;
  firmwareVersion?: string;
  [key: string]: unknown;
}

export interface EncResponse {
  [key: string]: unknown;
}

/**
 * Get device ability information
 */
export async function getAbility(
  client: ReolinkClient,
  userName?: string
): Promise<AbilityResponse> {
  const params: Record<string, unknown> = {};
  if (userName) {
    params.userName = userName;
  }
  return client.api<AbilityResponse>("GetAbility", params);
}

/**
 * Get device information (model, firmware, etc.)
 */
export async function getDevInfo(client: ReolinkClient): Promise<DevInfoResponse> {
  return client.api<DevInfoResponse>("GetDevInfo", {});
}

/**
 * Get encoding configuration
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

