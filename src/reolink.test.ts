/**
 * Unit tests for ReolinkClient
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReolinkClient } from "./reolink.js";
import { ReolinkHttpError } from "./types.js";

// Mock fetch
global.fetch = vi.fn();

describe("ReolinkClient", () => {
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
  const mockOptions = {
    host: "192.168.1.100",
    username: "admin",
    password: "password",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("login", () => {
    it("should login successfully and return token", async () => {
      const mockResponse = {
        ok: true,
        json: async () => [
          {
            code: 0,
            value: {
              Token: {
                name: "test-token-123",
                leaseTime: 3600,
              },
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const client = new ReolinkClient(mockOptions);
      const token = await client.login();

      expect(token).toBe("test-token-123");
      expect(client.getToken()).toBe("test-token-123");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should throw error on login failure", async () => {
      const mockResponse = {
        ok: true,
        json: async () => [
          {
            code: 1,
            error: {
              rspCode: -1,
              detail: "Invalid credentials",
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const client = new ReolinkClient(mockOptions);

      await expect(client.login()).rejects.toThrow(ReolinkHttpError);
    });
  });

  describe("api", () => {
    it("should make API call successfully", async () => {
      // Mock login
      const loginResponse = {
        ok: true,
        json: async () => [
          {
            code: 0,
            value: {
              Token: {
                name: "test-token",
                leaseTime: 3600,
              },
            },
          },
        ],
      };

      // Mock API call
      const apiResponse = {
        ok: true,
        json: async () => [
          {
            code: 0,
            value: { result: "success" },
          },
        ],
      };

      mockFetch
        .mockResolvedValueOnce(loginResponse)
        .mockResolvedValueOnce(apiResponse);

      const client = new ReolinkClient(mockOptions);
      await client.login();
      const result = await client.api("GetDevInfo");

      expect(result).toEqual({ result: "success" });
    });

    it("should throw ReolinkHttpError on API error", async () => {
      const loginResponse = {
        ok: true,
        json: async () => [
          {
            code: 0,
            value: {
              Token: {
                name: "test-token",
                leaseTime: 3600,
              },
            },
          },
        ],
      };

      const apiErrorResponse = {
        ok: true,
        json: async () => [
          {
            code: 1,
            error: {
              rspCode: -2,
              detail: "Command not supported",
            },
          },
        ],
      };

      mockFetch
        .mockResolvedValueOnce(loginResponse)
        .mockResolvedValueOnce(apiErrorResponse);

      const client = new ReolinkClient(mockOptions);
      await client.login();

      await expect(client.api("InvalidCommand")).rejects.toThrow(
        ReolinkHttpError
      );
    });
  });

  describe("close", () => {
    it("should logout and close client", async () => {
      const loginResponse = {
        ok: true,
        json: async () => [
          {
            code: 0,
            value: {
              Token: {
                name: "test-token",
                leaseTime: 3600,
              },
            },
          },
        ],
      };

      const logoutResponse = {
        ok: true,
        json: async () => [{ code: 0, value: {} }],
      };

      mockFetch
        .mockResolvedValueOnce(loginResponse)
        .mockResolvedValueOnce(logoutResponse);

      const client = new ReolinkClient(mockOptions);
      await client.login();
      await client.close();

      expect(client.isClosed()).toBe(true);
    });
  });
});

