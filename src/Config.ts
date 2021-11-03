import fs from 'fs'
import path from 'path'
import { cwd } from 'process'

import dotenv from 'dotenv'
import 'reflect-metadata'

type ConfigFieldsMap = Map<string | symbol, FieldOptions>

interface FieldOptions {
  default?: any
  type?: string
}

const FIELDS_METADATA_KEY = Symbol('fields')

const camelToSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter}`).toUpperCase()

export function Field(options: FieldOptions = {}): PropertyDecorator {
  return (target, key) => {
    if (!options.type) {
      options.type = Reflect.getMetadata("design:type", target, key).name
    }

    const fields: ConfigFieldsMap = Reflect.getMetadata(FIELDS_METADATA_KEY, target) || new Map<string | symbol, FieldOptions>()

    if (!fields.has(key)) {
      fields.set(key, options)
    }

    Reflect.defineMetadata(FIELDS_METADATA_KEY, fields, target)
  }
}

/**
 * Application Configuration for setting environment-specific and secret configs
 */
export class AppConfig {
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
  @Field({ default: 3000 })
  port: number

  /**
   * The URL on which the server is hosted
   */
  @Field()
  origin: string

  constructor () {
    /**
     * Init NODE_ENV
     */
    this.nodeEnv = process.env.NODE_ENV || 'development'
    this.isDevelopment = this.nodeEnv === 'development'
    this.isProduction = this.nodeEnv === 'production'
    this.isTesting = this.nodeEnv === 'test' || this.nodeEnv === 'testing'

    this.loadEnvFile()

    this.initConfigFields()
  }

  private loadEnvFile () {
    // Load environment configuration
    const envSpecificFile = path.join(cwd(), `.env.${this.nodeEnv}`)
    const envFilePath = fs.existsSync(envSpecificFile)
      ? envSpecificFile
      : path.join(cwd(), '.env')

    console.log(`Loaded configuration file '${envFilePath}'`)

    dotenv.config({
      path: envFilePath
    })
  }

  /**
   * Initialize all the fields values with the values found in the configuration
   * or their default values
   */
  private initConfigFields () {
    const fields: ConfigFieldsMap = Reflect.getMetadata(FIELDS_METADATA_KEY, this) || new Map<string | symbol, FieldOptions>()

    fields.forEach((fieldOptions, key) => {
      const value = this.getConfigValue(
        camelToSnakeCase(key.toString()),
        fieldOptions.type
      )

      this[key] = value ?? (fieldOptions ? fieldOptions.default : undefined)

      if (!this[key]) {
        console.warn(`The configuration '${key.toString()}' is missing and it doesn't have a default value`)
      }
    })
  }

  private getConfigValue (name: string, type: string, defaultValue?: any): any {
    if (type === 'number') {
      return this.getConfigAsInt(name, defaultValue)
    } else {
      return this.getConfigAsString(name, defaultValue)
    }
  }

  private getConfigAsString (name: string, defaultValue?: string) {
    return process.env[name] || defaultValue
  }

  private getConfigAsInt (name: string, defaultValue: number = 0) {
    const value = this.getConfigAsString(name)

    if (value) {
      return parseInt(value)
    }

    return defaultValue
  }
}
