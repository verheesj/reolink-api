/**
 * Reolink API Client
 * 
 * TypeScript implementation of the Reolink API client matching the functionality
 * of the bash script reolink.sh
 */

import https from "https";
import {
  ReolinkRequest,
  ReolinkResponse,
  ReolinkResponseError,
  ReolinkHttpError,
  ReolinkToken,
} from "./types.js";
import {
  ReolinkEventEmitter,
  ReolinkEventEmitterOptions,
} from "./events.js";

interface LoginParams {
  User: {
    userName: string;
    password: string;
  };
}

interface LoginResponse {
  Token: ReolinkToken;
}

export type ReolinkMode = "long" | "short";

export interface ReolinkOptions {
  host: string;
  username: string;
  password: string;
  mode?: ReolinkMode;
  insecure?: boolean;
  debug?: boolean;
  fetch?: typeof fetch;
}

export class ReolinkClient {
  private host: string;
  private username: string;
  private password: string;
  private mode: ReolinkMode;
  private insecure: boolean;
  private debug: boolean;
  private token: string = "null";
  private tokenLeaseTime: number = 3600; // Default 3600 seconds (1 hour)
  private tokenExpiryTime: number = 0; // Timestamp when token expires
  private url: string;
  private fetchImpl: typeof fetch;
  private closed: boolean = false;
  private eventEmitters: Set<ReolinkEventEmitter> = new Set();

  constructor(options: ReolinkOptions) {
    this.host = options.host;
    this.username = options.username;
    this.password = options.password;
    this.mode = options.mode ?? "long";
    this.insecure = options.insecure ?? true; // Default to insecure (curl -k equivalent)
    this.debug = options.debug ?? false;
    this.fetchImpl = options.fetch ?? fetch;
    this.url = `https://${this.host}/cgi-bin/api.cgi`;
  }

  /**
   * Make an API call to the Reolink device with automatic token refresh
   */
  async api<T = unknown>(
    command: string,
    params: Record<string, unknown> = {}
  ): Promise<T> {
    return this.withToken<T>(command, params);
  }

