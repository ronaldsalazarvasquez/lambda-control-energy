import { useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { PLANS, ROLES, FEATURE_LABELS } from '../lib/saas'
import { Usage } from '../components/Gate'
import { nextInvoice, invoicesFor, cycleLabel, CONTACT, toDate } from '../lib/billing'
import { Save, RotateCcw, Factory, Coins, Users, Database, Zap, CreditCard, Check, Plus, Sparkles } from 'lucide-react'
import { scanVoltageEvents } from '../lib/alerts'
import { useStore } from '../store'
import { Card, Field, Modal, Badge } from '../components/ui'
import { INDUSTRY_TEMPLATES } from '../data/seed'

export default function Settings() {
  const store = useStore()
  const { plant, updatePlant, applyIndustry, resetDemo, toast, directory, addUser, setPlantMeta, meters, dashboards } = store
  const { can, plan, feature, user } = useAuth()
  const users = directory.filter((u) => u.plants === '*' ? false : u.plants.includes(plant.id))
  const [invite, setInvite] = useState(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [f, setF] = useState(plant)
  const [reset, setReset] = useState(false)
  const [ind, setInd] = useState(null)
  const num = (k) => (e) => setF({ ...f, [k]: +e.target.value })
  const txt = (k) => (e) => setF({ ...f, [k]: e.target.value })
  return (
    <div className="page">
      <div className="page-h">
        <div><h2>Configuración</h2><p className="muted">Parámetros de planta, tarifas y usuarios.</p></div>
        <button className="btn primary" onClick={() => { updatePlant(f); setTimeout(scanVoltageEvents, 0); toast('Configuración guardada') }}><Save size={15} /> Guardar cambios</button>
      </div>
      <div className="grid g-2">
        <Card title={<span className="row gap8"><Factory size={16} /> Planta</span>}>
          <div className="form-grid">
            <Field label="Nombre de planta"><input value={f.name} onChange={txt('name')} /></Field>
            <Field label="Empresa"><input value={f.company} onChange={txt('company')} /></Field>
            <Field label="Ubicación"><input value={f.location} onChange={txt('location')} /></Field>
            <Field label="Tipo de industria">
              <select value={f.industry} onChange={(e) => { setF({ ...f, industry: e.target.value }); setInd(e.target.value) }}>
                {Object.entries(INDUSTRY_TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Frecuencia (Hz)"><input type="number" value={f.frequency} onChange={num('frequency')} /></Field>
            <Field label="Capacidad de proceso (t/h paddy)"><input type="number" value={f.capacityTph} onChange={num('capacityTph')} /></Field>
            <Field label="Meta consumo específico (kWh/t)"><input type="number" value={f.targetKwht} onChange={num('targetKwht')} /></Field>
          </div>
        </Card>
        <Card title={<span className="row gap8"><Coins size={16} /> Tarifa eléctrica</span>} subtitle="Usada para costos, reportes y simulaciones">
          <div className="form-grid">
            <Field label="Energía hora punta (S/ kWh)"><input type="number" step="0.01" value={f.tariffHP} onChange={num('tariffHP')} /></Field>
            <Field label="Energía fuera de punta (S/ kWh)"><input type="number" step="0.01" value={f.tariffFP} onChange={num('tariffFP')} /></Field>
            <Field label="Inicio hora punta"><input type="number" min="0" max="23" value={f.peakStart} onChange={num('peakStart')} /></Field>
            <Field label="Fin hora punta"><input type="number" min="1" max="24" value={f.peakEnd} onChange={num('peakEnd')} /></Field>
            <Field label="Potencia contratada (kW)"><input type="number" value={f.contractedKw} onChange={num('contractedKw')} /></Field>
            <Field label="Factor emisión (kg CO₂/kWh)"><input type="number" step="0.01" value={f.co2Factor} onChange={num('co2Factor')} /></Field>
          </div>
        </Card>
        <Card className={feature('voltage') ? '' : 'locked-card'} title={<span className="row gap8"><Zap size={16} /> Calidad de energía · ingreso a planta {!feature('voltage') && <span className="plan-tag p-pro">Pro</span>}</span>} subtitle="Límites de tensión del medidor general. Los huecos y sobretensiones que los superen se registran como eventos automáticos.">
          <div className="form-grid">
            <Field label="Tensión nominal (V)"><input type="number" value={f.voltage} onChange={num('voltage')} /></Field>
            <Field label="Duración mínima del evento (s)"><input type="number" value={f.vMinDurS} onChange={num('vMinDurS')} /></Field>
            <Field label="Límite inferior (%)" hint={`Subtensión por debajo de ${(f.voltage * (1 - f.vLowPct / 100)).toFixed(0)} V`}><input type="number" step="0.5" value={f.vLowPct} onChange={num('vLowPct')} /></Field>
            <Field label="Límite superior (%)" hint={`Sobretensión por encima de ${(f.voltage * (1 + f.vHighPct / 100)).toFixed(0)} V`}><input type="number" step="0.5" value={f.vHighPct} onChange={num('vHighPct')} /></Field>
          </div>
          <div className="vlim mt12">
            <span style={{ width: '25%' }}>Subtensión</span><span style={{ width: '50%' }}>Rango normal {(f.voltage * (1 - f.vLowPct / 100)).toFixed(0)} – {(f.voltage * (1 + f.vHighPct / 100)).toFixed(0)} V</span><span style={{ width: '25%' }}>Sobretensión</span>
          </div>
        </Card>
        <Card title={<span className="row gap8"><CreditCard size={16} /> Plan y suscripción</span>} actions={<button className="btn sm primary" onClick={() => store.openUpgrade()}><Sparkles size={13} /> {can('console') ? 'Cambiar plan' : 'Mejorar plan'}</button>}>
          <div className="row between mb12">
            <div><span className={`plan-tag p-${plant.plan}`}>{plan.name}</span> <span className="muted sm">· {plan.price} {plan.per}</span></div>
            <span className="muted xs">{plant.status === 'Prueba' ? `Prueba hasta ${toDate(plant.renewal).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}` : `Contrato desde ${toDate(plant.since).toLocaleDateString('es-PE', { month: 'short', year: 'numeric' })}`}</span>
          </div>
          {(() => { const nx = nextInvoice(plant); const inv = invoicesFor(plant).slice(0, 3); return (<>
            <div className="bill-grid">
              <div><small>Facturación</small><b>{plant.status === 'Prueba' ? 'Prueba gratuita' : cycleLabel(plant.billing)}</b></div>
              <div><small>{nx.trial ? 'Fin de la prueba' : 'Próximo cobro'}</small><b>{new Date(nx.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</b>{!nx.trial && <small>US$ {nx.amount.toLocaleString('es-PE')}</small>}</div>
              <div><small>Estado de pago</small><b className={plant.paymentStatus === 'Al día' ? 't-green' : 't-amber'}>{plant.status === 'Prueba' ? '—' : plant.paymentStatus}</b></div>
            </div>
            {inv.length > 0 && <table className="tbl mb12"><tbody>{inv.map((i) => <tr key={i.id}><td className="sm">{i.period}</td><td className="r num">US$ {i.amount.toLocaleString('es-PE')}</td><td className="r"><span className={`pay ${i.status === 'Pagada' ? 'pay-ok' : i.status === 'Pendiente' ? 'pay-pend' : 'pay-late'}`}>{i.status}</span></td></tr>)}</tbody></table>}
          </>) })()}
          <div className="usage-grid">
            <Usage label="Medidores" used={meters.length} limit={plan.meters} />
            <Usage label="Dashboards" used={dashboards.length} limit={plan.dashboards} />
            <Usage label="Usuarios" used={users.length} limit={plan.users} />
          </div>
          <ul className="plan-list mt12">{Object.entries(FEATURE_LABELS).map(([f, l]) => <li key={f} className={plan.features[f] ? '' : 'off'}><Check size={14} /> {l}</li>)}</ul>
          <p className="muted xs mt12">¿Dudas sobre tu plan o facturación? Escríbenos a <a className="link" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> o al WhatsApp {CONTACT.whatsapp}.</p>
        </Card>
        <Card title={<span className="row gap8"><Users size={16} /> Usuarios de la planta</span>} actions={can('users.manage') && <button className="btn sm" disabled={users.length >= plan.users} onClick={() => setInvite({ name: '', email: '', role: 'operator' })}><Plus size={13} /> Invitar</button>}>
          <table className="tbl">
            <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th></tr></thead>
            <tbody>{users.map((u) => <tr key={u.id}><td><span className="avatar sm">{u.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}</span> {u.name}</td><td className="muted">{u.email}</td><td><span className={`role-tag r-${u.role}`}>{ROLES[u.role].label}</span></td></tr>)}</tbody>
          </table>
          <p className="muted xs mt12">El equipo Beez tiene acceso de soporte a todas las plantas. Los integradores se asignan desde la consola Beez.</p>
        </Card>
        <Card title={<span className="row gap8"><Database size={16} /> Datos de demostración</span>}>
          <p className="muted sm">Este mockup guarda la configuración en el navegador. Los datos de medición son simulados con perfiles reales de un molino de arroz (2 turnos, secado continuo, compresores).</p>
          <button className="btn ghost danger mt12" onClick={() => setReset(true)}><RotateCcw size={15} /> Restablecer datos de demostración</button>
        </Card>
      </div>
      <Modal open={!!ind} onClose={() => setInd(null)} title="Aplicar plantilla de industria" width={460}
        footer={<><button className="btn ghost" onClick={() => setInd(null)}>Solo cambiar tipo</button><button className="btn primary" onClick={() => { applyIndustry(ind); setInd(null); toast('Áreas de plantilla aplicadas') }}>Reemplazar áreas</button></>}>
        <p>¿Reemplazar las áreas actuales por las de la plantilla <b>{INDUSTRY_TEMPLATES[ind]?.name}</b>?</p>
        <div className="chips mt12">{INDUSTRY_TEMPLATES[ind]?.areas.map((a) => <span key={a.id} className="chip">{a.name}</span>)}</div>
      </Modal>
      <Modal open={!!invite} onClose={() => setInvite(null)} title="Invitar usuario a la planta" width={480}
        footer={<><button className="btn ghost" onClick={() => setInvite(null)}>Cancelar</button><button className="btn primary" disabled={!invite?.name || !invite?.email} onClick={() => { addUser({ ...invite, org: plant.company, plants: [plant.id] }); toast(`Invitación enviada a ${invite.email}`); setInvite(null) }}>Enviar invitación</button></>}>
        {invite && <div className="form-grid">
          <Field label="Nombre"><input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} /></Field>
          <Field label="Correo"><input value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} /></Field>
          <Field label="Rol"><select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>{['plant_admin', 'supervisor', 'operator'].map((k) => <option key={k} value={k}>{ROLES[k].label}</option>)}</select></Field>
        </div>}
        {invite && <p className="muted xs mt12">{ROLES[invite.role].desc}.</p>}
      </Modal>
      <Modal open={planOpen} onClose={() => setPlanOpen(false)} title="Cambiar plan de la planta" width={720}>
        <div className="plans compact">
          {Object.entries(PLANS).map(([k, p]) => (
            <button key={k} disabled={p.meters < meters.length} className={`card plan-card ${plant.plan === k ? 'featured' : ''}`} onClick={() => { setPlantMeta(plant.id, { plan: k }); setPlanOpen(false); toast(`Plan cambiado a ${p.name}`) }}>
              <span className={`plan-tag p-${k}`}>{p.name}</span><div className="plan-price">{p.price}</div>
              <p className="muted xs">{p.meters === Infinity ? 'Medidores ilimitados' : `Hasta ${p.meters} medidores`}</p>
            </button>
          ))}
        </div>
      </Modal>
      <Modal open={reset} onClose={() => setReset(false)} title="Restablecer demo" width={420}
        footer={<><button className="btn ghost" onClick={() => setReset(false)}>Cancelar</button><button className="btn danger" onClick={() => { resetDemo(); setF(useStore.getState().plant); setReset(false); toast('Datos restablecidos') }}>Restablecer</button></>}>
        <p>Se perderán los dashboards, medidores, áreas y flujos que hayas creado.</p>
      </Modal>
    </div>
  )
}
