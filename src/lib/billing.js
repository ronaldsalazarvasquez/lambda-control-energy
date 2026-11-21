// Facturación SaaS: ciclos mensual / anual, facturas, MRR y salud de clientes
import { PLANS } from './saas'

export const ANNUAL_MONTHS = 10 // anual = 2 meses gratis
export const CONTACT = { email: 'ventas@beezcorp.com', whatsapp: '+51 900 000 000', phone: '(01) 000 0000' }

// Fechas 'AAAA-MM-DD' como hora local (evita el desfase de zona horaria)
export const toDate = (v) => new Date(typeof v === 'string' && v.length === 10 ? v + 'T00:00:00' : v)
export const cycleLabel = (c) => (c === 'anual' ? 'Anual' : 'Mensual')
export const priceFor = (planKey, cycle) => (cycle === 'anual' ? PLANS[planKey].monthly * ANNUAL_MONTHS : PLANS[planKey].monthly)
export const priceText = (planKey, cycle) => {
  const v = priceFor(planKey, cycle)
  return `${planKey === 'enterprise' ? 'Desde ' : ''}US$ ${v.toLocaleString('es-PE')}`
}
export const mrrOf = (plant) => (plant.status === 'Prueba' || plant.status === 'Suspendido' ? 0 : plant.billing === 'anual' ? (PLANS[plant.plan].monthly * ANNUAL_MONTHS) / 12 : PLANS[plant.plan].monthly)

const addPeriod = (d, cycle, n = 1) => { const x = new Date(d); cycle === 'anual' ? x.setFullYear(x.getFullYear() + n) : x.setMonth(x.getMonth() + n); return x }

// Facturas emitidas desde el inicio del contrato
export function invoicesFor(plant) {
  if (plant.status === 'Prueba') return []
  const out = []
  const cycle = plant.billing || 'mensual'
  let d = toDate(plant.since)
  const now = new Date()
  let k = 0
  while (d <= now && k < 60) {
    out.push({ id: `${plant.id}-${k}`, plantId: plant.id, date: d.getTime(), due: d.getTime() + 15 * 864e5, cycle, plan: plant.plan,
      amount: priceFor(plant.plan, cycle), period: cycle === 'anual' ? `${d.getFullYear()}–${d.getFullYear() + 1}` : d.toLocaleDateString('es-PE', { month: 'short', year: 'numeric' }), status: 'Pagada' })
    d = addPeriod(d, cycle); k++
  }
  if (out.length) {
    const last = out[out.length - 1]
    if (plant.paymentStatus === 'Pendiente') last.status = 'Pendiente'
    if (plant.paymentStatus === 'Vencido') last.status = 'Vencida'
  }
  return out.reverse()
}
export function nextInvoice(plant) {
  if (plant.status === 'Prueba') return { date: toDate(plant.renewal).getTime(), amount: 0, trial: true }
  const inv = invoicesFor(plant)[0]
  const base = inv ? new Date(inv.date) : toDate(plant.since)
  return { date: addPeriod(base, plant.billing || 'mensual').getTime(), amount: priceFor(plant.plan, plant.billing || 'mensual') }
}

// Salud del cliente: combina pago, comunicación, uso y alertas
export function healthOf({ p, meters, online, alerts, plan }) {
  const issues = []
  if (p.paymentStatus === 'Vencido') issues.push({ t: 'Pago vencido', lvl: 3 })
  else if (p.paymentStatus === 'Pendiente') issues.push({ t: 'Pago pendiente', lvl: 2 })
  if (online < meters) issues.push({ t: `${meters - online} medidor(es) sin comunicación`, lvl: 2 })
  if (alerts > 4) issues.push({ t: `${alerts} alertas abiertas`, lvl: 2 })
  if (p.status === 'Prueba') issues.push({ t: 'En periodo de prueba', lvl: 1 })
  const upsell = plan.meters !== Infinity && meters >= plan.meters
  const lvl = Math.max(0, ...issues.map((i) => i.lvl))
  return { issues, upsell, level: lvl >= 3 ? 'riesgo' : lvl === 2 ? 'atencion' : 'ok', label: lvl >= 3 ? 'En riesgo' : lvl === 2 ? 'Atención' : 'Saludable' }
}

// Ingreso recurrente mensual de los últimos 12 meses (según fecha de inicio de cada planta)
export function mrrHistory(plants) {
  const out = []
  const now = new Date(); now.setDate(1); now.setHours(0, 0, 0, 0)
  for (let k = 11; k >= 0; k--) {
    const m = new Date(now); m.setMonth(m.getMonth() - k)
    const end = new Date(m); end.setMonth(end.getMonth() + 1)
    const mrr = plants.filter((p) => toDate(p.since) < end && p.status !== 'Prueba').reduce((a, p) => a + mrrOf({ ...p, status: 'Activo' }), 0)
    out.push({ label: m.toLocaleDateString('es-PE', { month: 'short' }), mrr: Math.round(mrr) })
  }
  return out
}
