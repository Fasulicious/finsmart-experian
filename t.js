const a = require('./test.json')
//const d = a.informe.endeudamientoSBS

const informacionCCL = [...a.informe.informacionCCL]
informacionCCL.sort((a, b) => {
  if (a._attributes.fechaActualizacionDC < b._attributes.fechaActualizacionDC) return 1
  if (a._attributes.fechaActualizacionDC > b._attributes.fechaActualizacionDC) return -1
  return 0
})
const lastReport = new Date(parseInt(informacionCCL[0]._attributes.fechaActualizacionDC, 10))
const startReport = new Date(+lastReport)
startReport.setMonth(startReport.getMonth() - 24)
const filteredInformacionCCL = informacionCCL.filter(informacion => new Date(parseInt(informacion._attributes.fechaActualizacionDC, 10)) > startReport)
console.log(filteredInformacionCCL.length)
const counter = filteredInformacionCCL.reduce((acc, curr) => {
  console.log(!curr._attributes.fechaRegularizacion)
  if (!curr._attributes.fechaRegularizacion)  acc + 1
  else  acc
}, 0)
console.log(counter)
x = [1,2,3,4]
const c = x.reduce((acc, curr) => acc + 1, 0)
console.log({c})
/*
const puc = df.map(e => e._attributes.codigoPUC)
const cal = df.map(e => e._attributes.calificacion)
console.log(new Set(cal))
console.log(new Set(puc))
console.log(lastYearEndeudamientos.length)
console.log(df.length)
console.log(df.map(e => e._attributes.saldo))
*/