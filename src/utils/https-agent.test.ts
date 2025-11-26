/**
 * Unit tests for HTTPS agent utility
 */

import { describe, it, expect, vi } from "vitest";
import { createFetchOptions, isUndiciFetch } from "./https-agent.js";
import { fetch as undiciFetch } from "undici";

describe("https-agent", () => {
  describe("createFetchOptions", () => {
    it("should return base options unchanged when insecure is false", () => {
      const baseOptions = {
        method: "POST" as const,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      };

      const mockFetch = vi.fn() as unknown as typeof fetch;
      const result = createFetchOptions(false, mockFetch, baseOptions);

      expect(result).toEqual(baseOptions);
      expect((result as { dispatcher?: unknown }).dispatcher).toBeUndefined();
      expect((result as { agent?: unknown }).agent).toBeUndefined();
    });

    it("should add dispatcher for undici fetch when insecure is true", () => {
      const baseOptions = {
        method: "GET" as const,
      };

      const result = createFetchOptions(true, undiciFetch, baseOptions);

      expect(result.method).toBe("GET");
      expect((result as { dispatcher?: unknown }).dispatcher).toBeDefined();
      expect((result as { agent?: unknown }).agent).toBeUndefined();
    });

    it("should add agent for non-undici fetch when insecure is true", () => {
      const baseOptions = {
        method: "POST" as const,
        headers: { "Content-Type": "application/json" },
      };

      // Create a mock fetch that is NOT undici
      const mockFetch = vi.fn() as unknown as typeof fetch;

      const result = createFetchOptions(true, mockFetch, baseOptions);

      expect(result.method).toBe("POST");
      expect(result.headers).toEqual({ "Content-Type": "application/json" });
      expect((result as { agent?: unknown }).agent).toBeDefined();
      expect((result as { dispatcher?: unknown }).dispatcher).toBeUndefined();
    });

    it("should work with empty base options", () => {
      const mockFetch = vi.fn() as unknown as typeof fetch;
      const result = createFetchOptions(true, mockFetch);

      expect((result as { agent?: unknown }).agent).toBeDefined();
    });

    it("should preserve all base options when adding agent", () => {
      const baseOptions = {
        method: "POST" as const,
        headers: {
          "Content-Type": "application/json",
          "X-Custom-Header": "value",
        },
        body: JSON.stringify({ data: "test" }),
      };

      const mockFetch = vi.fn() as unknown as typeof fetch;
      const result = createFetchOptions(true, mockFetch, baseOptions);

      expect(result.method).toBe("POST");
      expect(result.headers).toEqual({
        "Content-Type": "application/json",
        "X-Custom-Header": "value",
      });
      expect(result.body).toBe(JSON.stringify({ data: "test" }));
      expect((result as { agent?: unknown }).agent).toBeDefined();
    });

    it("should preserve all base options when adding dispatcher", () => {
      const baseOptions = {
        method: "POST" as const,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: "test" }),
      };

      const result = createFetchOptions(true, undiciFetch, baseOptions);

      expect(result.method).toBe("POST");
      expect(result.headers).toEqual({ "Content-Type": "application/json" });
      expect(result.body).toBe(JSON.stringify({ data: "test" }));
      expect((result as { dispatcher?: unknown }).dispatcher).toBeDefined();
    });
  });

  describe("isUndiciFetch", () => {
    it("should return true for undici fetch", () => {
      expect(isUndiciFetch(undiciFetch)).toBe(true);
    });

    it("should return false for mock fetch", () => {
      const mockFetch = vi.fn() as unknown as typeof fetch;
      expect(isUndiciFetch(mockFetch)).toBe(false);
    });

    it("should return false for globalThis.fetch", () => {
      // Note: globalThis.fetch may not be available in all test environments
      // This test checks the logic when it is available
      if (globalThis.fetch) {
        expect(isUndiciFetch(globalThis.fetch)).toBe(false);
      }
    });
  });
});
