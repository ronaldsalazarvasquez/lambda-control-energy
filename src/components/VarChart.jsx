import { useMemo, useState } from 'react'
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea } from 'recharts'
import { ZoomOut } from 'lucide-react'
import { Modal, Segmented } from './ui'
import { useStore, useMinute } from '../store'
import { VARIABLES } from '../data/catalog'
import { varSeries, varAt, plantEvents, fmt, fmtTime, fmtLong, HOUR, DAY } from '../lib/sim'

const SPANS = { '1h': HOUR, '6h': 6 * HOUR, '24h': DAY, '7d': 7 * DAY, '30d': 30 * DAY }
const DEC = { PF: 3, F: 2, THDV: 1, THDI: 1 }
const QUICK = ['V12', 'V23', 'V31', 'I1', 'I2', 'I3', 'P', 'Q', 'PF', 'F', 'THDV', 'THDI']

export function limitsFor(key, meter, plant) {
  const V = plant.voltage
  if (key.startsWith('V')) return { lo: V * (1 - plant.vLowPct / 100), hi: V * (1 + plant.vHighPct / 100), nom: V }
  if (key === 'PF') return { lo: 0.9 }
  if (key === 'P' && meter?.isMain) return { hi: plant.contractedKw }
  if (key === 'THDI') return { hi: 15 }
  if (key === 'THDV') return { hi: 8 }
  return {}
}

