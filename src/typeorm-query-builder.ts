import { FindManyOptions, FindOperator, ILike, IsNull, LessThan, LessThanOrEqual, Like, MoreThan, MoreThanOrEqual, Not } from 'typeorm'

const DELIMITER = '__'
const DEFAULT_PAGE_SIZE = 30

const TYPEORM_OPERATORS = {
  gt: value => MoreThan(value),
  gte: value => MoreThanOrEqual(value),
  lt: value => LessThan(value),
  lte: value => LessThanOrEqual(value),
  contains: value => Like(`%${value}%`),
  icontains: value => ILike(`%${value}%`),
  startswith: value => Like(`${value}%`),
  istartswith: value => ILike(`${value}%`),
  endswith: value => Like(`%${value}`),
  iendswith: value => ILike(`%${value}`),
  isnull: value => IsNull()
}

const getOperator = (operators: string[], value: string | string[]): FindOperator<any> | string => {
  if (!operators[0]) {
    return Array.isArray(value) ? value[0] : value
  }

  const isNegate = operators[0] === 'not'
  const operator = isNegate ? operators[1] : operators[0]
  const typeormOperator = TYPEORM_OPERATORS[operator]

  if (!typeormOperator) {
    throw new Error(`Invalid operator ${operator}`)
  }

  let output = typeormOperator(value)

  if (isNegate) {
    output = Not(output)
  }

  return output
}

const ensureIsArray = (value: string | string[]): string[] => {
  return Array.isArray(value) ? value : [ value ]
}

const getOrder = (orderQuery: string | string[]) => {
  const orders = Array.isArray(orderQuery)
    ? orderQuery
    : [ orderQuery ]

  return orders.reduce((orderClause, entry) => {
    const ascOrDesc = entry[0] === '+' ? 'ASC' : 'DESC'
    const column = entry[0] === '+' || entry[0] === '-'
      ? entry.slice(1)
      : entry

    orderClause[column] = ascOrDesc

    return orderClause
  }, {})
}

export const buildTypeormQuery = <T>(queryString: { [key: string]: string | string[] }): FindManyOptions<T> => {
  const query: FindManyOptions = {}

  // Define pagination params
  const rawPageSize = queryString[`${DELIMITER}page_size`]
  const pageSize = Array.isArray(rawPageSize)
    ? DEFAULT_PAGE_SIZE
    : parseInt(rawPageSize)

  const rawPage = queryString[`${DELIMITER}page`]
  const page = Array.isArray(rawPage)
    ? 1
    : parseInt(rawPage)

  query.take = pageSize || DEFAULT_PAGE_SIZE
  query.skip = ((page >= 1 ? page : 1) - 1) * query.take

  if (queryString[`${DELIMITER}order`]) {
    query.order = getOrder(queryString[`${DELIMITER}order`])
  }

  if (queryString[`${DELIMITER}populate`]) {
    query.relations = ensureIsArray(queryString[`${DELIMITER}populate`])
  }

  Object.entries(queryString).forEach(([ key, value ]) => {
    const [ columnName, ...operators ] = key.split(DELIMITER)

    if (!columnName) {
      // something that starts with __ like __page, so it's already handled
      return
    }

    if (!query.where) {
      query.where = {}
    }
    query.where[columnName] = getOperator(operators, value)
  })

  return query
}
