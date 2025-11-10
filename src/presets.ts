import { ReolinkClient } from "./reolink.js";
import { ReolinkHttpError } from "./types.js";

export type PresetId = number; // 1..64

export interface PtzPreset {
  id: PresetId;
  name: string;
  enable: boolean;
  channel: number;
}

export type AiType = "people" | "vehicle" | "dog_cat" | "face";

export interface GridArea {
  width: number;
  height: number;
  bits: string;
}

export interface PresetZones {
  md?: GridArea;
  ai?: Partial<Record<AiType, GridArea>>;
  masks?: Array<{
    screen: { width: number; height: number };
    block: { x: number; y: number; width: number; height: number };
  }>;
}

export interface PresetRecord {
  preset: PtzPreset;
  zones?: PresetZones;
}

export interface PtzMoveOptions {
  speed?: number;
  settleMs?: number;
}

export interface GuardOptions {
  enable?: boolean;
  timeoutSec?: number;
  setCurrentAsGuard?: boolean;
  goToGuardNow?: boolean;
}

export interface PanoramaPlan {
  panStep: number;
  tiltStep: number;
  settleMs?: number;
  snapshotMode?: "snap" | "framegrab";
  maxTiles?: number;
}

const DEFAULT_SETTLE_MS = 400;
const SUPPORTED_AI_TYPES: AiType[] = ["people", "vehicle", "dog_cat", "face"];
type CanvasResult =
  | Buffer
  | (typeof globalThis extends { HTMLCanvasElement: infer T } ? T : never);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeMdScope(scope: any): GridArea {
  const width = scope?.cols ?? scope?.width;
  const height = scope?.rows ?? scope?.height;
  const table = scope?.table ?? scope?.area ?? scope?.bits;
  if (!width || !height || typeof table !== "string") {
    throw new Error("Invalid motion detection scope received from device");
  }
  if (table.length !== width * height) {
    throw new Error("Motion detection scope size mismatch");
  }
  return { width, height, bits: table };
}

function buildScope(area: GridArea): Record<string, unknown> {
  if (area.bits.length !== area.width * area.height) {
    throw new Error("Grid area bitstring size mismatch");
  }
  return {
    width: area.width,
    height: area.height,
    cols: area.width,
    rows: area.height,
    table: area.bits,
  };
}

function normalizeAiArea(payload: any): GridArea {
  const width = payload?.width ?? payload?.cols;
  const height = payload?.height ?? payload?.rows;
  const bits = payload?.area ?? payload?.table ?? payload?.bits;
  if (!width || !height || typeof bits !== "string") {
    throw new Error("Invalid AI detection area received from device");
  }
  if (bits.length !== width * height) {
    throw new Error("AI detection area size mismatch");
  }
  return { width, height, bits };
}

export class PresetsModule {
  private abilityCache: Map<number, Record<string, any>> = new Map();
  private aiSupportCache: Map<number, AiType[]> = new Map();

  constructor(private client: ReolinkClient) {}

  async listPresets(channel: number): Promise<PtzPreset[]> {
    const response = await this.client.request<any>(
      "GetPtzPreset",
      { channel },
      1
    );

    const rawPresets =
      response?.PtzPreset?.preset ??
      response?.PtzPreset ??
      response?.preset ??
      response?.Presets ??
      [];

    if (!Array.isArray(rawPresets)) {
      return [];
    }

    return rawPresets.map((preset) => ({
      id: Number(preset.id),
      name: String(preset.name ?? `Preset ${preset.id}`),
      enable: Boolean(preset.enable ?? 1),
      channel: Number(preset.channel ?? channel),
    }));
  }

  async setPreset(
    channel: number,
    id: PresetId,
    name: string,
    enable?: boolean
  ): Promise<void> {
    const payload = {
      PtzPreset: {
        channel,
        id,
        name,
        ...(enable === undefined ? {} : { enable: enable ? 1 : 0 }),
      },
    };

    await this.client.request("SetPtzPreset", payload);
  }

