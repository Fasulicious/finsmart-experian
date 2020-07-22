'use strict'

import soapRequest from 'easy-soap-request'
import fs from 'fs'
import convert from 'xml-js'

const url = 'https://demo-servicesesb.experian.com.pe/dhws/services/DHService?wsdl'

const requestHeaders = {
  'Content-Type': 'text/html',
  'soapAction': 'GET'
}
const xml = fs.readFileSync('./query.xml');

(async () => {
  const { response } = await soapRequest({
    url,
    xml,
    headers: requestHeaders
  })
  const {
    body,
    statusCode
  } = response
  //fs.writeFileSync('response.xml', body.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"'))
  //fs.writeFileSync('response.json', parser.toJson(body))
  const bodyJson = convert.xml2json(body, { compact: true })
  const info = bodyJson['soapenv:Envelope']['soapenv:Body']['ns1:consultarResponse']['consultarReturn']['_text']
  console.log(info)
  console.log(statusCode)
})()
