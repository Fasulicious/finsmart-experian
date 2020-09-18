'use strict'

import soapRequest from 'easy-soap-request'
import convert from 'xml-js'

const {
  experianURL
} = process.env

export const makeXMLBody = (ruc) => `<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws.hc.dc.com">
   <soapenv:Header/>
   <soapenv:Body>
      <ws:consultar soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
         <idsus xsi:type="soapenc:string" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/">47078837</idsus>
            <clasus xsi:type="soapenc:string" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/">02DCA</clasus>
            <tipoid xsi:type="soapenc:string" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/">2</tipoid>
            <id xsi:type="soapenc:string" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/">${ruc}</id>
            <papellido xsi:type="soapenc:string" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/"></papellido>            
      </ws:consultar>
   </soapenv:Body>
</soapenv:Envelope>`

export const makeXMLRequest = (xml) => {
  const headers = {
    'Content-Type': 'text/html',
    soapAction: 'GET'
  }

  return soapRequest({
    url: experianURL,
    xml,
    headers
  })
}

export const xml2json = (body) => {
  const bodyJSON = JSON.parse(convert.xml2json(body, { compact: true }))
  const data = bodyJSON['soapenv:Envelope']['soapenv:Body']['ns1:consultarResponse'].consultarReturn._text
  const dataJSON = JSON.parse(convert.xml2json(data, { compact: true }))
  return dataJSON
}

