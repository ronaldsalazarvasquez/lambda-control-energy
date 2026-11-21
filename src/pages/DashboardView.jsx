import { useAuth } from '../lib/useAuth'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Responsive, WidthProvider } from 'react-grid-layout'
import { Pencil, Plus, X, Copy, Trash2, GripVertical, ArrowLeft, CalendarDays, Settings2, Maximize2, ZoomOut, MessageSquarePlus, StickyNote, Crosshair } from 'lucide-react'
import { useStore } from '../store'
import { PanelBody, PANEL_TYPES, DashCtx } from '../components/widgets'
import PanelEditor, { newPanel } from '../components/PanelEditor'
import { Empty, Modal, Field, InlineEdit } from '../components/ui'
import { RANGES, fmtLong, HOUR } from '../lib/sim'

const Grid = WidthProvider(Responsive)
const toInput = (t) => { if (!t) return ''; const d = new Date(t); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
const fromInput = (s) => (s ? new Date(s).getTime() : null)

export default function DashboardView() {
  const { id } = useParams()
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const dash = useStore((s) => s.dashboards.find((d) => d.id === id))
  const { updateDashboard, addAnnotation, removeAnnotation, toast } = useStore()
  const [delP, setDelP] = useState(null)
  const { can } = useAuth()
  const ed = can('dash.edit')
  const [editing, setEditing] = useState(sp.get('edit') === '1' ? { ...newPanel(), _new: true } : null)
  const [meta, setMeta] = useState(false)
  const [full, setFull] = useState(null)
  const [bp, setBp] = useState('lg')
  const [zoom, setZoom] = useState(null)
  const [annotating, setAnnotating] = useState(false)
  const [annForm, setAnnForm] = useState(null)
  const [drawer, setDrawer] = useState(false)

  const layout = useMemo(() => (dash?.panels || []).map(({ i, x, y, w, h }) => ({ i, x, y, w, h, minW: 2, minH: 2 })), [dash?.panels])
  const range = dash?.range || '24h'

  const ctx = useMemo(() => ({
    zoom, setZoom, annotating, annotations: dash?.annotations || [],
    requestAnnotation: (t, end) => setAnnForm({ t, end, text: '' }),
  }), [zoom, annotating, dash?.annotations])

  if (!dash) return <div className="page"><Empty icon="LayoutDashboard" title="Dashboard no encontrado"><button className="btn" onClick={() => nav('/dashboards')}>Volver</button></Empty></div>
  const panels = dash.panels
  const anns = [...(dash.annotations || [])].sort((a, b) => b.t - a.t)

  // Guarda la disposición al soltar / redimensionar (solo en pantallas anchas)
  const persist = (cur) => {
    if (bp !== 'lg' && bp !== 'md') return
    updateDashboard(id, { panels: dash.panels.map((p) => { const l = cur.find((x) => x.i === p.i); return l ? { ...p, x: l.x, y: l.y, w: l.w, h: l.h } : p }) })
  }
  const savePanel = (p) => {
    const { _new, ...clean } = p
    updateDashboard(id, { panels: _new ? [...dash.panels, clean] : dash.panels.map((x) => (x.i === clean.i ? clean : x)) })
    toast(_new ? 'Panel agregado' : 'Panel actualizado')
    setEditing(null); setSp({})
  }
  const duplicate = (p) => updateDashboard(id, { panels: [...dash.panels, { ...JSON.parse(JSON.stringify(p)), i: `p-${Math.random().toString(36).slice(2, 9)}`, y: 999 }] })
  const saveAnn = () => {
    if (!annForm.text.trim()) return
    addAnnotation(id, { t: annForm.t, end: annForm.end || null, text: annForm.text.trim() })
    setAnnForm(null); setAnnotating(false); toast('Anotación agregada')
  }
  const fmtZoom = zoom && `${fmtLong(zoom[0], 1)} → ${fmtLong(zoom[1], 1)}`

  return (
    <DashCtx.Provider value={ctx}>
      <div className="page">
        <div className="dash-tools">
          <div className="row gap8 wrap">
            <button className="icon-btn" onClick={() => nav('/dashboards')} title="Volver"><ArrowLeft size={17} /></button>
            <div className="dash-name" title={dash.description}><InlineEdit as="b" value={dash.name} enabled={ed} onSave={(name) => { updateDashboard(id, { name }); toast('Dashboard renombrado') }} /></div>
            <span className="tools-sep" />
            <label className="select"><CalendarDays size={15} />
              <select value={range} onChange={(e) => { setZoom(null); updateDashboard(id, { range: e.target.value }) }}>
                {Object.entries(RANGES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
              </select>
            </label>
            {zoom
              ? <span className="zoom-chip">{fmtZoom}<button className="icon-btn sm" title="Restablecer zoom" onClick={() => setZoom(null)}><ZoomOut size={14} /></button></span>
              : annotating
                ? <span className="ann-mode"><Crosshair size={13} /> Clic o arrastra en una gráfica para anotar</span>
                : <span className="muted xs">Arrastra en una gráfica para hacer zoom</span>}
          </div>
          <div className="row gap8 wrap">
            <button className={`btn ghost ${annotating ? 'on' : ''}`} onClick={() => setAnnotating(!annotating)}><MessageSquarePlus size={15} /> {annotating ? 'Cancelar' : 'Anotar'}</button>
            <button className="btn ghost" onClick={() => setDrawer(true)}><StickyNote size={15} /> Anotaciones{anns.length ? ` (${anns.length})` : ''}</button>
            {ed && <button className="btn ghost" onClick={() => setMeta(true)} title="Nombre y descripción"><Settings2 size={15} /></button>}
            {ed && <button className="btn primary" onClick={() => setEditing({ ...newPanel(), _new: true })}><Plus size={15} /> Agregar panel</button>}
          </div>
        </div>

        {panels.length === 0 && (
          <Empty icon="LayoutGrid" title="Dashboard vacío">
            <p className="muted">Agrega paneles para visualizar los datos de tus medidores.</p>
            <button className="btn primary" onClick={() => setEditing({ ...newPanel(), _new: true })}><Plus size={15} /> Agregar primer panel</button>
          </Empty>
        )}

        <Grid className={`layout ${ed ? 'dash-grid-live' : ''}`} layouts={{ lg: layout }} breakpoints={{ lg: 1200, md: 900, sm: 600, xs: 0 }} cols={{ lg: 12, md: 12, sm: 6, xs: 1 }}
          rowHeight={38} margin={[16, 16]} containerPadding={[0, 0]} isDraggable={ed} isResizable={ed} resizeHandles={['se', 'e', 's']}
          draggableHandle=".panel-h" draggableCancel=".panel-act, .ie-btn, .inline-input" onDragStop={persist} onResizeStop={persist} onBreakpointChange={setBp} compactType="vertical">
          {panels.map((p) => (
            <div key={p.i} className="panel card">
              <div className="panel-h" title="Arrastra para mover · esquina inferior para redimensionar">
                {ed && <GripVertical size={14} className="panel-grip" />}
                <InlineEdit as="b" value={p.title} enabled={ed} onSave={(title) => updateDashboard(id, { panels: dash.panels.map((x) => (x.i === p.i ? { ...x, title } : x)) })} />
                <div className="panel-act">
                  <button className="icon-btn sm" title="Ampliar" onClick={() => setFull(p)}><Maximize2 size={13} /></button>
                  {ed && <>
                    <button className="icon-btn sm" title="Editar panel" onClick={() => setEditing(p)}><Pencil size={13} /></button>
                    <button className="icon-btn sm" title="Duplicar" onClick={() => duplicate(p)}><Copy size={13} /></button>
                    <button className="icon-btn sm danger" title="Eliminar" onClick={() => setDelP(p)}><Trash2 size={13} /></button>
                  </>}
                </div>
              </div>
              <div className={`panel-b t-${p.type}`}><PanelBody panel={p} range={range} /></div>
            </div>
          ))}
        </Grid>

        <Modal open={!!delP} onClose={() => setDelP(null)} title="Eliminar panel" width={420}
          footer={<><button className="btn ghost" onClick={() => setDelP(null)}>Cancelar</button><button className="btn danger" onClick={() => { updateDashboard(id, { panels: dash.panels.filter((x) => x.i !== delP.i) }); setDelP(null); toast('Panel eliminado') }}>Eliminar</button></>}>
          <p>¿Eliminar el panel <b>{delP?.title}</b> de este dashboard?</p>
        </Modal>

        {editing && <PanelEditor open panel={editing} range={range} onClose={() => { setEditing(null); setSp({}) }} onSave={savePanel} />}

        <Modal open={!!full} onClose={() => setFull(null)} title={full?.title} width={1100}>
          {full && <div className={`panel-b t-${full.type}`} style={{ height: 520 }}><PanelBody panel={full} range={range} /></div>}
        </Modal>

        <Modal open={!!annForm} onClose={() => setAnnForm(null)} title="Nueva anotación" width={480}
          footer={<><button className="btn ghost" onClick={() => setAnnForm(null)}>Cancelar</button><button className="btn primary" disabled={!annForm?.text?.trim()} onClick={saveAnn}>Guardar anotación</button></>}>
          {annForm && <>
            <Field label="Descripción"><textarea rows={3} autoFocus value={annForm.text} onChange={(e) => setAnnForm({ ...annForm, text: e.target.value })} placeholder="Ej. Arranque de secadora SC-02 · lote 245" /></Field>
            <div className="form-grid mt12">
              <Field label="Desde"><input type="datetime-local" value={toInput(annForm.t)} onChange={(e) => setAnnForm({ ...annForm, t: fromInput(e.target.value) })} /></Field>
              <Field label="Hasta (opcional)"><input type="datetime-local" value={toInput(annForm.end)} onChange={(e) => setAnnForm({ ...annForm, end: fromInput(e.target.value) })} /></Field>
            </div>
            <p className="muted xs mt12">Las anotaciones se muestran en todas las series de tiempo de este dashboard.</p>
          </>}
        </Modal>

        {drawer && (
          <aside className="drawer">
            <div className="drawer-h"><h3>Anotaciones</h3><div className="row gap4">
              <button className="btn sm" onClick={() => setAnnForm({ t: Date.now(), end: null, text: '' })}><Plus size={13} /> Nueva</button>
              <button className="icon-btn sm" onClick={() => setDrawer(false)}><X size={15} /></button></div></div>
            <div className="drawer-b">
              {anns.length === 0 && <p className="muted sm pad">Aún no hay anotaciones. Usa “Anotar” y haz clic sobre una gráfica.</p>}
              {anns.map((a) => (
                <div key={a.id} className="ann-i">
                  <span className="ann-bar" />
                  <div className="grow">
                    <b>{a.text}</b>
                    <div className="muted xs mt8">{fmtLong(a.t, 1)}{a.end ? ` → ${fmtLong(a.end, 1)}` : ''}</div>
                    <div className="muted xs">{a.author}</div>
                    <div className="row gap8 mt8">
                      <button className="link xs" onClick={() => setZoom([a.t - 2 * HOUR, (a.end || a.t) + 2 * HOUR])}>Ver en gráficas</button>
                      <button className="link xs t-red" onClick={() => removeAnnotation(id, a.id)}>Eliminar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        <DashMeta open={meta} dash={dash} onClose={() => setMeta(false)} onSave={(patch) => { updateDashboard(id, patch); setMeta(false); toast('Ajustes guardados') }} />
      </div>
    </DashCtx.Provider>
  )
}

function DashMeta({ open, dash, onClose, onSave }) {
  const [f, setF] = useState({ name: dash.name, description: dash.description || '' })
  useEffect(() => setF({ name: dash.name, description: dash.description || '' }), [dash, open])
  return (
    <Modal open={open} onClose={onClose} title="Ajustes del dashboard" width={520}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={() => onSave(f)}>Guardar</button></>}>
      <div className="form-grid">
        <Field label="Nombre"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Descripción"><input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      </div>
    </Modal>
  )
}
