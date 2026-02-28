export type OpenClawErrorCode =
  | "HTTP_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE"
  | "UNKNOWN";

export class OpenClawApiError extends Error {
  readonly code: OpenClawErrorCode;
  readonly status?: number;
  readonly requestId?: string;
  readonly details?: unknown;
  readonly retriable: boolean;

  constructor(params: {
    message: string;
    code?: OpenClawErrorCode;
    status?: number;
    requestId?: string;
    details?: unknown;
    retriable?: boolean;
  }) {
    super(params.message);
    this.name = "OpenClawApiError";
    this.code = params.code ?? "UNKNOWN";
    this.status = params.status;
    this.requestId = params.requestId;
    this.details = params.details;
    this.retriable = params.retriable ?? false;
  }
}

export async function normalizeOpenClawError(error: unknown): Promise<OpenClawApiError> {
  if (error instanceof OpenClawApiError) return error;

  if (error instanceof DOMException && error.name === "AbortError") {
    return new OpenClawApiError({
      message: "OpenClaw request timed out.",
      code: "TIMEOUT",
      retriable: true,
      details: { name: error.name },
    });
  }

  if (error instanceof Error) {
    return new OpenClawApiError({
      message: error.message || "OpenClaw request failed.",
      code: "NETWORK_ERROR",
      retriable: true,
      details: { name: error.name },
    });
  }

  return new OpenClawApiError({
    message: "Unknown OpenClaw error.",
    code: "UNKNOWN",
    retriable: false,
    details: error,
  });
}
