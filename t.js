const a = require('./test.json')
const d = a.informe.endeudamientoSBS
const df = d.filter(e => !e._attributes.codigoPUC.startsWith('84'))
const puc = df.map(e => e._attributes.codigoPUC)
const cal = df.map(e => e._attributes.calificacion)
console.log(new Set(cal))
console.log(new Set(puc))