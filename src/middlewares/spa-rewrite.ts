import { Next, Middleware, ParameterizedContext } from 'koa'

/**
 * Rewrite any path to a specific path to support serving SPA applications
 * from an API server.
 *
 * @param rewritePath The target path of the rewrite
 * @param skipPaths Paths that shouldn't be rewritten, (default: `/api`)
 * @returns A Koa middleware to be used with `app.use()`
 */
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
