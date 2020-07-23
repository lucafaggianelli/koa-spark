import Koa from 'koa'
import koaBody from 'koa-body'

import Config from './Config'
import OpenApiBuilder from './OpenApiBuilder'
import * as middlewares from './middlewares'
import * as rest from './rest-endpoints'

// app is not used, but is needed to declare ctx.request.body type for Typescript
const app = new Koa()
app.use(koaBody)

export {
  Config,
  OpenApiBuilder,
  middlewares,
  rest
}
