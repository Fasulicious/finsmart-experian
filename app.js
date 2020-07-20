'use strict'

import soapRequest from 'easy-soap-request'
import fs from 'fs'

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
    headers,
    body,
    statusCode
  } = response
  console.log(headers)
  console.log(body)
  console.log(statusCode)
})()
