import { useEffect, useState } from 'react'
import { Check, Sparkles, Mail, MessageCircle, Phone, CheckCircle2 } from 'lucide-react'
import { useStore } from '../store'
import { useAuth } from '../lib/useAuth'
import { Modal, Segmented, Field } from './ui'
import { PLANS, FEATURE_LABELS } from '../lib/saas'
import { priceFor, ANNUAL_MONTHS, CONTACT } from '../lib/billing'

const ORDER = ['starter', 'pro', 'enterprise']

// Modal global para que el cliente solicite una mejora de plan (Beez recibe la solicitud en la consola)
export default function UpgradeModal() {
  const up = useStore((s) => s.upgrade)
  const { closeUpgrade, submitRequest, setPlantMeta, toast, meters } = useStore()
  const { plant, user, can } = useAuth()
  const [cycle, setCycle] = useState('anual')
  const [target, setTarget] = useState('pro')
  const [form, setForm] = useState({ phone: '', via: 'WhatsApp', note: '' })
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!up) return
    const next = ORDER[Math.min(ORDER.indexOf(plant.plan) + 1, ORDER.length - 1)]
    setTarget(next); setCycle(plant.billing || 'anual'); setSent(false)
    setForm({ phone: '', via: 'WhatsApp', note: up.reason || '' })
  }, [up]) // eslint-disable-line

  if (!up || !user) return null
  const direct = can('console')
  const send = () => {
    if (direct) { setPlantMeta(plant.id, { plan: target, billing: cycle, status: 'Activo' }); toast(`Plan cambiado a ${PLANS[target].name} (${cycle})`); closeUpgrade(); return }
    submitRequest({ plantId: plant.id, from: plant.plan, to: target, cycle, by: user.name, email: user.email, phone: form.phone, via: form.via, note: form.note })
    setSent(true)
  }

  return (
    <Modal open onClose={closeUpgrade} title={sent ? 'Solicitud enviada' : 'Mejora tu plan'} width={sent ? 520 : 940}
      footer={!sent && <><span className="muted xs grow">Plan actual: <b>{PLANS[plant.plan].name}</b> · {meters.length} medidores en uso</span>
        <button className="btn ghost" onClick={closeUpgrade}>Cancelar</button>
        <button className="btn primary" disabled={target === plant.plan && cycle === plant.billing} onClick={send}><Sparkles size={15} /> {direct ? 'Aplicar cambio' : 'Solicitar mejora'}</button></>}>
      {sent ? (
        <div className="up-done">
          <CheckCircle2 size={40} />
          <h3>¡Gracias, {user.name.split(' ')[0]}!</h3>
          <p className="muted">Recibimos tu solicitud para pasar a <b>{PLANS[target].name}</b> con facturación <b>{cycle}</b>. Un asesor de Beez te contactará en menos de 24 horas para confirmar el cambio.</p>
          <div className="up-contact">
            <a href={`mailto:${CONTACT.email}`}><Mail size={15} /> {CONTACT.email}</a>
            <span><MessageCircle size={15} /> WhatsApp {CONTACT.whatsapp}</span>
            <span><Phone size={15} /> {CONTACT.phone}</span>
          </div>
          <button className="btn primary mt16" onClick={closeUpgrade}>Entendido</button>
        </div>
      ) : (
        <>
          {up.reason && <div className="limit-note mb12">{up.reason}</div>}
          <div className="row between wrap gap8 mb12">
            <p className="muted sm">Elige el plan y la forma de pago. {direct ? 'Como administrador Beez el cambio se aplica al instante.' : 'Te contactamos para confirmar; no se cobra nada hasta que lo apruebes.'}</p>
            <Segmented value={cycle} onChange={setCycle} options={[{ value: 'mensual', label: 'Mensual' }, { value: 'anual', label: `Anual · ahorra ${12 - ANNUAL_MONTHS} meses` }]} />
          </div>
          <div className="up-plans">
            {ORDER.map((k) => {
              const p = PLANS[k]
              const cur = plant.plan === k
              const tooSmall = p.meters < meters.length
              return (
                <button key={k} disabled={tooSmall} className={`up-plan ${target === k ? 'on' : ''}`} onClick={() => setTarget(k)}>
                  <div className="row between"><span className={`plan-tag p-${k}`}>{p.name}</span>{cur && <span className="muted xs">Plan actual</span>}</div>
                  <div className="up-price">{k === 'enterprise' && <small>Desde </small>}US$ {priceFor(k, cycle).toLocaleString('es-PE')}<small> /{cycle === 'anual' ? 'año' : 'mes'}</small></div>
                  {cycle === 'anual' && <div className="xs t-green">Equivale a US$ {Math.round(priceFor(k, 'anual') / 12)}/mes</div>}
                  <ul>
                    <li><Check size={13} /> <b>{p.meters === Infinity ? 'Medidores ilimitados' : `Hasta ${p.meters} medidores`}</b></li>
                    <li><Check size={13} /> {p.dashboards === Infinity ? 'Dashboards ilimitados' : `${p.dashboards} dashboards`}</li>
                    {Object.entries(FEATURE_LABELS).filter(([f]) => p.features[f]).slice(2).map(([f, l]) => <li key={f}><Check size={13} /> {l}</li>)}
                  </ul>
                  {tooSmall && <p className="t-red xs">Tu planta ya usa {meters.length} medidores</p>}
                </button>
              )
            })}
          </div>
          {!direct && (
            <div className="form-grid mt16">
              <Field label="¿Cómo prefieres que te contactemos?"><select value={form.via} onChange={(e) => setForm({ ...form, via: e.target.value })}><option>WhatsApp</option><option>Llamada</option><option>Correo</option></select></Field>
              <Field label={form.via === 'Correo' ? 'Correo' : 'Teléfono'}><input value={form.via === 'Correo' ? user.email : form.phone} readOnly={form.via === 'Correo'} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+51 9__ ___ ___" /></Field>
              <Field label="Comentario (opcional)" className="span2"><textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ej. Vamos a instalar 4 medidores nuevos en pulido." /></Field>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
