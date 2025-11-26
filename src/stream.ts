/**
 * Streaming URL helpers for RTSP, RTMP, FLV, and playback
 */

import { buildAuthParams } from "./utils/url-auth.js";

/**
 * Options for generating RTSP streaming URLs
 * 
 * @property user - Username for RTSP authentication
 * @property pass - Password for RTSP authentication
 * @property host - Device hostname or IP address
 * @property channel - Camera channel number (0-based, will be converted to 1-based for RTSP)
 * @property h265 - Use H.265 codec instead of H.264 (default: false)
 */
export interface RtspUrlOptions {
  user: string;
  pass: string;
  host: string;
  channel: number;
  h265?: boolean;
}

/**
 * Options for generating RTMP streaming URLs
 * 
 * @property token - Session token for long connection mode
 * @property user - Username for short connection mode
 * @property pass - Password for short connection mode
 * @property host - Device hostname or IP address
 * @property channel - Camera channel number (0-based)
 * @property streamType - Stream quality: "main" for high quality, "sub" for lower quality (default: "main")
 */
export interface RtmpUrlOptions {
  token?: string;
  user?: string;
  pass?: string;
  host: string;
  channel: number;
  streamType?: "main" | "sub";
}

/**
 * Options for generating FLV streaming URLs
 * 
 * @property token - Session token for long connection mode
 * @property user - Username for short connection mode
 * @property pass - Password for short connection mode
 * @property host - Device hostname or IP address
 * @property channel - Camera channel number (0-based)
 * @property streamType - Stream quality: "main" for high quality, "sub" for lower quality (default: "main")
 */
export interface FlvUrlOptions {
  token?: string;
  user?: string;
  pass?: string;
  host: string;
  channel: number;
  streamType?: "main" | "sub";
}

/**
 * Options for generating NVR/IPC playback FLV URLs
 * 
 * @property host - Device hostname or IP address
 * @property channel - Camera channel number (0-based)
 * @property start - Playback start time as ISO 8601 timestamp (e.g., "2025-01-01T09:00:00Z")
 * @property type - Stream quality: "main" for high quality, "sub" for lower quality (default: "main")
 * @property token - Session token for long connection mode
 * @property user - Username for short connection mode
 * @property pass - Password for short connection mode
 */
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
 * Generate RTSP preview URL for live video streaming
 * 
 * Creates an RTSP URL for accessing live video streams. RTSP is a standard
 * streaming protocol supported by most video players (VLC, FFmpeg, etc.).
 * 
 * Note: RTSP channel indexing starts at 01 (not 0), so this function
 * automatically converts zero-based channel numbers to the RTSP format.
 * 
 * @param options - RTSP URL configuration
 * @returns RTSP URL string (e.g., "rtsp://admin:pass@192.168.1.100:554//h264Preview_01_main")
 * 
 * @example
 * ```typescript
 * // H.264 stream on channel 0
 * const url = rtspUrl({
 *   user: "admin",
 *   pass: "password",
 *   host: "192.168.1.100",
 *   channel: 0
 * });
 * // Returns: "rtsp://admin:password@192.168.1.100:554//h264Preview_01_main"
 * 
 * // H.265 stream on channel 1
 * const urlH265 = rtspUrl({
 *   user: "admin",
 *   pass: "password",
 *   host: "192.168.1.100",
 *   channel: 1,
 *   h265: true
 * });
 * // Returns: "rtsp://admin:password@192.168.1.100:554//h265Preview_02_main"
 * ```
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
 * Generate RTMP preview URL for live video streaming
 * 
 * Creates an RTMP URL for accessing live video streams. RTMP is commonly
 * used for flash-based players and streaming to media servers.
 * 
 * Note: RTMP channel indexing starts at 0 (unlike RTSP which starts at 01).
 * 
 * @param options - RTMP URL configuration
 * @returns RTMP URL string
 * 
 * @throws Error if neither token nor user/pass credentials are provided
 * 
 * @example
 * ```typescript
 * // With token (long connection mode)
 * const url = rtmpUrl({
 *   host: "192.168.1.100",
 *   channel: 0,
 *   streamType: "main",
 *   user: "admin",
 *   token: "abc123token"
 * });
 * 
 * // With user/pass (short connection mode)
 * const urlShort = rtmpUrl({
 *   host: "192.168.1.100",
 *   channel: 0,
 *   user: "admin",
 *   pass: "password"
 * });
 * ```
 */
