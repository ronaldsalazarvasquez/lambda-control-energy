import { useAuth } from '../lib/useAuth'
import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, ArrowLeft, Pencil, Trash2, Cpu, Cog, LayoutDashboard } from 'lucide-react'
import { useStore, useNow, useMinute } from '../store'
import { Card, Icon, Modal, Field, Empty, StatusDot, InlineEdit } from '../components/ui'
import { TimeseriesPanel, BarPanel } from '../components/widgets'
import { liveKw, stats, windowFor, tonsRange, fmt } from '../lib/sim'
import { INDUSTRY_TEMPLATES, dashboardTemplates } from '../data/seed'

const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#64748b', '#84cc16', '#0d9488']
const ICONS = ['Factory', 'Truck', 'Flame', 'Disc3', 'Sparkles', 'ScanEye', 'Package', 'Wrench', 'Wind', 'Snowflake', 'Droplets', 'Building2', 'Warehouse', 'Fan', 'Lightbulb', 'Cog']

function AreaForm({ open, onClose, initial }) {
  const { areas, addArea, updateArea, toast } = useStore()
  const [f, setF] = useState({ name: '', short: '', color: COLORS[0], icon: 'Factory' })
  useEffect(() => { if (open) setF(initial || { name: '', short: '', color: COLORS[areas.length % COLORS.length], icon: 'Factory' }) }, [open]) // eslint-disable-line
  const suggestions = INDUSTRY_TEMPLATES.arroz.areas.filter((s) => !areas.some((a) => a.name === s.name))
  const save = () => {
    if (!f.name) return
    const data = { ...f, short: f.short || f.name.split(' ')[0] }
    initial ? updateArea(initial.id, data) : addArea(data)
    toast(initial ? 'Área actualizada' : 'Área creada')
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar área' : 'Nueva área'} width={560}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={save} disabled={!f.name}>Guardar</button></>}>
      {!initial && suggestions.length > 0 && (
        <div className="mb12"><span className="muted sm">Sugerencias para molino de arroz:</span>
          <div className="chips mt8">{suggestions.map((s) => <button key={s.id} className="chip" onClick={() => setF({ name: s.name, short: s.short, color: s.color, icon: s.icon, machines: s.machines })}>{s.name}</button>)}</div>
        </div>
      )}
      <div className="form-grid">
        <Field label="Nombre"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ej. Secado de paddy" /></Field>
        <Field label="Nombre corto"><input value={f.short} onChange={(e) => setF({ ...f, short: e.target.value })} placeholder="Ej. Secado" /></Field>
      </div>
      <Field label="Color" className="mt12"><div className="colors">{COLORS.map((c) => <button key={c} className={f.color === c ? 'on' : ''} style={{ background: c }} onClick={() => setF({ ...f, color: c })} />)}</div></Field>
      <Field label="Ícono" className="mt12"><div className="icon-grid">{ICONS.map((i) => <button key={i} className={f.icon === i ? 'on' : ''} onClick={() => setF({ ...f, icon: i })} ><Icon name={i} size={18} /></button>)}</div></Field>
    </Modal>
  )
}

