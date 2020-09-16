'use strict'

import Router from 'koa-router'

import {
  makeXMLBody,
  makeXMLRequest
} from '../utils'

const router = new Router({ prefix: '/experian' })

router.get('/:ruc', async ctx => {
  const { ruc } = ctx.params
  const xml = makeXMLBody(ruc)
  const { body, statusCode } = await makeXMLRequest(xml)
  console.log(body)
  ctx.status = statusCode
})

export default router
