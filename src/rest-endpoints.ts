import { ParameterizedContext, Next } from 'koa'
import { Repository, DeepPartial } from 'typeorm'

/**
 * Create a result and return it with the newly created ID
 *
 * @param entity
 */
export const createResource = <T>(entity: { getRepository(): Repository<T> }) =>
  async function (ctx: ParameterizedContext) {
    try {
      const result = await entity.getRepository()
        .insert(ctx.request.body)

      const response = entity.getRepository()
        .create({
          id: result.identifiers[0],
          ...ctx.request.body as DeepPartial<T>
        })

      ctx.status = 201
      ctx.body = response
    } catch (e) {
      ctx.status = 400
      ctx.body = e.message
    }
  }

/**
 * Get a resource by its ID
 *
 * @param repository Get the entity repository calling `.getRepository()` on the class
 */
export const getResource = <T>(entity: { getRepository(): Repository<T> }) =>
  async function (ctx: ParameterizedContext) {
    const { id } = ctx.params

    let resource: T

    if (id === 'random') {
      resource = await entity.getRepository()
        .createQueryBuilder()
        .orderBy('RANDOM()')
        .limit(1)
        .getOne()
    } else {
      resource = await entity.getRepository()
        .findOne(id)
    }

    ctx.assert(resource, 404)

    ctx.body = resource
  }

/**
 * List resources
 *
 * @param repository Get the entity repository calling `.getRepository()` on the class
 */
export const listResources = <T>(entity: { getRepository(): Repository<T> }) =>
  async function (ctx: ParameterizedContext) {
    const pageSize = 30
    const page = !Array.isArray(ctx.query.page)
      ? parseInt(ctx.query.page)
      : 1

    ctx.assert(page >= 1, 400, 'page argument must be >= 1')

    let where = {}
    if (ctx.query.where && !Array.isArray(ctx.query.where)) {
      try {
        where = JSON.parse(ctx.query.where)
      } catch (e) {
        ctx.throw(400, 'where query argument must be a valid JSON string')
      }
    }

    ctx.body = await entity.getRepository().find({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  }

/**
 * Update a resource by its ID
 *
 * @param repository Get the entity repository calling `.getRepository()` on the class
 */
export const updateResource = <T>(entity: { getRepository(): Repository<T> }) =>
  async function (ctx: ParameterizedContext, next: Next) {
    const id = parseInt(ctx.params.id)
    ctx.assert(id > 0, 400, 'Resource ID must be an integer > 0')

    try {
      const toSave = entity.getRepository().create({ id, ...ctx.request.body })
      await entity.getRepository().save(toSave)

      ctx.status = 204
    } catch (e) {
      ctx.status = 400
      ctx.body = e.message
    }
  }

/**
 * Delete a resource by its ID
 *
 * @param repository Get the entity repository calling `.getRepository()` on the class
 */
export const deleteResource = <T>(entity: { getRepository(): Repository<T> }) =>
  async function (ctx: ParameterizedContext) {
    const id: number = parseInt(ctx.params.id)

    ctx.assert(id > 0, 400, 'Resource ID must be an integer > 0')

    try {
      const result = await entity.getRepository().delete(id)

      ctx.status = 204
    } catch (e) {
      ctx.status = 400
      ctx.body = e.message
    }
  }