  async gotoPreset(
    channel: number,
    id: PresetId,
    opts: PtzMoveOptions = {}
  ): Promise<void> {
    const speed = opts.speed !== undefined ? Math.max(1, Math.min(64, opts.speed)) : undefined;
    const settleMs = opts.settleMs ?? DEFAULT_SETTLE_MS;

    await this.client.request("PtzCtrl", {
      channel,
      op: "ToPos",
      cmdStr: `ToPos=${id}`,
      ...(speed ? { speed } : {}),
    });

    if (settleMs > 0) {
      await delay(settleMs);
    }
  }

  async getPatrol(channel: number): Promise<any> {
    return this.client.request("GetPtzPatrol", { channel }, 1);
  }

  async setPatrol(channel: number, payload: any): Promise<void> {
    await this.client.request("SetPtzPatrol", payload ?? {});
  }

  async getPattern(channel: number): Promise<any> {
    return this.client.request("GetPtzPattern", { channel }, 1);
  }

  async setPattern(channel: number, payload: any): Promise<void> {
    await this.client.request("SetPtzPattern", payload ?? {});
  }

  async getPtzSerial(channel: number, action: 0 | 1 = 1): Promise<any> {
    return this.client.request("GetPtzSerial", { channel }, action);
  }

  async setPtzSerial(
    channel: number,
    value: {
      baudRate: number;
      ctrlAddr: number;
      ctrlProtocol: "PELCO_D" | "PELCO_P";
      dataBit: "CS8" | "CS7" | "CS6" | "CS5";
      flowCtrl: "none" | "hard" | "xon" | "xoff";
      parity: "none" | "odd" | "even";
      stopBit: 1 | 2;
    }
  ): Promise<void> {
    await this.client.request("SetPtzSerial", {
      PtzSerial: {
        channel,
        ...value,
      },
    });
  }

  async getAutoFocus(channel: number): Promise<any> {
    return this.client.request("GetAutoFocus", { channel });
  }

  async setAutoFocus(channel: number, payload: any): Promise<void> {
    await this.client.request("SetAutoFocus", {
      AutoFocus: {
        channel,
        ...(payload ?? {}),
      },
    });
  }

  async getZoomFocus(
    channel: number
  ): Promise<{ focus: { pos: number }; zoom: { pos: number } }> {
    const response = await this.client.request<any>("GetZoomFocus", { channel });
    const zoomFocus = response?.ZoomFocus ?? response;
    return {
      focus: { pos: Number(zoomFocus?.Focus?.pos ?? zoomFocus?.focus?.pos ?? 0) },
      zoom: { pos: Number(zoomFocus?.Zoom?.pos ?? zoomFocus?.zoom?.pos ?? 0) },
    };
  }

  async startZoomFocus(
    channel: number,
    op:
      | "ZoomPos"
      | "FocusPos"
      | "ZoomInc"
      | "ZoomDec"
      | "FocusInc"
      | "FocusDec",
    pos?: number
  ): Promise<void> {
    await this.client.request("StartZoomFocus", {
      ZoomFocus: {
        channel,
        op,
        ...(pos !== undefined ? { pos } : {}),
      },
    });
  }

  async getGuard(
    channel: number
  ): Promise<{ benable: number; bexistPos: number; timeout: number }> {
    const response = await this.client.request<any>("GetPtzGuard", { channel });
    const guard = response?.PtzGuard ?? response;
    return {
      benable: Number(guard?.benable ?? 0),
      bexistPos: Number(guard?.bexistPos ?? guard?.bExistPos ?? 0),
      timeout: Number(guard?.timeout ?? 0),
    };
  }

