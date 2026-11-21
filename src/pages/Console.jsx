import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts'
import { Building2, Gauge, Users, Wallet, Plus, Search, LogIn, Pencil, Trash2, Check, MapPin, TrendingUp, Receipt, Inbox, AlertTriangle, Sparkles, Clock, Mail, MessageCircle, Phone, X, ArrowRight, CircleDollarSign } from 'lucide-react'
import { useStore, plantsFor, allPlants } from '../store'
import { useAuth } from '../lib/useAuth'
import { Card, Modal, Field, Segmented, Empty } from '../components/ui'
import { Usage } from '../components/Gate'
import { PLANS, ROLES, FEATURE_LABELS, fmtLimit } from '../lib/saas'
import { mrrOf, invoicesFor, nextInvoice, healthOf, mrrHistory, priceFor, cycleLabel, ANNUAL_MONTHS, toDate } from '../lib/billing'
import { fmt } from '../lib/sim'

const initials = (n) => n.split(' ').map((x) => x[0]).slice(0, 2).join('')
const statusTone = { Activo: 'st-ok', Prueba: 'st-trial', Suspendido: 'st-off' }
const payTone = { 'Al día': 'pay-ok', Pendiente: 'pay-pend', Vencido: 'pay-late', Pagada: 'pay-ok', Vencida: 'pay-late' }
const PLAN_COLORS = { starter: '#94a3b8', pro: '#2563eb', enterprise: '#111827' }
const usd = (v) => `US$ ${fmt(v, 0)}`
const dateS = (t) => toDate(t).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d` }

function plantInfo(t, directory) {
  const info = {
    t, p: t.plant, meters: t.meters.length, online: t.meters.filter((m) => m.status === 'online').length,
    alerts: (t.alerts || []).filter((a) => !a.ack).length,
    users: directory.filter((u) => (u.plants === '*' ? false : u.plants.includes(t.plant.id))).length,
    plan: PLANS[t.plant.plan], mrr: mrrOf(t.plant), next: nextInvoice(t.plant),
  }
  info.health = healthOf(info)
  return info
}

// ---------- Integrador: plantas asignadas ----------
export function Plants() {
  const nav = useNavigate()
  const state = useStore()
  const { user } = useAuth()
  const list = plantsFor(state, user).map((t) => plantInfo(t, state.directory))
  return (
    <div className="page">
      <div className="page-h">
        <div><h2>Mis plantas</h2><p className="muted">Plantas a las que Beez te dio acceso como {ROLES[user.role].label.toLowerCase()}. Entra a una para configurar medidores, integraciones y dashboards.</p></div>
      </div>
      <div className="plant-grid">
        {list.map((x) => (
          <div key={x.p.id} className={`card plant-card ${x.p.id === state.currentPlantId ? 'cur' : ''}`}>
            <div className="row between"><span className={`plan-tag p-${x.p.plan}`}>{x.plan.name}</span><span className={`health h-${x.health.level}`}>{x.health.label}</span></div>
            <h3>{x.p.name}</h3>
            <p className="muted xs"><MapPin size={12} style={{ verticalAlign: -2 }} /> {x.p.location} · {x.p.company}</p>
            <Usage label="Medidores" used={x.meters} limit={x.plan.meters} />
            <div className="pc-stats">
              <div><small>En línea</small><b>{x.online}/{x.meters}</b></div>
              <div><small>Alertas</small><b className={x.alerts ? 't-red' : ''}>{x.alerts}</b></div>
              <div><small>Usuarios</small><b>{x.users}</b></div>
            </div>
            <button className="btn primary" onClick={() => { state.switchPlant(x.p.id); nav('/') }}><LogIn size={15} /> Entrar a la planta</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- Consola Beez ----------
export default function Console() {
  const nav = useNavigate()
  const state = useStore()
  const { directory, switchPlant, setPlantMeta, createPlant, addUser, updateUser, removeUser, resolveRequest, toast } = state
  const requests = state.requests || []
  const [tab, setTab] = useState('resumen')
  const [q, setQ] = useState('')
  const [planFor, setPlanFor] = useState(null)
  const [newPlant, setNewPlant] = useState(null)
  const [userForm, setUserForm] = useState(null)
  const [cyclePlans, setCyclePlans] = useState('mensual')
  const [invFilter, setInvFilter] = useState('todas')
  const [reqTab, setReqTab] = useState('pendiente')

  const plants = allPlants(state).map((t) => plantInfo(t, directory))
  const pending = requests.filter((r) => r.status === 'pendiente')
  const K = useMemo(() => {
    const mrr = plants.reduce((a, x) => a + x.mrr, 0)
    const invoices = plants.flatMap((x) => invoicesFor(x.p).map((i) => ({ ...i, plant: x.p })))
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    return {
      mrr, arr: mrr * 12,
      active: plants.filter((x) => x.p.status === 'Activo').length, trial: plants.filter((x) => x.p.status === 'Prueba').length,
      meters: plants.reduce((a, x) => a + x.meters, 0),
      capacity: plants.reduce((a, x) => a + (x.plan.meters === Infinity ? x.meters : x.plan.meters), 0),
      online: plants.reduce((a, x) => a + x.online, 0),
      invoices: invoices.sort((a, b) => b.date - a.date),
      due: invoices.filter((i) => i.status !== 'Pagada').reduce((a, i) => a + i.amount, 0),
      collected: invoices.filter((i) => i.status === 'Pagada' && i.date >= monthStart.getTime()).reduce((a, i) => a + i.amount, 0),
      history: mrrHistory(plants.map((x) => x.p)),
      byPlan: Object.keys(PLANS).map((k) => ({ k, name: PLANS[k].name, n: plants.filter((x) => x.p.plan === k).length, mrr: plants.filter((x) => x.p.plan === k).reduce((a, x) => a + x.mrr, 0) })),
    }
  }, [plants]) // eslint-disable-line
  const attention = plants.filter((x) => x.health.level !== 'ok')
  const upsell = plants.filter((x) => x.health.upsell || x.p.status === 'Prueba')
  const filtered = plants.filter((x) => (x.p.name + x.p.company + x.p.location).toLowerCase().includes(q.toLowerCase()))
  const enter = (id) => { switchPlant(id); nav('/') }
  const markPaid = (plantId) => { setPlantMeta(plantId, { paymentStatus: 'Al día' }); toast('Pago registrado') }

  const TABS = [
    { value: 'resumen', label: 'Resumen' }, { value: 'clientes', label: 'Clientes' }, { value: 'facturacion', label: 'Facturación' },
    { value: 'solicitudes', label: `Solicitudes${pending.length ? ` · ${pending.length}` : ''}` }, { value: 'planes', label: 'Planes' }, { value: 'usuarios', label: 'Usuarios y accesos' },
  ]

  return (
    <div className="page">
      <div className="page-h">
        <div><h2>Consola Beez</h2><p className="muted">Todos tus clientes, ingresos, cobros y solicitudes en un solo lugar.</p></div>
        <div className="row gap8">
          {tab === 'usuarios'
            ? <button className="btn primary" onClick={() => setUserForm({ name: '', email: '', role: 'integrator', org: '', plants: [] })}><Plus size={15} /> Nuevo usuario</button>
            : <button className="btn primary" onClick={() => setNewPlant({ name: '', company: '', location: '', plan: 'starter', billing: 'mensual', contact: '' })}><Plus size={15} /> Nueva planta</button>}
        </div>
      </div>

      <div className="con-kpis">
        <div className="card ck main"><span className="ck-ic"><CircleDollarSign size={18} /></span><div><small>Ingreso recurrente mensual</small><b>{usd(K.mrr)}</b><span>ARR {usd(K.arr)}</span></div></div>
        <div className="card ck"><span className="ck-ic"><Building2 size={18} /></span><div><small>Clientes</small><b>{K.active}<i> activos</i></b><span>{K.trial} en prueba</span></div></div>
        <div className="card ck"><span className="ck-ic"><Gauge size={18} /></span><div><small>Medidores conectados</small><b>{K.meters}</b><span>{K.online} en línea · capacidad {K.capacity}</span></div></div>
        <div className="card ck"><span className="ck-ic"><Receipt size={18} /></span><div><small>Por cobrar</small><b className={K.due ? 't-amber' : ''}>{usd(K.due)}</b><span>cobrado este mes {usd(K.collected)}</span></div></div>
        <button className="card ck click" onClick={() => setTab('solicitudes')}><span className="ck-ic gold"><Inbox size={18} /></span><div><small>Solicitudes</small><b>{pending.length}<i> pendientes</i></b><span>Ver y responder →</span></div></button>
      </div>

      <div className="row between wrap gap8">
        <Segmented value={tab} onChange={setTab} options={TABS} />
        {['clientes', 'usuarios'].includes(tab) && <div className="search wide" style={{ width: 300 }}><Search size={15} /><input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} /></div>}
      </div>

      {/* ---------- RESUMEN ---------- */}
      {tab === 'resumen' && (<>
        <div className="grid g-2-1">
          <Card title="Ingreso recurrente mensual (MRR)" subtitle="Últimos 12 meses · contratos anuales prorrateados por mes">
            <div style={{ height: 250 }}>
              <ResponsiveContainer>
                <AreaChart data={K.history} margin={{ top: 10, right: 8, left: -4, bottom: 0 }}>
                  <defs><linearGradient id="mrrg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563eb" stopOpacity={0.25} /><stop offset="1" stopColor="#2563eb" stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid stroke="#eef0f3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8a929e' }} tickLine={false} axisLine={{ stroke: '#e3e6ea' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#8a929e' }} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v) => [usd(v), 'MRR']} />
                  <Area dataKey="mrr" type="monotone" stroke="#2563eb" strokeWidth={2} fill="url(#mrrg)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Clientes por plan">
            <div className="plan-donut">
              <div style={{ width: 150, height: 150, position: 'relative' }}>
                <ResponsiveContainer><PieChart><Pie data={K.byPlan} dataKey="n" innerRadius="62%" outerRadius="95%" stroke="#fff" isAnimationActive={false}>{K.byPlan.map((b) => <Cell key={b.k} fill={PLAN_COLORS[b.k]} />)}</Pie></PieChart></ResponsiveContainer>
                <div className="pie-center"><b>{plants.length}</b><span>plantas</span></div>
              </div>
              <ul className="legend">{K.byPlan.map((b) => <li key={b.k}><i className="sw" style={{ background: PLAN_COLORS[b.k] }} /><span>{b.name} · {b.n}</span><b>{usd(b.mrr)}</b></li>)}</ul>
            </div>
          </Card>
        </div>
        <div className="grid g-2">
          <Card title="Requieren atención" subtitle="Pagos, comunicación de medidores y alertas" actions={<span className="muted xs">{attention.length} clientes</span>}>
            {attention.length === 0 && <p className="muted sm">Todo en orden. Ningún cliente requiere atención.</p>}
            {attention.map((x) => (
              <div key={x.p.id} className="att-row">
                <span className={`health-dot h-${x.health.level}`} />
                <div className="grow"><b>{x.p.name}</b><div className="muted xs">{x.health.issues.map((i) => i.t).join(' · ')}</div></div>
                {x.p.paymentStatus !== 'Al día' && <button className="btn sm" onClick={() => markPaid(x.p.id)}>Registrar pago</button>}
                <button className="btn sm" onClick={() => enter(x.p.id)}><LogIn size={13} /> Entrar</button>
              </div>
            ))}
          </Card>
          <Card title="Oportunidades" subtitle="Clientes al límite de su plan o en periodo de prueba">
            {upsell.length === 0 && <p className="muted sm">Sin oportunidades por ahora.</p>}
            {upsell.map((x) => (
              <div key={x.p.id} className="att-row">
                <span className="opp-ic"><Sparkles size={14} /></span>
                <div className="grow"><b>{x.p.name}</b><div className="muted xs">{x.p.status === 'Prueba' ? `Prueba vence ${dateS(x.p.renewal)}` : `Usa ${x.meters} de ${x.plan.meters} medidores del plan ${x.plan.name}`}</div></div>
                <button className="btn sm" onClick={() => setPlanFor(x.p)}>{x.p.status === 'Prueba' ? 'Activar contrato' : 'Ofrecer mejora'}</button>
              </div>
            ))}
          </Card>
        </div>
      </>)}

      {/* ---------- CLIENTES ---------- */}
      {tab === 'clientes' && (
        <Card pad={false}>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Cliente</th><th>Salud</th><th>Plan</th><th>Ciclo</th><th className="r">MRR</th><th>Próximo cobro</th><th>Pago</th><th style={{ width: 150 }}>Medidores</th><th className="r">Alertas</th><th>Último acceso</th><th /></tr></thead>
              <tbody>
                {filtered.map((x) => (
                  <tr key={x.p.id} className={x.p.id === state.currentPlantId ? 'sel-row' : ''}>
                    <td><b>{x.p.name}</b><div className="muted xs">{x.p.company} · {x.p.location}</div></td>
                    <td><span className={`health h-${x.health.level}`} title={x.health.issues.map((i) => i.t).join('\n')}>{x.health.label}</span></td>
                    <td><button className={`plan-tag p-${x.p.plan} clickable`} title="Cambiar plan" onClick={() => setPlanFor(x.p)}>{x.plan.name} <Pencil size={10} /></button></td>
                    <td className="sm">{x.p.status === 'Prueba' ? <span className="st st-trial">Prueba</span> : cycleLabel(x.p.billing)}</td>
                    <td className="r num">{x.mrr ? usd(x.mrr) : '—'}</td>
                    <td className="sm">{x.next.trial ? <span className="muted">fin de prueba {dateS(x.next.date)}</span> : <>{dateS(x.next.date)}<div className="muted xs">{usd(x.next.amount)}</div></>}</td>
                    <td>{x.p.status === 'Prueba' ? <span className="muted xs">—</span> : <span className={`pay ${payTone[x.p.paymentStatus]}`}>{x.p.paymentStatus}</span>}</td>
                    <td><Usage label="" used={x.meters} limit={x.plan.meters} /></td>
                    <td className={`r num ${x.alerts ? 't-red' : ''}`}>{x.alerts}</td>
                    <td className="muted xs">{x.p.lastLogin ? ago(x.p.lastLogin) : '—'}</td>
                    <td className="r"><button className="btn sm" onClick={() => enter(x.p.id)}><LogIn size={13} /> Entrar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ---------- FACTURACIÓN ---------- */}
      {tab === 'facturacion' && (
        <Card pad={false}>
          <div className="filters">
            <b className="sm">Facturas emitidas</b>
            <span className="grow" />
            <Segmented size="sm" value={invFilter} onChange={setInvFilter} options={[{ value: 'todas', label: 'Todas' }, { value: 'pendientes', label: 'Por cobrar' }, { value: 'pagadas', label: 'Pagadas' }]} />
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Factura</th><th>Cliente</th><th>Plan</th><th>Periodo</th><th>Emisión</th><th>Vence</th><th className="r">Monto</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {K.invoices.filter((i) => invFilter === 'todas' || (invFilter === 'pagadas' ? i.status === 'Pagada' : i.status !== 'Pagada')).slice(0, 40).map((i) => (
                  <tr key={i.id}>
                    <td className="mono">F001-{String(1000 + Math.abs(i.id.split('').reduce((a, c) => a + c.charCodeAt(0) * 7, 0)) % 9000).padStart(5, '0')}</td>
                    <td><b>{i.plant.name}</b></td>
                    <td><span className={`plan-tag p-${i.plan}`}>{PLANS[i.plan].name}</span> <span className="muted xs">{cycleLabel(i.cycle)}</span></td>
                    <td className="sm">{i.period}</td>
                    <td className="muted xs">{dateS(i.date)}</td>
                    <td className="muted xs">{dateS(i.due)}</td>
                    <td className="r num"><b>{usd(i.amount)}</b></td>
                    <td><span className={`pay ${payTone[i.status]}`}>{i.status}</span></td>
                    <td className="r">{i.status !== 'Pagada' && <button className="btn sm" onClick={() => markPaid(i.plantId)}>Registrar pago</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ---------- SOLICITUDES ---------- */}
      {tab === 'solicitudes' && (<>
        <Segmented size="sm" value={reqTab} onChange={setReqTab} options={[{ value: 'pendiente', label: `Pendientes (${pending.length})` }, { value: 'historial', label: 'Historial' }]} />
        {requests.filter((r) => (reqTab === 'pendiente' ? r.status === 'pendiente' : r.status !== 'pendiente')).length === 0 && <Empty icon="Inbox" title="Sin solicitudes">Cuando un cliente pida mejorar su plan aparecerá aquí.</Empty>}
        <div className="req-list">
          {requests.filter((r) => (reqTab === 'pendiente' ? r.status === 'pendiente' : r.status !== 'pendiente')).map((r) => {
            const pl = plants.find((x) => x.p.id === r.plantId)
            const diff = (priceFor(r.to, r.cycle) / (r.cycle === 'anual' ? 12 : 1)) - (pl?.mrr || 0)
            return (
              <div key={r.id} className="card req">
                <div className="req-h">
                  <div><b>{pl?.p.name || r.plantId}</b><div className="muted xs">{pl?.p.company} · {ago(r.at)}</div></div>
                  <div className="req-plan"><span className={`plan-tag p-${r.from}`}>{PLANS[r.from].name}</span><ArrowRight size={14} className="muted" /><span className={`plan-tag p-${r.to}`}>{PLANS[r.to].name}</span><span className="muted xs">{cycleLabel(r.cycle)}</span></div>
                  {r.status === 'pendiente' ? <span className="pay pay-pend">Pendiente</span> : <span className={`pay ${r.status === 'aprobada' ? 'pay-ok' : 'pay-late'}`}>{r.status === 'aprobada' ? 'Aprobada' : 'Rechazada'}</span>}
                </div>
                {r.note && <p className="req-note">“{r.note}”</p>}
                <div className="req-f">
                  <span className="muted xs">{r.by} · prefiere {r.via}{r.phone ? ` · ${r.phone}` : ''} · {r.email}</span>
                  <span className="grow" />
                  {diff > 0 && <span className="xs t-green"><TrendingUp size={12} /> +{usd(diff)} MRR</span>}
                  {r.status === 'pendiente' && <>
                    <a className="btn sm" href={`mailto:${r.email}?subject=Mejora de plan Beez - ${pl?.p.name}`}><Mail size={13} /> Contactar</a>
                    <button className="btn sm" onClick={() => { resolveRequest(r.id, 'rechazada'); toast('Solicitud rechazada', 'info') }}><X size={13} /> Rechazar</button>
                    <button className="btn sm primary" onClick={() => { resolveRequest(r.id, 'aprobada'); toast(`${pl?.p.name}: plan ${PLANS[r.to].name} activado`) }}><Check size={13} /> Aprobar y activar</button>
                  </>}
                </div>
              </div>
            )
          })}
        </div>
      </>)}

      {/* ---------- PLANES ---------- */}
      {tab === 'planes' && (<>
        <div className="row between wrap gap8">
          <p className="muted sm">Precio por planta. El pago anual equivale a {ANNUAL_MONTHS} meses (2 meses gratis).</p>
          <Segmented size="sm" value={cyclePlans} onChange={setCyclePlans} options={[{ value: 'mensual', label: 'Mensual' }, { value: 'anual', label: 'Anual' }]} />
        </div>
        <div className="plans">
          {Object.entries(PLANS).map(([k, p]) => (
            <div key={k} className={`card plan-card ${k === 'pro' ? 'featured' : ''}`}>
              {k === 'pro' && <span className="plan-badge">Más contratado</span>}
              <span className={`plan-tag p-${k}`}>{p.name}</span>
              <div className="plan-price">{k === 'enterprise' && <small>Desde </small>}{usd(priceFor(k, cyclePlans))}<small> /{cyclePlans === 'anual' ? 'año' : 'mes'} por planta</small></div>
              <p className="muted sm">{p.tagline}</p>
              <ul className="plan-list">
                <li><Check size={14} /> <b>{p.meters === Infinity ? 'Medidores ilimitados' : `Hasta ${p.meters} medidores`}</b></li>
                <li><Check size={14} /> {p.dashboards === Infinity ? 'Dashboards ilimitados' : `${p.dashboards} dashboards`}</li>
                <li><Check size={14} /> {fmtLimit(p.users)} usuarios</li>
                <li><Check size={14} /> Histórico {p.history}</li>
                {Object.entries(FEATURE_LABELS).map(([f, l]) => <li key={f} className={p.features[f] ? '' : 'off'}><Check size={14} /> {l}</li>)}
              </ul>
              <div className="plan-foot"><b>{K.byPlan.find((b) => b.k === k).n}</b> plantas · {usd(K.byPlan.find((b) => b.k === k).mrr)} MRR</div>
            </div>
          ))}
        </div>
      </>)}

      {/* ---------- USUARIOS ---------- */}
      {tab === 'usuarios' && (
        <Card pad={false}>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Usuario</th><th>Rol</th><th>Organización</th><th>Plantas con acceso</th><th /></tr></thead>
              <tbody>
                {directory.filter((u) => (u.name + u.email + u.org).toLowerCase().includes(q.toLowerCase())).map((u) => (
                  <tr key={u.id}>
                    <td><span className="row gap8"><span className="avatar sm">{initials(u.name)}</span><span><b>{u.name}</b><div className="muted xs">{u.email}</div></span></span></td>
                    <td><span className={`role-tag r-${u.role}`}>{ROLES[u.role].label}</span></td>
                    <td className="muted">{u.org}</td>
                    <td>{u.plants === '*' ? <span className="chip on">Todas las plantas</span> : <div className="chips">{u.plants.map((pid) => <span key={pid} className="chip">{plants.find((x) => x.p.id === pid)?.p.name || pid}</span>)}</div>}</td>
                    <td className="r"><div className="row gap4" style={{ justifyContent: 'flex-end' }}>
                      <button className="icon-btn sm" title="Editar accesos" onClick={() => setUserForm({ ...u, plants: u.plants === '*' ? '*' : [...u.plants] })}><Pencil size={13} /></button>
                      {u.id !== state.session.userId && <button className="icon-btn sm danger" title="Eliminar" onClick={() => { removeUser(u.id); toast('Usuario eliminado') }}><Trash2 size={13} /></button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Cambiar plan y ciclo */}
      <PlanModal plant={planFor} used={plants.find((x) => x.p.id === planFor?.id)?.meters || 0} onClose={() => setPlanFor(null)}
        onSave={(plan, billing) => { setPlantMeta(planFor.id, { plan, billing, status: 'Activo' }); toast(`${planFor.name}: ${PLANS[plan].name} ${billing}`); setPlanFor(null) }} />

      {/* Nueva planta */}
      <Modal open={!!newPlant} onClose={() => setNewPlant(null)} title="Nueva planta cliente" width={560}
        footer={<><button className="btn ghost" onClick={() => setNewPlant(null)}>Cancelar</button><button className="btn primary" disabled={!newPlant?.name} onClick={() => { createPlant(newPlant); toast('Planta creada en periodo de prueba'); setNewPlant(null) }}>Crear planta</button></>}>
        {newPlant && <div className="form-grid">
          <Field label="Nombre de la planta"><input value={newPlant.name} onChange={(e) => setNewPlant({ ...newPlant, name: e.target.value })} placeholder="Ej. Molino San Pedro" /></Field>
          <Field label="Empresa"><input value={newPlant.company} onChange={(e) => setNewPlant({ ...newPlant, company: e.target.value })} /></Field>
          <Field label="Ubicación"><input value={newPlant.location} onChange={(e) => setNewPlant({ ...newPlant, location: e.target.value })} placeholder="Ciudad, Región" /></Field>
          <Field label="Contacto"><input value={newPlant.contact} onChange={(e) => setNewPlant({ ...newPlant, contact: e.target.value })} /></Field>
          <Field label="Plan"><select value={newPlant.plan} onChange={(e) => setNewPlant({ ...newPlant, plan: e.target.value })}>{Object.entries(PLANS).map(([k, p]) => <option key={k} value={k}>{p.name} · {p.meters === Infinity ? 'ilimitado' : `${p.meters} medidores`}</option>)}</select></Field>
          <Field label="Facturación tras la prueba"><select value={newPlant.billing} onChange={(e) => setNewPlant({ ...newPlant, billing: e.target.value })}><option value="mensual">Mensual</option><option value="anual">Anual (2 meses gratis)</option></select></Field>
        </div>}
        <p className="muted xs mt12">Se crea con 30 días de prueba, plantilla de molino de arroz y 3 medidores de ejemplo.</p>
      </Modal>

      {/* Usuario y accesos */}
      <Modal open={!!userForm} onClose={() => setUserForm(null)} title={userForm?.id ? `Accesos de ${userForm.name}` : 'Nuevo usuario'} width={620}
        footer={<><button className="btn ghost" onClick={() => setUserForm(null)}>Cancelar</button><button className="btn primary" disabled={!userForm?.name || !userForm?.email} onClick={() => {
          const { id, ...data } = userForm
          if (data.role === 'superadmin') data.plants = '*'
          else if (data.plants === '*') data.plants = []
          id ? updateUser(id, data) : addUser(data)
          toast(id ? 'Accesos actualizados' : 'Usuario creado'); setUserForm(null)
        }}>Guardar</button></>}>
        {userForm && <>
          <div className="form-grid">
            <Field label="Nombre"><input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} /></Field>
            <Field label="Correo"><input value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></Field>
            <Field label="Organización"><input value={userForm.org} onChange={(e) => setUserForm({ ...userForm, org: e.target.value })} /></Field>
            <Field label="Rol"><select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>{Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</select></Field>
          </div>
          <p className="muted xs mt8">{ROLES[userForm.role].desc}</p>
          {userForm.role !== 'superadmin' && <>
            <h4 className="mt16 mb8">Plantas con acceso</h4>
            <div className="access-list">
              {plants.map((x) => {
                const on = userForm.plants !== '*' && userForm.plants.includes(x.p.id)
                return (
                  <button key={x.p.id} className={`picker-i ${on ? 'on' : ''}`} onClick={() => {
                    const cur = userForm.plants === '*' ? [] : userForm.plants
                    setUserForm({ ...userForm, plants: on ? cur.filter((p) => p !== x.p.id) : [...cur, x.p.id] })
                  }}>
                    <span className="chk">{on && <Check size={11} />}</span>
                    <span className="grow"><b>{x.p.name}</b> <span className="muted xs">{x.p.location}</span></span>
                    <span className={`plan-tag p-${x.p.plan}`}>{x.plan.name}</span>
                  </button>
                )
              })}
            </div>
          </>}
        </>}
      </Modal>
    </div>
  )
}

function PlanModal({ plant, used, onClose, onSave }) {
  const [plan, setPlan] = useState(plant?.plan)
  const [billing, setBilling] = useState(plant?.billing || 'mensual')
  const key = plant?.id
  useEffect(() => { if (plant) { setPlan(plant.plan); setBilling(plant.billing || 'mensual') } }, [key]) // eslint-disable-line
  if (!plant) return null
  return (
    <Modal open onClose={onClose} title={`Plan de ${plant.name}`} width={780}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={() => onSave(plan, billing)}>Guardar cambios</button></>}>
      <div className="row between mb12"><span className="muted sm">Uso actual: {used} medidores</span>
        <Segmented size="sm" value={billing} onChange={setBilling} options={[{ value: 'mensual', label: 'Mensual' }, { value: 'anual', label: 'Anual' }]} /></div>
      <div className="plans compact">
        {Object.entries(PLANS).map(([k, p]) => (
          <button key={k} disabled={p.meters < used} className={`card plan-card ${plan === k ? 'featured' : ''}`} onClick={() => setPlan(k)}>
            <span className={`plan-tag p-${k}`}>{p.name}</span>
            <div className="plan-price">{usd(priceFor(k, billing))}<small> /{billing === 'anual' ? 'año' : 'mes'}</small></div>
            <p className="muted xs">{p.meters === Infinity ? 'Medidores ilimitados' : `Hasta ${p.meters} medidores`}</p>
            {p.meters < used ? <p className="t-red xs">Usa {used} medidores</p> : plant.plan === k ? <p className="xs"><Check size={12} /> Plan actual</p> : null}
          </button>
        ))}
      </div>
    </Modal>
  )
}
