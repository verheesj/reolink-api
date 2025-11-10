import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ReolinkClient } from "../src/reolink.js";
import {
  PresetsModule,
  GridArea,
  PresetZones,
} from "../src/presets.js";

declare global {
  // eslint-disable-next-line no-var
  var fetch: typeof fetch;
}

describe("PresetsModule integration", () => {
  const loginResponse = {
    ok: true,
    json: async () => [
      {
        code: 0,
        value: {
          Token: { name: "token", leaseTime: 3600 },
        },
      },
    ],
  } as const;

  let mockFetch: ReturnType<typeof vi.fn>;
  let client: ReolinkClient;
  let module: PresetsModule;

  beforeEach(() => {
    mockFetch = vi.fn();
    // @ts-expect-error assign mock fetch
    global.fetch = mockFetch;
    client = new ReolinkClient({
      host: "192.168.1.2",
      username: "admin",
      password: "password",
    });
    module = new PresetsModule(client);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("lists presets via GetPtzPreset action=1", async () => {
    const presetResponse = {
      ok: true,
      json: async () => [
        {
          code: 0,
          value: {
            PtzPreset: {
              preset: [
                { id: 1, name: "Home", enable: 1, channel: 0 },
                { id: 2, name: "Door", enable: 0, channel: 0 },
              ],
            },
          },
        },
      ],
    } as const;

    mockFetch.mockResolvedValueOnce(loginResponse);
    mockFetch.mockResolvedValueOnce(presetResponse);

    await client.login();
    const presets = await module.listPresets(0);

    expect(presets).toEqual([
      { id: 1, name: "Home", enable: true, channel: 0 },
      { id: 2, name: "Door", enable: false, channel: 0 },
    ]);

    const [, requestArgs] = mockFetch.mock.calls[1];
    const body = JSON.parse(String(requestArgs?.body ?? "[]"));
    expect(body[0].cmd).toBe("GetPtzPreset");
    expect(body[0].action).toBe(1);
  });

  it("sets a preset with enable flag", async () => {
    const response = {
      ok: true,
      json: async () => [
        {
          code: 0,
          value: {},
        },
      ],
    } as const;

    mockFetch.mockResolvedValueOnce(loginResponse);
    mockFetch.mockResolvedValueOnce(response);

    await client.login();
    await module.setPreset(0, 5, "Entry", true);

    const [, requestArgs] = mockFetch.mock.calls[1];
    const body = JSON.parse(String(requestArgs?.body ?? "[]"));
    expect(body[0].param.PtzPreset).toMatchObject({
      channel: 0,
      id: 5,
      name: "Entry",
      enable: 1,
    });
  });

  it("moves to preset and waits for settle time", async () => {
    vi.useFakeTimers();

    const response = {
      ok: true,
      json: async () => [
        {
          code: 0,
          value: {},
        },
      ],
    } as const;

    mockFetch.mockResolvedValueOnce(loginResponse);
    mockFetch.mockResolvedValueOnce(response);

    await client.login();
    const promise = module.gotoPreset(0, 3, { speed: 32, settleMs: 500 });

    await Promise.resolve();
    const [, requestArgs] = mockFetch.mock.calls[1];
    const body = JSON.parse(String(requestArgs?.body ?? "[]"));
    expect(body[0].param).toMatchObject({
      channel: 0,
      op: "ToPos",
      cmdStr: "ToPos=3",
      speed: 32,
    });

    await vi.runAllTimersAsync();
    await promise;
  });
});

describe("Preset zone helpers", () => {
  let module: PresetsModule;
  let requestMock: ReturnType<typeof vi.fn>;
  let client: ReolinkClient;
  let snapshotMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    requestMock = vi.fn();
    snapshotMock = vi.fn();
    client = {
      request: requestMock,
      requestMany: vi.fn(),
      snapshotToBuffer: snapshotMock,
    } as unknown as ReolinkClient;
    module = new PresetsModule(client);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("applies zones by delegating to zone setters", async () => {
    const md: GridArea = { width: 4, height: 2, bits: "1".repeat(8) };
    const aiArea: GridArea = { width: 4, height: 2, bits: "0".repeat(8) };
    const masks: NonNullable<PresetZones["masks"]> = [
      {
        screen: { width: 1920, height: 1080 },
        block: { x: 100, y: 200, width: 300, height: 400 },
      },
    ];

    const mdSpy = vi
      .spyOn(module, "setMdZone")
      .mockResolvedValueOnce(undefined as unknown as void);
    const aiSpy = vi
      .spyOn(module, "setAiZone")
      .mockResolvedValue(undefined as unknown as void);
    const maskSpy = vi
      .spyOn(module, "setMasks")
      .mockResolvedValueOnce(undefined as unknown as void);

    await module.applyZonesForPreset(0, 1, {
      md,
      ai: { people: aiArea },
      masks,
    });

    expect(maskSpy).toHaveBeenCalledWith(0, masks, 1);
    expect(mdSpy).toHaveBeenCalledWith(0, md);
    expect(aiSpy).toHaveBeenCalledWith(0, "people", aiArea);
  });

  it("fetches existing MD config before writing", async () => {
    const currentConfig = {
      MdAlarm: {
        channel: 0,
        scope: { width: 4, height: 2, table: "0".repeat(8) },
        sensitivity: 50,
      },
    };

    requestMock
      .mockResolvedValueOnce(currentConfig)
      .mockResolvedValueOnce({});

    await module.setMdZone(0, { width: 4, height: 2, bits: "1".repeat(8) });

    expect(requestMock).toHaveBeenNthCalledWith(1, "GetMdAlarm", { channel: 0 });
    expect(requestMock).toHaveBeenNthCalledWith(2, "SetMdAlarm", {
      MdAlarm: expect.objectContaining({
        channel: 0,
        table: "1".repeat(8),
      }),
    });
  });

  it("returns panorama buffer from snapshot helper", async () => {
    const snapshotBuffer = Buffer.from("test");
    snapshotMock.mockResolvedValue(snapshotBuffer);

    const result = await module.buildPanorama(0, {
      panStep: 10,
      tiltStep: 10,
    });

    expect(result.tiles).toBe(1);
    expect(result.image).toBe(snapshotBuffer);
  });
});