export function rtmpUrl(options: RtmpUrlOptions): string {
  const { host, channel, streamType = "main" } = options;
  const streamTypeNum = streamType === "main" ? "0" : "1";
  const authParams = buildAuthParams({
    token: options.token,
    user: options.user,
    pass: options.pass,
  });

  return `rtmp://${host}:1935/bcs/channel${channel}_${streamTypeNum}.bcs?channel=${channel}&stream=${streamTypeNum}&${authParams}`;
}

/**
 * Generate FLV preview URL for live video streaming
 * 
 * Creates an HTTP-FLV URL for accessing live video streams. FLV over HTTP
 * is often easier to work with than RTSP and can be played in browsers
 * with JavaScript players like flv.js.
 * 
 * Note: FLV channel indexing starts at 0.
 * 
 * @param options - FLV URL configuration
 * @returns FLV URL string
 * 
 * @throws Error if neither token nor user/pass credentials are provided
 * 
 * @example
 * ```typescript
 * // With token (long connection mode)
 * const url = flvUrl({
 *   host: "192.168.1.100",
 *   channel: 0,
 *   streamType: "sub",
 *   user: "admin",
 *   token: "abc123token"
 * });
 * 
 * // With user/pass (short connection mode)
 * const urlShort = flvUrl({
 *   host: "192.168.1.100",
 *   channel: 0,
 *   user: "admin",
 *   pass: "password"
 * });
 * ```
 */
export function flvUrl(options: FlvUrlOptions): string {
  const { host, channel, streamType = "main" } = options;
  const streamTypeNum = streamType === "main" ? "0" : "1";
  const authParams = buildAuthParams({
    token: options.token,
    user: options.user,
    pass: options.pass,
  });

  return `http://${host}/flv?port=1935&app=bcs&stream=channel${channel}_${streamTypeNum}.bcs&channel=${channel}&stream=${streamTypeNum}&${authParams}`;
}

/**
 * Generate NVR/IPC playback FLV URL for recorded video
 * 
 * Creates an HTTP-FLV URL for playing back recorded video from a specific
 * start time. The stream will play from the start time until the end of
 * the recording or until the connection is closed.
 * 
 * @param options - Playback FLV URL configuration
 * @returns Playback FLV URL string
 * 
 * @throws Error if neither token nor user/pass credentials are provided
 * 
 * @example
 * ```typescript
 * // With token (long connection mode)
 * const url = nvrPlaybackFlvUrl({
 *   host: "192.168.1.100",
 *   channel: 0,
 *   start: "2025-01-01T09:00:00Z",
 *   type: "main",
 *   user: "admin",
 *   token: "abc123token"
 * });
 * 
 * // With user/pass (short connection mode)
 * const urlShort = nvrPlaybackFlvUrl({
 *   host: "192.168.1.100",
 *   channel: 0,
 *   start: "2025-01-01T09:00:00Z",
 *   user: "admin",
 *   pass: "password"
 * });
 * ```
 */
export function nvrPlaybackFlvUrl(options: PlaybackFlvUrlOptions): string {
  const { host, channel, start, type = "main", token, user, pass } = options;
  const streamTypeNum = type === "main" ? "0" : "1";

  // Convert ISO timestamp to Unix timestamp
  const startTime = Math.floor(new Date(start).getTime() / 1000);

  const authParams = buildAuthParams({ token, user, pass });

  return `http://${host}/flv?port=1935&app=bcs&stream=recordchannel${channel}_${streamTypeNum}.bcs&channel=${channel}&stream=${streamTypeNum}&starttime=${startTime}&${authParams}`;
}

