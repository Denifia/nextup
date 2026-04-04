export class NextupError extends Error {
  readonly code: string;
  readonly exitCode: number;

  constructor(code: string, detail: string, exitCode: number) {
    super(detail);
    this.code = code;
    this.exitCode = exitCode;
    this.name = this.constructor.name;
  }
}

export class UsageError extends NextupError {
  constructor(detail: string) {
    super("usage", detail, 64);
  }
}

export class InvalidInputError extends NextupError {
  constructor(detail: string) {
    super("invalid_input", detail, 2);
  }
}

export class UnparseableError extends NextupError {
  constructor(detail = "expression could not be resolved to a usable date/time") {
    super("unparseable", detail, 2);
  }
}

export class WindowPastError extends NextupError {
  constructor(detail = "no eligible future time remains after clamping") {
    super("window_past", detail, 2);
  }
}

export class WindowEmptyError extends NextupError {
  constructor(detail = "constraints leave no eligible time") {
    super("window_empty", detail, 2);
  }
}

export class InternalError extends NextupError {
  constructor(detail = "Unexpected internal error") {
    super("internal", detail, 70);
  }
}

export function toFailure(error: unknown): NextupError {
  if (error instanceof NextupError) {
    return error;
  }

  return new InternalError();
}
