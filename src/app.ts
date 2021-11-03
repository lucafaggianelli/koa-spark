import deepmerge from 'deepmerge'
import http from 'http'
import Koa from 'koa'
import koaBody, { IKoaBodyOptions } from 'koa-body'
import koaCors, { Options as CorsOptions } from '@koa/cors'
import koaLogger from 'koa-logger'
import session from 'koa-session'
import koaStatic from 'koa-static'
import helmet from 'koa-helmet'
import path from 'path'

import { AppConfig } from './Config'
import { spaRewrite } from './middlewares'
import { combineMerge } from './utils'
import { KoaApp } from './types'

type HelmetOptions = Parameters<typeof helmet>[0]

export class SparkApp {
  config: AppConfig
  nativeApp: KoaApp
  options: SparkOptions
  server: http.Server

  constructor () {}

  startServer () {
    this.server.listen(this.config.port, () => {
      console.log(`Server running on port ${this.config.origin} (env: ${this.config.nodeEnv})`)
    })
  }
}

export interface SparkOptions {
  body?: IKoaBodyOptions

  cors?: CorsOptions

  /**
   * Options for Helmet.
   *
   * For full reference see https://helmetjs.github.io/#reference
   */
  helmet?: HelmetOptions

  /**
   * Use session
   */
  useSession?: boolean

  /**
   * Enable URL rewrite to serve SPA applications from the API server
   */
  useSpaRewrite?: boolean
}

const getDefaultOptions = (config: AppConfig): SparkOptions => {
  return {
    useSession: true,
    useSpaRewrite: false,
    cors: {
      credentials: config.isDevelopment,
      origin: config.origin,
      allowHeaders: [ 'Content-Type', 'Authorization' ],
      allowMethods: 'GET, HEAD, POST, OPTIONS, PUT, PATCH, DELETE'
    }
  }
}

export const createApp = (config: AppConfig = new AppConfig(), options?: SparkOptions): SparkApp => {
  const app = new SparkApp()

  app.nativeApp = new Koa()
  app.config = config
  app.options = deepmerge(options, getDefaultOptions(app.config), { arrayMerge: combineMerge })

  // Koa logger must be registered at the beginning to catch all requests
  if (app.config.isDevelopment) {
    app.nativeApp.use(koaLogger())
  }

  app.nativeApp.use(koaCors(app.options.cors))

  app.nativeApp.proxy = true

  app.nativeApp.use(koaBody(app.options.body))

  // Sessions
  if (app.options.useSession) {
    app.nativeApp.keys = [ 'secret' ]
    app.nativeApp.use(session(app.nativeApp))
  }

  app.nativeApp.use(helmet(app.options.helmet))

  // Every URL that is not /api will be rewritten to / and served by the SPA app
  if (app.options.useSpaRewrite) {
    app.nativeApp.use(spaRewrite())
  }

  /**
   * Serve static files from public/ folder. The folder structure is:
   *
   * /backend/dist/
   * -- src/
   * -- public/ (contains static files)
   */
   app.nativeApp.use(koaStatic(path.resolve(__dirname, '..', 'public')))

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.server = http.createServer(app.nativeApp.callback())

  return app
}
