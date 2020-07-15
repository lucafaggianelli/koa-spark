import KoaRouter from '@koa/router'
import deepmerge from 'deepmerge'
import { promises as fs, Stats } from 'fs'
import { Router } from 'koa-joi-router'
import j2j from 'joi-to-json-schema'
import YAML from 'js-yaml'
import path from 'path'

const SUPPORTED_EXTENSIONS = {
  '.json': 'json',
  '.yml': 'yaml',
  '.yaml': 'yaml'
}

const paths: { [path: string]: any } = {}

export function buildOpenApi (pkg: any, router: Router, oaVersion = '3.0.3') {
  const paths: { [path: string]: any } = {}

  const openapi = {
    openapi: oaVersion,
    info: {
      title: pkg.name,
      description: pkg.description,
      version: pkg.version
    },
    paths: {}
  }

  for (const route of router.routes) {
    const pathObject: { [method: string]: any } = {}
    const operation: any = {}

    if (!route.validate) {
      console.warn('Route has no validation specs:', route.method, route.path)
      continue
    }

    if (route.meta && route.meta.description) {
      operation.description = route.meta.description
    }

    if (route.validate.body) {
      const schema = j2j(route.validate.body)

      operation.requestBody = {
        content: {
          // check route.validate.type
          'application/json': {
            schema
          }
        }
      }
    }

    if (route.validate.params) {
      operation.parameters = Object.keys(route.validate.params).map(paramName => ({
        name: paramName,
        in: 'path',
        required: true,
        schema: j2j(route.validate.params[paramName])
      }))
    }

    const methods: string[] = Array.isArray(route.method) ? route.method : [ route.method ]

    for (const method of methods.filter(m => m.toUpperCase() !== 'HEAD')) {
      pathObject[method.toLowerCase()] = operation
    }

    /**
     * Convert koa-router path params to OpenApi
     *  /users/:id -> /users/{id}
     */
    const path = typeof route.path === 'string'
      ? route.path.replace(/:(\w+)/, '{$1}')
      // TODO: warn the user that swagger doesn't accept regex as path
      : route.path.toString()
    paths[path] = pathObject
  }

  openapi.paths = paths

  return openapi
}

const combineMerge = (target: any, source: any, options: any) => {
  const destination = target.slice()

  source.forEach((item: any, index: any) => {
    if (typeof destination[index] === 'undefined') {
      destination[index] = options.cloneUnlessOtherwiseSpecified(item, options)
    } else if (options.isMergeableObject(item)) {
      destination[index] = deepmerge(target[index], item, options)
    } else if (target.indexOf(item) === -1) {
      destination.push(item)
    }
  })
  return destination
}

/**
 *
 * @param filePath Abolute path to the file to write, supported extensions are .json, .yml, .yaml.
 *  If the file already exists, its content will be merged with the new openapi object.
 *  Example of valid path `/home/me/dev/project/openapi.yml`
 * @param openapi
 */
export async function dump(filePath: string, openapi: any) {
  let stat: Stats

  try {
    stat = await fs.stat(filePath)
  } catch (e) {
    // File doesn't exist
  }

  const extension = path.extname(filePath)
  if (!extension) { throw new Error('The path argument must be a valid file path') }

  const format = SUPPORTED_EXTENSIONS[extension.toLowerCase()]
  if (!format) { throw new Error('Unsupported extension ' + extension) }

  let mergedOpenapi: any = {}

  if (stat && stat.isFile()) {
    const content = await fs.readFile(filePath, 'utf8')

    if (format === 'json') {
      mergedOpenapi = JSON.parse(content)
    } else {
      mergedOpenapi = YAML.load(content)
    }
  }

  mergedOpenapi = deepmerge(mergedOpenapi, openapi, { arrayMerge: combineMerge })

  if (format === 'json') {
    mergedOpenapi = JSON.stringify(mergedOpenapi, null, '  ')
  } else {
    mergedOpenapi = YAML.dump(mergedOpenapi, { indent: 2 })
  }

  await fs.writeFile(filePath, mergedOpenapi)
}
