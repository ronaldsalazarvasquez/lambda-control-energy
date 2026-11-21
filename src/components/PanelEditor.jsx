import { useEffect, useState } from 'react'
import { Modal, Field, MeterPicker, Icon, Segmented } from './ui'
import { PANEL_TYPES, PanelBody, PALETTE } from './widgets'
import { METRICS, RANGES } from '../lib/sim'
import { VARIABLES } from '../data/catalog'
import { useStore } from '../store'

const METRIC_BY_TYPE = {
  stat: ['energy', 'power', 'demand', 'cost', 'pf', 'kwht', 'tons', 'co2'],
  timeseries: ['power', 'energy', 'demand', 'cost'],
  bar: ['energy', 'cost', 'demand', 'power'],
}
const GAUGE_METRICS = ['P', 'PF', 'THDI', 'THDV', 'V12', 'I1']
const DEFAULT_SIZE = { stat: [3, 3], timeseries: [6, 7], bar: [6, 7], pie: [4, 7], gauge: [3, 6], live: [6, 5], table: [12, 8], heatmap: [6, 7], text: [4, 4], counter: [6, 6] }

export const newPanel = (type = 'timeseries') => ({
  i: `p-${Math.random().toString(36).slice(2, 9)}`,
  type, title: PANEL_TYPES[type].label, x: 0, y: 999, w: DEFAULT_SIZE[type][0], h: DEFAULT_SIZE[type][1],
  config: { metric: METRIC_BY_TYPE[type]?.[0], meterIds: ['MED-001'], meterId: 'MED-001', range: 'inherit' },
})

export default function PanelEditor({ open, panel, onClose, onSave, range }) {
  const [p, setP] = useState(panel)
  const meters = useStore((s) => s.meters)
  useEffect(() => setP(panel), [panel])
  if (!p) return null
  const c = p.config || {}
  const setC = (patch) => setP({ ...p, config: { ...c, ...patch } })
  const setType = (type) => {
    const [w, h] = DEFAULT_SIZE[type]
    const keepTitle = p.title && !Object.values(PANEL_TYPES).some((t) => t.label === p.title)
    setP({ ...p, type, w, h, title: keepTitle ? p.title : PANEL_TYPES[type].label, config: { ...c, metric: METRIC_BY_TYPE[type]?.includes(c.metric) ? c.metric : METRIC_BY_TYPE[type]?.[0] ?? (type === 'gauge' ? 'P' : c.metric) } })
  }
  const metrics = METRIC_BY_TYPE[p.type]
  const single = ['gauge', 'live'].includes(p.type)

  return (
    <Modal open={open} onClose={onClose} title={panel?._new ? 'Agregar panel' : 'Editar panel'} width={1100}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={() => onSave(p)}>{panel?._new ? 'Agregar al dashboard' : 'Aplicar cambios'}</button></>}>
      <div className="pe">
        <div className="pe-prev">
          <div className="panel card">
            <div className="panel-h"><b>{p.title || 'Sin título'}</b></div>
            <div className={`panel-b t-${p.type}`} style={{ height: 330 }}><PanelBody panel={p} range={range} /></div>
          </div>
          <h4 className="mt16 mb8">Tipo de visualización</h4>
          <div className="vt-grid">
            {Object.entries(PANEL_TYPES).map(([k, t]) => (
              <button key={k} className={`vt ${p.type === k ? 'on' : ''}`} onClick={() => setType(k)} title={t.desc}>
                <Icon name={t.icon} size={20} /><span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="pe-form">
          <Field label="Título del panel"><input value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} /></Field>

          {metrics && (
            <Field label="Métrica">
              <select value={c.metric} onChange={(e) => setC({ metric: e.target.value })}>
                {metrics.map((m) => <option key={m} value={m}>{METRICS[m].label} {METRICS[m].unit && `(${METRICS[m].unit})`}</option>)}
              </select>
            </Field>
          )}

          {p.type === 'gauge' && (
            <Field label="Variable">
              <select value={c.metric} onChange={(e) => setC({ metric: e.target.value })}>
                {GAUGE_METRICS.map((m) => <option key={m} value={m}>{VARIABLES[m].label}</option>)}
              </select>
            </Field>
          )}

          {p.type === 'pie' && (
            <Field label="Agrupar por"><Segmented value={c.groupBy || 'area'} onChange={(v) => setC({ groupBy: v })} options={[{ value: 'area', label: 'Área' }, { value: 'meter', label: 'Medidor' }]} /></Field>
          )}

          {['timeseries', 'bar', 'pie', 'heatmap'].includes(p.type) && (
            <Field label="Rango de tiempo">
              <select value={c.range || 'inherit'} onChange={(e) => setC({ range: e.target.value })}>
                <option value="inherit">Usar rango del dashboard</option>
                {Object.entries(RANGES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
              </select>
            </Field>
          )}

          {['timeseries', 'bar'].includes(p.type) && (
            <label className="check"><input type="checkbox" checked={p.type === 'bar' ? c.stacked !== false : !!c.stacked} onChange={(e) => setC({ stacked: e.target.checked })} /> Apilar series</label>
          )}

          {['stat', 'timeseries', 'bar'].includes(p.type) && (
            <Field label="Color">
              <div className="colors">{PALETTE.map((col) => <button key={col} className={c.color === col ? 'on' : ''} style={{ background: col }} onClick={() => setC({ color: col })} />)}</div>
            </Field>
          )}

          {p.type === 'live' && (
            <Field label="Variables a mostrar">
              <div className="chips">
                {Object.entries(VARIABLES).filter(([k]) => k !== 'E').map(([k, v]) => {
                  const sel = (c.vars || ['V12', 'V23', 'V31', 'I1', 'I2', 'I3', 'P', 'PF', 'F']).includes(k)
                  return <button key={k} className={`chip ${sel ? 'on' : ''}`} onClick={() => { const cur = c.vars || ['V12', 'V23', 'V31', 'I1', 'I2', 'I3', 'P', 'PF', 'F']; setC({ vars: sel ? cur.filter((x) => x !== k) : [...cur, k] }) }}>{v.label}</button>
                })}
              </div>
            </Field>
          )}

          {p.type === 'text' && (
            <Field label="Contenido"><textarea rows={8} value={c.text || ''} onChange={(e) => setC({ text: e.target.value })} placeholder="Ej. Encender CT-02 solo si la presión baja de 6 bar." /></Field>
          )}

          {p.type !== 'text' && !(p.type === 'pie' && (c.groupBy || 'area') === 'area') && (
            <Field label={single ? 'Medidor' : ['table', 'counter'].includes(p.type) ? 'Medidores (vacío = todos)' : 'Medidores'} hint={!single && !['table', 'counter'].includes(p.type) ? 'Selecciona uno o varios; los colores siguen al área.' : null}>
              <MeterPicker multi={!single} value={single ? [c.meterId] : c.meterIds || []} onChange={(v) => (single ? setC({ meterId: v[0] }) : setC({ meterIds: v }))} />
            </Field>
          )}
          {meters.length === 0 && <p className="muted sm">No hay medidores configurados.</p>}
        </div>
      </div>
    </Modal>
  )
}
