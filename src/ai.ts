/**
 * AI configuration and state endpoints
 */

import { ReolinkClient } from "./reolink.js";

export interface AiCfgResponse {
  [key: string]: unknown;
}

export interface AiStateResponse {
  [key: string]: unknown;
}

/**
 * Get AI configuration for a channel
 */
export async function getAiCfg(
  client: ReolinkClient,
  channel: number
): Promise<AiCfgResponse> {
  return client.api<AiCfgResponse>("GetAiCfg", {
    channel,
  });
}

/**
 * Get AI state for a channel
 */
export async function getAiState(
  client: ReolinkClient,
  channel: number
): Promise<AiStateResponse> {
  return client.api<AiStateResponse>("GetAiState", {
    channel,
  });
}

