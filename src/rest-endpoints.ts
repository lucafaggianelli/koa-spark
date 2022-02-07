import { ParameterizedContext, Next } from 'koa'
import { Repository, DeepPartial } from 'typeorm'

import { buildTypeormQuery } from './typeorm-query-builder'

/**
 * Create a resource and return it with the newly created ID
 *
 * @param entity
 */
export const createResource = <T>(entity: { getRepository(): Repository<T> }) =>
  async function (ctx: ParameterizedContext, next: Next) {
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

    return await next()
  }

/**
 * Get a resource by its ID
 *
 * @param repository Get the entity repository calling `.getRepository()` on the class
 */
export const getResource = <T>(entity: { getRepository(): Repository<T> }) =>
  async function (ctx: ParameterizedContext, next: Next) {
    const { id } = ctx.params
    const relations = ctx.request.query.with
      ? (Array.isArray(ctx.request.query.with)
        ? ctx.request.query.with
        : [ ctx.request.query.with ])
      : undefined

    let resource: T

    if (id === 'random') {
      resource = await entity.getRepository()
        .createQueryBuilder()
        .orderBy('RANDOM()')
        .limit(1)
        .getOne()
    } else {
      resource = await entity.getRepository()
        .findOne(id, { relations })
    }

    ctx.assert(resource, 404)

    ctx.body = resource

    return await next()
  }

/**
 * List resources
 *
 * @param repository Get the entity repository calling `.getRepository()` on the class
 */
export const listResources = <T>(entity: { getRepository(): Repository<T> }) =>
  async function (ctx: ParameterizedContext, next: Next) {
    try {
      const findQuery = buildTypeormQuery<T>(ctx.query)

      ctx.body = await entity.getRepository().find(findQuery)
    } catch (e) {
      ctx.status = 400
      ctx.body = e.message
    }

    return await next()
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
      // const toSave = entity.getRepository().create(ctx.request.body as DeepPartial<T>)
      console.log(`Updating ID ${id} to ${ctx.request.body}`)
      await entity.getRepository().update(id, ctx.request.body)

      ctx.status = 204
    } catch (e) {
      ctx.status = 400
      ctx.body = e.message
    }

    return await next()
  }

/**
 * Delete a resource by its ID
 *
 * @param repository Get the entity repository calling `.getRepository()` on the class
 */
export const deleteResource = <T>(entity: { getRepository(): Repository<T> }) =>
  async function (ctx: ParameterizedContext, next: Next) {
    const id: number = parseInt(ctx.params.id)

    ctx.assert(id > 0, 400, 'Resource ID must be an integer > 0')

    try {
      const result = await entity.getRepository().delete(id)

      ctx.status = 204
    } catch (e) {
      ctx.status = 400
      ctx.body = e.message
    }

    return await next()
  }
