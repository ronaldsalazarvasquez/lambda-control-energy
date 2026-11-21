import { useStore } from '../store'
import { plantEvents } from './sim'
import { hasFeature } from './saas'

// Motor de reglas de alerta
export const ruleValue = (r, plant) => (r.dynamic === 'vlow' ? plant.voltage * (1 - plant.vLowPct / 100) : r.dynamic === 'vhigh' ? plant.voltage * (1 + plant.vHighPct / 100) : r.value)

// Revisa la curva de tensión del ingreso y registra huecos / sobretensiones que superan los límites
export function scanVoltageEvents() {
  const { plant, meters, alerts, rules, pushAlert } = useStore.getState()
  const main = meters.find((m) => m.isMain)
  if (!main || !hasFeature(plant, 'voltage')) return
  const on = (dyn) => rules.some((r) => r.dynamic === dyn && r.enabled)
  const now = Date.now()
  plantEvents(now - 7 * 86400e3, now).forEach((e) => {
    const id = 'ev-' + e.start
    if (alerts.some((a) => a.id === id)) return
    const dev = Math.abs(e.depth) * 100
    const dur = (e.end - e.start) / 1000
    if (dur < (plant.vMinDurS || 0)) return
    const sag = e.type === 'sag'
    if (sag && (!on('vlow') || dev < plant.vLowPct)) return
    if (!sag && (!on('vhigh') || dev < plant.vHighPct)) return
    const v = plant.voltage * (1 - e.depth)
    pushAlert({ id, ts: e.start, meterId: main.id, metric: 'V12', severity: 'warning', ack: e.start < now - 12 * 3600e3,
      title: sag ? 'Hueco de tensión en ingreso' : 'Sobretensión en ingreso',
      detail: `${main.id} ${main.name}: ${v.toFixed(0)} V (${sag ? '−' : '+'}${dev.toFixed(1)} %) durante ${Math.round(dur / 60)} min` })
  })
  useStore.setState((s) => ({ alerts: [...s.alerts].sort((a, b) => b.ts - a.ts) }))
}

// Ruta al punto donde ocurrió el evento
export const alertLink = (a) => (a.metric && a.metric !== 'offline' ? `/medidores/${a.meterId}?ev=${a.ts}&var=${a.metric}` : `/medidores/${a.meterId}`)

