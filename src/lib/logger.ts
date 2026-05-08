type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogContext = Record<string, unknown>

const IS_PROD = process.env.NODE_ENV === 'production'

function emit(level: LogLevel, message: string, context?: LogContext): void {
  if (IS_PROD && (level === 'debug' || level === 'info')) return

  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: 'lms-frontend',
    ...(context ?? {}),
  }

  const logMessage = IS_PROD ? JSON.stringify(entry) : `[${level.toUpperCase()}] ${message}`

  // Always use console.log as it's the most universally available method
  try {
    if (typeof console !== 'undefined' && typeof console.log === 'function') {
      console.log(logMessage)
    }
  } catch {
    // Silently fail - logging should never crash the app
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info:  (message: string, context?: LogContext) => emit('info',  message, context),
  warn:  (message: string, context?: LogContext) => emit('warn',  message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
}
