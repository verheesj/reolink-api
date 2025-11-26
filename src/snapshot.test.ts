/**
 * Unit tests for snapshot capture functionality
 */

import { promises as fs } from "fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReolinkClient } from "./reolink.js";
import { snapToBuffer, snapToFile } from "./snapshot.js";

// Mock fs module
vi.mock("fs", () => ({
  promises: {
    writeFile: vi.fn(),
  },
}));

describe("snapshot", () => {
  let mockClient: ReolinkClient;
  let mockApiBinary: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a fake JPEG buffer (starts with FFD8)
    const fakeJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      // ... more JPEG data
      0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9,
    ]);

    // Convert Buffer to ArrayBuffer
    const arrayBuffer = fakeJpeg.buffer.slice(
      fakeJpeg.byteOffset,
      fakeJpeg.byteOffset + fakeJpeg.byteLength
    );

    // Mock apiBinary to return fake JPEG as ArrayBuffer
    mockApiBinary = vi.fn().mockResolvedValue(arrayBuffer);

    // Create mock client
    mockClient = {
      apiBinary: mockApiBinary,
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

    it("should call apiBinary with correct command and channel", async () => {
      await snapToBuffer(mockClient, 0);

      expect(mockApiBinary).toHaveBeenCalledTimes(1);
      expect(mockApiBinary).toHaveBeenCalledWith("Snap", { channel: 0 });
    });

    it("should use correct channel parameter", async () => {
      await snapToBuffer(mockClient, 1);

      expect(mockApiBinary).toHaveBeenCalledTimes(1);
      expect(mockApiBinary).toHaveBeenCalledWith("Snap", { channel: 1 });
    });

    it("should default to channel 0 if not specified", async () => {
      await snapToBuffer(mockClient);

      expect(mockApiBinary).toHaveBeenCalledTimes(1);
      expect(mockApiBinary).toHaveBeenCalledWith("Snap", { channel: 0 });
    });

    it("should throw error for invalid JPEG data", async () => {
      // Mock apiBinary to return invalid data
      const invalidData = Buffer.from([0x00, 0x01, 0x02]);
      const invalidArrayBuffer = invalidData.buffer.slice(
        invalidData.byteOffset,
        invalidData.byteOffset + invalidData.byteLength
      );
      mockApiBinary.mockResolvedValueOnce(invalidArrayBuffer);

      await expect(snapToBuffer(mockClient, 0)).rejects.toThrow(
        "Invalid JPEG data"
      );
    });

    it("should propagate errors from apiBinary", async () => {
      mockApiBinary.mockRejectedValueOnce(new Error("Network error"));

      await expect(snapToBuffer(mockClient, 0)).rejects.toThrow(
        "Network error"
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

      expect(mockApiBinary).toHaveBeenCalledTimes(1);
      expect(mockApiBinary).toHaveBeenCalledWith("Snap", { channel: 0 });
    });

    it("should propagate errors from snapToBuffer", async () => {
      mockApiBinary.mockRejectedValueOnce(new Error("Connection failed"));

      await expect(snapToFile(mockClient, "/tmp/test.jpg", 0)).rejects.toThrow(
        "Connection failed"
      );
    });
  });
});

