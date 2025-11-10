/**
 * Streaming URL helpers for RTSP, RTMP, FLV, and playback
 */

export interface RtspUrlOptions {
  user: string;
  pass: string;
  host: string;
  channel: number;
  h265?: boolean;
}

export interface RtmpUrlOptions {
  token?: string;
  user?: string;
  pass?: string;
  host: string;
  channel: number;
  streamType?: "main" | "sub";
}

export interface FlvUrlOptions {
  token?: string;
  user?: string;
  pass?: string;
  host: string;
  channel: number;
  streamType?: "main" | "sub";
}

export interface PlaybackFlvUrlOptions {
  host: string;
  channel: number;
  start: string; // ISO 8601 timestamp
  type?: "main" | "sub";
  token?: string;
  user?: string;
  pass?: string;
}

/**
 * Generate RTSP preview URL
 * Note: RTSP channel indexing starts at 01 (not 0)
 */
export function rtspUrl(options: RtspUrlOptions): string {
  const { user, pass, host, channel, h265 = false } = options;
  // RTSP channels start at 01, so add 1 and pad with zero
  const channelStr = String(channel + 1).padStart(2, "0");
  const codec = h265 ? "h265" : "h264";
  // RTSP uses double slash format: //h264Preview_01_main
  return `rtsp://${user}:${pass}@${host}:554//${codec}Preview_${channelStr}_main`;
}

/**
 * Generate RTMP preview URL
 * Note: RTMP channel indexing starts at 0
 */
export function rtmpUrl(options: RtmpUrlOptions): string {
  const { host, channel, streamType = "main" } = options;
  const streamTypeNum = streamType === "main" ? "0" : "1";

  if (options.token) {
    // Long connection mode with token
    return `rtmp://${host}:1935/bcs/channel${channel}_${streamTypeNum}.bcs?channel=${channel}&stream=${streamTypeNum}&user=${options.user || ""}&token=${options.token}`;
  } else if (options.user && options.pass) {
    // Short connection mode with user/pass
    return `rtmp://${host}:1935/bcs/channel${channel}_${streamTypeNum}.bcs?channel=${channel}&stream=${streamTypeNum}&user=${options.user}&password=${options.pass}`;
  } else {
    throw new Error("RTMP URL requires either token or user/pass");
  }
}

/**
 * Generate FLV preview URL
 * Note: FLV channel indexing starts at 0
 */
export function flvUrl(options: FlvUrlOptions): string {
  const { host, channel, streamType = "main" } = options;
  const streamTypeNum = streamType === "main" ? "0" : "1";

  if (options.token) {
    // Long connection mode with token
    return `http://${host}/flv?port=1935&app=bcs&stream=channel${channel}_${streamTypeNum}.bcs&channel=${channel}&stream=${streamTypeNum}&user=${options.user || ""}&token=${options.token}`;
  } else if (options.user && options.pass) {
    // Short connection mode with user/pass
    return `http://${host}/flv?port=1935&app=bcs&stream=channel${channel}_${streamTypeNum}.bcs&channel=${channel}&stream=${streamTypeNum}&user=${options.user}&password=${options.pass}`;
  } else {
    throw new Error("FLV URL requires either token or user/pass");
  }
}

/**
 * Generate NVR/IPC playback FLV URL
 */
export function nvrPlaybackFlvUrl(options: PlaybackFlvUrlOptions): string {
  const { host, channel, start, type = "main", token, user, pass } = options;
  const streamTypeNum = type === "main" ? "0" : "1";

  // Convert ISO timestamp to Unix timestamp
  const startTime = Math.floor(new Date(start).getTime() / 1000);

  if (token) {
    return `http://${host}/flv?port=1935&app=bcs&stream=recordchannel${channel}_${streamTypeNum}.bcs&channel=${channel}&stream=${streamTypeNum}&starttime=${startTime}&user=${user || ""}&token=${token}`;
  } else if (user && pass) {
    return `http://${host}/flv?port=1935&app=bcs&stream=recordchannel${channel}_${streamTypeNum}.bcs&channel=${channel}&stream=${streamTypeNum}&starttime=${startTime}&user=${user}&password=${pass}`;
  } else {
    throw new Error("Playback FLV URL requires either token or user/pass");
  }
}

