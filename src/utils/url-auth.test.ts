/**
 * Unit tests for URL authentication utility
 */

import { describe, it, expect } from "vitest";
import { buildAuthParams } from "./url-auth.js";

describe("url-auth", () => {
  describe("buildAuthParams", () => {
    it("should build params with token and user", () => {
      const result = buildAuthParams({
        token: "test-token-123",
        user: "admin",
      });

      expect(result).toBe("user=admin&token=test-token-123");
    });

    it("should build params with token only (empty user)", () => {
      const result = buildAuthParams({
        token: "test-token-123",
      });

      expect(result).toBe("user=&token=test-token-123");
    });

    it("should build params with user and password", () => {
      const result = buildAuthParams({
        user: "admin",
        pass: "password123",
      });

      expect(result).toBe("user=admin&password=password123");
    });

    it("should URL-encode special characters in token", () => {
      const result = buildAuthParams({
        token: "token=with&special/chars",
        user: "admin",
      });

      expect(result).toBe(
        "user=admin&token=token%3Dwith%26special%2Fchars"
      );
    });

    it("should URL-encode special characters in user", () => {
      const result = buildAuthParams({
        token: "token123",
        user: "admin@domain.com",
      });

      expect(result).toBe("user=admin%40domain.com&token=token123");
    });

    it("should URL-encode special characters in password", () => {
      const result = buildAuthParams({
        user: "admin",
        pass: "pass&word=123",
      });

      expect(result).toBe("user=admin&password=pass%26word%3D123");
    });

    it("should prefer token over user/pass when both provided", () => {
      const result = buildAuthParams({
        token: "test-token",
        user: "admin",
        pass: "password",
      });

      // When token is present, it should use token mode
      expect(result).toContain("token=");
      expect(result).not.toContain("password=");
    });

    it("should throw error when no authentication provided", () => {
      expect(() => buildAuthParams({})).toThrow(
        "Authentication requires either token or user/password"
      );
    });

    it("should throw error when only user is provided (no pass)", () => {
      expect(() => buildAuthParams({ user: "admin" })).toThrow(
        "Authentication requires either token or user/password"
      );
    });

    it("should throw error when only pass is provided (no user)", () => {
      expect(() => buildAuthParams({ pass: "password" })).toThrow(
        "Authentication requires either token or user/password"
      );
    });
  });
});
