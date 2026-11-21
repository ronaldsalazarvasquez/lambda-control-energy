import { useAuth } from '../lib/useAuth'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Star, Copy, Trash2, Search, LayoutTemplate, FileJson, Upload } from 'lucide-react'
import { useStore } from '../store'
import { Modal, Field, Icon, Empty, InlineEdit } from '../components/ui'
import { dashboardTemplates } from '../data/seed'

const TEMPLATES = [
  { id: 'blank', name: 'En blanco', icon: 'Square', desc: 'Empieza desde cero y agrega paneles' },
  { id: 'resumen', name: 'Resumen de molino', icon: 'Factory', desc: 'KPIs, potencia por área, energía diaria y mapa de calor' },
  { id: 'area', name: 'Por área / medidor', icon: 'Boxes', desc: 'Dashboard automático para un área o medidor' },
  { id: 'calidad', name: 'Calidad de energía', icon: 'Waves', desc: 'FP, THD, tensión y tabla de variables' },
]

function Thumb({ panels }) {
  return (
    <div className="thumb">
      {panels.slice(0, 14).map((p) => (
        <div key={p.i} style={{ gridColumn: `${p.x + 1} / span ${p.w}`, gridRow: `${Math.min(p.y, 30) + 1} / span ${p.h}` }} />
      ))}
    </div>
  )
}

export default function Dashboards() {
  const nav = useNavigate()
  const { dashboards, meters, areas, addDashboard, updateDashboard, duplicateDashboard, removeDashboard, toast } = useStore()
  const { can, plan } = useAuth()
  const ed = can('dash.edit')
  const full = dashboards.length >= plan.dashboards
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', template: 'resumen', meterId: 'MED-005' })
  const [confirm, setConfirm] = useState(null)

  const create = () => {
    const panels = form.template === 'area' ? dashboardTemplates.area(form.meterId) : dashboardTemplates[form.template]()
    const m = meters.find((x) => x.id === form.meterId)
    const id = addDashboard({ name: form.name || (form.template === 'area' ? `Dashboard ${m?.name}` : TEMPLATES.find((t) => t.id === form.template).name), description: form.description, panels })
    setOpen(false)
    toast('Dashboard creado')
    nav(`/dashboards/${id}${form.template === 'blank' ? '?edit=1' : ''}`)
  }

  const importJson = () => {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = '.json'
    inp.onchange = async () => {
      try {
        const d = JSON.parse(await inp.files[0].text())
        if (!Array.isArray(d.panels)) throw new Error()
        addDashboard({ name: d.name || 'Importado', description: d.description, panels: d.panels, range: d.range })
        toast('Dashboard importado')
      } catch { toast('Archivo no válido', 'error') }
    }
    inp.click()
  }

  const list = dashboards.filter((d) => d.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0))
  return (
    <div className="page">
      <div className="page-h">
        <div>
          <h2>Dashboards personalizados</h2>
          <p className="muted">Crea vistas a medida para cada área, turno o rol. Arrastra, redimensiona y configura paneles como en Grafana.</p>
        </div>
        <div className="row gap8">
          {ed && full && <button className="limit-note" onClick={() => useStore.getState().openUpgrade(`Tu plan ${plan.name} permite ${plan.dashboards} dashboards.`)}>Plan {plan.name}: máximo {plan.dashboards} dashboards · Mejorar plan</button>}
          {ed && <button className="btn ghost" disabled={full} onClick={importJson}><Upload size={15} /> Importar</button>}
          {ed && <button className="btn primary" disabled={full} onClick={() => setOpen(true)}><Plus size={16} /> Nuevo dashboard</button>}
        </div>
      </div>
      <div className="search wide"><Search size={15} /><input placeholder="Buscar dashboard…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {list.length === 0 && <Empty icon="LayoutDashboard" title="No hay dashboards">Crea el primero con una plantilla.</Empty>}
      <div className="dash-grid">
        {list.map((d) => (
          <div key={d.id} className="card dash-card" onClick={() => nav(`/dashboards/${d.id}`)}>
            <div className="dash-cover"><Thumb panels={d.panels} /></div>
            <div className="dash-info">
              <div className="row between">
                <InlineEdit as="b" value={d.name} enabled={ed} onSave={(name) => { updateDashboard(d.id, { name }); toast('Dashboard renombrado') }} />
                <button className="icon-btn" style={d.favorite ? { color: '#d9a400' } : null} onClick={(e) => { e.stopPropagation(); updateDashboard(d.id, { favorite: !d.favorite }) }}><Star size={16} fill={d.favorite ? 'currentColor' : 'none'} /></button>
              </div>
              <p className="muted sm">{d.description || 'Sin descripción'}</p>
              <div className="row between">
                <span className="muted xs">{d.panels.length} paneles · editado {new Date(d.updated).toLocaleDateString('es-PE')}</span>
                <div className="row gap4" onClick={(e) => e.stopPropagation()}>
                  <button className="icon-btn" title="Exportar JSON" onClick={() => {
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }))
                    a.download = `${d.name}.json`; a.click()
                  }}><FileJson size={15} /></button>
                  {ed && !full && <button className="icon-btn" title="Duplicar" onClick={() => { duplicateDashboard(d.id); toast('Dashboard duplicado') }}><Copy size={15} /></button>}
                  {ed && <button className="icon-btn danger" title="Eliminar" onClick={() => setConfirm(d)}><Trash2 size={15} /></button>}
                </div>
              </div>
            </div>
          </div>
        ))}
        {ed && !full && <button className="card dash-new" onClick={() => setOpen(true)}><Plus size={26} /><span>Nuevo dashboard</span></button>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo dashboard" width={720}
        footer={<><button className="btn ghost" onClick={() => setOpen(false)}>Cancelar</button><button className="btn primary" onClick={create}>Crear dashboard</button></>}>
        <div className="form-grid">
          <Field label="Nombre"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Turno noche – Secado" /></Field>
          <Field label="Descripción"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opcional" /></Field>
        </div>
        <h4 className="mt16 mb8"><LayoutTemplate size={15} /> Plantilla</h4>
        <div className="tpl-grid">
          {TEMPLATES.map((t) => (
            <button key={t.id} className={`tpl ${form.template === t.id ? 'on' : ''}`} onClick={() => setForm({ ...form, template: t.id })}>
              <Icon name={t.icon} size={22} /><b>{t.name}</b><span>{t.desc}</span>
            </button>
          ))}
        </div>
        {form.template === 'area' && (
          <Field label="Medidor del área" className="mt16">
            <select value={form.meterId} onChange={(e) => setForm({ ...form, meterId: e.target.value })}>
              {areas.map((a) => (
                <optgroup key={a.id} label={a.name}>
                  {meters.filter((m) => m.areaId === a.id).map((m) => <option key={m.id} value={m.id}>{m.id} · {m.name}</option>)}
                </optgroup>
              ))}
              <optgroup label="Planta">{meters.filter((m) => !m.areaId).map((m) => <option key={m.id} value={m.id}>{m.id} · {m.name}</option>)}</optgroup>
            </select>
          </Field>
        )}
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Eliminar dashboard" width={420}
        footer={<><button className="btn ghost" onClick={() => setConfirm(null)}>Cancelar</button><button className="btn danger" onClick={() => { removeDashboard(confirm.id); setConfirm(null); toast('Dashboard eliminado') }}>Eliminar</button></>}>
        <p>¿Eliminar <b>{confirm?.name}</b>? Esta acción no se puede deshacer.</p>
      </Modal>
    </div>
  )
}