  async setGuard(channel: number, options: GuardOptions): Promise<void> {
    const timeout = options.timeoutSec ?? 60;
    if (timeout !== 60) {
      throw new Error("Reolink guard timeout currently supports only 60 seconds");
    }

    const payload = {
      PtzGuard: {
        channel,
        ...(options.enable === undefined ? {} : { benable: options.enable ? 1 : 0 }),
        ...(options.setCurrentAsGuard ? { bexistPos: 1 } : {}),
        timeout,
        cmdStr: options.goToGuardNow ? "toPos" : "setPos",
        bSaveCurrentPos: options.setCurrentAsGuard ? 1 : 0,
      },
    };

    await this.client.request("SetPtzGuard", payload);
  }

  async getPtzCheckState(channel: number): Promise<number> {
    const response = await this.client.request<any>("GetPtzCheckState", { channel });
    if (typeof response === "number") {
      return response;
    }
    if (typeof response?.state === "number") {
      return response.state;
    }
    if (typeof response?.PtzCheckState?.state === "number") {
      return response.PtzCheckState.state;
    }
    return Number(response ?? 0);
  }

  async ptzCheck(channel: number): Promise<void> {
    await this.client.request("PtzCheck", { channel });
  }

  async getMdZone(channel: number): Promise<GridArea> {
    const response = await this.client.request<any>("GetMdAlarm", { channel });
    const mdAlarm = response?.MdAlarm ?? response?.Alarm ?? response;
    const scope = mdAlarm?.scope ?? mdAlarm?.Scope ?? mdAlarm;
    return normalizeMdScope(scope);
  }

  async setMdZone(channel: number, area: GridArea): Promise<void> {
    const scope = buildScope(area);
    let mdAlarmPayload: Record<string, unknown> = {
      channel,
      scope,
      table: area.bits,
    };

    try {
      const current = await this.client.request<any>("GetMdAlarm", { channel });
      const mdAlarm = current?.MdAlarm ?? current;
      if (mdAlarm && typeof mdAlarm === "object") {
        mdAlarmPayload = {
          ...mdAlarm,
          channel,
          scope: {
            ...(mdAlarm.scope ?? {}),
            ...scope,
          },
          table: area.bits,
        };
      }
    } catch (error) {
      if (error instanceof ReolinkHttpError) {
        throw error;
      }
      // Ignore inability to fetch current settings; fall back to minimal payload
    }

    await this.client.request("SetMdAlarm", {
      MdAlarm: mdAlarmPayload,
    });
  }

  async getAiCfg(channel?: number): Promise<any> {
    const payload = channel === undefined ? {} : { channel };
    const cfg = await this.client.request<any>("GetAiCfg", payload, 1);
    return cfg?.AiCfg ?? cfg;
  }

  async getAiZone(channel: number, ai_type: AiType): Promise<GridArea> {
    const response = await this.client.request<any>("GetAiAlarm", {
      channel,
      ai_type,
    });
    const aiAlarm = response?.AiAlarm ?? response;
    const scope = aiAlarm?.scope ?? aiAlarm?.Scope ?? aiAlarm;
    const areaPayload = scope?.area
      ? { width: scope.width, height: scope.height, area: scope.area }
      : scope;
    return normalizeAiArea(areaPayload);
  }

  async setAiZone(channel: number, ai_type: AiType, area: GridArea): Promise<void> {
    if (!SUPPORTED_AI_TYPES.includes(ai_type)) {
      throw new Error(`Unsupported AI type: ${ai_type}`);
    }
    if (area.bits.length !== area.width * area.height) {
      throw new Error("Invalid AI zone bitstring length");
    }
    await this.client.request("SetAlarmArea", {
      channel,
      ai_type,
      width: area.width,
      height: area.height,
      area: area.bits,
    });
  }

  async getMasks(
    channel: number,
    action: 0 | 1 = 1
  ): Promise<PresetZones["masks"]> {
    const response = await this.client.request<any>("GetMask", { channel }, action);
    const mask = response?.Mask ?? response?.mask ?? response;
    return mask?.area ?? mask?.areas ?? mask ?? undefined;
  }

  async setMasks(
    channel: number,
    masks: NonNullable<PresetZones["masks"]>,
    enable: 0 | 1
  ): Promise<void> {
    await this.client.request("SetMask", {
      Mask: {
        channel,
        enable,
        area: masks,
      },
    });
  }

