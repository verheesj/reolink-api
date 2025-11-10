/**
 * Core types for Reolink API requests and responses
 */

export interface ReolinkToken {
  name: string;
  leaseTime?: number;
}

export interface ReolinkRequest<T = Record<string, unknown>> {
  cmd: string;
  action: number;
  param: T;
}

export interface ReolinkError {
  rspCode: number;
  detail: string;
}

export interface ReolinkResponseSuccess<T = unknown> {
  code: 0;
  value: T;
  error?: never;
}

export interface ReolinkResponseError {
  code: number;
  value?: never;
  error: ReolinkError;
}

export type ReolinkResponse<T = unknown> =
  | ReolinkResponseSuccess<T>
  | ReolinkResponseError;

/**
 * Custom error class for Reolink API errors
 */
export class ReolinkHttpError extends Error {
  public readonly code: number;
  public readonly rspCode: number;
  public readonly detail: string;

  constructor(code: number, rspCode: number, detail: string, command?: string) {
    const message = command
      ? `${command} ERROR: ${detail} (${rspCode})`
      : `${detail} (${rspCode})`;
    super(message);
    this.name = "ReolinkHttpError";
    this.code = code;
    this.rspCode = rspCode;
    this.detail = detail;
  }
}

