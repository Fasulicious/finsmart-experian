'use strict'

import Router from 'koa-router'

import {
  makeXMLBody,
  makeXMLRequest,
  xml2json
} from '../utils'

const router = new Router({ prefix: '/experian' })

router.get('/:ruc', async ctx => {
  const { ruc } = ctx.params
  const xml = makeXMLBody(ruc)
  const { response: { body, statusCode } } = await makeXMLRequest(xml)
  const data = xml2json(body)
  console.log(data)
  ctx.status = statusCode
})

export default router
