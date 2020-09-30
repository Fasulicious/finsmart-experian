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

const getRazonSocial = data => data.informe.infoRUC ? data.informe.infoRUC._attributes.tipoContribuyente : null

const getFechaCreacion = data => data.informe.infoRUC ? new Date(data.informe.infoRUC._attributes.fechaAlta - 5 * 60 * 60 * 1000).toString() : null

const getPadron = data => data.informe.buenosContribuyentes

const getNumTrabajadores = data => {
  if (data.informe.otrosDatosEmpresa) {
    const otrosDatosEmpresa = [...data.informe.otrosDatosEmpresa]
    otrosDatosEmpresa.sort((a, b) => {
      if (a._attributes.periodo < b._attributes.periodo) return -1
      if (a._attributes.periodo > b._attributes.periodo) return 1
      return 0
    })
    return parseInt(otrosDatosEmpresa.slice(-1)[0]._attributes.numeroEmpleados, 10)
  }
  return null
}

const getCalificacion = (endeudamientos, lastReport) => {
  const regex = /^84[12][401, 404, 403, 405, 410, 409, 5]/
  const filtered = endeudamientos.filter(endeudamiento => !regex.test(endeudamiento._attributes.codigoPUC))
  const res = new Array(12)
  res.fill(0)
  filtered.forEach(endeudamiento => {
    const currentDate = new Date(parseInt(endeudamiento._attributes.fechaReporte, 10))
    const diff = lastReport.getMonth() - currentDate.getMonth()
    if (diff >= 0) res[diff] += parseInt(endeudamiento._attributes.calificacion, 10)
    else res[diff + 12] += parseInt(endeudamiento._attributes.calificacion, 10)
  })
  const calificacion = res.map(el => !!el)
  return calificacion.reduce((acc, curr) => acc + curr, 0)
}

const getDeudaDirecta = (endeudamientos, lastReport) => {
  const regex1 = /^14[12][13456]/
  const regex2 = /^81[12][302, 925]/
  const filtered = endeudamientos.filter(endeudamiento => regex1.test(endeudamiento._attributes.codigoPUC) || regex2.test(endeudamiento._attributes.codigoPUC))
  const res = new Array(12)
  res.fill(0.0)
  filtered.forEach(endeudamiento => {
    const currentDate = new Date(parseInt(endeudamiento._attributes.fechaReporte, 10))
    const diff = lastReport.getMonth() - currentDate.getMonth()
    if (diff >= 0) res[diff] += parseFloat(endeudamiento._attributes.saldo)
    else res[diff + 12] += parseFloat(endeudamiento._attributes.saldo)
  })
  return res
}

const getDeudaIndirecta = (endeudamientos, lastReport) => {
  const regex = /^71[12][1234]/
  const filtered = endeudamientos.filter(endeudamiento => regex.test(endeudamiento._attributes.codigoPUC))
  const res = new Array(12)
  res.fill(0.0)
  filtered.forEach(endeudamiento => {
    const currentDate = new Date(parseInt(endeudamiento._attributes.fechaReporte, 10))
    const diff = lastReport.getMonth() - currentDate.getMonth()
    if (diff >= 0) res[diff] += parseFloat(endeudamiento._attributes.saldo)
    else res[diff + 12] += parseFloat(endeudamiento._attributes.saldo)
  })
  return res
}

const getGarantiaPreferida = (endeudamientos, lastReport) => {
  const regex = /^84[12]40201/
  const filtered = endeudamientos.filter(endeudamiento => regex.test(endeudamiento._attributes.codigoPUC))
  const res = new Array(12)
  res.fill(0.0)
  filtered.forEach(endeudamiento => {
    const currentDate = new Date(parseInt(endeudamiento._attributes.fechaReporte, 10))
    const diff = lastReport.getMonth() - currentDate.getMonth()
    if (diff >= 0) res[diff] += parseFloat(endeudamiento._attributes.saldo)
    else res[diff + 12] += parseFloat(endeudamiento._attributes.saldo)
  })
  return res
}

