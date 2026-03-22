const levels = ["debug", "info", "warn", "error", "silent"] as const;
type LogLevel = (typeof levels)[number];

export class Logger {
  private readonly currentLevelIndex: number;

  constructor(level: string) {
    const index = levels.indexOf(level as LogLevel);
    this.currentLevelIndex = index === -1 ? 1 : index;
  }

  debug(message: string, meta?: unknown): void {
    this.log("debug", message, meta);
  }

  info(message: string, meta?: unknown): void {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.log("warn", message, meta);
  }

  error(message: string, meta?: unknown): void {
    this.log("error", message, meta);
  }

  private log(level: LogLevel, message: string, meta?: unknown): void {
    if (levels.indexOf(level) < this.currentLevelIndex) {
      return;
    }

    const payload = meta === undefined ? "" : ` ${safeStringify(meta)}`;
    process.stderr.write(`[${new Date().toISOString()}] ${level.toUpperCase()} ${message}${payload}\n`);
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '"[unserializable]"';
  }
}
