/**
 * Playback stream control utilities
 */

import { ReolinkClient } from "./reolink.js";
import { ReolinkHttpError } from "./types.js";

/**
 * Validates ISO 8601 timestamp format
 */
function validateTimestamp(timestamp: string): void {
  // Basic ISO 8601 validation (YYYY-MM-DDTHH:mm:ssZ or with timezone)
  // Must have T separator and timezone indicator
  const iso8601Regex =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})$/;
  if (!iso8601Regex.test(timestamp)) {
    throw new Error(
      `Invalid timestamp format: ${timestamp}. Expected ISO 8601 format (e.g., "2025-11-10T09:00:00Z")`
    );
  }

  // Try to parse to ensure it's a valid date
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${timestamp} cannot be parsed as a date`);
  }

  // Additional validation: check that the parsed date matches the input
  // This prevents dates like "2025-13-45T25:70:99Z" from being accepted
  const year = parseInt(timestamp.substring(0, 4), 10);
  const month = parseInt(timestamp.substring(5, 7), 10);
  const day = parseInt(timestamp.substring(8, 10), 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid timestamp: ${timestamp} contains invalid date values`);
  }

  // Check if parsed date components match (accounting for timezone conversion)
  const parsedYear = date.getUTCFullYear();
  const parsedMonth = date.getUTCMonth() + 1;

  // Allow some flexibility for timezone conversions, but basic date should be valid
  if (Math.abs(parsedYear - year) > 1 || Math.abs(parsedMonth - month) > 1) {
    throw new Error(`Invalid timestamp: ${timestamp} contains invalid date values`);
  }
}

/**
 * Playback controller for managing NVR/IPC playback streams
 * 
 * Note: Playback control commands (PlaybackStart, PlaybackStop, PlaybackSeek) 
 * are not supported on all Reolink devices. Some NVR models (e.g., RLN8-410) 
 * may return error code -9 ("not support") even though they support playback 
 * via the web UI. This is a device/firmware limitation, not an SDK issue.
 * 
 * If playback control is not supported, consider using:
 * - RTSP/FLV streaming URLs for live playback
 * - Record download functionality for offline playback
 * - Web UI for manual playback control
 */
export class ReolinkPlaybackController {
  private client: ReolinkClient;

  constructor(client: ReolinkClient) {
    this.client = client;
  }

  /**
   * Start playback on a channel from a specific time
   * @param channel - Camera channel number (0-based)
   * @param startTime - ISO 8601 timestamp (e.g., "2025-11-10T09:00:00Z")
   * @returns API response
   */
  async startPlayback(channel: number, startTime: string): Promise<unknown> {
    if (typeof channel !== "number" || channel < 0) {
      throw new Error(`Invalid channel: ${channel}. Must be a non-negative number`);
    }

    validateTimestamp(startTime);

    try {
      const response = await this.client.api("PlaybackStart", {
        channel,
        startTime,
      });
      return response;
    } catch (error) {
      if (error instanceof ReolinkHttpError) {
        // Provide more helpful error message for unsupported commands
        if (error.rspCode === -9) {
          throw new Error(
            `Playback control not supported on this device (error -9). ` +
            `This device may not support PlaybackStart via the API, even though ` +
            `playback is available via the web UI. Consider using RTSP/FLV streaming ` +
            `URLs or record download functionality instead.`
          );
        }
        throw error;
      }
      throw new Error(`Failed to start playback: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Stop playback on a channel (or all channels if not specified)
   * @param channel - Optional camera channel number (0-based). If omitted, stops all channels
   * @returns API response
   */
  async stopPlayback(channel?: number): Promise<unknown> {
    if (channel !== undefined) {
      if (typeof channel !== "number" || channel < 0) {
        throw new Error(`Invalid channel: ${channel}. Must be a non-negative number`);
      }

      try {
        const response = await this.client.api("PlaybackStop", {
          channel,
        });
        return response;
      } catch (error) {
        if (error instanceof ReolinkHttpError) {
          if (error.rspCode === -9) {
            throw new Error(
              `Playback control not supported on this device (error -9). ` +
              `This device may not support PlaybackStop via the API.`
            );
          }
          throw error;
        }
        throw new Error(`Failed to stop playback: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // Stop all channels
      try {
        const response = await this.client.api("PlaybackStop", {});
        return response;
      } catch (error) {
        if (error instanceof ReolinkHttpError) {
          if (error.rspCode === -9) {
            throw new Error(
              `Playback control not supported on this device (error -9). ` +
              `This device may not support PlaybackStop via the API.`
            );
          }
          throw error;
        }
        throw new Error(`Failed to stop playback: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Seek to a specific time in the current playback stream
   * @param channel - Camera channel number (0-based)
   * @param seekTime - ISO 8601 timestamp (e.g., "2025-11-10T09:15:00Z")
   * @returns API response
   */
  async seekPlayback(channel: number, seekTime: string): Promise<unknown> {
    if (typeof channel !== "number" || channel < 0) {
      throw new Error(`Invalid channel: ${channel}. Must be a non-negative number`);
    }

    validateTimestamp(seekTime);

    try {
      const response = await this.client.api("PlaybackSeek", {
        channel,
        seekTime,
      });
      return response;
    } catch (error) {
      if (error instanceof ReolinkHttpError) {
        if (error.rspCode === -9) {
          throw new Error(
            `Playback control not supported on this device (error -9). ` +
            `This device may not support PlaybackSeek via the API, even though ` +
            `playback is available via the web UI. Consider using RTSP/FLV streaming ` +
            `URLs or record download functionality instead.`
          );
        }
        throw error;
      }
      throw new Error(`Failed to seek playback: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the underlying client (for advanced usage)
   */
  getClient(): ReolinkClient {
    return this.client;
  }
}

