/**
 * URL Authentication Utility
 *
 * Provides centralized authentication parameter building for
 * streaming URLs (RTMP, FLV, etc.).
 */

/**
 * Authentication options for building URL parameters
 */
export interface AuthOptions {
  /** Session token for long connection mode */
  token?: string;
  /** Username for authentication */
  user?: string;
  /** Password for short connection mode */
  pass?: string;
}

/**
 * Build authentication parameters for streaming URLs.
 *
 * Supports two modes:
 * - Long connection mode: Uses token with optional user
 * - Short connection mode: Uses user/password combination
 *
 * @param options - Authentication options
 * @returns URL-encoded authentication parameter string
 *
 * @throws Error if neither token nor user/pass credentials are provided
 *
 * @example
 * ```typescript
 * // Long connection mode with token
 * const params = buildAuthParams({ token: "abc123", user: "admin" });
 * // Returns: "user=admin&token=abc123"
 *
 * // Short connection mode with user/pass
 * const params = buildAuthParams({ user: "admin", pass: "password" });
 * // Returns: "user=admin&password=password"
 * ```
 */
export function buildAuthParams(options: AuthOptions): string {
  const { token, user, pass } = options;

  if (token) {
    // Long connection mode with token
    return `user=${encodeURIComponent(user || "")}&token=${encodeURIComponent(token)}`;
  } else if (user && pass) {
    // Short connection mode with user/pass
    return `user=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
  } else {
    throw new Error("Authentication requires either token or user/password");
  }
}
