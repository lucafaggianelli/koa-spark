import { Next, Middleware, ParameterizedContext } from 'koa'

export function spaRewrite (rewritePath: string = '/', skipPaths: (string | RegExp)[] = [ '/api' ]): Middleware {
  const skipRegexes = [
    ...skipPaths.map(path => typeof path === 'string' ? new RegExp(`${path}.+/?`) : path),

    // Not an asset request (image, css, js, anythingwith.ext)
    /\.\S{2,4}$/,

    // Not a webpack HMR request
    /webpack_hmr/
  ]

  return async (ctx: ParameterizedContext, next: Next) => {
    if (skipRegexes.some(re => ctx.url.match(re))) {
      ctx.url = rewritePath
    }
    await next()
  }
}
