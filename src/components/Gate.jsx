import { useNavigate } from 'react-router-dom'
import { Lock, ShieldOff, Check, Sparkles } from 'lucide-react'
import { useStore } from '../store'
import { useAuth } from '../lib/useAuth'
import { PLANS, FEATURE_LABELS, minPlanFor, ROLES } from '../lib/saas'

export function Denied() {
  const nav = useNavigate()
  const { user } = useAuth()
  return (
    <div className="gate">
      <span className="gate-ic"><ShieldOff size={24} /></span>
      <h2>Acceso restringido</h2>
      <p className="muted">Tu rol <b>{ROLES[user?.role]?.label}</b> no tiene permiso para esta sección. Si lo necesitas, pide acceso al administrador de tu planta.</p>
      <button className="btn primary mt16" onClick={() => nav('/')}>Volver al inicio</button>
    </div>
  )
}

// Muestra el contenido solo si el plan de la planta incluye la funcionalidad
export function PlanGate({ feature, children }) {
  const { plant, can, feature: has } = useAuth()
  const { setPlantMeta, toast, openUpgrade } = useStore()
  if (has(feature)) return children
  const target = Object.entries(PLANS).find(([, p]) => p.features[feature])
  return (
    <div className="gate">
      <span className="gate-ic gold"><Lock size={22} /></span>
      <h2>{FEATURE_LABELS[feature]}</h2>
      <p className="muted">Disponible desde el plan <b>{minPlanFor(feature)}</b>. La planta <b>{plant.name}</b> tiene el plan <b>{PLANS[plant.plan].name}</b>.</p>
      {target && (
        <div className="gate-plan">
          <div className="row between"><b>Plan {target[1].name}</b><span>{target[1].price} <small className="muted">{target[1].per}</small></span></div>
          <ul>{Object.entries(target[1].features).filter(([, v]) => v).map(([k]) => <li key={k}><Check size={13} /> {FEATURE_LABELS[k]}</li>)}<li><Check size={13} /> Hasta {target[1].meters === Infinity ? 'ilimitados' : target[1].meters} medidores</li></ul>
        </div>
      )}
      {can('console')
        ? <button className="btn primary mt16" onClick={() => { setPlantMeta(plant.id, { plan: target[0] }); toast(`Plan cambiado a ${target[1].name}`) }}><Sparkles size={15} /> Cambiar a {target[1].name}</button>
        : <button className="btn primary mt16" onClick={() => openUpgrade(`${FEATURE_LABELS[feature]} está disponible desde el plan ${minPlanFor(feature)}.`)}><Sparkles size={15} /> Mejorar plan</button>}
    </div>
  )
}

// Indicador de uso respecto al límite del plan
export function Usage({ label, used, limit }) {
  const inf = limit === Infinity
  const pct = inf ? Math.min(100, used * 4) : Math.min(100, (used / limit) * 100)
  return (
    <div className="usage">
      <div className="row between"><span>{label}</span><b>{used} <small className="muted">/ {inf ? '∞' : limit}</small></b></div>
      <div className="usage-bar"><i className={!inf && used >= limit ? 'full' : ''} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}
