const a = require('./test.json')
const d = a.informe.endeudamientoSBS

const endeudamientos = [...d]
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

const df = lastYearEndeudamientos.filter(e => e._attributes.codigoPUC.startsWith('84'))
const cal = new Array(12)
cal.fill(0)
df.forEach(endeudamiento => {
  const currentDate = new Date(parseInt(endeudamiento._attributes.fechaReporte, 10))
  const diff = lastReport.getMonth() - currentDate.getMonth()
  if (diff >= 0)  cal[diff] += parseInt(endeudamiento._attributes.calificacion, 10)
  else cal[diff + 12] += parseInt(endeudamiento._attributes.calificacion, 10)
})

const Endeudamientos4Calificacion = lastYearEndeudamientos.filter(endeudamiento => !endeudamiento._attributes.codigoPUC.startsWith('84'))
const cal = new Array(12)
cal.fill(0)
Endeudamientos4Calificacion.forEach(endeudamiento => {
  const currentDate = new Date(parseInt(endeudamiento._attributes.fechaReporte, 10))
  const diff = lastReport.getMonth() - currentDate.getMonth()
  if (diff >= 0)  cal[diff] += parseInt(endeudamiento._attributes.calificacion, 10)
  else cal[diff + 12] += parseInt(endeudamiento._attributes.calificacion, 10)
})
console.log(cal)
/*
const puc = df.map(e => e._attributes.codigoPUC)
const cal = df.map(e => e._attributes.calificacion)
console.log(new Set(cal))
console.log(new Set(puc))
console.log(lastYearEndeudamientos.length)
console.log(df.length)
console.log(df.map(e => e._attributes.saldo))
*/