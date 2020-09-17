'use strict'

import Router from 'koa-router'

import {
  makeXMLBody,
  makeXMLRequest,
  xml2json,
  getInfo
} from '../utils'

const router = new Router({ prefix: '/experian' })

router.get('/:ruc', async ctx => {
  const { ruc } = ctx.params
  const xml = makeXMLBody(ruc)
  const { response: { body, statusCode } } = await makeXMLRequest(xml)
  const data = xml2json(body)
  const info = getInfo(data)
  console.log(info)
  ctx.status = statusCode
  ctx.body = data
})

export default router
