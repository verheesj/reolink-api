/**
 * Alarm and motion detection endpoints
 */

import { ReolinkClient } from "./reolink.js";

export interface AlarmResponse {
  [key: string]: unknown;
}

export interface MdStateResponse {
  [key: string]: unknown;
}

/**
 * Get alarm information
 */
export async function getAlarm(client: ReolinkClient): Promise<AlarmResponse> {
  return client.api<AlarmResponse>("GetAlarm", {});
}

/**
 * Get motion detection state
 */
export async function getMdState(
  client: ReolinkClient,
  channel: number
): Promise<MdStateResponse> {
  return client.api<MdStateResponse>("GetMdState", {
    channel,
  });
}

