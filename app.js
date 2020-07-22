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
  const bodyJson = JSON.parse(convert.xml2json(body, { compact: true }))
  const info = bodyJson['soapenv:Envelope']['soapenv:Body']['ns1:consultarResponse']['consultarReturn']['_text']
  const infoJson = JSON.parse(convert.xml2json(info, { compact: true }))
  //console.log(infoJson.informe)
  fs.writeFileSync('response.json', JSON.stringify(infoJson.informe))
  console.log(statusCode)
})()