  async applyZonesForPreset(
    channel: number,
    presetId: PresetId,
    zones: PresetZones
  ): Promise<void> {
    if (zones.masks) {
      await this.setMasks(channel, zones.masks, zones.masks.length > 0 ? 1 : 0);
    }

    if (zones.md) {
      await this.setMdZone(channel, zones.md);
    }

    if (zones.ai) {
      const entries = Object.entries(zones.ai) as Array<[AiType, GridArea | undefined]>;
      for (const [type, area] of entries) {
        if (!area) continue;
        await this.setAiZone(channel, type, area);
      }
    }
  }

  async gotoPresetWithZones(
    channel: number,
    presetId: PresetId,
    zonesProvider: (id: PresetId) => Promise<PresetZones | undefined>,
    opts: PtzMoveOptions = {}
  ): Promise<void> {
    await this.gotoPreset(channel, presetId, opts);
    const zones = await zonesProvider(presetId);
    if (zones) {
      await this.applyZonesForPreset(channel, presetId, zones);
    }
  }

  async buildPanorama(
    channel: number,
    plan: PanoramaPlan
  ): Promise<{ image: CanvasResult; tiles: number }> {
    const maxTiles = plan.maxTiles ?? 16;
    if (maxTiles <= 0) {
      throw new Error("maxTiles must be positive for panorama plan");
    }

    // Basic implementation: capture a single snapshot as the panorama base.
    const buffer = await this.client.snapshotToBuffer(channel);
    return { image: buffer, tiles: 1 };
  }

  private async getChannelAbility(channel: number): Promise<Record<string, any> | null> {
    if (this.abilityCache.has(channel)) {
      return this.abilityCache.get(channel) ?? null;
    }

    try {
      const response = await this.client.request<any>("GetAbility", {});
      const ability = response?.ability ?? response?.Ability ?? response;
      let channelAbility: Record<string, any> | null = null;

      if (Array.isArray(ability?.abilityChn)) {
        channelAbility =
          ability.abilityChn.find((item: any) => item?.channel === channel) ?? null;
      } else if (ability?.abilityChn && typeof ability.abilityChn === "object") {
        channelAbility = ability.abilityChn[channel] ?? ability.abilityChn[`chn${channel}`] ?? null;
      }

      this.abilityCache.set(channel, channelAbility ?? ability ?? {});
      return this.abilityCache.get(channel) ?? null;
    } catch (error) {
      this.abilityCache.set(channel, {});
      return null;
    }
  }

  async getSupportedAiTypes(channel: number): Promise<AiType[]> {
    if (this.aiSupportCache.has(channel)) {
      return this.aiSupportCache.get(channel)!;
    }

    const supported = new Set<AiType>();

    try {
      const ability = await this.getChannelAbility(channel);
      const aiFlags =
        ability?.supportAi ??
        ability?.supportAI ??
        ability?.ai ??
        ability?.AI ??
        ability;
      if (aiFlags && typeof aiFlags === "object") {
        for (const type of SUPPORTED_AI_TYPES) {
          const flag = aiFlags[type] ?? aiFlags[`support${type}`] ?? aiFlags[`support${type.toUpperCase()}`];
          if (flag === 1 || flag === true) {
            supported.add(type);
          }
        }
      }
    } catch (error) {
      // Ignore ability errors and fall back to GetAiCfg
    }

    if (supported.size === 0) {
      try {
        const cfg = await this.getAiCfg(channel);
        const info = cfg?.ability ?? cfg?.Ability ?? cfg;
        for (const type of SUPPORTED_AI_TYPES) {
          const flag = info?.[type];
          if (flag === 1 || flag === true) {
            supported.add(type);
          }
        }
      } catch (error) {
        // Ignore errors; fallback to empty set
      }
    }

    const result = Array.from(supported);
    this.aiSupportCache.set(channel, result);
    return result;
  }
}
