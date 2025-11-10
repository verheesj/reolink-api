/**
 * PTZ (Pan-Tilt-Zoom) control endpoints
 */

import { ReolinkClient } from "./reolink.js";

export interface PtzPreset {
  id: number;
  name?: string;
  [key: string]: unknown;
}

export interface PtzPresetResponse {
  preset?: PtzPreset[];
  [key: string]: unknown;
}

export interface PtzCtrlParams {
  channel: number;
  op: "ToPos" | "Start" | "Stop" | "SetPreset" | "GotoPreset";
  speed?: number;
  presetId?: number;
  x?: number;
  y?: number;
  z?: number;
}

export interface PtzPatrol {
  id: number;
  name?: string;
  preset?: number[];
  [key: string]: unknown;
}

export interface PtzPatrolResponse {
  patrol?: PtzPatrol[];
  [key: string]: unknown;
}

/**
 * Get PTZ presets for a channel
 */
export async function getPtzPreset(
  client: ReolinkClient,
  channel: number
): Promise<PtzPresetResponse> {
  return client.api<PtzPresetResponse>("GetPtzPreset", {
    channel,
  });
}

/**
 * Set a PTZ preset
 */
export async function setPtzPreset(
  client: ReolinkClient,
  channel: number,
  id: number,
  name?: string
): Promise<unknown> {
  return client.api("SetPtzPreset", {
    channel,
    id,
    name: name || `Preset ${id}`,
  });
}

/**
 * Control PTZ movement
 */
export async function ptzCtrl(
  client: ReolinkClient,
  params: PtzCtrlParams
): Promise<unknown> {
  const apiParams: Record<string, unknown> = {
    channel: params.channel,
    op: params.op,
  };

  if (params.speed !== undefined) {
    apiParams.speed = params.speed;
  }

  if (params.op === "GotoPreset" || params.op === "SetPreset") {
    if (params.presetId !== undefined) {
      apiParams.id = params.presetId;
    }
  }

  if (params.op === "ToPos" && params.x !== undefined && params.y !== undefined) {
    apiParams.x = params.x;
    apiParams.y = params.y;
    if (params.z !== undefined) {
      apiParams.z = params.z;
    }
  }

  return client.api("PtzCtrl", apiParams);
}

/**
 * Get PTZ patrol configuration
 */
export async function getPtzPatrol(
  client: ReolinkClient,
  channel: number
): Promise<PtzPatrolResponse> {
  return client.api<PtzPatrolResponse>("GetPtzPatrol", {
    channel,
  });
}

/**
 * Set PTZ patrol configuration
 */
export async function setPtzPatrol(
  client: ReolinkClient,
  channel: number,
  patrol: PtzPatrol
): Promise<unknown> {
  return client.api("SetPtzPatrol", {
    channel,
    patrol: [patrol],
  });
}