export function VarModal({ meter, varKey, at, onClose }) {
  const plant = useStore((s) => s.plant)
  const minute = useMinute()
  const [key, setKey] = useState(varKey)
  const [span, setSpan] = useState(at ? 'evento' : '6h')
  const [zoom, setZoom] = useState(null)
  const [sel, setSel] = useState(null)
  const win = useMemo(() => {
    if (zoom) return zoom
    if (span === 'evento' && at) return [at - 2 * HOUR, Math.min(Date.now(), at + 2 * HOUR)]
    return [Date.now() - SPANS[span], Date.now()]
  }, [zoom, span, at, minute])
  const { rows, step } = useMemo(() => varSeries(meter, key, win[0], win[1]), [meter, key, win])
  const lim = limitsFor(key, meter, plant)
  const evs = key.startsWith('V') ? plantEvents(win[0], win[1]) : []
  const vals = rows.map((r) => r.v)
  const st = vals.length ? { min: Math.min(...rows.map((r) => r.band[0])), max: Math.max(...rows.map((r) => r.band[1])), avg: vals.reduce((a, b) => a + b, 0) / vals.length, last: vals[vals.length - 1] } : {}
  const out = rows.filter((r) => (lim.lo != null && r.band[0] < lim.lo) || (lim.hi != null && r.band[1] > lim.hi)).length
  const unit = VARIABLES[key]?.unit
  const d = DEC[key] ?? 1
  const spanMs = win[1] - win[0]
  const lo = Math.min(st.min ?? 0, lim.lo ?? Infinity), hi = Math.max(st.max ?? 0, lim.hi ?? -Infinity)
  const pad = (hi - lo) * 0.08 || 1
  const up = () => {
    if (!sel) return
    const a = Math.min(sel.a, sel.b), b = Math.max(sel.a, sel.b)
    setSel(null)
    if (b > a) setZoom([a, b + step])
  }
  return (
    <Modal open onClose={onClose} title={<span>{meter.id} · {meter.name} <span className="muted" style={{ fontWeight: 400 }}>— {VARIABLES[key]?.label}</span></span>} width={1000}>
      <div className="vc-bar">
        <div className="chips">
          {QUICK.map((k) => <button key={k} className={`chip ${k === key ? 'on' : ''}`} onClick={() => setKey(k)}>{VARIABLES[k].label.replace('Voltaje ', 'V ').replace('Corriente ', 'I ').replace('Potencia ', 'P. ')}</button>)}
        </div>
        <div className="row gap8">
          {zoom && <button className="btn sm" onClick={() => setZoom(null)}><ZoomOut size={13} /> Restablecer</button>}
          <Segmented size="sm" value={zoom ? '' : span} onChange={(v) => { setZoom(null); setSpan(v) }} options={[...(at ? [{ value: 'evento', label: 'Evento' }] : []), ...Object.keys(SPANS)]} />
        </div>
      </div>
      <div className="vc-stats">
        <div><small>Actual</small><b>{fmt(st.last, d)} <i>{unit}</i></b></div>
        <div><small>Mínimo</small><b className={lim.lo != null && st.min < lim.lo ? 't-red' : ''}>{fmt(st.min, d)} <i>{unit}</i></b></div>
        <div><small>Máximo</small><b className={lim.hi != null && st.max > lim.hi ? 't-red' : ''}>{fmt(st.max, d)} <i>{unit}</i></b></div>
        <div><small>Promedio</small><b>{fmt(st.avg, d)} <i>{unit}</i></b></div>
        <div><small>{lim.lo != null || lim.hi != null ? 'Fuera de límite' : 'Muestras'}</small><b className={out ? 't-red' : ''}>{lim.lo != null || lim.hi != null ? `${fmt((out * step) / 60000, 0)} min` : rows.length}</b></div>
      </div>
      <div style={{ height: 340, userSelect: 'none' }} onDoubleClick={() => setZoom(null)}>
        <ResponsiveContainer>
          <ComposedChart data={rows} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
            onMouseDown={(e) => e?.activeLabel != null && setSel({ a: e.activeLabel, b: e.activeLabel })}
            onMouseMove={(e) => sel && e?.activeLabel != null && setSel((x) => ({ ...x, b: e.activeLabel }))}
            onMouseUp={up} onMouseLeave={() => setSel(null)}>
            <defs><linearGradient id="vcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563eb" stopOpacity={0.18} /><stop offset="1" stopColor="#2563eb" stopOpacity={0.04} /></linearGradient></defs>
            <CartesianGrid stroke="#eef0f3" vertical={false} />
            <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(t) => fmtTime(t, step, spanMs)} tick={{ fontSize: 11, fill: '#8a929e' }} tickLine={false} axisLine={{ stroke: '#e3e6ea' }} minTickGap={40} />
            <YAxis domain={[lo - pad, hi + pad]} tickFormatter={(v) => fmt(v, d > 1 ? 2 : 0)} tick={{ fontSize: 11, fill: '#8a929e' }} tickLine={false} axisLine={false} width={52} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e3e6ea' }} labelFormatter={(t) => fmtLong(t, 1)} formatter={(v, n) => (n === 'band' ? [`${fmt(v[0], d)} – ${fmt(v[1], d)} ${unit}`, 'Rango'] : [`${fmt(v, d)} ${unit}`, VARIABLES[key]?.label])} />
            {evs.map((e) => <ReferenceArea key={e.start} x1={e.start - step} x2={e.end + step} fill={e.type === 'sag' ? '#ef4444' : '#f59e0b'} fillOpacity={0.1} />)}
            {lim.hi != null && <ReferenceLine y={lim.hi} stroke="#ef4444" strokeDasharray="5 4" label={{ value: `Máx ${fmt(lim.hi, d > 1 ? 2 : 0)}`, position: 'insideTopRight', fontSize: 10.5, fill: '#ef4444' }} />}
            {lim.lo != null && <ReferenceLine y={lim.lo} stroke="#ef4444" strokeDasharray="5 4" label={{ value: `Mín ${fmt(lim.lo, d > 1 ? 2 : 0)}`, position: 'insideBottomRight', fontSize: 10.5, fill: '#ef4444' }} />}
            {lim.nom != null && <ReferenceLine y={lim.nom} stroke="#9aa2ad" strokeDasharray="2 4" />}
            {at && <ReferenceLine x={at} stroke="#111827" strokeWidth={1.5} label={{ value: 'Evento', position: 'insideTopLeft', fontSize: 10.5, fill: '#111827' }} />}
            <Area dataKey="band" stroke="none" fill="url(#vcg)" isAnimationActive={false} />
            <Line dataKey="v" stroke="#2563eb" strokeWidth={1.8} dot={false} isAnimationActive={false} />
            {sel && sel.a !== sel.b && <ReferenceArea x1={sel.a} x2={sel.b} fill="#2563eb" fillOpacity={0.08} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {evs.length > 0 && (
        <div className="vc-evs">
          <span className="upper">Eventos en el periodo</span>
          {evs.map((e) => {
            const v = varAt(meter, 'V12', (e.start + e.end) / 2)
            return (
              <button key={e.start} className={`ev-chip ${e.type}`} onClick={() => setZoom([e.start - 20 * 60000, e.end + 20 * 60000])}>
                <b>{e.type === 'sag' ? 'Hueco de tensión' : 'Sobretensión'}</b> {fmt(v, 0)} V ({e.depth > 0 ? '−' : '+'}{fmt(Math.abs(e.depth) * 100, 1)} %) · {fmt((e.end - e.start) / 60000, 0)} min · {fmtLong(e.start, 1)}
              </button>
            )
          })}
        </div>
      )}
      <p className="muted xs mt12">Arrastra sobre la curva para ampliar un intervalo · doble clic para volver. Límites de tensión configurables en Ajustes → Calidad de energía.</p>
    </Modal>
  )
}
