/**
 * Unit tests for System endpoints
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReolinkClient } from "../reolink.js";
import { 
  getAbility, 
  getDevInfo, 
  getEnc, 
  setDevName,
  getDevName,
  getTime,
  setTime,
  getAutoMaint,
  setAutoMaint,
  getHddInfo,
  formatHdd,
  reboot,
  restore,
  checkFirmware,
  upgradeOnline,
  getUpgradeStatus,
  getAutoUpgrade,
  setAutoUpgrade
} from "./system.js";

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

  describe("setDevName", () => {
    it("should set device name", async () => {
      const setDevNameResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: {
              rspCode: 200,
            },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(setDevNameResponse);

      await client.login();
      await setDevName(client, "New Camera Name");

      expect(mockFetch).toHaveBeenCalledTimes(2);

      const [, requestArgs] = mockFetch.mock.calls[1];
      const body = JSON.parse(String(requestArgs?.body ?? "[]"));
      expect(body[0].cmd).toBe("SetDevName");
      expect(body[0].param).toEqual({
        channel: 0,
        DevName: {
          name: "New Camera Name",
        },
      });
    });

    it("should set device name with channel", async () => {
      const setDevNameResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: {
              rspCode: 200,
            },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(setDevNameResponse);

      await client.login();
      await setDevName(client, "Channel 1 Name", 1);

      const [, requestArgs] = mockFetch.mock.calls[1];
      const body = JSON.parse(String(requestArgs?.body ?? "[]"));
      expect(body[0].param).toEqual({
        channel: 1,
        DevName: {
          name: "Channel 1 Name",
        },
      });
    });
  });

  describe("getDevName", () => {
    it("should get device name", async () => {
      const devNameResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: {
              DevName: {
                name: "My Camera",
              },
            },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(devNameResponse);

      await client.login();
      const result = await getDevName(client);

      expect(result).toHaveProperty("DevName");
      expect(result.DevName.name).toBe("My Camera");
      
      const [, requestArgs] = mockFetch.mock.calls[1];
      const body = JSON.parse(String(requestArgs?.body ?? "[]"));
      expect(body[0].param).toEqual({ channel: 0 });
    });

    it("should get device name with channel", async () => {
      const devNameResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: {
              DevName: {
                name: "Channel 1",
              },
            },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(devNameResponse);

      await client.login();
      await getDevName(client, 1);

      const [, requestArgs] = mockFetch.mock.calls[1];
      const body = JSON.parse(String(requestArgs?.body ?? "[]"));
      expect(body[0].param).toEqual({ channel: 1 });
    });
  });

  describe("getTime", () => {
    it("should get system time", async () => {
      const timeResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: {
              Time: {
                year: 2023,
                mon: 12,
                day: 25,
                hour: 10,
                min: 30,
                sec: 0,
                timeFmt: "24h",
                dateFmt: "YYYY-MM-DD",
              },
            },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(timeResponse);

      await client.login();
      const result = await getTime(client);

      expect(result).toHaveProperty("Time");
      expect(result.Time.year).toBe(2023);
    });
  });

  describe("setTime", () => {
    it("should set system time", async () => {
      const setTimeResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: { rspCode: 200 },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(setTimeResponse);

      await client.login();
      await setTime(client, { year: 2024, mon: 1 });

      const [, requestArgs] = mockFetch.mock.calls[1];
      const body = JSON.parse(String(requestArgs?.body ?? "[]"));
      expect(body[0].cmd).toBe("SetTime");
      expect(body[0].param.Time).toEqual({ year: 2024, mon: 1 });
    });
  });

  describe("getAutoMaint", () => {
    it("should get auto maintenance settings", async () => {
      const autoMaintResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: {
              AutoMaint: {
                day: 1,
                hour: 3,
                min: 0,
              },
            },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(autoMaintResponse);

      await client.login();
      const result = await getAutoMaint(client);

      expect(result).toHaveProperty("AutoMaint");
      expect(result.AutoMaint.hour).toBe(3);
    });
  });

  describe("setAutoMaint", () => {
    it("should set auto maintenance settings", async () => {
      const setAutoMaintResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: { rspCode: 200 },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(setAutoMaintResponse);

      await client.login();
      await setAutoMaint(client, { day: 7, hour: 2, min: 0 });

      const [, requestArgs] = mockFetch.mock.calls[1];
      const body = JSON.parse(String(requestArgs?.body ?? "[]"));
      expect(body[0].cmd).toBe("SetAutoMaint");
      expect(body[0].param.AutoMaint).toEqual({ day: 7, hour: 2, min: 0 });
    });
  });

  describe("getHddInfo", () => {
    it("should get HDD info", async () => {
      const hddInfoResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: {
              HddInfo: [
                {
                  capacity: 1000,
                  hddName: "HDD1",
                  hddNo: 0,
                  status: 1,
                  type: "SATA",
                },
              ],
            },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(hddInfoResponse);

      await client.login();
      const result = await getHddInfo(client);

      expect(result).toHaveProperty("HddInfo");
      expect(result.HddInfo).toHaveLength(1);
    });
  });

  describe("formatHdd", () => {
    it("should format HDD", async () => {
      const formatResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: { rspCode: 200 },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(formatResponse);

      await client.login();
      await formatHdd(client, 0);

      const [, requestArgs] = mockFetch.mock.calls[1];
      const body = JSON.parse(String(requestArgs?.body ?? "[]"));
      expect(body[0].cmd).toBe("Format");
      expect(body[0].param.HddInfo).toEqual({ hddNo: 0 });
    });
  });

  describe("reboot", () => {
    it("should reboot device", async () => {
      const rebootResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: { rspCode: 200 },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(rebootResponse);

      await client.login();
      await reboot(client);

      const [, requestArgs] = mockFetch.mock.calls[1];
      const body = JSON.parse(String(requestArgs?.body ?? "[]"));
      expect(body[0].cmd).toBe("Reboot");
    });
  });

  describe("restore", () => {
    it("should restore device", async () => {
      const restoreResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: { rspCode: 200 },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(restoreResponse);

      await client.login();
      await restore(client);

      const [, requestArgs] = mockFetch.mock.calls[1];
      const body = JSON.parse(String(requestArgs?.body ?? "[]"));
      expect(body[0].cmd).toBe("Restore");
    });
  });

  describe("checkFirmware", () => {
    it("should check firmware", async () => {
      const checkResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: { rspCode: 200 },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(checkResponse);

      await client.login();
      await checkFirmware(client);

      const [, requestArgs] = mockFetch.mock.calls[1];
      const body = JSON.parse(String(requestArgs?.body ?? "[]"));
      expect(body[0].cmd).toBe("CheckFirmware");
    });
  });

  describe("upgradeOnline", () => {
    it("should upgrade online", async () => {
      const upgradeResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: { rspCode: 200 },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(upgradeResponse);

      await client.login();
      await upgradeOnline(client);

      const [, requestArgs] = mockFetch.mock.calls[1];
      const body = JSON.parse(String(requestArgs?.body ?? "[]"));
      expect(body[0].cmd).toBe("UpgradeOnline");
    });
  });

  describe("getUpgradeStatus", () => {
    it("should get upgrade status", async () => {
      const statusResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: {
              UpgradeStatus: {
                status: 1,
                progress: 50,
                message: "Upgrading",
              },
            },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(statusResponse);

      await client.login();
      const result = await getUpgradeStatus(client);

      expect(result).toHaveProperty("UpgradeStatus");
      expect(result.UpgradeStatus.progress).toBe(50);
    });
  });

  describe("getAutoUpgrade", () => {
    it("should get auto upgrade settings", async () => {
      const autoUpgradeResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: {
              AutoUpgrade: {
                enable: 1,
              },
            },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(autoUpgradeResponse);

      await client.login();
      const result = await getAutoUpgrade(client);

      expect(result).toHaveProperty("AutoUpgrade");
      expect(result.AutoUpgrade.enable).toBe(1);
    });
  });

  describe("setAutoUpgrade", () => {
    it("should set auto upgrade settings", async () => {
      const setAutoUpgradeResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            code: 0,
            value: { rspCode: 200 },
          },
        ]),
      };

      mockFetch.mockResolvedValueOnce(createLoginResponse());
      mockFetch.mockResolvedValueOnce(setAutoUpgradeResponse);

      await client.login();
      await setAutoUpgrade(client, 0);

      const [, requestArgs] = mockFetch.mock.calls[1];
      const body = JSON.parse(String(requestArgs?.body ?? "[]"));
      expect(body[0].cmd).toBe("SetAutoUpgrade");
      expect(body[0].param.AutoUpgrade).toEqual({ enable: 0 });
    });
  });
});
