import { ParameterizedContext, Next } from 'koa'
import { Repository, DeepPartial } from 'typeorm'
import { QueryBuilder } from 'typeorm-express-query-builder'

/**
 * Create a resource and return it with the newly created ID
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
    const findQuery = new QueryBuilder(ctx.query).build()

    ctx.body = await entity.getRepository().find(findQuery)
  }

/**
 * Update a resource by its ID
 *
 * @param repository Get the entity repository calling `.getRepository()` on the class
 */
export const updateResource = <T>(entity: { getRepository(): Repository<T> }) =>
  async function (ctx: ParameterizedContext, next: Next) {
    const { id } = ctx.params

    try {
      const toSave = entity.getRepository().create(ctx.request.body as DeepPartial<T>)
      await entity.getRepository().update(id, toSave)

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