function AreaDetail({ area }) {
  const { can } = useAuth()
  const ed = can('config.meters')
  const nav = useNavigate()
  const now = useNow()
  const { meters, updateArea, removeArea, updateMeter, addDashboard, toast } = useStore()
  const [edit, setEdit] = useState(false)
  const [del, setDel] = useState(false)
  const [mach, setMach] = useState({ name: '', kw: '' })
  const ms = meters.filter((m) => m.areaId === area.id)
  const free = meters.filter((m) => m.areaId !== area.id && !m.isMain)
  const kw = ms.reduce((a, m) => a + (liveKw(m, now) || 0), 0)
  const installed = (area.machines || []).reduce((a, m) => a + +m.kw, 0)
  return (
    <div className="page">
      <div className="dash-bar">
        <div className="row gap12">
          <button className="icon-btn" onClick={() => nav('/areas')}><ArrowLeft size={18} /></button>
          <span className="area-ic lg"><Icon name={area.icon} size={24} /></span>
          <div><InlineEdit as="h2" value={area.name} enabled={ed} onSave={(name) => { updateArea(area.id, { name }); toast('Nombre actualizado') }} /><p className="muted sm">{ms.length} medidores · {(area.machines || []).length} máquinas · {fmt(installed, 1)} kW instalados</p></div>
        </div>
        <div className="row gap8">
          <span className="live-chip">Potencia actual <b>{fmt(kw, 1)} kW</b></span>
          {ms[0] && <button className="btn ghost" onClick={() => { const id = addDashboard({ name: `Área ${area.short}`, description: area.name, panels: dashboardTemplates.area(ms[0].id) }); nav(`/dashboards/${id}`) }}><LayoutDashboard size={15} /> Crear dashboard</button>}
          {ed && <button className="btn ghost" onClick={() => setEdit(true)}><Pencil size={15} /> Editar</button>}
          {ed && <button className="btn ghost danger" onClick={() => setDel(true)}><Trash2 size={15} /></button>}
        </div>
      </div>
      {ms.length > 0 ? (
        <div className="grid g-2">
          <Card title="Potencia del área (24 h)"><div style={{ height: 260 }}><TimeseriesPanel config={{ metric: 'power', meterIds: ms.map((m) => m.id), stacked: true, _key: 'ad' }} range="24h" /></div></Card>
          <Card title="Energía diaria (7 días)"><div style={{ height: 260 }}><BarPanel config={{ metric: 'energy', meterIds: ms.map((m) => m.id), color: area.color }} range="7d" /></div></Card>
        </div>
      ) : <Empty icon="Cpu" title="Sin medidores asignados">Asigna un medidor abajo para ver los consumos de esta área.</Empty>}
      <div className="grid g-2">
        <Card title="Máquinas del área" subtitle="Carga instalada referencial para análisis de eficiencia">
          <table className="tbl">
            <thead><tr><th>Máquina</th><th className="r">kW</th><th className="r">% área</th><th /></tr></thead>
            <tbody>
              {(area.machines || []).map((x, i) => (
                <tr key={i}><td><Cog size={14} className="muted" /> {x.name}</td><td className="r num">{x.kw}</td><td className="r num">{fmt((x.kw / (installed || 1)) * 100, 0)}%</td>
                  <td className="r">{ed && <button className="icon-btn sm danger" onClick={() => updateArea(area.id, { machines: area.machines.filter((_, k) => k !== i) })}><Trash2 size={13} /></button>}</td></tr>
              ))}
            </tbody>
          </table>
          {ed && <div className="row gap8 mt12">
            <input className="grow" placeholder="Nueva máquina (ej. Pulidora PA-03)" value={mach.name} onChange={(e) => setMach({ ...mach, name: e.target.value })} />
            <input style={{ width: 90 }} type="number" placeholder="kW" value={mach.kw} onChange={(e) => setMach({ ...mach, kw: e.target.value })} />
            <button className="btn primary" disabled={!mach.name} onClick={() => { updateArea(area.id, { machines: [...(area.machines || []), { name: mach.name, kw: +mach.kw || 0 }] }); setMach({ name: '', kw: '' }) }}><Plus size={15} /></button>
          </div>}
        </Card>
        <Card title="Medidores asignados">
          {ms.map((m) => (
            <div key={m.id} className="assign-row">
              <Cpu size={15} className="muted" />
              <button className="link" onClick={() => nav(`/medidores/${m.id}`)}><b>{m.id}</b> {m.name}</button>
              <span className="grow" />
              <b className="num">{fmt(liveKw(m, now), 1)} kW</b>
              <StatusDot status={m.status} />
              <button className="icon-btn sm" title="Quitar del área" onClick={() => updateMeter(m.id, { areaId: null })}><Trash2 size={13} /></button>
            </div>
          ))}
          {ed && free.length > 0 && (
            <select className="mini-select mt12" value="" onChange={(e) => { updateMeter(e.target.value, { areaId: area.id }); toast('Medidor asignado') }}>
              <option value="">+ Asignar medidor existente…</option>
              {free.map((m) => <option key={m.id} value={m.id}>{m.id} · {m.name}</option>)}
            </select>
          )}
        </Card>
      </div>
      <AreaForm open={edit} onClose={() => setEdit(false)} initial={area} />
      <Modal open={del} onClose={() => setDel(false)} title="Eliminar área" width={420}
        footer={<><button className="btn ghost" onClick={() => setDel(false)}>Cancelar</button><button className="btn danger" onClick={() => { removeArea(area.id); toast('Área eliminada'); nav('/areas') }}>Eliminar</button></>}>
        <p>¿Eliminar <b>{area.name}</b>? Sus medidores quedarán sin área asignada.</p>
      </Modal>
    </div>
  )
}

