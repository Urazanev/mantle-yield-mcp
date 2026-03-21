export type BackendGapCode =
  | "missing_endpoint"
  | "missing_field"
  | "invalid_payload_shape"
  | "inconsistent_backend_contract"
  | "http_error"
  | "timeout"
  | "not_found";

export interface BackendGap {
  code: BackendGapCode;
  message: string;
  endpoint?: string;
  field?: string;
  context?: string;
  statusCode?: number;
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: BackendGapCode,
    public readonly details: Omit<BackendGap, "code" | "message"> = {},
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toBackendGap(): BackendGap {
    return {
      code: this.code,
      message: this.message,
      ...this.details,
    };
  }
}

export class MissingEndpointError extends AppError {
  constructor(endpoint: string, statusCode = 404) {
    super(`Backend endpoint is missing: ${endpoint}`, "missing_endpoint", {
      endpoint,
      statusCode,
    });
  }
}

export class MissingFieldError extends AppError {
  constructor(field: string, context: string) {
    super(`Backend payload is missing field "${field}" in ${context}`, "missing_field", {
      field,
      context,
    });
  }
}

export class InvalidPayloadShapeError extends AppError {
  constructor(message: string, context?: string) {
    super(message, "invalid_payload_shape", { context });
  }
}

export class InconsistentBackendContractError extends AppError {
  constructor(message: string, endpoint?: string) {
    super(message, "inconsistent_backend_contract", { endpoint });
  }
}

export class HttpRequestError extends AppError {
  constructor(endpoint: string, statusCode: number, body: string) {
    super(`HTTP ${statusCode} from ${endpoint}: ${body}`, "http_error", {
      endpoint,
      statusCode,
    });
  }
}

export class TimeoutError extends AppError {
  constructor(endpoint: string, timeoutMs: number) {
    super(`Request to ${endpoint} timed out after ${timeoutMs}ms`, "timeout", {
      endpoint,
    });
  }
}

export class ResourceNotFoundError extends AppError {
  constructor(resource: string, context?: string) {
    super(`${resource} not found`, "not_found", {
      context,
    });
  }
}

export function toBackendGap(error: unknown): BackendGap {
  if (error instanceof AppError) {
    return error.toBackendGap();
  }

  if (error instanceof Error) {
    return {
      code: "inconsistent_backend_contract",
      message: error.message,
    };
  }

  return {
    code: "inconsistent_backend_contract",
    message: "Unknown error",
  };
}
