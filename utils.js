'use strict'

import soapRequest from 'easy-soap-request'
import convert from 'xml-js'
import axios from 'axios'

const {
  experianURL,
  experianUSER,
  experianPASS,
  token
} = process.env

/*
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
*/
export const makeXMLBody = (ruc) => `<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws.hc.dc.com">
   <soapenv:Header/>
   <soapenv:Body>
      <ws:consultar soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
         <idsus xsi:type="soapenc:string" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/">${experianUSER}</idsus>
            <clasus xsi:type="soapenc:string" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/">${experianPASS}</clasus>
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

const getRazonSocial = data => {
  const razonSocial = data.informe.infoRUC ? data.informe.infoRUC._attributes.tipoContribuyente : null
  if (razonSocial === 'SOCIEDAD ANONIMA CERRADA') return 'SAC'
  if (razonSocial === 'SOCIEDAD ANONIMA') return 'SA'
  if (razonSocial === 'SOC.COM.RESPONS. LTDA') return 'SRL'
  if (razonSocial === 'EMPRESA INDIVIDUAL DE RESP. LT') return 'EIRL'
  if (razonSocial === 'UNIVERS. CENTROS EDUCAT. Y CUL') return 'SRL'
  return razonSocial
}

const getFechaCreacion = data => {
  // data.informe.infoRUC ? new Date(data.informe.infoRUC._attributes.fechaAlta - 5 * 60 * 60 * 1000).toString() : null
  if (!data.informe.infoRUC) return null
  const creationDate = new Date(parseInt(data.informe.infoRUC._attributes.fechaAlta, 10))
  let day = creationDate.getDate()
  day = day.toString().length === 2 ? day.toString() : `0${day.toString()}`
  let month = creationDate.getMonth() + 1
  month = month.toString().length === 2 ? month.toString() : `0${month.toString()}`
  return `${day}/${month}/${creationDate.getFullYear()}`
}

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

const getDiffMonths = (endeudamiento, lastReport) => {
  const currentDate = new Date(parseInt(endeudamiento._attributes.fechaReporte, 10))
  return currentDate.getFullYear() === lastReport.getFullYear() ? lastReport.getMonth() - currentDate.getMonth() : 12 + lastReport.getMonth() - currentDate.getMonth()
}

const getCalificacion = (endeudamientos, lastReport) => {
  const regex = /^84[12](401|404|403|405|410|409|5)/
  const filtered = endeudamientos.filter(endeudamiento => !regex.test(endeudamiento._attributes.codigoPUC))
  const res = new Array(12)
  res.fill(0)
  filtered.forEach(endeudamiento => {
    const diff = getDiffMonths(endeudamiento, lastReport)
    if (diff >= 0) res[diff] += parseInt(endeudamiento._attributes.calificacion, 10)
    else res[diff + 12] += parseInt(endeudamiento._attributes.calificacion, 10)
  })
  const calificacion = res.map(el => !!el)
  return 12 - calificacion.reduce((acc, curr) => acc + curr, 0)
}

const getDeudaDirecta = endeudamientos => {
  const regex1 = /^14[12](1|3|4|5|6)/
  const regex2 = /^81[12](302|925)/
  const filtered = endeudamientos.filter(endeudamiento => regex1.test(endeudamiento._attributes.codigoPUC) || regex2.test(endeudamiento._attributes.codigoPUC))
  return filtered.reduce((acc, curr) => acc + parseFloat(curr._attributes.saldo), 0.0)
  /*
  const res = new Array(12)
  res.fill(0.0)
  filtered.forEach(endeudamiento => {
    const diff = getDiffMonths(endeudamiento, lastReport)
    if (diff >= 0) res[diff] += parseFloat(endeudamiento._attributes.saldo)
    else res[diff + 12] += parseFloat(endeudamiento._attributes.saldo)
  })
  return res
  */
}

const getDeudaIndirecta = endeudamientos => {
  const regex = /^71[12](1|2|3|4)/
  const filtered = endeudamientos.filter(endeudamiento => regex.test(endeudamiento._attributes.codigoPUC))
  return filtered.reduce((acc, curr) => acc + parseFloat(curr._attributes.saldo), 0.0)
  /*
  const res = new Array(12)
  res.fill(0.0)
  filtered.forEach(endeudamiento => {
    const diff = getDiffMonths(endeudamiento, lastReport)
    if (diff >= 0) res[diff] += parseFloat(endeudamiento._attributes.saldo)
    else res[diff + 12] += parseFloat(endeudamiento._attributes.saldo)
  })
  return res
  */
}

const getGarantiaPreferida = endeudamientos => {
  const regex = /^84[12]40201/
  const filtered = endeudamientos.filter(endeudamiento => regex.test(endeudamiento._attributes.codigoPUC))
  return filtered.reduce((acc, curr) => acc + parseFloat(curr._attributes.saldo), 0.0)
  /*
  const res = new Array(12)
  res.fill(0.0)
  filtered.forEach(endeudamiento => {
    const diff = getDiffMonths(endeudamiento, lastReport)
    if (diff >= 0) res[diff] += parseFloat(endeudamiento._attributes.saldo)
    else res[diff + 12] += parseFloat(endeudamiento._attributes.saldo)
  })
  return res
  */
}

const getPPP = (endeudamientos, lastReport) => {
  const regex = /^14[12]5/
  const filtered = endeudamientos.filter(endeudamiento => regex.test(endeudamiento._attributes.codigoPUC))
  const res = new Array(12)
  res.fill(0)
  filtered.forEach(endeudamiento => {
    const diff = getDiffMonths(endeudamiento, lastReport)
    const days = parseInt(endeudamiento._attributes.condicion, 10)
    if (diff >= 0) res[diff] = days > res[diff] ? days : res[diff]
    else res[diff + 12] = days > res[diff + 12] ? days : res[diff + 12]
  })
  return (res.reduce((acc, curr) => acc + curr, 0)) / 12
}

export const getInfo = data => {
  const razonSocial = getRazonSocial(data)
  const fechaCreacion = getFechaCreacion(data)
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
    const lastYearStartReport = new Date(+lastReport)
    const lastMonthStartReport = new Date(+lastReport)
    lastYearStartReport.setMonth(lastYearStartReport.getMonth() - 12)
    lastMonthStartReport.setMonth(lastMonthStartReport.getMonth() - 1)

    const lastYearEndeudamientos = endeudamientos.filter(endeudamiento => new Date(parseInt(endeudamiento._attributes.fechaReporte, 10)) > lastYearStartReport && endeudamiento._attributes.indicadorLectura === '0')
    const lastMonthEndeudamientos = endeudamientos.filter(endeudamiento => new Date(parseInt(endeudamiento._attributes.fechaReporte, 10)) > lastMonthStartReport && endeudamiento._attributes.indicadorLectura === '0')

    calificacion = getCalificacion(lastYearEndeudamientos, lastReport)
    deudaDirecta = getDeudaDirecta(lastMonthEndeudamientos)
    deudaIndirecta = getDeudaIndirecta(lastMonthEndeudamientos)
    garantiaPreferida = getGarantiaPreferida(lastMonthEndeudamientos)
    ppp = getPPP(lastYearEndeudamientos, lastReport)
  }

  if (Array.isArray(data.informe.informacionCCL)) {
    const informacionCCL = [...data.informe.informacionCCL]
    informacionCCL.sort((a, b) => {
      if (a._attributes.fechaVencimiento < b._attributes.fechaVencimiento) return 1
      if (a._attributes.fechaVencimiento > b._attributes.fechaVencimiento) return -1
      return 0
    })
    const lastReport = new Date(parseInt(informacionCCL[0]._attributes.fechaVencimiento, 10))
    const startReport = new Date(+lastReport)
    startReport.setMonth(startReport.getMonth() - 24)

    const filteredInformacionCCL = informacionCCL.filter(informacion => new Date(parseInt(informacion._attributes.fechaVencimiento, 10)) > startReport)
    const counter = filteredInformacionCCL.reduce((acc, curr) => {
      if (!curr._attributes.fechaRegularizacion) return acc + (curr._attributes.descripcionMoneda === 'DOLAR AMERICANO' ? parseFloat(curr._attributes.monto) * 3.3 : parseFloat(curr._attributes.monto))
      else return acc
    }, 0.0)
    protestosSinAclarar = counter
  }

  return {
    razonSocial,
    fechaCreacion,
    numTrabajadores,
    calificacion,
    deudaDirecta,
    deudaIndirecta,
    garantiaPreferida,
    protestosSinAclarar,
    ppp
  }
}

export const getPadron = async ruc => {
  const url = `https://dniruc.apisperu.com/api/v1/ruc/${ruc}?token=${token}`
  const { data } = await axios.get(url)
  if (!data || !data.padrones) return '-'
  const padrones = data.padrones
  if (padrones.length === 1 && padrones[0] === 'NINGUNO') return '-'
  const details = [
    {
      active: false,
      type: 'Agente de Retención',
      date: null
    },
    {
      active: false,
      type: 'Agente de Percepción',
      date: null
    },
    {
      active: false,
      type: 'Buen Contribuyente',
      date: null
    }
  ]
  padrones.sort((a, b) => {
    if (new Date(a.slice(-4), a.slice(-7, -5) - 1, a.slice(-10, -8)) < new Date(b.slice(-4), b.slice(-7, -5) - 1, b.slice(-10, -8))) return -1
    if (new Date(a.slice(-4), a.slice(-7, -5) - 1, a.slice(-10, -8)) > new Date(b.slice(-4), b.slice(-7, -5) - 1, b.slice(-10, -8))) return 1
    return 0
  })
  padrones.forEach(padron => {
    const date = new Date(padron.slice(-4), padron.slice(-7, -5) - 1, padron.slice(-10, -8))
    const active = padron.includes('Incorporado')
    if (padron.includes('Agentes de Retención')) {
      details[0].active = active
      details[0].date = date
    }
    if (padron.includes('Agentes de Percepción')) {
      details[1].active = active
      details[1].date = date
    }
    if (padron.includes('Buenos Contribuyentes')) {
      details[2].active = active
      details[2].date = date
    }
  })
  console.log(padrones)
  console.log(details)
  const filtered = details.filter(padron => padron.active)
  console.log(filtered)
  if (filtered.length === 0) return '-'
  if (filtered.length === 1) return filtered[0].type
  filtered.sort((a, b) => {
    if (a.date < b.date) return -1
    if (a.date > b.date) return 1
    return 0
  })
  return filtered.slice(-1)[0].type
}
