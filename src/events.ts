/**
 * Event polling and subscriptions for Reolink devices
 */

import { EventEmitter } from "events";
import { ReolinkClient } from "./reolink.js";

export interface MotionEvent {
  event: "motion";
  channel: number;
  active: boolean;
}

export interface AiEvent {
  event: "ai";
  channel: number;
  person?: boolean;
  vehicle?: boolean;
  pet?: boolean;
  face?: boolean;
  package?: boolean;
  [key: string]: unknown;
}

export type ReolinkEvent = MotionEvent | AiEvent;

export interface ReolinkEventEmitterOptions {
  interval?: number; // Polling interval in milliseconds
  channels?: number[]; // Channels to monitor (default: all)
}

interface LastState {
  motion?: boolean;
  ai?: {
    person?: boolean;
    vehicle?: boolean;
    pet?: boolean;
    face?: boolean;
    package?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Event emitter for Reolink device events (motion, AI detection)
 */
export class ReolinkEventEmitter extends EventEmitter {
  private client: ReolinkClient;
  private interval: number;
  private channels: number[];
  private pollTimer: NodeJS.Timeout | null = null;
  private lastStates: Map<number, LastState> = new Map();
  private isRunning = false;

  constructor(client: ReolinkClient, options: ReolinkEventEmitterOptions = {}) {
    super();
    this.client = client;
    this.interval = options.interval ?? 1000;
    this.channels = options.channels ?? [];
  }

  /**
   * Start polling for events
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.poll();
    this.pollTimer = setInterval(() => {
      this.poll().catch((error) => {
        this.emit("error", error);
      });
    }, this.interval);
  }

  /**
   * Stop polling for events
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.removeAllListeners();
  }

  /**
   * Poll for motion and AI state changes
   */
  private async poll(): Promise<void> {
    // If no channels specified, try to detect from device info
    let channelsToCheck = this.channels;
    if (channelsToCheck.length === 0) {
      try {
        const devInfo = await this.client.api<{ DevInfo?: { channelNum?: number } }>("GetDevInfo", {});
        const channelNum = devInfo?.DevInfo?.channelNum ?? 0;
        channelsToCheck = Array.from({ length: channelNum }, (_, i) => i);
      } catch (error) {
        // If we can't get device info, default to channel 0
        channelsToCheck = [0];
      }
    }

    // Poll each channel
    for (const channel of channelsToCheck) {
      await this.checkChannel(channel);
    }
  }

  /**
   * Check a single channel for state changes
   */
  private async checkChannel(channel: number): Promise<void> {
    const lastState = this.lastStates.get(channel) ?? {};

    // Check motion detection state
    try {
      const mdState = await this.client.api<{
        value?: {
          state?: number;
          [key: string]: unknown;
        };
        [key: string]: unknown;
      }>("GetMdState", { channel });

      const motionActive = mdState?.value?.state === 1 || mdState?.state === 1;

      // Only emit if state changed (not on first poll)
      if (lastState.motion !== undefined && lastState.motion !== motionActive) {
        lastState.motion = motionActive;
        this.emit("motion", {
          event: "motion",
          channel,
          active: motionActive,
        } as MotionEvent);
      } else {
        // Initialize state on first poll
        lastState.motion = motionActive;
      }
    } catch (error) {
      // Motion detection might not be available for this channel
    }

    // Check AI state
    try {
      const aiState = await this.client.api<{
        value?: {
          person?: { state?: number };
          vehicle?: { state?: number };
          pet?: { state?: number };
          face?: { state?: number };
          package?: { state?: number };
          [key: string]: unknown;
        };
        person?: { state?: number };
        vehicle?: { state?: number };
        pet?: { state?: number };
        face?: { state?: number };
        package?: { state?: number };
        [key: string]: unknown;
      }>("GetAiState", { channel });

      const aiData = aiState?.value ?? aiState;
      const personState = aiData?.person ?? aiData?.people;
      const vehicleState = aiData?.vehicle;
      const petState = aiData?.pet ?? aiData?.dog_cat;
      const faceState = aiData?.face;
      const packageState = aiData?.package;
      
      // Helper to check if state is active (handles both object with state property and direct number)
      const isStateActive = (state: unknown): boolean => {
        if (typeof state === "number") {
          return state === 1;
        }
        if (typeof state === "object" && state !== null && "state" in state) {
          return (state as { state?: number }).state === 1;
        }
        return false;
      };
      
      const personActive = isStateActive(personState);
      const vehicleActive = isStateActive(vehicleState);
      const petActive = isStateActive(petState);
      const faceActive = isStateActive(faceState);
      const packageActive = isStateActive(packageState);

      const currentAiState = {
        person: personActive,
        vehicle: vehicleActive,
        pet: petActive,
        face: faceActive,
        package: packageActive,
      };

      // Check if AI state changed (not on first poll)
      const lastAiState = lastState.ai;
      const aiChanged =
        lastAiState !== undefined &&
        (lastAiState.person !== personActive ||
          lastAiState.vehicle !== vehicleActive ||
          lastAiState.pet !== petActive ||
          lastAiState.face !== faceActive ||
          lastAiState.package !== packageActive);

      if (aiChanged) {
        lastState.ai = currentAiState;
        this.emit("ai", {
          event: "ai",
          channel,
          person: personActive,
          vehicle: vehicleActive,
          pet: petActive,
          face: faceActive,
          package: packageActive,
        } as AiEvent);
      } else {
        // Initialize state on first poll
        lastState.ai = currentAiState;
      }
    } catch (error) {
      // AI might not be available for this channel
    }

    this.lastStates.set(channel, lastState);
  }

  /**
   * Check if the emitter is currently running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

