import deepmerge from 'deepmerge'
import fs, { Stats } from 'fs'
import { Router } from 'koa-joi-router'
import j2j from 'joi-to-json-schema'
import YAML from 'js-yaml'
import path from 'path'
import { combineMerge } from './utils'

const SUPPORTED_EXTENSIONS = {
  '.json': 'json',
  '.yml': 'yaml',
  '.yaml': 'yaml'
}

const TYPE_TO_MIME = {
  form: 'application/x-www-form-urlencoded',
  json: 'application/json',
  multipart: 'multipart/form-data'
}

export default class OpenApiBuilder {
  version: string
  openapi: any = {}

  constructor (version: string = '3.0.3') {
    this.openapi = {
      openapi: version,
      paths: {}
    }
  }

  setInfo (info: any) {
    this.openapi.info = info

    return this
  }

  setInfoFromPackage (packagePath: string) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))

    this.setInfo({
      title: pkg.name,
      description: pkg.description,
      version: pkg.version
    })

    return this
  }

  addServer (server: any) {
    if (!this.openapi.servers) {
      this.openapi.servers = []
    }

    this.openapi.servers.push(server)

    return this
  }

  addRouter (router: Router) {
    const paths: { [path: string]: any } = {}

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

      if (route.meta && route.meta.tags) {
        operation.tags = Array.isArray(route.meta.tags) ? route.meta.tags : [ route.meta.tags ]
      }

      /**
       * Request Body
       */
      if (route.validate.body) {
        operation.requestBody = this.buildContent(route.validate.type, route.validate.body)
      }

      /**
       * URL params
       */
      if (route.validate.params) {
        operation.parameters = Object.keys(route.validate.params).map(paramName => {
          try {
            const { description, ...schema } = j2j(route.validate.params[paramName])

            return {
              name: paramName,
              description,
              in: 'path',
              required: true,
              schema
            }
          } catch (e) {
            console.log('Error parsing params', route.method, route.path, route.validate.params[paramName])
            console.log(e.message)
          }
        })
      }

      /**
       * Responses
       */
      if (route.validate.output) {
        operation.responses = {}

        for (const status in route.validate.output) {
          operation.responses[status] = this.buildContent(route.validate.type, route.validate.output[status]['body'])

          if (status === '204') {
            delete operation.responses[status].content
          }
        }
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
        ? route.path.replace(/:(\w+)/g, '{$1}')
        // TODO: warn the user that swagger doesn't accept regex as path
        : route.path.toString()
      paths[path] = pathObject
    }

    this.openapi.paths = paths

    return this
  }

  /**
   * Write the OpenApi definition to a file.
   * If the file already exists, its content will be merged with the new openapi object.
   *
   * @param filePath Abolute path to the file to write, supported extensions are .json, .yml, .yaml.
   *  Example of valid path `/home/me/dev/project/openapi.yml`
   */
  async dump (filePath: string) {
    let stat: Stats

    try {
      stat = await fs.promises.stat(filePath)
    } catch (e) {
      // File doesn't exist
    }

    const extension = path.extname(filePath)
    if (!extension) { throw new Error('The path argument must be a valid file path') }

    const format = SUPPORTED_EXTENSIONS[extension.toLowerCase()]
    if (!format) { throw new Error('Unsupported extension ' + extension) }

    let mergedOpenapi: any = {}

    if (stat && stat.isFile()) {
      const content = await fs.promises.readFile(filePath, 'utf8')

      if (format === 'json') {
        mergedOpenapi = JSON.parse(content)
      } else {
        mergedOpenapi = YAML.load(content)
      }
    }

    mergedOpenapi = deepmerge(mergedOpenapi, this.openapi, { arrayMerge: combineMerge })

    if (format === 'json') {
      mergedOpenapi = JSON.stringify(mergedOpenapi, null, '  ')
    } else {
      mergedOpenapi = YAML.dump(mergedOpenapi, { indent: 2 })
    }

    await fs.promises.writeFile(filePath, mergedOpenapi)
  }

  private buildContent (type: string, joiSchema: any) {
    const content = {}
    const mime = TYPE_TO_MIME[type] || 'text/plain'

    const schema = j2j(joiSchema)

    const description = schema.description || ''

    // Remove the `patterns: []` property from the schema
    if (schema.properties) {
      for (const propertySchema of Object.values<any>(schema.properties)) {
        if (propertySchema.items && propertySchema.items.patterns) {
          // The property is an array, so definition is inside `items`
          delete propertySchema.items.patterns
        } else if (propertySchema.patterns) {
          delete propertySchema.patterns
        }
      }
    }

    delete schema.description
    delete schema.patterns

    content[mime] = { schema }

    return { content, description }
  }
}
