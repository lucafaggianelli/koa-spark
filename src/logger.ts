import pino from 'pino'

const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
const transportPretty = {
  target: 'pino-pretty',
  options: {
    ignore: 'pid,hostname',
    translateTime: true
  }
}

export const logger = pino({
  level: isDev ? 'debug' : 'warn',
  transport: isDev ? transportPretty : undefined
})

export const getChildLogger = (name: string) => {
  return logger.child({ name })
}
