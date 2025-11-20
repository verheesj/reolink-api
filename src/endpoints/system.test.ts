/**
 * Unit tests for System endpoints
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReolinkClient } from "../reolink.js";
import { getAbility, getDevInfo, getEnc } from "./system.js";

describe("System endpoints", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let client: ReolinkClient;

  const createLoginResponse = () => ({
    ok: true,
    json: vi.fn().mockResolvedValue([
      {
        code: 0,
        value: {
          Token: { name: "test-token", leaseTime: 3600 },
        },
      },
    ]),
  });

  beforeEach(() => {
    mockFetch = vi.fn();
    client = new ReolinkClient({
      host: "192.168.1.100",
      username: "admin",
      password: "password",
      fetch: mockFetch as unknown as typeof fetch,
    });
  });

  describe("getAbility", () => {
    it("should get device ability without userName", async () => {
      const abilityResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: {
              Ability: {
                Ptz: { ver: 1, permit: 7 },
                User: { ver: 1, permit: 1 },
              },
            },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(abilityResponse);

      await client.login();
      const result = await getAbility(client);

      expect(result).toHaveProperty("Ability");
      expect(mockFetch).toHaveBeenCalledTimes(2);

      const [ target ] = mockFetch.mock.calls[1];
      const url = new URL(target);
      expect(url.searchParams.get('cmd')).toBe("GetAbility");
    });

    it("should get device ability with userName parameter", async () => {
      const abilityResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: {
              Ability: {
                User: { ver: 1, permit: 1 },
              },
            },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(abilityResponse);

      await client.login();
      const result = await getAbility(client, "admin");

      expect(result).toHaveProperty("Ability");

      const [, requestArgs] = mockFetch.mock.calls[1];
      const body = JSON.parse(String(requestArgs?.body ?? "[]"));
      expect(body[0].param).toEqual({ userName: "admin" });
    });
  });

  describe("getDevInfo", () => {
    it("should get device information", async () => {
      const devInfoResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: {
              DevInfo: {
                deviceName: "NVR-Test",
                model: "RLN8-410",
                hardwareVersion: "IPC_51516M5M",
                firmwareVersion: "v3.0.0.660_21091300",
              },
            },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(devInfoResponse);

      await client.login();
      const result = await getDevInfo(client);

      expect(result).toHaveProperty("DevInfo");
      expect(mockFetch).toHaveBeenCalledTimes(2);

      const [, requestArgs] = mockFetch.mock.calls[1];
      const body = JSON.parse(String(requestArgs?.body ?? "[]"));
      expect(body[0].cmd).toBe("GetDevInfo");
      expect(body[0].param).toEqual({});
    });
  });

  describe("getEnc", () => {
    it("should get encoding configuration with default parameters", async () => {
      const encResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: {
              Enc: {
                audio: 1,
                channel: 0,
                mainStream: {
                  vType: "h265",
                  size: "2560*1440",
                  frameRate: 15,
                  bitRate: 4096,
                },
                subStream: {
                  vType: "h264",
                  size: "640*480",
                  frameRate: 7,
                  bitRate: 512,
                },
              },
            },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(encResponse);

      await client.login();
      const result = await getEnc(client);

      expect(result).toHaveProperty("Enc");
      expect(mockFetch).toHaveBeenCalledTimes(2);

      const [, requestArgs] = mockFetch.mock.calls[1];
      const body = JSON.parse(String(requestArgs?.body ?? "[]"));
      expect(body[0].cmd).toBe("GetEnc");
      expect(body[0].param).toEqual({ channel: 0, action: 1 });
    });

    it("should get encoding configuration with custom channel", async () => {
      const encResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: { Enc: { channel: 2 } },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(encResponse);

      await client.login();
      await getEnc(client, 2);

      const [, requestArgs] = mockFetch.mock.calls[1];
      const body = JSON.parse(String(requestArgs?.body ?? "[]"));
      expect(body[0].param).toHaveProperty("channel", 2);
    });

    it("should get encoding configuration with custom action", async () => {
      const encResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: { Enc: { channel: 0 } },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(encResponse);

      await client.login();
      await getEnc(client, 0, 0);

      const [, requestArgs] = mockFetch.mock.calls[1];
      const body = JSON.parse(String(requestArgs?.body ?? "[]"));
      expect(body[0].param).toHaveProperty("action", 0);
    });
  });
});
