import Koa from 'koa'
import koaBody from 'koa-body'

import * as openapi from './openapi'
import * as rest from './rest-endpoints'

// app is not used, but is needed to declare ctx.request.body type for Typescript
const app = new Koa()
app.use(koaBody)

export {
  openapi,
  rest
}
