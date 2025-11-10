/**
 * Unit tests for PTZ guard and patrol functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPtzGuard,
  setPtzGuard,
  toggleGuardMode,
  getPtzPatrol,
  setPtzPatrol,
  startPatrol,
  stopPatrol,
} from "./ptz.js";
import { ReolinkClient } from "./reolink.js";
import { ReolinkHttpError } from "./types.js";

describe("PTZ Guard and Patrol", () => {
  let mockClient: ReolinkClient;

  beforeEach(() => {
    mockClient = {
      api: vi.fn(),
    } as unknown as ReolinkClient;
  });

  describe("getPtzGuard", () => {
    it("should call GetPtzGuard with correct parameters", async () => {
      const mockResponse = {
        PtzGuard: {
          channel: 0,
          benable: 1,
          timeout: 60,
        },
      };
      vi.mocked(mockClient.api).mockResolvedValue(mockResponse);

      const result = await getPtzGuard(mockClient, 0);

      expect(mockClient.api).toHaveBeenCalledWith("GetPtzGuard", {
        channel: 0,
      });
      expect(result).toEqual({
        benable: 1,
        timeout: 60,
        channel: 0,
      });
    });

    it("should handle error -9 gracefully", async () => {
      const httpError = new ReolinkHttpError(1, -9, "not support", "GetPtzGuard");
      vi.mocked(mockClient.api).mockRejectedValue(httpError);

      await expect(getPtzGuard(mockClient, 0)).rejects.toThrow(ReolinkHttpError);
    });
  });

  describe("setPtzGuard", () => {
    it("should call SetPtzGuard with options object", async () => {
      const mockResponse = { code: 0 };
      vi.mocked(mockClient.api).mockResolvedValue(mockResponse);

      await setPtzGuard(mockClient, 0, {
        benable: 1,
        timeout: 60,
      });

      expect(mockClient.api).toHaveBeenCalledWith("SetPtzGuard", {
        channel: 0,
        PtzGuard: {
          benable: 1,
          timeout: 60,
          channel: 0,
          cmdStr: "setPos",
          bSaveCurrentPos: 1,
        },
      });
    });

    it("should call SetPtzGuard with enabled=false", async () => {
      const mockResponse = { code: 0 };
      vi.mocked(mockClient.api).mockResolvedValue(mockResponse);

      await setPtzGuard(mockClient, 0, {
        benable: 0,
        timeout: 60,
      });

      expect(mockClient.api).toHaveBeenCalledWith("SetPtzGuard", {
        channel: 0,
        PtzGuard: {
          benable: 0,
          timeout: 60,
          channel: 0,
          cmdStr: "setPos",
          bSaveCurrentPos: 1,
        },
      });
    });

    it("should call SetPtzGuard with timeout", async () => {
      const mockResponse = { code: 0 };
      vi.mocked(mockClient.api).mockResolvedValue(mockResponse);

      await setPtzGuard(mockClient, 0, {
        benable: 1,
        timeout: 120,
      });

      expect(mockClient.api).toHaveBeenCalledWith("SetPtzGuard", {
        channel: 0,
        PtzGuard: {
          benable: 1,
          timeout: 120,
          channel: 0,
          cmdStr: "setPos",
          bSaveCurrentPos: 1,
        },
      });
    });

    it("should handle error -1", async () => {
      const mockResponse = {
        code: 1,
        error: {
          rspCode: -1,
          detail: "Invalid preset or position",
        },
      };
      vi.mocked(mockClient.api).mockResolvedValue(mockResponse);

      await expect(
        setPtzGuard(mockClient, 0, { benable: 1, timeout: 60 })
      ).rejects.toThrow(ReolinkHttpError);
    });

    it("should handle error -4", async () => {
      const mockResponse = {
        code: 1,
        error: {
          rspCode: -4,
          detail: "Parameter format error",
        },
      };
      vi.mocked(mockClient.api).mockResolvedValue(mockResponse);

      await expect(
        setPtzGuard(mockClient, 0, { benable: 1, timeout: 60 })
      ).rejects.toThrow(ReolinkHttpError);
    });

    it("should handle error -9 gracefully", async () => {
      const httpError = new ReolinkHttpError(1, -9, "not support", "SetPtzGuard");
      vi.mocked(mockClient.api).mockRejectedValue(httpError);

      await expect(
        setPtzGuard(mockClient, 0, { benable: 1, timeout: 60 })
      ).rejects.toThrow(ReolinkHttpError);
    });
  });

  describe("toggleGuardMode", () => {
    it("should toggle from disabled to enabled", async () => {
      const getResponse = {
        PtzGuard: {
          channel: 0,
          benable: 0,
          timeout: 60,
        },
      };
      const setResponse = { code: 0 };

      vi.mocked(mockClient.api)
        .mockResolvedValueOnce(getResponse)
        .mockResolvedValueOnce(setResponse);

      await toggleGuardMode(mockClient, 0);

      expect(mockClient.api).toHaveBeenCalledTimes(2);
      expect(mockClient.api).toHaveBeenNthCalledWith(1, "GetPtzGuard", { channel: 0 });
      expect(mockClient.api).toHaveBeenNthCalledWith(2, "SetPtzGuard", {
        channel: 0,
        PtzGuard: {
          benable: 1,
          timeout: 60,
          channel: 0,
          cmdStr: "setPos",
          bSaveCurrentPos: 1,
        },
      });
    });

    it("should toggle from enabled to disabled", async () => {
      const getResponse = {
        PtzGuard: {
          channel: 0,
          benable: 1,
          timeout: 60,
        },
      };
      const setResponse = { code: 0 };

      vi.mocked(mockClient.api)
        .mockResolvedValueOnce(getResponse)
        .mockResolvedValueOnce(setResponse);

      await toggleGuardMode(mockClient, 0);

      expect(mockClient.api).toHaveBeenCalledTimes(2);
      expect(mockClient.api).toHaveBeenNthCalledWith(2, "SetPtzGuard", {
        channel: 0,
        PtzGuard: {
          benable: 0,
          timeout: 60,
          channel: 0,
          cmdStr: "setPos",
          bSaveCurrentPos: 1,
        },
      });
    });
  });

  describe("getPtzPatrol", () => {
    it("should call GetPtzPatrol with correct parameters", async () => {
      const mockResponse = {
        PtzPatrol: [
          {
            channel: 0,
            enable: 1,
            id: 1,
            name: "cruise1",
            preset: [
              { id: 1, dwellTime: 3, speed: 10 },
              { id: 2, dwellTime: 4, speed: 20 },
            ],
            running: 0,
          },
        ],
      };
      vi.mocked(mockClient.api).mockResolvedValue(mockResponse);

      const result = await getPtzPatrol(mockClient, 0);

      expect(mockClient.api).toHaveBeenCalledWith("GetPtzPatrol", {
        channel: 0,
      });
      expect(result).toEqual([
        {
          channel: 0,
          enable: 1,
          id: 1,
          running: 0,
          name: "cruise1",
          preset: [
            { id: 1, speed: 10, dwellTime: 3 },
            { id: 2, speed: 20, dwellTime: 4 },
          ],
        },
      ]);
    });

    it("should handle error -9 gracefully", async () => {
      const httpError = new ReolinkHttpError(1, -9, "not support", "GetPtzPatrol");
      vi.mocked(mockClient.api).mockRejectedValue(httpError);

      await expect(getPtzPatrol(mockClient, 0)).rejects.toThrow(ReolinkHttpError);
    });
  });

  describe("setPtzPatrol", () => {
    it("should call SetPtzPatrol with RLC-823A/S1 format (preset array)", async () => {
      const mockResponse = { code: 0 };
      const config = {
        channel: 0,
        id: 0,
        enable: 1,
        preset: [
          { id: 0, speed: 32, dwellTime: 10 },
          { id: 1, speed: 32, dwellTime: 10 },
        ],
      };

      vi.mocked(mockClient.api).mockResolvedValue(mockResponse);

      await setPtzPatrol(mockClient, 0, config);

      expect(mockClient.api).toHaveBeenCalledWith("SetPtzPatrol", {
        channel: 0,
        PtzPatrol: {
          channel: 0,
          id: 0,
          enable: 1,
          preset: [
            { id: 0, speed: 32, dwellTime: 10 },
            { id: 1, speed: 32, dwellTime: 10 },
          ],
        },
      });
    });

    it("should convert legacy points format to preset format", async () => {
      const mockResponse = { code: 0 };
      const config = {
        id: 0,
        enable: 1,
        points: [
          { presetId: 1, speed: 5, stayTime: 3 },
          { presetId: 2, speed: 4, stayTime: 3 },
        ],
      };

      vi.mocked(mockClient.api).mockResolvedValue(mockResponse);

      await setPtzPatrol(mockClient, 0, config);

      expect(mockClient.api).toHaveBeenCalledWith("SetPtzPatrol", {
        channel: 0,
        PtzPatrol: {
          channel: 0,
          id: 0,
          enable: 1,
          preset: [
            { id: 1, speed: 5, dwellTime: 3 },
            { id: 2, speed: 4, dwellTime: 3 },
          ],
        },
      });
    });

    it("should call SetPtzPatrol with legacy path format (converts to preset)", async () => {
      const mockResponse = { code: 0 };
      const config = {
        id: 1,
        enable: true,
        path: [
          { presetId: 1, speed: 5, stayTime: 3 },
          { presetId: 2, speed: 4, stayTime: 3 },
        ],
      };

      vi.mocked(mockClient.api).mockResolvedValue(mockResponse);

      await setPtzPatrol(mockClient, 0, config);

      expect(mockClient.api).toHaveBeenCalledWith("SetPtzPatrol", {
        channel: 0,
        PtzPatrol: {
          channel: 0,
          id: 1,
          enable: 1,
          preset: [
            { id: 1, speed: 5, dwellTime: 3 },
            { id: 2, speed: 4, dwellTime: 3 },
          ],
        },
      });
    });

    it("should call SetPtzPatrol with legacy format (preset array with old structure)", async () => {
      const mockResponse = { code: 0 };
      const config = {
        enable: true,
        id: 1,
        name: "cruise1",
        preset: [
          { id: 1, dwellTime: 3, speed: 10 },
          { id: 2, dwellTime: 4, speed: 20 },
        ],
      };

      vi.mocked(mockClient.api).mockResolvedValue(mockResponse);

      await setPtzPatrol(mockClient, 0, config);

      // Legacy format with preset array should be passed through as-is
      expect(mockClient.api).toHaveBeenCalledWith("SetPtzPatrol", {
        channel: 0,
        enable: 1,
        id: 1,
        name: "cruise1",
        preset: [
          { id: 1, dwellTime: 3, speed: 10 },
          { id: 2, dwellTime: 4, speed: 20 },
        ],
      });
    });

    it("should convert boolean enable to number in legacy format", async () => {
      const mockResponse = { code: 0 };
      const config = {
        enable: false,
        id: 1,
      };

      vi.mocked(mockClient.api).mockResolvedValue(mockResponse);

      await setPtzPatrol(mockClient, 0, config);

      expect(mockClient.api).toHaveBeenCalledWith("SetPtzPatrol", {
        channel: 0,
        enable: 0,
        id: 1,
      });
    });

    it("should handle error -9 gracefully", async () => {
      const httpError = new ReolinkHttpError(1, -9, "not support", "SetPtzPatrol");
      vi.mocked(mockClient.api).mockRejectedValue(httpError);

      await expect(
        setPtzPatrol(mockClient, 0, { enable: true, id: 1, preset: [] })
      ).rejects.toThrow(ReolinkHttpError);
    });
  });

  describe("startPatrol", () => {
    it("should call PtzCtrl with StartPatrol operation", async () => {
      const mockResponse = { code: 0 };
      vi.mocked(mockClient.api).mockResolvedValue(mockResponse);

      await startPatrol(mockClient, 0, 1);

      expect(mockClient.api).toHaveBeenCalledWith("PtzCtrl", {
        channel: 0,
        op: "StartPatrol",
        id: 1,
      });
    });

    it("should handle error -9 gracefully", async () => {
      const httpError = new ReolinkHttpError(1, -9, "not support", "PtzCtrl");
      vi.mocked(mockClient.api).mockRejectedValue(httpError);

      await expect(startPatrol(mockClient, 0, 1)).rejects.toThrow(ReolinkHttpError);
    });
  });

  describe("stopPatrol", () => {
    it("should call PtzCtrl with StopPatrol operation", async () => {
      const mockResponse = { code: 0 };
      vi.mocked(mockClient.api).mockResolvedValue(mockResponse);

      await stopPatrol(mockClient, 0, 1);

      expect(mockClient.api).toHaveBeenCalledWith("PtzCtrl", {
        channel: 0,
        op: "StopPatrol",
        id: 1,
      });
    });

    it("should handle error -9 gracefully", async () => {
      const httpError = new ReolinkHttpError(1, -9, "not support", "PtzCtrl");
      vi.mocked(mockClient.api).mockRejectedValue(httpError);

      await expect(stopPatrol(mockClient, 0, 1)).rejects.toThrow(ReolinkHttpError);
    });
  });
});


