/**
 * Simple structured logger for Trust Admin
 * Uses Bun's built-in console with consistent formatting
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogContext {
  [key: string]: unknown
}

const LOG_LEVEL = (typeof process !== "undefined" ? process.env.LOG_LEVEL : "info") as LogLevel
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL]
}

function formatMessage(level: LogLevel, module: string, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const contextStr = context ? ` ${JSON.stringify(context)}` : ""
  return `${timestamp} [${level.toUpperCase()}] [${module}] ${message}${contextStr}`
}

function createLogger(module: string) {
  return {
    debug: (message: string, context?: LogContext) => {
      if (shouldLog("debug")) {
        console.debug(formatMessage("debug", module, message, context))
      }
    },
    info: (message: string, context?: LogContext) => {
      if (shouldLog("info")) {
        console.info(formatMessage("info", module, message, context))
      }
    },
    warn: (message: string, context?: LogContext) => {
      if (shouldLog("warn")) {
        console.warn(formatMessage("warn", module, message, context))
      }
    },
    error: (message: string, context?: LogContext) => {
      if (shouldLog("error")) {
        console.error(formatMessage("error", module, message, context))
      }
    },
  }
}

export const logger = {
  create: createLogger,
  auth: createLogger("Auth"),
  api: createLogger("API"),
  db: createLogger("DB"),
}