export default function Areas() {
  const { can } = useAuth()
  const { id } = useParams()
  const nav = useNavigate()
  const now = useNow()
  const minute = useMinute()
  const { areas, meters, updateArea, toast } = useStore()
  const [form, setForm] = useState(false)
  const data = useMemo(() => {
    const [s, e] = windowFor('24h')
    const tons = tonsRange(s, e)
    const rows = areas.map((a) => {
      const ms = meters.filter((m) => m.areaId === a.id)
      const energy = ms.reduce((acc, m) => acc + stats(m, s, e).energy, 0)
      return { a, ms, energy, kwht: tons ? energy / tons : 0 }
    })
    const total = rows.reduce((x, r) => x + r.energy, 0)
    return { rows, total }
  }, [areas, meters, minute]) // eslint-disable-line

  const area = areas.find((a) => a.id === id)
  if (id && area) return <AreaDetail area={area} />

  return (
    <div className="page">
      <div className="page-h">
        <div><h2>Áreas de planta</h2><p className="muted">Organiza tu planta por procesos. Cada área agrupa medidores y máquinas para ver dónde se consume la energía.</p></div>
        {can('config.meters') && <button className="btn primary" onClick={() => setForm(true)}><Plus size={16} /> Nueva área</button>}
      </div>
      <div className="flow-strip card">
        {areas.filter((a) => a.id !== 'servicios').map((a, i, arr) => (
          <div key={a.id} className="fs-step" onClick={() => nav(`/areas/${a.id}`)}>
            <span><Icon name={a.icon} size={15} /></span>
            <b>{a.short}</b>
            {i < arr.length - 1 && <em>→</em>}
          </div>
        ))}
      </div>
      <div className="area-grid">
        {data.rows.map(({ a, ms, energy, kwht }) => {
          const kw = ms.reduce((acc, m) => acc + (liveKw(m, now) || 0), 0)
          const pct = (energy / (data.total || 1)) * 100
          return (
            <div key={a.id} role="button" tabIndex={0} className="card area-card" onClick={() => nav(`/areas/${a.id}`)}>
              <div className="row between">
                <span className="area-ic"><Icon name={a.icon} size={20} /></span>
                <span className="pill">{fmt(pct, 0)}% del consumo</span>
              </div>
              <InlineEdit as="h3" value={a.name} enabled={can('config.meters')} onSave={(name) => { updateArea(a.id, { name }); toast('Nombre actualizado') }} />
              <div className="ac-stats">
                <div><small>Potencia</small><b>{fmt(kw, 1)} <i>kW</i></b></div>
                <div><small>Últimas 24 h</small><b>{fmt(energy, 0)} <i>kWh</i></b></div>
                <div><small>Específico</small><b>{fmt(kwht, 1)} <i>kWh/t</i></b></div>
              </div>
              <div className="bar-mini"><i style={{ width: `${pct}%`, background: a.color }} /></div>
              <div className="row between muted xs"><span>{ms.length} medidores</span><span>{(a.machines || []).length} máquinas</span></div>
            </div>
          )
        })}
        {can('config.meters') && <button className="card dash-new" onClick={() => setForm(true)}><Plus size={26} /><span>Nueva área</span></button>}
      </div>
      <AreaForm open={form} onClose={() => setForm(false)} />
    </div>
  )
}
