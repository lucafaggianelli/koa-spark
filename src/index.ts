import Koa from 'koa'
import koaBody from 'koa-body'

export * from './Config'
import OpenApiBuilder from './OpenApiBuilder'
import * as app from './app'
import * as middlewares from './middlewares'
import * as rest from './rest-endpoints'

// Needed to declare ctx.request.body type for Typescript
new Koa().use(koaBody)

export {
  OpenApiBuilder,
  app,
  middlewares,
  rest
}