export const getInfo = data => {
  const razonSocial = getRazonSocial(data)
  const fechaCreacion = getFechaCreacion(data)
  const padron = getPadron(data)
  const numTrabajadores = getNumTrabajadores(data)
  let calificacion = null
  let deudaDirecta = null
  let deudaIndirecta = null
  let garantiaPreferida = null
  let protestosSinAclarar = null
  let ppp = null

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

    const lastYearEndeudamientos = endeudamientos.filter(endeudamiento => new Date(parseInt(endeudamiento._attributes.fechaReporte, 10)) > startReport && endeudamiento._attributes.indicadorLectura === '0')

    // CALIFICACION STUFF
    calificacion = getCalificacion(lastYearEndeudamientos, lastReport)

    // DEUDA DIRECTA STUFF
    deudaDirecta = getDeudaDirecta(lastYearEndeudamientos, lastReport)

    // DEUDA INDIRECTA STUFF
    deudaIndirecta = getDeudaIndirecta(lastYearEndeudamientos, lastReport)
    
    // GARANTIA PREFERIDA STUFF
    garantiaPreferida = getGarantiaPreferida(lastYearEndeudamientos, lastReport)
    /*
    const Endeudamientos4GarantiaPreferia = lastYearEndeudamientos.filter(endeudamiento => endeudamiento._attributes.codigoPUC.startsWith('84240201') || endeudamiento._attributes.codigoPUC.startsWith('84140201'))
    const gp = new Array(12)
    gp.fill(0.0)
    Endeudamientos4GarantiaPreferia.forEach(endeudamiento => {
      const currentDate = new Date(parseInt(endeudamiento._attributes.fechaReporte, 10))
      const diff = lastReport.getMonth() - currentDate.getMonth()
      if (diff >= 0) gp[diff] += parseFloat(endeudamiento._attributes.saldo)
      else gp[diff + 12] += parseFloat(endeudamiento._attributes.saldo)
    })
    garantiaPreferida = gp
    */

    // PPP STUFF
    const Endeudamientos4PPP = lastYearEndeudamientos.filter(endeudamiento => !endeudamiento._attributes.codigoPUC.startsWith('84'))
    ppp = new Array(12)
    ppp.fill(0)
    Endeudamientos4PPP.forEach(endeudamiento => {
      const currentDate = new Date(parseInt(endeudamiento._attributes.fechaReporte, 10))
      const diff = lastReport.getMonth() - currentDate.getMonth()
      const days = parseInt(endeudamiento._attributes.condicion, 10)
      if (diff >= 0) ppp[diff] = days > ppp[diff] ? days : ppp[diff]
      else ppp[diff + 12] = days > ppp[diff + 12] ? days : ppp[diff + 12]
    })
  }

  if (data.informe.informacionCCL) {
    const informacionCCL = [...data.informe.informacionCCL]
    informacionCCL.sort((a, b) => {
      if (a._attributes.fechaActualizacionDC < b._attributes.fechaActualizacionDC) return 1
      if (a._attributes.fechaActualizacionDC > b._attributes.fechaActualizacionDC) return -1
      return 0
    })
    const lastReport = new Date(parseInt(informacionCCL[0]._attributes.fechaActualizacionDC, 10))
    const startReport = new Date(+lastReport)
    startReport.setMonth(startReport.getMonth() - 24)
    const filteredInformacionCCL = informacionCCL.filter(informacion => new Date(parseInt(informacion._attributes.fechaActualizacionDC, 10)) > startReport)
    const counter = filteredInformacionCCL.reduce((acc, curr) => {
      if (!curr._attributes.fechaRegularizacion) return acc + 1
      else return acc
    }, 0)
    protestosSinAclarar = counter
  }

  return {
    razonSocial,
    fechaCreacion,
    padron,
    numTrabajadores,
    calificacion,
    deudaDirecta,
    deudaIndirecta,
    garantiaPreferida,
    protestosSinAclarar,
    ppp
  }
}
