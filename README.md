# KoaSpark - Koa application boilerplate-less

Build Koa applications in a spark.

KoaSpark is a *boilerplate-as-a-library* for creating Koa apps, it includes out-of-the-box many koa plugins that
you normally need for an app like `koa-body`, `koa-cors` and `koa-router`, plus many other useful features
like the automatic generation of *OpenAPI* definitions.

All of this is typically found in *templates* and *boilerplates* via cloning a base git repo and then editing it or
via a CLI that generates code, this approach works but keep your app updated when a new version of the template is released
is a nightmare.

KoaSpark has a differnet approach, it doesn't generate any code, it's just an `import`able library that provides an alternative
to `const app = new Koa()`: `const app = createApp(config, options)` and you have a KoaApp ready to use.

## Get Started

```sh
npm install koa-spark
# or
yarn add koa-spark
```

Then create the app:

```ts
import { createApp } from 'koa-spark'

const app = createApp()

if (require.main === module) {
  app.startServer()
}
```

## Configuration

In Koa Spark, there are 2 levels of configuration, at the app level `AppConfig` and at the framework level `SparkOptions`.
They are both passed to the `createApp(AppConfig, SparkOptions)` function.

### App Configuration

The app configuration holds environment-specific configurations, like secrets, connection info, etc. that should be changed
by the final user if you redistribute the app, or changed when you deploy in production.

The AppConfig can be configured via environmental variables and/or `.env` files, Koa Spark will automatically initialize the `AppConfig`
properties decorated with `@Field()` with the corresponding environment variable. Note that AppConfig properties are written in `camelCase`
but env variables are written in `UPPER_SNAKE_CASE`.

```ts
// config.ts
import { AppConfig, Field } from 'koa-spark'

class MyAppConfig extends AppConfig {
  @Field({ default: 'test@localhost' }) // env: FROM_ADDRESS
  fromAddress!: string

  @Field() // env: GCLOUD_STORAGE_BUCKET
  gcloudStorageBucket!: string

  @Field({ default: 'mongodb://localhost/thedb' })
  mongodbConnectionUri!: string

  @Field()
  sendgridApiKey!: string
}

export default new MyAppConfig()
```

And its relative `.env` file:

```sh
# .env
FROM_ADDRESS=luca@mail.com
GCLOUD_STORAGE_BUCKET=my_bucket_production
```

You can have multiple `.env` files, one per each environment, named `.env.<NODE_ENV>`.
Koa Spark will try to load the environment-specific file and fallback to the generic one,
for example in production will try to load `.env.production` and if it's missing will load `.env`.

### Framework Options

The framework options `SparkOptions` are used to configure Koa Spark itself, are more *inner-configs* than
`AppConfig`, for example they include configurations for *CORS*, *helmet*, etc.

As for their nature, framework options are not configurable via env variables, but only via code:

```ts
const app = createApp(
  config,
  {
    body: {
      multipart: true
    }
  }
)
```
