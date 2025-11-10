/**
 * Unit tests for stream URL helpers
 */

import { describe, it, expect } from "vitest";
import { rtspUrl, rtmpUrl, flvUrl, nvrPlaybackFlvUrl } from "./stream.js";

describe("stream URL helpers", () => {
  describe("rtspUrl", () => {
    it("should generate RTSP URL with h264", () => {
      const url = rtspUrl({
        user: "admin",
        pass: "password",
        host: "192.168.1.100",
        channel: 0,
        h265: false,
      });

      expect(url).toBe(
        "rtsp://admin:password@192.168.1.100:554//h264Preview_01_main"
      );
    });

    it("should generate RTSP URL with h265", () => {
      const url = rtspUrl({
        user: "admin",
        pass: "password",
        host: "192.168.1.100",
        channel: 1,
        h265: true,
      });

      expect(url).toBe(
        "rtsp://admin:password@192.168.1.100:554//h265Preview_02_main"
      );
    });
  });

  describe("rtmpUrl", () => {
    it("should generate RTMP URL with token", () => {
      const url = rtmpUrl({
        token: "test-token",
        user: "admin",
        host: "192.168.1.100",
        channel: 0,
        streamType: "main",
      });

      expect(url).toContain("rtmp://192.168.1.100:1935");
      expect(url).toContain("token=test-token");
      expect(url).toContain("channel=0");
    });

    it("should generate RTMP URL with user/pass", () => {
      const url = rtmpUrl({
        user: "admin",
        pass: "password",
        host: "192.168.1.100",
        channel: 1,
        streamType: "sub",
      });

      expect(url).toContain("rtmp://192.168.1.100:1935");
      expect(url).toContain("user=admin");
      expect(url).toContain("password=password");
      expect(url).toContain("channel=1");
    });
  });

  describe("flvUrl", () => {
    it("should generate FLV URL with token", () => {
      const url = flvUrl({
        token: "test-token",
        user: "admin",
        host: "192.168.1.100",
        channel: 0,
        streamType: "main",
      });

      expect(url).toContain("http://192.168.1.100/flv");
      expect(url).toContain("token=test-token");
    });
  });

  describe("nvrPlaybackFlvUrl", () => {
    it("should generate playback FLV URL", () => {
      const url = nvrPlaybackFlvUrl({
        host: "192.168.1.100",
        channel: 0,
        start: "2025-01-01T00:00:00Z",
        type: "main",
        token: "test-token",
        user: "admin",
      });

      expect(url).toContain("http://192.168.1.100/flv");
      expect(url).toContain("recordchannel0_0");
      expect(url).toContain("token=test-token");
    });
  });
});

