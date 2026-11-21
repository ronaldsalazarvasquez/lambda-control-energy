import { createContext, useContext, useMemo, useRef, useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, ReferenceArea, ReferenceLine } from 'recharts'
import { TrendingUp, TrendingDown, WifiOff, ZoomOut, ChartSpline } from 'lucide-react'
import { VarModal, limitsFor } from './VarChart'
import { useNavigate } from 'react-router-dom'
import { useStore, useNow, useMinute } from '../store'
import { VARIABLES } from '../data/catalog'
import { aggregate, windowFor, seriesWin, fmt, fmtAuto, fmtTime, fmtLong, METRICS, liveVars, liveKw, meterById, mainMeter, stats, buckets, hourlyKw, HOUR, readings } from '../lib/sim'
import { Spark, Status } from './ui'

// Paleta de series: colores vivos y bien diferenciados (solo para gráficos)
export const PALETTE = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#64748b', '#84cc16']
export const DATA = '#2563eb'

export const PANEL_TYPES = {
  stat: { label: 'Indicador', icon: 'Hash', desc: 'Valor clave con variación' },
  timeseries: { label: 'Serie de tiempo', icon: 'ChartSpline', desc: 'Tendencia con zoom y anotaciones' },
  bar: { label: 'Barras', icon: 'ChartColumn', desc: 'Energía por hora o día' },
  counter: { label: 'Totalizadores', icon: 'Calculator', desc: 'Lecturas de contadores kWh' },
  pie: { label: 'Distribución', icon: 'ChartPie', desc: 'Consumo por área o medidor' },
  gauge: { label: 'Indicador radial', icon: 'Gauge', desc: 'Valor instantáneo vs. límite' },
  live: { label: 'Variables eléctricas', icon: 'Activity', desc: 'V, I, P, FP de un medidor' },
  table: { label: 'Tabla de medidores', icon: 'Table', desc: 'Estado y lecturas actuales' },
  heatmap: { label: 'Mapa de calor', icon: 'Grid3x3', desc: 'Consumo por hora y día' },
  text: { label: 'Texto / nota', icon: 'Type', desc: 'Notas para operadores' },
}

// Contexto de dashboard: zoom de tiempo compartido y anotaciones
export const DashCtx = createContext(null)

const axisTick = { fontSize: 11, fill: '#8a929e' }
const tipStyle = { borderRadius: 8, border: '1px solid #e3e6ea', boxShadow: '0 8px 24px rgba(15,20,28,.08)', fontSize: 12, padding: '8px 10px' }
const unitOf = (metric) => METRICS[metric]?.unit ?? ''
export const colorFor = (m, i, areas) => areas.find((a) => a.id === m?.areaId)?.color || PALETTE[i % PALETTE.length]

export function resolveMeters(ids) {
  return (ids?.length ? ids : [mainMeter()?.id]).map(meterById).filter(Boolean)
}

function useWin(range, config) {
  const ctx = useContext(DashCtx)
  const minute = useMinute()
  const r = config?.range && config.range !== 'inherit' ? config.range : range
  const zoom = ctx?.zoom
  return useMemo(() => {
    if (zoom) return { start: zoom[0], end: zoom[1], key: 'z' + zoom.join(), zoomed: true }
    const [start, end] = windowFor(r)
    return { start, end, key: r + minute }
  }, [zoom, r, minute])
}

