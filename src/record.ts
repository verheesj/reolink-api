/**
 * Record search and download endpoints
 */

import { ReolinkClient } from "./reolink.js";

export interface SearchParams {
  channel: number;
  start: string; // ISO 8601 timestamp
  end: string; // ISO 8601 timestamp
  streamType?: "main" | "sub";
}

export interface SearchFile {
  name: string;
  start: string;
  end: string;
  [key: string]: unknown;
}

export interface SearchResponse {
  files?: SearchFile[];
  [key: string]: unknown;
}

/**
 * Search for recorded files
 */
export async function search(
  client: ReolinkClient,
  params: SearchParams
): Promise<SearchResponse> {
  // Convert ISO timestamps to Unix timestamps
  const startTime = Math.floor(new Date(params.start).getTime() / 1000);
  const endTime = Math.floor(new Date(params.end).getTime() / 1000);

  const streamTypeNum = params.streamType === "sub" ? 1 : 0;

  return client.api<SearchResponse>("Search", {
    channel: params.channel,
    startTime,
    endTime,
    streamType: streamTypeNum,
  });
}

export interface DownloadParams {
  channel: number;
  fileName: string;
  streamType?: "main" | "sub";
}

/**
 * Download a recorded file
 * Returns the download URL or file data depending on implementation
 */
export async function download(
  client: ReolinkClient,
  params: DownloadParams
): Promise<unknown> {
  const streamTypeNum = params.streamType === "sub" ? 1 : 0;

  return client.api("Download", {
    channel: params.channel,
    fileName: params.fileName,
    streamType: streamTypeNum,
  });
}

/**
 * NVR download (if device is an NVR)
 */
export async function nvrDownload(
  client: ReolinkClient,
  params: DownloadParams
): Promise<unknown> {
  return download(client, params);
}