  /**
   * Internal API call method (without token refresh wrapper)
   */
  private async apiInternal<T = unknown>(
    command: string,
    params: Record<string, unknown> = {}
  ): Promise<T> {
    const request: ReolinkRequest = {
      cmd: command,
      action: 0,
      param: params,
    };

    // Build query string based on mode
    let queryParams: string;
    if (this.mode === "short") {
      // Short connection mode: include user and password in query params
      const user = encodeURIComponent(this.username);
      const pass = encodeURIComponent(this.password);
      queryParams = `cmd=${command}&user=${user}&password=${pass}`;
    } else {
      // Long connection mode: use token
      queryParams = `cmd=${command}&token=${this.token}`;
    }

    const target = `${this.url}?${queryParams}`;

    if (this.debug) {
      console.error(">>> REQUEST >>>");
      console.error(`TARGET: ${target}`);
      console.error(JSON.stringify(request, null, 2));
    }

    try {
      const fetchOptions: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([request]),
      };

      // Create an HTTPS agent that ignores certificate errors (equivalent to curl -k)
      if (this.insecure) {
        const agent = new https.Agent({
          rejectUnauthorized: false,
        });
        (fetchOptions as { agent?: https.Agent }).agent = agent;
      }

      const response = await this.fetchImpl(target, fetchOptions);

      if (!response.ok) {
        throw new ReolinkHttpError(
          response.status,
          response.status,
          `HTTP error! status: ${response.status}`,
          command
        );
      }

      const data = (await response.json()) as ReolinkResponse<T>[];
      const result = data[0];

      if (this.debug) {
        console.error("<<< RESPONSE <<<");
        console.error(JSON.stringify(result, null, 2));
      }

      if (result.code === 0) {
        return result.value as T;
      } else {
        const errorResult = result as ReolinkResponseError;
        throw new ReolinkHttpError(
          errorResult.code,
          errorResult.error.rspCode,
          errorResult.error.detail,
          command
        );
      }
    } catch (error) {
      if (error instanceof ReolinkHttpError) {
        throw error;
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unexpected error: ${String(error)}`);
    }
  }

  /**
   * Login and get a session token
   */
  async login(): Promise<string> {
    const params: LoginParams = {
      User: {
        userName: this.username,
        password: this.password,
      },
    };

    // Use direct API call to avoid token refresh loop
    const request: ReolinkRequest = {
      cmd: "Login",
      action: 0,
      param: params as unknown as Record<string, unknown>,
    };

    const target = `${this.url}?cmd=Login&token=null`;

    if (this.debug) {
      console.error(">>> LOGIN REQUEST >>>");
      console.error(`TARGET: ${target}`);
      console.error(JSON.stringify(request, null, 2));
    }

    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([request]),
    };

    if (this.insecure) {
      const agent = new https.Agent({
        rejectUnauthorized: false,
      });
      (fetchOptions as { agent?: https.Agent }).agent = agent;
    }

    const response = await this.fetchImpl(target, fetchOptions);

    if (!response.ok) {
      throw new ReolinkHttpError(
        response.status,
        response.status,
        `HTTP error! status: ${response.status}`,
        "Login"
      );
    }

    const data = (await response.json()) as ReolinkResponse<LoginResponse>[];
    const result = data[0];

    if (result.code === 0) {
      const loginResponse = result.value as LoginResponse;
      this.token = loginResponse.Token.name;
      this.tokenLeaseTime = loginResponse.Token.leaseTime ?? 3600;
      this.tokenExpiryTime = Date.now() + this.tokenLeaseTime * 1000;
      return this.token;
    } else {
      const errorResult = result as ReolinkResponseError;
      throw new ReolinkHttpError(
        errorResult.code,
        errorResult.error.rspCode,
        errorResult.error.detail,
        "Login"
      );
    }
  }

  /**
   * Check if token needs refresh and refresh if necessary
   */
  private async ensureToken(): Promise<void> {
    // Refresh if token expires within 60 seconds
    if (this.token === "null" || Date.now() >= this.tokenExpiryTime - 60000) {
      if (this.debug) {
        console.error("Token expired or expiring soon, refreshing...");
      }
      await this.login();
    }
  }

  /**
   * Wrapper for API calls that handles token refresh on 401/invalid token errors
   */
  private async withToken<T>(
    command: string,
    params: Record<string, unknown> = {},
    retryCount = 0
  ): Promise<T> {
    if (this.closed) {
      throw new Error("Client is closed");
    }

    // In short mode, skip token management
    if (this.mode === "short") {
      return this.apiInternal<T>(command, params);
    }

    await this.ensureToken();

    try {
      return await this.apiInternal<T>(command, params);
    } catch (error) {
      // Check if it's a token-related error (401 or specific error codes)
      if (error instanceof ReolinkHttpError) {
        const isTokenError =
          error.code === 401 ||
          error.rspCode === -1 || // Common invalid token code
          error.detail.toLowerCase().includes("token") ||
          error.detail.toLowerCase().includes("session");

        if (isTokenError && retryCount === 0) {
          if (this.debug) {
            console.error("Token error detected, re-logging in and retrying...");
          }
          // Force token refresh
          this.token = "null";
          this.tokenExpiryTime = 0;
          // Retry once after re-login
          return this.withToken<T>(command, params, retryCount + 1);
        }
      }
      throw error;
    }
  }

  /**
   * Logout and invalidate the session token
   */
  async logout(): Promise<void> {
    if (this.token === "null" || this.token === "" || this.closed) {
      return;
    }
    try {
      await this.apiInternal("Logout");
    } catch (error) {
      // Ignore logout errors (token may already be invalid)
      if (this.debug) {
        console.error("Logout error (ignored):", error);
      }
    } finally {
      this.token = "null";
      this.tokenExpiryTime = 0;
    }
  }

  /**
   * Create an event emitter for polling device events
   */
  createEventEmitter(
    options?: ReolinkEventEmitterOptions
  ): ReolinkEventEmitter {
    const emitter = new ReolinkEventEmitter(this, options);
    this.eventEmitters.add(emitter);
    return emitter;
  }

  /**
   * Close the client and logout (idempotent)
   */
  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;

    // Stop all event emitters
    for (const emitter of this.eventEmitters) {
      emitter.stop();
    }
    this.eventEmitters.clear();

    await this.logout();
  }

  /**
   * Get the current token
   */
  getToken(): string {
    return this.token;
  }

  /**
   * Check if the client is closed
   */
  isClosed(): boolean {
    return this.closed;
  }

  /**
   * Get the host
   */
  getHost(): string {
    return this.host;
  }

  /**
   * Get the username
   */
  getUsername(): string {
    return this.username;
  }

  /**
   * Get the password
   */
  getPassword(): string {
    return this.password;
  }

  /**
   * Get the connection mode
   */
  getMode(): ReolinkMode {
    return this.mode;
  }

  /**
   * Check if insecure mode is enabled
   */
  isInsecure(): boolean {
    return this.insecure;
  }

  /**
   * Get the fetch implementation
   */
  getFetchImpl(): typeof fetch {
    return this.fetchImpl;
  }

  /**
   * Capture a snapshot and return as Buffer
   */
  async snapshotToBuffer(channel: number = 0): Promise<Buffer> {
    const { snapToBuffer } = await import("./snapshot.js");
    return snapToBuffer(this, channel);
  }

  /**
   * Capture a snapshot and save to file
   */
  async snapshotToFile(path: string, channel: number = 0): Promise<void> {
    const { snapToFile } = await import("./snapshot.js");
    return snapToFile(this, path, channel);
  }
}

