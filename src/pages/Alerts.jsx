import { useAuth } from '../lib/useAuth'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { CircleAlert, AlertTriangle, Info, Check, Plus, Trash2, CheckCheck, ChevronRight } from 'lucide-react'
import { alertLink, ruleValue } from '../lib/alerts'
import { useStore } from '../store'
import { Card, Segmented, Modal, Field, Badge, Empty } from '../components/ui'
import { VARIABLES } from '../data/catalog'

const SEV = { critical: { l: 'Crítica', tone: 'red', I: CircleAlert }, warning: { l: 'Advertencia', tone: 'amber', I: AlertTriangle }, info: { l: 'Informativa', tone: 'gray', I: Info } }
const ago = (ts) => { const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? 'ahora' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d` }

export default function Alerts() {
  const { alerts, rules, meters, plant, ackAlert, ackAll, addRule, updateRule, removeRule, toast } = useStore()
  const nav = useNavigate()
  const { can } = useAuth()
  const ed = can('alerts.rules')
  const [tab, setTab] = useState('activas')
  const [sev, setSev] = useState('all')
  const [open, setOpen] = useState(false)
  const [r, setR] = useState({ name: '', meterId: '*', metric: 'P', op: '>', value: 0, severity: 'warning' })

  const list = alerts.filter((a) => (tab === 'activas' ? !a.ack : true) && (sev === 'all' || a.severity === sev))
  return (
    <div className="page">
      <div className="page-h">
        <div><h2>Alertas</h2><p className="muted">Eventos detectados por las reglas. Pulsa un evento para ver la curva del medidor en el momento en que ocurrió.</p></div>
        <div className="row gap8">
          <button className="btn ghost" onClick={() => { ackAll(); toast('Todas las alertas reconocidas') }}><CheckCheck size={15} /> Reconocer todas</button>
          {ed && <button className="btn primary" onClick={() => setOpen(true)}><Plus size={16} /> Nueva regla</button>}
        </div>
      </div>
      <div className="mini-kpis">
        {Object.entries(SEV).map(([k, s]) => (
          <div key={k} className="card mk"><s.I size={18} className={s.tone === 'gray' ? '' : `t-${s.tone}`} /><div><b>{alerts.filter((a) => !a.ack && a.severity === k).length}</b><span>{s.l}s activas</span></div></div>
        ))}
        <div className="card mk"><Check size={18} /><div><b>{alerts.filter((a) => a.ack).length}</b><span>Reconocidas</span></div></div>
      </div>
      <div className="grid g-2-1">
        <Card title="Eventos" actions={<><Segmented size="sm" value={tab} onChange={setTab} options={[{ value: 'activas', label: 'Activas' }, { value: 'todas', label: 'Historial' }]} />
          <select className="mini-select" value={sev} onChange={(e) => setSev(e.target.value)}><option value="all">Todas</option>{Object.entries(SEV).map(([k, s]) => <option key={k} value={k}>{s.l}</option>)}</select></>}>
          {list.length === 0 && <Empty icon="BellOff" title="Sin alertas">Todo opera con normalidad.</Empty>}
          <div className="alert-list">
            {list.map((a) => { const s = SEV[a.severity]; return (
              <div key={a.id} className={`alert-i click ${a.ack ? 'ack' : ''}`} onClick={() => nav(alertLink(a))} title="Ver dónde ocurrió">
                <span className={`al-ic ${s.tone === 'red' ? 't-red' : s.tone === 'amber' ? 't-amber' : 'muted'}`}><s.I size={16} /></span>
                <div className="grow"><b>{a.title}</b><p className="muted sm">{a.detail}</p><span className="muted xs">{new Date(a.ts).toLocaleString('es-PE')} · {ago(a.ts)}</span></div>
                <Badge tone={s.tone}>{s.l}</Badge>
                {a.ack ? <Badge tone="green">Reconocida</Badge> : <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); ackAlert(a.id) }}>Reconocer</button>}
                <ChevronRight size={16} className="muted" />
              </div>) })}
          </div>
        </Card>
        <Card title="Reglas de alerta" subtitle="Se evalúan cada 30 s" actions={<Link to="/configuracion" className="link xs">Límites de tensión</Link>}>
          {rules.map((x) => (
            <div key={x.id} className="rule">
              <label className="switch"><input type="checkbox" disabled={!ed} checked={x.enabled} onChange={(e) => updateRule(x.id, { enabled: e.target.checked })} /><i /></label>
              <div className="grow"><b>{x.name}</b><div className="muted xs">{x.meterId === '*' ? 'Todos los medidores' : x.meterId} · {x.metric === 'offline' ? 'sin comunicación' : `${VARIABLES[x.metric]?.label} ${x.op} ${Number(ruleValue(x, plant)).toFixed(x.metric === 'PF' ? 2 : 0)}${x.dynamic ? ' V (desde Ajustes)' : ''}`}</div></div>
              <Badge tone={SEV[x.severity].tone}>{SEV[x.severity].l}</Badge>
              {!x.dynamic && ed && <button className="icon-btn sm danger" onClick={() => removeRule(x.id)}><Trash2 size={13} /></button>}
            </div>
          ))}
        </Card>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva regla de alerta" width={560}
        footer={<><button className="btn ghost" onClick={() => setOpen(false)}>Cancelar</button><button className="btn primary" disabled={!r.name} onClick={() => { addRule(r); setOpen(false); toast('Regla creada') }}>Crear regla</button></>}>
        <Field label="Nombre"><input value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} placeholder="Ej. Sobrecarga en compresores" /></Field>
        <div className="form-grid mt12">
          <Field label="Medidor"><select value={r.meterId} onChange={(e) => setR({ ...r, meterId: e.target.value })}><option value="*">Todos</option>{meters.map((m) => <option key={m.id} value={m.id}>{m.id} · {m.name}</option>)}</select></Field>
          <Field label="Variable"><select value={r.metric} onChange={(e) => setR({ ...r, metric: e.target.value })}>{Object.entries(VARIABLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}<option value="offline">Sin comunicación</option></select></Field>
          {r.metric !== 'offline' && <><Field label="Condición"><select value={r.op} onChange={(e) => setR({ ...r, op: e.target.value })}><option value=">">Mayor que</option><option value="<">Menor que</option></select></Field>
            <Field label={`Valor (${VARIABLES[r.metric]?.unit || '—'})`}><input type="number" step="any" value={r.value} onChange={(e) => setR({ ...r, value: +e.target.value })} /></Field></>}
          <Field label="Severidad"><select value={r.severity} onChange={(e) => setR({ ...r, severity: e.target.value })}>{Object.entries(SEV).map(([k, s]) => <option key={k} value={k}>{s.l}</option>)}</select></Field>
          <Field label="Notificar por"><select defaultValue="app"><option value="app">Aplicación</option><option>Correo electrónico</option><option>WhatsApp / SMS</option></select></Field>
        </div>
      </Modal>
    </div>
  )
}