export const getInfo = (data) => {
  const razonSocial = data.informe.infoRUC ? data.informe.infoRUC._attributes.tipoContribuyente : null
  const fechaCreacion = data.informe.infoRUC ? new Date(data.informe.infoRUC._attributes.fechaAlta - 5 * 60 * 60 * 1000).toString() : null
  const padron = data.informe.buenosContribuyentes
  let numTrabajadores = null
  if (data.informe.otrosDatosEmpresa) {
    const otrosDatosEmpresa = [...data.informe.otrosDatosEmpresa]
    otrosDatosEmpresa.sort((a, b) => {
      if (a._attributes.periodo < b._attributes.periodo) return -1
      if (a._attributes.periodo > b._attributes.periodo) return 1
      return 0
    })
    numTrabajadores = parseInt(otrosDatosEmpresa.slice(-1)[0]._attributes.numeroEmpleados, 10)
  }
  let calificacion = 0
  let deuda_directa = 0
  let deuda_indirecta = 0
  let garantia_preferida = 0
  if (data.informe.endeudamientoSBS) {
    const endeudamientos = [...data.informe.endeudamientoSBS]
    endeudamientos.sort((a, b) => {
      if (a._attributes.fechaReporte < b._attributes.fechaReporte) return 1
      if (a._attributes.fechaReporte > b._attributes.fechaReporte) return -1
      return 0
    })
    const lastReport = new Date(parseInt(endeudamientos[0]._attributes.fechaReporte, 10))
    const startReport = new Date(+lastReport)
    startReport.setMonth(startReport.getMonth() - 12)
    // console.log(endeudamientos.length)
    const lastYearEndeudamientos = endeudamientos.filter(endeudamiento => new Date(parseInt(endeudamiento._attributes.fechaReporte, 10)) > startReport)
    // Calificacion stuff
    const Endeudamientos4Calificacion = lastYearEndeudamientos.filter(endeudamiento => !endeudamiento._attributes.codigoPUC.startsWith('84'))
    // console.log(Endeudamientos4Calificacion.length)
    const cal = new Array(12)
    cal.fill(0)
    Endeudamientos4Calificacion.forEach(endeudamiento => {
      const currentDate = new Date(parseInt(endeudamiento._attributes.fechaReporte, 10))
      const diff = lastReport.getMonth() - currentDate.getMonth()
      if (diff >= 0)  cal[diff] += parseInt(endeudamiento._attributes.calificacion, 10)
      else cal[diff + 12] += parseInt(endeudamiento._attributes.calificacion, 10)
      /*
      switch (diff) {
        case 0:
          cal[diff] += parseInt(endeudamiento._attributes.calificacion, 10)
          break
        case 1:
          cal[diff] += parseInt(endeudamiento._attributes.calificacion, 10)
          break
        case 2:
          cal[diff] += parseInt(endeudamiento._attributes.calificacion, 10)
          break
        case 3:
          cal[diff] += parseInt(endeudamiento._attributes.calificacion, 10)
          break
        case 4:
          cal[diff] += parseInt(endeudamiento._attributes.calificacion, 10)
          break
        case 5:
          cal[diff] += parseInt(endeudamiento._attributes.calificacion, 10)
          break
        case 6:
          cal[diff] += parseInt(endeudamiento._attributes.calificacion, 10)
          break
        case 7:
          cal[diff] += parseInt(endeudamiento._attributes.calificacion, 10)
          break
        case 8:
          cal[diff] += parseInt(endeudamiento._attributes.calificacion, 10)
          break
        case 9:
          cal[diff] += parseInt(endeudamiento._attributes.calificacion, 10)
          break
        case 10:
          cal[diff] += parseInt(endeudamiento._attributes.calificacion, 10)
          break
        case -1:
          cal[11] += parseInt(endeudamiento._attributes.calificacion, 10)
          break
      }
      */
    })
    // console.log(cal)
    const lastYearCalification = cal.map(el => !!el)
    calificacion = lastYearCalification.reduce((acc, curr) => acc + curr, 0)
    
    // Deuda directa stuff
    const Endeudamientos4Deudadirecta = endeudamientos.filter(endeudamiento => endeudamiento._attributes.codigoPUC.startsWith('14') || endeudamiento._attributes.codigoPUC.startsWith('81'))
    // console.log(Endeudamientos4Deudadirecta.length)
    const dd = new Array(12)
    dd.fill(0.0)
    Endeudamientos4Deudadirecta.forEach(endeudamiento => {
      const currentDate = new Date(parseInt(endeudamiento._attributes.fechaReporte, 10))
      const diff = lastReport.getMonth() - currentDate.getMonth()
      if (diff >= 0)  dd[diff] += parseFloat(endeudamiento._attributes.saldo)
      else dd[diff + 12] += parseFloat(endeudamiento._attributes.saldo)
    })
    // console.log(dd)
    deuda_directa = dd

    // Deuda indirecta stuff
    const Endeudamientos4dDeudaindirecta = endeudamientos.filter(endeudamiento => endeudamiento._attributes.codigoPUC.startsWith('71') || endeudamiento._attributes.codigoPUC.startsWith('72'))
    const di = new Array(12)
    di.fill(0.0)
    Endeudamientos4dDeudaindirecta.forEach(endeudamiento => {
      const currentDate = new Date(parseInt(endeudamiento._attributes.fechaReporte, 10))
      const diff = lastReport.getMonth() - currentDate.getMonth()
      if (diff >= 0)  di[diff] += parseFloat(endeudamiento._attributes.saldo)
      else di[diff + 12] += parseFloat(endeudamiento._attributes.saldo)
    })
    deuda_indirecta = di

    // Garantia Preferida stuff
    const Endeudamientos4GarantiaPreferia = endeudamientos.filter(endeudamiento => endeudamiento._attributes.codigoPUC.startsWith('84'))
    const gp = new Array(12)
    gp.fill(0.0)
    Endeudamientos4GarantiaPreferia.forEach(endeudamiento => {
      const currentDate = new Date(parseInt(endeudamiento._attributes.fechaReporte, 10))
      const diff = lastReport.getMonth() - currentDate.getMonth()
      if (diff >= 0)  gp[diff] += parseFloat(endeudamiento._attributes.saldo)
      else gp[diff + 12] += parseFloat(endeudamiento._attributes.saldo)
    })
    garantia_preferida = gp
  }

  return {
    razonSocial,
    fechaCreacion,
    padron,
    numTrabajadores,
    calificacion,
    deuda_directa,
    deuda_indirecta,
    garantia_preferida
  }
}
