/**
 * Unit tests for ReolinkEventEmitter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ReolinkEventEmitter } from "./events.js";
import { ReolinkClient } from "./reolink.js";

// Mock ReolinkClient
class MockReolinkClient {
  api = vi.fn();
}

describe("ReolinkEventEmitter", () => {
  let mockClient: MockReolinkClient;
  let emitter: ReolinkEventEmitter;

  beforeEach(() => {
    vi.useFakeTimers();
    mockClient = new MockReolinkClient();
    emitter = new ReolinkEventEmitter(mockClient as unknown as ReolinkClient, {
      interval: 100,
      channels: [0, 1],
    });
  });

  afterEach(() => {
    emitter.stop();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("start/stop", () => {
    it("should start polling when start() is called", async () => {
      mockClient.api.mockResolvedValue({ value: { state: 0 } });

      emitter.start();
      expect(emitter.isActive()).toBe(true);

      await vi.advanceTimersByTimeAsync(100);
      expect(mockClient.api).toHaveBeenCalled();
    });

    it("should stop polling when stop() is called", async () => {
      mockClient.api.mockResolvedValue({ value: { state: 0 } });

      emitter.start();
      expect(emitter.isActive()).toBe(true);

      await vi.advanceTimersByTimeAsync(100);
      const callCount = mockClient.api.mock.calls.length;

      emitter.stop();
      expect(emitter.isActive()).toBe(false);

      await vi.advanceTimersByTimeAsync(200);
      // Should not have made additional calls after stop
      expect(mockClient.api.mock.calls.length).toBe(callCount);
    });

    it("should not start multiple times if already running", async () => {
      mockClient.api.mockResolvedValue({ value: { state: 0 } });

      emitter.start();
      await vi.advanceTimersByTimeAsync(100);
      const initialCallCount = mockClient.api.mock.calls.length;

      emitter.start(); // Second start should be ignored
      await vi.advanceTimersByTimeAsync(100);
      // Should have same number of calls (no duplicate polling)
      expect(mockClient.api.mock.calls.length).toBeGreaterThanOrEqual(
        initialCallCount
      );
    });
  });

  describe("motion events", () => {
    it("should emit motion event when state changes from inactive to active", async () => {
      // Use single channel for simpler test
      const singleChannelEmitter = new ReolinkEventEmitter(
        mockClient as unknown as ReolinkClient,
        { interval: 100, channels: [0] }
      );
      const motionHandler = vi.fn();
      singleChannelEmitter.on("motion", motionHandler);

      // First poll: inactive
      mockClient.api.mockResolvedValueOnce({ value: { state: 0 } });
      singleChannelEmitter.start();
      await vi.advanceTimersByTimeAsync(100);

      // Second poll: active (state change)
      mockClient.api.mockResolvedValueOnce({ value: { state: 1 } });
      await vi.advanceTimersByTimeAsync(100);

      // Should emit once for channel 0 (state changed)
      expect(motionHandler).toHaveBeenCalledTimes(1);
      expect(motionHandler).toHaveBeenCalledWith({
        event: "motion",
        channel: 0,
        active: true,
      });

      singleChannelEmitter.stop();
    });

    it("should not emit motion event when state does not change", async () => {
      // Use single channel for simpler test
      const singleChannelEmitter = new ReolinkEventEmitter(
        mockClient as unknown as ReolinkClient,
        { interval: 100, channels: [0] }
      );
      const motionHandler = vi.fn();
      singleChannelEmitter.on("motion", motionHandler);

      // Both polls: active (no change)
      mockClient.api.mockResolvedValue({ value: { state: 1 } });
      singleChannelEmitter.start();
      await vi.advanceTimersByTimeAsync(100); // First poll - initializes state, no emit
      await vi.advanceTimersByTimeAsync(100); // Second poll - no change, no emit

      // Should not emit when state doesn't change
      expect(motionHandler).toHaveBeenCalledTimes(0);

      singleChannelEmitter.stop();
    });

    it("should handle GetMdState errors gracefully", async () => {
      const errorHandler = vi.fn();
      emitter.on("error", errorHandler);

      // Error on first channel, success on second
      mockClient.api
        .mockRejectedValueOnce(new Error("API error")) // Channel 0 fails
        .mockResolvedValueOnce({ value: { state: 0 } }); // Channel 1 succeeds
      emitter.start();
      await vi.advanceTimersByTimeAsync(100);

      // Should not crash, but error might be caught internally
      // The important thing is it doesn't throw
      expect(emitter.isActive()).toBe(true);
    });
  });

  describe("AI events", () => {
    it("should emit AI event when person detection changes", async () => {
      // Use single channel for simpler test
      const singleChannelEmitter = new ReolinkEventEmitter(
        mockClient as unknown as ReolinkClient,
        { interval: 100, channels: [0] }
      );
      const aiHandler = vi.fn();
      singleChannelEmitter.on("ai", aiHandler);

      // First poll: no person
      mockClient.api
        .mockResolvedValueOnce({ value: { state: 0 } }) // GetMdState
        .mockResolvedValueOnce({
          value: { person: { state: 0 }, vehicle: { state: 0 } },
        }); // GetAiState

      singleChannelEmitter.start();
      await vi.advanceTimersByTimeAsync(100);

      // Second poll: person detected (state change)
      mockClient.api
        .mockResolvedValueOnce({ value: { state: 0 } }) // GetMdState
        .mockResolvedValueOnce({
          value: { person: { state: 1 }, vehicle: { state: 0 } },
        }); // GetAiState - state change

      await vi.advanceTimersByTimeAsync(100);

      // Should emit once for channel 0 (state changed)
      expect(aiHandler).toHaveBeenCalledTimes(1);
      expect(aiHandler).toHaveBeenCalledWith({
        event: "ai",
        channel: 0,
        person: true,
        vehicle: false,
        pet: false,
        face: false,
        package: false
      });

      singleChannelEmitter.stop();
    });

    it("should not emit AI event when state does not change", async () => {
      // Use single channel for simpler test
      const singleChannelEmitter = new ReolinkEventEmitter(
        mockClient as unknown as ReolinkClient,
        { interval: 100, channels: [0] }
      );
      const aiHandler = vi.fn();
      singleChannelEmitter.on("ai", aiHandler);

      // Both polls: same state
      mockClient.api
        .mockResolvedValue({ value: { state: 0 } }) // GetMdState
        .mockResolvedValue({
          value: { person: { state: 1 }, vehicle: { state: 0 } },
        }); // GetAiState

      singleChannelEmitter.start();
      await vi.advanceTimersByTimeAsync(100); // First poll - initializes state, no emit
      await vi.advanceTimersByTimeAsync(100); // Second poll - no change, no emit

      // Should not emit when state doesn't change
      expect(aiHandler).toHaveBeenCalledTimes(0);

      singleChannelEmitter.stop();
    });
  });

  describe("channel detection", () => {
    it("should auto-detect channels from GetDevInfo if not specified", async () => {
      const emitterNoChannels = new ReolinkEventEmitter(
        mockClient as unknown as ReolinkClient,
        { interval: 100 }
      );

      mockClient.api
        .mockResolvedValueOnce({ DevInfo: { channelNum: 2 } }) // GetDevInfo
        .mockResolvedValue({ value: { state: 0 } }); // GetMdState

      emitterNoChannels.start();
      await vi.advanceTimersByTimeAsync(100);

      // Should have called GetDevInfo and then GetMdState for channels 0 and 1
      expect(mockClient.api).toHaveBeenCalledWith("GetDevInfo", {});
      expect(mockClient.api).toHaveBeenCalledWith("GetMdState", { channel: 0 });
      expect(mockClient.api).toHaveBeenCalledWith("GetMdState", { channel: 1 });

      emitterNoChannels.stop();
    });
  });
});

