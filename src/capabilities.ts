/**
 * Capability detection and feature guards
 */

import { ReolinkClient } from "./reolink.js";
import { getAbility } from "./endpoints/system.js";

export interface DeviceCapabilities {
  ptz?: boolean;
  ai?: boolean;
  motionDetection?: boolean;
  recording?: boolean;
  [key: string]: unknown;
}

/**
 * Detect device capabilities from GetAbility response
 */
export async function detectCapabilities(
  client: ReolinkClient
): Promise<DeviceCapabilities> {
  try {
    const ability = await getAbility(client);
    const caps: DeviceCapabilities = {};

    // Check for PTZ support
    // Common ability keys that indicate PTZ support
    if (
      ability.Ptz ||
      ability.ptz ||
      (typeof ability === "object" &&
        ability !== null &&
        ("Ptz" in ability || "ptz" in ability))
    ) {
      caps.ptz = true;
    }

    // Check for AI support
    if (
      ability.AI ||
      ability.ai ||
      (typeof ability === "object" &&
        ability !== null &&
        ("AI" in ability || "ai" in ability || "Person" in ability))
    ) {
      caps.ai = true;
    }

    // Check for motion detection
    if (
      ability.Md ||
      ability.md ||
      (typeof ability === "object" &&
        ability !== null &&
        ("Md" in ability || "md" in ability || "Motion" in ability))
    ) {
      caps.motionDetection = true;
    }

    // Check for recording
    if (
      ability.Rec ||
      ability.rec ||
      (typeof ability === "object" &&
        ability !== null &&
        ("Rec" in ability || "rec" in ability || "Record" in ability))
    ) {
      caps.recording = true;
    }

    return caps;
  } catch (error) {
    // If GetAbility fails, return empty capabilities
    return {};
  }
}

/**
 * Guard function to check if a feature is supported before use
 */
export function requireCapability(
  capabilities: DeviceCapabilities,
  feature: keyof DeviceCapabilities
): void {
  if (!capabilities[feature]) {
    throw new Error(
      `Feature '${feature}' is not supported on this device. Available capabilities: ${Object.keys(capabilities).join(", ")}`
    );
  }
}

/**
 * Helper to get capabilities and check feature support
 */
export async function checkFeature(
  client: ReolinkClient,
  feature: keyof DeviceCapabilities
): Promise<boolean> {
  const caps = await detectCapabilities(client);
  return caps[feature] === true;
}

