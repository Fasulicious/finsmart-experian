'use strict'

import Koa from 'koa'
import logger from 'koa-logger'
import helmet from 'koa-helmet'
import cors from 'koa2-cors'
import body from 'koa-body'
import compress from 'koa-compress'

import experian from './routes/experian'

const app = new Koa()

app.use(cors({
  origin: '190.237.1.236'
}))
app.use(body())
app.use(logger())
app.use(helmet())
app.use(compress())

app.use(async (ctx, next) => {
  try {
    await next()
  } catch (e) {
    console.log(e)
    ctx.status = 500
    ctx.body = {
      error: {
        body: 'unhandled error',
        message: 'Something went wrong'
      }
    }
  }
})

app.use(experian.routes())

app.listen(3000, () => console.log('Server listening on port 3000'))
