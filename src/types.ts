import Koa from 'koa'
import { IKoaBodyOptions } from 'koa-body'

export type KoaApp = Koa<Koa.DefaultState, Koa.DefaultContext & IKoaBodyOptions>
export type KoaContext = Koa.ParameterizedContext<Koa.DefaultState, Koa.DefaultContext & IKoaBodyOptions>
