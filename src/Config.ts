import dotenv from 'dotenv'
import fs from 'fs'

export default class Config {
  /**
   * NODE_ENV variable. If it's not set, by default it has `'development'` value
   */
  readonly nodeEnv: string
  /**
   * True if NODE_ENV is `'development'`
   */
  readonly isDevelopment: boolean
  /**
   * True if NODE_ENV is `'production'`
   */
  readonly isProduction: boolean
  /**
   * True if NODE_ENV is `'test'` or `'testing'`
   */
  readonly isTesting: boolean

  /**
   * Server port number
   */
  port: number

  constructor () {
    const envConfigFileExists = fs.existsSync(`.env.${this.nodeEnv}`)

    dotenv.config({
      path: envConfigFileExists ? `.env.${this.nodeEnv}` : '.env'
    })

    /**
     * Init config
     */
    this.nodeEnv = process.env.NODE_ENV || 'development'

    this.isDevelopment = this.nodeEnv === 'development'
    this.isProduction = this.nodeEnv === 'production'
    this.isTesting = this.nodeEnv === 'test' || this.nodeEnv === 'testing'

    this.port = parseInt(process.env.PORT as string) || 3000
  }
}
