/**
 * Unit tests for playback control functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReolinkPlaybackController } from "./playback.js";
import { ReolinkClient } from "./reolink.js";
import { ReolinkHttpError } from "./types.js";

describe("ReolinkPlaybackController", () => {
  let mockClient: ReolinkClient;
  let controller: ReolinkPlaybackController;

  beforeEach(() => {
    mockClient = {
      api: vi.fn(),
    } as unknown as ReolinkClient;

    controller = new ReolinkPlaybackController(mockClient);
  });

  describe("startPlayback", () => {
    it("should call PlaybackStart with correct parameters", async () => {
      const mockResponse = { rspCode: 200 };
      vi.mocked(mockClient.api).mockResolvedValue(mockResponse);

      const result = await controller.startPlayback(0, "2025-11-10T09:00:00Z");

      expect(mockClient.api).toHaveBeenCalledWith("PlaybackStart", {
        channel: 0,
        startTime: "2025-11-10T09:00:00Z",
      });
      expect(result).toBe(mockResponse);
    });

    it("should validate ISO 8601 timestamp format", async () => {
      await expect(controller.startPlayback(0, "invalid-timestamp")).rejects.toThrow(
        "Invalid timestamp format"
      );
      expect(mockClient.api).not.toHaveBeenCalled();
    });

    it("should validate channel is non-negative", async () => {
      await expect(controller.startPlayback(-1, "2025-11-10T09:00:00Z")).rejects.toThrow(
        "Invalid channel"
      );
      expect(mockClient.api).not.toHaveBeenCalled();
    });

    it("should wrap API errors in ReolinkHttpError", async () => {
      const httpError = new ReolinkHttpError(1, -4, "param error", "PlaybackStart");
      vi.mocked(mockClient.api).mockRejectedValue(httpError);

      await expect(controller.startPlayback(0, "2025-11-10T09:00:00Z")).rejects.toThrow(
        ReolinkHttpError
      );
    });

    it("should handle non-ReolinkHttpError errors", async () => {
      const error = new Error("Network error");
      vi.mocked(mockClient.api).mockRejectedValue(error);

      await expect(controller.startPlayback(0, "2025-11-10T09:00:00Z")).rejects.toThrow(
        "Failed to start playback"
      );
    });
  });

  describe("stopPlayback", () => {
    it("should call PlaybackStop with channel when specified", async () => {
      const mockResponse = { rspCode: 200 };
      vi.mocked(mockClient.api).mockResolvedValue(mockResponse);

      const result = await controller.stopPlayback(0);

      expect(mockClient.api).toHaveBeenCalledWith("PlaybackStop", {
        channel: 0,
      });
      expect(result).toBe(mockResponse);
    });

    it("should call PlaybackStop without channel when not specified", async () => {
      const mockResponse = { rspCode: 200 };
      vi.mocked(mockClient.api).mockResolvedValue(mockResponse);

      const result = await controller.stopPlayback();

      expect(mockClient.api).toHaveBeenCalledWith("PlaybackStop", {});
      expect(result).toBe(mockResponse);
    });

    it("should validate channel is non-negative when provided", async () => {
      await expect(controller.stopPlayback(-1)).rejects.toThrow("Invalid channel");
      expect(mockClient.api).not.toHaveBeenCalled();
    });

    it("should wrap API errors", async () => {
      const httpError = new ReolinkHttpError(1, -4, "param error", "PlaybackStop");
      vi.mocked(mockClient.api).mockRejectedValue(httpError);

      await expect(controller.stopPlayback(0)).rejects.toThrow(ReolinkHttpError);
    });
  });

  describe("seekPlayback", () => {
    it("should call PlaybackSeek with correct parameters", async () => {
      const mockResponse = { rspCode: 200 };
      vi.mocked(mockClient.api).mockResolvedValue(mockResponse);

      const result = await controller.seekPlayback(0, "2025-11-10T09:15:00Z");

      expect(mockClient.api).toHaveBeenCalledWith("PlaybackSeek", {
        channel: 0,
        seekTime: "2025-11-10T09:15:00Z",
      });
      expect(result).toBe(mockResponse);
    });

    it("should validate ISO 8601 timestamp format", async () => {
      await expect(controller.seekPlayback(0, "invalid-timestamp")).rejects.toThrow(
        "Invalid timestamp format"
      );
      expect(mockClient.api).not.toHaveBeenCalled();
    });

    it("should validate channel is non-negative", async () => {
      await expect(controller.seekPlayback(-1, "2025-11-10T09:15:00Z")).rejects.toThrow(
        "Invalid channel"
      );
      expect(mockClient.api).not.toHaveBeenCalled();
    });

    it("should wrap API errors", async () => {
      const httpError = new ReolinkHttpError(1, -4, "param error", "PlaybackSeek");
      vi.mocked(mockClient.api).mockRejectedValue(httpError);

      await expect(controller.seekPlayback(0, "2025-11-10T09:15:00Z")).rejects.toThrow(
        ReolinkHttpError
      );
    });
  });

  describe("timestamp validation", () => {
    it("should accept valid ISO 8601 timestamps", async () => {
      const validTimestamps = [
        "2025-11-10T09:00:00Z",
        "2025-11-10T09:00:00.000Z",
        "2025-11-10T09:00:00+00:00",
        "2025-11-10T09:00:00-05:00",
      ];

      for (const timestamp of validTimestamps) {
        vi.mocked(mockClient.api).mockResolvedValue({ rspCode: 200 });
        await expect(controller.startPlayback(0, timestamp)).resolves.toBeDefined();
      }
    });

    it("should reject invalid timestamp formats", async () => {
      const invalidTimestamps = [
        "2025-11-10 09:00:00", // Missing T
        "2025/11/10T09:00:00Z", // Wrong date separator
        "2025-11-10T09:00:00", // Missing timezone
        "not-a-date",
        "",
      ];

      for (const timestamp of invalidTimestamps) {
        await expect(controller.startPlayback(0, timestamp)).rejects.toThrow(
          "Invalid timestamp format"
        );
      }
    });

    it("should reject unparseable dates", async () => {
      // Valid format but invalid date
      await expect(controller.startPlayback(0, "2025-13-45T25:70:99Z")).rejects.toThrow(
        "Invalid timestamp"
      );
    });
  });

  describe("getClient", () => {
    it("should return the underlying client", () => {
      expect(controller.getClient()).toBe(mockClient);
    });
  });
});