// ---------- KPI ----------
export function StatPanel({ config, range }) {
  const now = useNow()
  const win = useWin(range, config)
  const metric = config.metric || 'energy'
  const meters = resolveMeters(config.meterIds)
  const ids = meters.map((m) => m.id).join()
  const { value, prev, spark } = useMemo(() => {
    const len = win.end - win.start
    const value = aggregate(meters, metric, win.start, win.end)
    const prev = aggregate(meters, metric, win.start - len, win.start)
    const sm = ['energy', 'cost', 'kwht', 'co2', 'tons'].includes(metric) ? 'energy' : 'power'
    const { rows } = seriesWin(meters, win.start, win.end, sm, 'timeseries')
    return { value, prev, spark: rows.map((r) => meters.reduce((a, m) => a + r[m.id], 0)) }
  }, [win.key, metric, ids]) // eslint-disable-line
  const live = metric === 'power' && !win.zoomed ? meters.reduce((a, m) => a + (liveKw(m, now) || 0), 0) : null
  const v = live ?? value
  const delta = prev ? ((value - prev) / prev) * 100 : 0
  const goodDown = ['energy', 'cost', 'demand', 'kwht', 'co2'].includes(metric)
  const good = goodDown ? delta <= 0 : delta >= 0
  const unit = unitOf(metric)
  return (
    <div className="stat">
      <div className="stat-v">
        {unit === 'S/' && <small>S/ </small>}
        {metric === 'pf' ? fmt(v, 2) : fmtAuto(v)}
        {unit && unit !== 'S/' && <small> {unit}</small>}
      </div>
      {metric === 'pf' ? (
        <span className={`pill ${v >= 0.95 ? 'p-green' : v >= 0.9 ? 'p-amber' : 'p-red'}`}>{v >= 0.95 ? 'Óptimo' : v >= 0.9 ? 'Aceptable' : 'Penalizable'}</span>
      ) : (
        <div className={`delta ${good ? 'up' : 'down'}`}>
          {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {delta >= 0 ? '+' : ''}{fmt(delta, 1)}% <span className="muted">vs. periodo anterior</span>
        </div>
      )}
      <Spark data={spark} color={config.color || DATA} />
    </div>
  )
}

// ---------- Serie de tiempo (zoom por arrastre + anotaciones) ----------
export function TimeseriesPanel({ config, range, height = '100%' }) {
  const ctx = useContext(DashCtx)
  const areas = useStore((s) => s.areas)
  const [localZoom, setLocalZoom] = useState(null)
  const wrapRef = useRef(null)
  const [sel, setSel] = useState(null)
  const minute = useMinute()
  const metric = config.metric || 'power'
  const meters = resolveMeters(config.meterIds)
  const ids = meters.map((m) => m.id).join()
  const zoom = ctx ? ctx.zoom : localZoom
  const setZoom = ctx ? ctx.setZoom : setLocalZoom
  const r = config.range && config.range !== 'inherit' ? config.range : range
  const { rows, step } = useMemo(() => {
    const [s, e] = zoom || windowFor(r)
    return seriesWin(meters, s, e, metric)
  }, [zoom?.join(), r, minute, metric, ids]) // eslint-disable-line
  const span = rows.length ? rows[rows.length - 1].t - rows[0].t : 0
  const unit = unitOf(metric)
  const single = meters.length === 1
  const col = (m, i) => (single && config.color ? config.color : single ? DATA : colorFor(m, i, areas))
  const anns = (ctx?.annotations || []).filter((a) => rows.length && a.t >= rows[0].t - step && a.t <= rows[rows.length - 1].t + step)

  const up = () => {
    if (!sel) return
    const a = Math.min(sel.a, sel.b), b = Math.max(sel.a, sel.b)
    setSel(null)
    if (ctx?.annotating) return ctx.requestAnnotation(a, b > a ? b + step : null)
    if (b > a) setZoom([a, b + step])
  }
  return (
    <div ref={wrapRef} className={`ts-wrap ${ctx?.annotating ? 'annot' : ''}`} style={{ height }} onDoubleClick={() => setZoom(null)}>
      {!ctx && localZoom && <button className="btn sm" style={{ position: 'absolute', right: 14, top: 0, zIndex: 2 }} onClick={() => setLocalZoom(null)}><ZoomOut size={13} /> Restablecer</button>}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 14, right: 8, left: -8, bottom: 0 }}
          onMouseDown={(e) => e?.activeLabel != null && setSel({ a: e.activeLabel, b: e.activeLabel })}
          onMouseMove={(e) => sel && e?.activeLabel != null && setSel((s) => ({ ...s, b: e.activeLabel }))}
          onMouseUp={up} onMouseLeave={() => setSel(null)}>
          <defs>
            {meters.map((m, i) => (
              <linearGradient key={m.id} id={`g-${m.id}-${config._key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={col(m, i)} stopOpacity={single ? 0.28 : 0.3} />
                <stop offset="100%" stopColor={col(m, i)} stopOpacity={0.01} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="#eef0f3" vertical={false} />
          <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(t) => fmtTime(t, step, span)} tick={axisTick} tickLine={false} axisLine={{ stroke: '#e3e6ea' }} minTickGap={36} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} width={48} />
          <Tooltip contentStyle={tipStyle} cursor={{ stroke: '#9aa2ad', strokeDasharray: '3 3' }} labelFormatter={(t) => fmtLong(t, step)} formatter={(v, n) => [`${fmtAuto(v)} ${unit}`, meterById(n)?.name || n]} />
          {meters.length > 1 && <Legend iconType="plainline" iconSize={14} wrapperStyle={{ fontSize: 11, color: '#6b7482' }} formatter={(v) => meterById(v)?.name || v} />}
          {meters.map((m, i) => (
            <Area key={m.id} type="monotone" dataKey={m.id} stackId={config.stacked ? 's' : undefined}
              stroke={col(m, i)} strokeWidth={2} fill={`url(#g-${m.id}-${config._key})`} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} isAnimationActive={false} />
          ))}
          {anns.map((a) => a.end
            ? <ReferenceArea key={a.id} x1={a.t} x2={a.end} fill="#f2b705" fillOpacity={0.12} stroke="#d9a400" strokeOpacity={0.5} label={<AnnMark text={a.text} author={a.author} t={a.t} end={a.end} cw={wrapRef.current?.offsetWidth} />} />
            : <ReferenceLine key={a.id} x={a.t} stroke="#d9a400" strokeWidth={1.6} strokeDasharray="5 3" label={<AnnMark text={a.text} author={a.author} t={a.t} cw={wrapRef.current?.offsetWidth} />} />)}
          {sel && sel.a !== sel.b && <ReferenceArea x1={sel.a} x2={sel.b} fill={ctx?.annotating ? '#f2b705' : DATA} fillOpacity={0.1} />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Marcador de anotación: punto en la línea; el texto aparece al pasar el cursor
function AnnMark({ viewBox, text, author, t, end, cw = 9999 }) {
  if (!viewBox) return null
  const x = viewBox.x, y = viewBox.y, h = viewBox.height
  const when = fmtLong(t, 1) + (end ? ` → ${fmtLong(end, 1)}` : '')
  const line2 = when + (author ? ` · ${author}` : '')
  const w = Math.min(320, Math.max(text.length * 6.6, line2.length * 5.4) + 22)
  const left = x + w + 14 > cw
  const tx = left ? x - w - 10 : x + 10
  return (
    <g className="ann-mark">
      <rect x={x - 7} y={y} width={(viewBox.width || 0) + 14} height={h} fill="transparent" />
      <circle cx={x} cy={y + 5} r={4.5} fill="#f2b705" stroke="#fff" strokeWidth={1.5} />
      <g className="ann-tip">
        <rect x={tx} y={y + 12} width={w} height={42} rx={6} fill="#fff" stroke="#e3e6ea" />
        <text x={tx + 11} y={y + 29} fontSize={11.5} fontWeight={600} fill="#111827">{text}</text>
        <text x={tx + 11} y={y + 45} fontSize={10} fill="#6b7482">{line2}</text>
      </g>
    </g>
  )
}

// ---------- Barras ----------
export function BarPanel({ config, range }) {
  const win = useWin(range, config)
  const areas = useStore((s) => s.areas)
  const metric = config.metric || 'energy'
  const meters = resolveMeters(config.meterIds)
  const ids = meters.map((m) => m.id).join()
  const { rows } = useMemo(() => seriesWin(meters, win.start, win.end, metric, 'bar'), [win.key, metric, ids]) // eslint-disable-line
  const unit = unitOf(metric)
  const single = meters.length === 1
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 18, right: 8, left: -8, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid stroke="#eef0f3" vertical={false} />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: '#e3e6ea' }} minTickGap={8} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} width={48} />
        <Tooltip cursor={{ fill: 'rgba(17,24,39,.04)' }} contentStyle={tipStyle} labelFormatter={(l, p) => p?.[0]?.payload?.long || l} formatter={(v, n) => [`${fmtAuto(v)} ${unit}`, meterById(n)?.name || n]} />
        {!single && <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#6b7482' }} formatter={(v) => meterById(v)?.name || v} />}
        {meters.map((m, i) => (
          <Bar key={m.id} dataKey={m.id} stackId={config.stacked !== false ? 's' : undefined} radius={i === meters.length - 1 || config.stacked === false ? [3, 3, 0, 0] : 0}
            fill={single ? config.color || DATA : colorFor(m, i, areas)} isAnimationActive={false}
            label={single && rows.length <= 10 ? { position: 'top', fontSize: 10.5, fill: '#6b7482', formatter: (v) => fmt(v, 0) } : false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ---------- Distribución ----------
export function PiePanel({ config, range }) {
  const win = useWin(range, config)
  const areas = useStore((s) => s.areas)
  const meters = useStore((s) => s.meters)
  const data = useMemo(() => {
    const { start: s, end: e } = win
    if (config.groupBy === 'meter') {
      const ms = resolveMeters(config.meterIds?.length ? config.meterIds : meters.filter((m) => !m.isMain).map((m) => m.id))
      return ms.map((m, i) => ({ name: m.name, value: stats(m, s, e).energy, color: colorFor(m, i, areas) }))
    }
    return areas.map((a) => ({ name: a.short || a.name, value: meters.filter((m) => m.areaId === a.id).reduce((acc, m) => acc + stats(m, s, e).energy, 0), color: a.color })).filter((d) => d.value > 0)
  }, [win.key, config.groupBy, (config.meterIds || []).join(), areas, meters]) // eslint-disable-line
  const total = data.reduce((a, d) => a + d.value, 0)
  return (
    <div className="pie">
      <div className="pie-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="64%" outerRadius="94%" paddingAngle={1} stroke="#fff" strokeWidth={1.5} isAnimationActive={false}>
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={tipStyle} formatter={(v) => `${fmt(v, 0)} kWh`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pie-center"><b>{fmt(total, 0)}</b><span>kWh</span></div>
      </div>
      <ul className="legend">
        {[...data].sort((a, b) => b.value - a.value).map((d) => (
          <li key={d.name}><i className="sw" style={{ background: d.color }} /><span>{d.name}</span><b>{fmt((d.value / (total || 1)) * 100, 0)}%</b></li>
        ))}
      </ul>
    </div>
  )
}

// ---------- Gauge ----------
const GAUGE_DEF = {
  P: (m, plant) => ({ min: 0, max: m?.isMain ? plant.contractedKw : (m?.nominalKw || 100) * 1.1, warn: 0.85, unit: 'kW', d: 1 }),
  PF: () => ({ min: 0.7, max: 1, warnLow: 0.9, unit: '', d: 3 }),
  THDI: () => ({ min: 0, max: 30, warn: 0.5, unit: '%', d: 1 }),
  THDV: () => ({ min: 0, max: 10, warn: 0.5, unit: '%', d: 1 }),
  V12: (m, plant) => ({ min: plant.voltage * 0.85, max: plant.voltage * 1.15, unit: 'V', d: 1, band: true }),
  I1: (m, plant) => ({ min: 0, max: ((m?.nominalKw || 100) * 1000) / (1.732 * plant.voltage * 0.9) * 1.2, warn: 0.85, unit: 'A', d: 1 }),
}
export function GaugePanel({ config }) {
  const now = useNow()
  const plant = useStore((s) => s.plant)
  const m = meterById(config.meterId) || mainMeter()
  const metric = config.metric || 'P'
  const lv = liveVars(m, now)
  const v = lv ? lv[metric] : null
  const def = (GAUGE_DEF[metric] || GAUGE_DEF.P)(m, plant)
  const pct = v == null ? 0 : Math.max(0, Math.min(1, (v - def.min) / (def.max - def.min)))
  let color = DATA
  if (def.warnLow && v < def.warnLow) color = '#ef4444'
  else if (def.warnLow && v < 0.95) color = '#f59e0b'
  else if (def.warn && pct > def.warn) color = pct > 0.95 ? '#ef4444' : '#f59e0b'
  else if (def.band && Math.abs(pct - 0.5) > 0.3) color = '#f59e0b'
  const R = 70, C = Math.PI * R
  return (
    <div className="gauge">
      <svg viewBox="0 0 180 112">
        <path d="M20 95 A70 70 0 0 1 160 95" fill="none" stroke="#edf0f3" strokeWidth="10" />
        <path d="M20 95 A70 70 0 0 1 160 95" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${C * pct} ${C}`} style={{ transition: 'stroke-dasharray .8s' }} />
        <text x="90" y="82" textAnchor="middle" className="g-val">{v == null ? '—' : fmt(v, def.d)}</text>
        <text x="90" y="98" textAnchor="middle" className="g-unit">{def.unit || VARIABLES[metric]?.label}</text>
        <text x="20" y="109" textAnchor="middle" className="g-lim">{fmt(def.min, def.d > 2 ? 1 : 0)}</text>
        <text x="160" y="109" textAnchor="middle" className="g-lim">{fmt(def.max, def.d > 2 ? 1 : 0)}</text>
      </svg>
      <div className="muted xs center">{m?.id} · {m?.name} — {VARIABLES[metric]?.label}</div>
    </div>
  )
}

// ---------- Variables eléctricas (cada valor abre su curva) ----------
export function LivePanel({ config, vars }) {
  const now = useNow()
  const plant = useStore((s) => s.plant)
  const [open, setOpen] = useState(null)
  const m = meterById(config.meterId) || mainMeter()
  const lv = liveVars(m, now)
  const list = vars || config.vars || ['V12', 'V23', 'V31', 'I1', 'I2', 'I3', 'P', 'PF', 'F']
  if (!lv) return <div className="offline-box"><WifiOff size={18} /> {m?.id} sin comunicación</div>
  return (
    <>
      <div className="live-grid">
        {list.map((k) => {
          const lim = limitsFor(k, m, plant)
          const bad = (lim.lo != null && lv[k] < lim.lo) || (lim.hi != null && lv[k] > lim.hi)
          const isV = k.startsWith('V') && lim.lo
          const r0 = isV ? lim.nom - 2 * (lim.nom - lim.lo) : 0, r1 = isV ? lim.nom + 2 * (lim.hi - lim.nom) : 1
          const pos = isV ? Math.max(0, Math.min(1, (lv[k] - r0) / (r1 - r0))) : 0
          return (
            <button key={k} className={`live-c ${bad ? 'bad' : ''}`} onClick={() => setOpen(k)} title="Ver curva">
              <div className="live-l">{VARIABLES[k]?.label}<ChartSpline size={12} className="live-go" /></div>
              <div className="live-v">{fmt(lv[k], k === 'PF' ? 3 : k === 'F' ? 2 : 1)} <small>{VARIABLES[k]?.unit}</small></div>
              {isV && <div className="vband" title={`Límites ${fmt(lim.lo, 0)} – ${fmt(lim.hi, 0)} V`}><i style={{ left: `${pos * 100}%` }} /></div>}
            </button>
          )
        })}
      </div>
      {open && <VarModal meter={m} varKey={open} onClose={() => setOpen(null)} />}
    </>
  )
}

// ---------- Totalizadores ----------
export function CounterPanel({ config }) {
  const now = useNow()
  const nav = useNavigate()
  const all = useStore((s) => s.meters)
  const ms = config.meterIds?.length ? all.filter((m) => config.meterIds.includes(m.id)) : all
  if (ms.length === 1) {
    const m = ms[0], r = readings(m, now)
    return (
      <div className="counter-big">
        <div><div className="upper">{m.id} · {m.name} — Energía activa importada</div>
          <div className="odo mt8">{fmt(r.cur, 1)}<small>kWh</small></div></div>
        <div className="cb-grid">
          <div><small className="muted xs">Consumo hoy</small><b>{fmt(r.day, 1)} kWh</b></div>
          <div><small className="muted xs">Consumo del mes</small><b>{fmt(r.month, 0)} kWh</b></div>
          <div><small className="muted xs">Reactiva total</small><b>{fmt(r.kvarh, 0)} kvarh</b></div>
        </div>
      </div>
    )
  }
  return (
    <div className="counter-list">
      <div className="counter-row head"><span>Medidor</span><span>Totalizador kWh</span><span className="r">Hoy</span><span className="r">Mes</span></div>
      {ms.map((m) => {
        const r = readings(m, now)
        return (
          <div key={m.id} className="counter-row" style={{ cursor: 'pointer' }} onClick={() => nav(`/medidores/${m.id}`)}>
            <span><b className="sm">{m.id}</b><small>{m.name}</small></span>
            <span className="odo">{fmt(r.cur, 1)}</span>
            <span className="r num">{fmt(r.day, 1)}</span>
            <span className="r num">{fmt(r.month, 0)}</span>
          </div>
        )
      })}
    </div>
  )
}

// ---------- Tabla ----------
export function TablePanel({ config }) {
  const now = useNow()
  const meters = useStore((s) => s.meters)
  const areas = useStore((s) => s.areas)
  const nav = useNavigate()
  const ms = config.meterIds?.length ? meters.filter((m) => config.meterIds.includes(m.id)) : meters
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead><tr><th>Medidor</th><th>Área</th><th className="r">kW</th><th className="r">FP</th><th className="r">V L1-L2</th><th className="r">I prom.</th><th className="r">THDi %</th><th className="r">Totalizador kWh</th><th>Estado</th></tr></thead>
        <tbody>
          {ms.map((m) => {
            const v = liveVars(m, now)
            const a = areas.find((x) => x.id === m.areaId)
            return (
              <tr key={m.id} onClick={() => nav(`/medidores/${m.id}`)} className="click">
                <td><b>{m.id}</b> <span className="muted">{m.name}</span></td>
                <td>{a ? <span className="row"><i className="sw" style={{ background: a.color }} />{a.short}</span> : <span className="muted">Planta</span>}</td>
                <td className="r num">{fmt(v?.P, 1)}</td>
                <td className={`r num ${v && v.PF < 0.9 ? 't-red' : ''}`}>{fmt(v?.PF, 2)}</td>
                <td className="r num">{fmt(v?.V12, 1)}</td>
                <td className="r num">{fmt(v ? (v.I1 + v.I2 + v.I3) / 3 : null, 1)}</td>
                <td className={`r num ${v && v.THDI > 15 ? 't-amber' : ''}`}>{fmt(v?.THDI, 1)}</td>
                <td className="r mono">{fmt(readings(m, now).cur, 1)}</td>
                <td><Status status={m.status} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---------- Mapa de calor ----------
export function HeatmapPanel({ config, range }) {
  const minute = useMinute()
  const meters = resolveMeters(config.meterIds)
  const r = config.range && config.range !== 'inherit' ? config.range : range === '24h' || range === 'today' ? '7d' : range
  const { days, max } = useMemo(() => {
    const days = buckets(r, 'day').slice(-14).map((d) => ({
      label: d.label,
      hours: Array.from({ length: 24 }, (_, h) => {
        const t = d.start + h * HOUR
        return t > Date.now() ? null : meters.reduce((a, m) => a + hourlyKw(m, t), 0)
      }),
    }))
    const max = Math.max(1, ...days.flatMap((d) => d.hours.filter((x) => x != null)))
    return { days, max }
  }, [minute, r, meters.map((m) => m.id).join()]) // eslint-disable-line
  return (
    <div className="heat">
      <div className="heat-grid" style={{ gridTemplateRows: `repeat(${days.length}, 1fr) 16px` }}>
        {days.map((d) => (
          <div key={d.label} className="heat-row">
            <span className="heat-l">{d.label}</span>
            {d.hours.map((v, h) => (
              <i key={h} title={v == null ? '' : `${d.label} ${h}:00 — ${fmt(v, 0)} kW`} style={{ background: v == null ? '#f7f8fa' : `rgba(37,99,235,${0.06 + 0.9 * (v / max)})` }} />
            ))}
          </div>
        ))}
        <div className="heat-row heat-ax"><span className="heat-l" />{Array.from({ length: 24 }, (_, h) => <span key={h}>{h % 3 === 0 ? h : ''}</span>)}</div>
      </div>
    </div>
  )
}

export function TextPanel({ config }) {
  return <div className="textp">{config.text || 'Escribe una nota para los operadores…'}</div>
}

export function PanelBody({ panel, range }) {
  const p = { config: { ...panel.config, _key: panel.i }, range }
  switch (panel.type) {
    case 'stat': return <StatPanel {...p} />
    case 'timeseries': return <TimeseriesPanel {...p} />
    case 'bar': return <BarPanel {...p} />
    case 'pie': return <PiePanel {...p} />
    case 'gauge': return <GaugePanel {...p} />
    case 'live': return <LivePanel {...p} />
    case 'counter': return <CounterPanel {...p} />
    case 'table': return <TablePanel {...p} />
    case 'heatmap': return <HeatmapPanel {...p} />
    case 'text': return <TextPanel {...p} />
    default: return null
  }
}
