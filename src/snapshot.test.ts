/**
 * Unit tests for snapshot capture functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { promises as fs } from "fs";
import { snapToBuffer, snapToFile } from "./snapshot.js";
import { ReolinkClient } from "./reolink.js";

// Mock fs module
vi.mock("fs", () => ({
  promises: {
    writeFile: vi.fn(),
  },
}));

describe("snapshot", () => {
  let mockClient: ReolinkClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a fake JPEG buffer (starts with FFD8)
    const fakeJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      // ... more JPEG data
      0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9,
    ]);

    // Mock fetch to return fake JPEG
    // Need to create a new ArrayBuffer from the Buffer
    const arrayBuffer = fakeJpeg.buffer.slice(
      fakeJpeg.byteOffset,
      fakeJpeg.byteOffset + fakeJpeg.byteLength
    );

    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => arrayBuffer,
    });

    // Create mock client
    mockClient = {
      getHost: vi.fn().mockReturnValue("192.168.0.79"),
      getUsername: vi.fn().mockReturnValue("admin"),
      getPassword: vi.fn().mockReturnValue("password"),
      getMode: vi.fn().mockReturnValue("long"),
      isInsecure: vi.fn().mockReturnValue(true),
      getToken: vi.fn().mockReturnValue("test-token-123"),
      getFetchImpl: vi.fn().mockReturnValue(mockFetch),
    } as unknown as ReolinkClient;
  });

  describe("snapToBuffer", () => {
    it("should return a Buffer with JPEG data", async () => {
      const buffer = await snapToBuffer(mockClient, 0);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // Verify JPEG header (FFD8)
      expect(buffer[0]).toBe(0xff);
      expect(buffer[1]).toBe(0xd8);
    });

    it("should use correct URL for long connection mode", async () => {
      await snapToBuffer(mockClient, 0);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("cmd=Snap");
      expect(callUrl).toContain("channel=0");
      expect(callUrl).toContain("token=test-token-123");
      expect(callUrl).not.toContain("user=");
      expect(callUrl).not.toContain("password=");
    });

    it("should use correct URL for short connection mode", async () => {
      (mockClient.getMode as ReturnType<typeof vi.fn>).mockReturnValue("short");
      (mockClient.getToken as ReturnType<typeof vi.fn>).mockReturnValue("null");

      await snapToBuffer(mockClient, 1);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("cmd=Snap");
      expect(callUrl).toContain("channel=1");
      expect(callUrl).toContain("user=admin");
      expect(callUrl).toContain("password=password");
      expect(callUrl).not.toContain("token=");
    });

    it("should default to channel 0 if not specified", async () => {
      await snapToBuffer(mockClient);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("channel=0");
    });

    it("should throw error for invalid JPEG data", async () => {
      // Mock fetch to return invalid data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => Buffer.from([0x00, 0x01, 0x02]).buffer,
      });

      await expect(snapToBuffer(mockClient, 0)).rejects.toThrow(
        "Invalid JPEG data"
      );
    });

    it("should throw error on HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(snapToBuffer(mockClient, 0)).rejects.toThrow(
        "Failed to capture snapshot"
      );
    });
  });

  describe("snapToFile", () => {
    it("should write JPEG buffer to file", async () => {
      const writeFileMock = vi.mocked(fs.writeFile);
      writeFileMock.mockResolvedValueOnce(undefined);

      await snapToFile(mockClient, "/tmp/test.jpg", 0);

      expect(writeFileMock).toHaveBeenCalledTimes(1);
      expect(writeFileMock).toHaveBeenCalledWith(
        "/tmp/test.jpg",
        expect.any(Buffer)
      );

      // Verify the buffer passed is valid JPEG
      const bufferArg = writeFileMock.mock.calls[0][1] as Buffer;
      expect(bufferArg[0]).toBe(0xff);
      expect(bufferArg[1]).toBe(0xd8);
    });

    it("should default to channel 0 if not specified", async () => {
      const writeFileMock = vi.mocked(fs.writeFile);
      writeFileMock.mockResolvedValueOnce(undefined);

      await snapToFile(mockClient, "/tmp/test.jpg");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("channel=0");
    });

    it("should propagate errors from snapToBuffer", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(snapToFile(mockClient, "/tmp/test.jpg", 0)).rejects.toThrow(
        "Failed to capture snapshot"
      );
    });
  });
});

