import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LineChart, Legend } from 'recharts'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, X, ArrowUpRight } from 'lucide-react'
import { useStore, useMinute } from '../store'
import { Card } from '../components/ui'
import { stats, tonsRange, peakInfo, monthRange, mainMeter, totalizer, TOTALIZER_FROM, hourlyKw, fmt, fmtLong, HOUR, DAY, pfAt } from '../lib/sim'

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const tip = { borderRadius: 8, fontSize: 12, border: '1px solid #e3e6ea' }
const ax = { fontSize: 11, fill: '#8a929e' }
const pct = (a, b) => (b ? ((a - b) / b) * 100 : 0)

function Delta({ v, goodDown = true }) {
  if (!isFinite(v)) return null
  const good = goodDown ? v <= 0 : v >= 0
  return <span className={`delta ${good ? 'up' : 'down'}`}>{v >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{v >= 0 ? '+' : ''}{fmt(v, 1)}%</span>
}

const dayEnergy = (m, t) => stats(m, t, t + DAY).energy

export default function Balance() {
  const minute = useMinute()
  const nav = useNavigate()
  const { meters, areas, plant } = useStore()
  const [off, setOff] = useState(0)
  const [day, setDay] = useState(null)
  const [areaSel, setAreaSel] = useState(null)
  const main = mainMeter()

  const [s, e, eFull] = monthRange(off)
  const [ps] = monthRange(off + 1)
  const pe = ps + (e - s) // mismo número de días del mes anterior
  const ms = new Date(s)
  const title = `${MONTHS[ms.getMonth()]} ${ms.getFullYear()}`
  const partial = e < eFull

  const M = useMemo(() => {
    const cur = stats(main, s, e), prv = stats(main, ps, pe)
    const tons = tonsRange(s, e), tonsP = tonsRange(ps, pe)
    const peak = peakInfo(main, s, e)
    const lf = cur.hours ? cur.energy / (peak.kw * cur.hours) : 0
    const days = []
    for (let t = s; t < e; t += DAY) {
      const i = days.length
      days.push({ t, d: new Date(t).getDate(), label: `${DOW[new Date(t).getDay()]} ${new Date(t).getDate()}`, cur: dayEnergy(main, t), prev: ps + i * DAY < monthRange(off)[0] ? dayEnergy(main, ps + i * DAY) : null })
    }
    const areaRows = areas.map((a) => {
      const am = meters.filter((m) => m.areaId === a.id)
      const c = am.reduce((x, m) => x + stats(m, s, e).energy, 0)
      const p = am.reduce((x, m) => x + stats(m, ps, pe).energy, 0)
      return { a, am, c, p, d: pct(c, p), kwht: tons ? c / tons : 0 }
    }).filter((r) => r.am.length)
    const measured = areaRows.reduce((x, r) => x + r.c, 0)
    const readA = s >= TOTALIZER_FROM() ? totalizer(main, s) : null
    const readB = s >= TOTALIZER_FROM() ? totalizer(main, e) : null
    const year = Array.from({ length: 12 }, (_, k) => {
      const [a, b] = monthRange(11 - k)
      const st = stats(main, a, b)
      return { off: 11 - k, label: MONTHS[new Date(a).getMonth()].slice(0, 3), energy: st.energy, cost: st.cost }
    })
    return { cur, prv, tons, tonsP, peak, lf, days, areaRows, measured, readA, readB, year, pf: pfAt(main) }
  }, [off, minute, meters, areas]) // eslint-disable-line

  const kwht = M.tons ? M.cur.energy / M.tons : 0, kwhtP = M.tonsP ? M.prv.energy / M.tonsP : 0
  const hpShare = M.cur.energy ? (M.cur.energyHP / M.cur.energy) * 100 : 0

  return (
    <div className="page">
      <div className="page-h">
        <div>
          <h2>Balance energético mensual</h2>
          <p className="muted">Consumo del medidor general en el mes, comparado con el mismo periodo del mes anterior. Pulsa un día o un área para ver su detalle.</p>
        </div>
        <div className="month-nav">
          <button className="icon-btn" onClick={() => { setOff(off + 1); setDay(null); setAreaSel(null) }}><ChevronLeft size={18} /></button>
          <div><b>{title}</b><span>{partial ? `al ${new Date(e).getDate()} · en curso` : 'mes cerrado'}</span></div>
          <button className="icon-btn" disabled={off === 0} onClick={() => { setOff(Math.max(0, off - 1)); setDay(null); setAreaSel(null) }}><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="bal-hero card">
        <div className="bh-main">
          <span className="upper">Energía · {main.id} {main.name}</span>
          <div className="bh-v">{fmt(M.cur.energy, 0)} <small>kWh</small></div>
          <div className="row gap8"><Delta v={pct(M.cur.energy, M.prv.energy)} /><span className="muted xs">vs. {fmt(M.prv.energy, 0)} kWh del mes anterior (mismos días)</span></div>
          {M.readA != null && <div className="bh-read"><span>Lectura inicial <b className="mono">{fmt(M.readA, 1)}</b></span><span>Lectura {partial ? 'actual' : 'final'} <b className="mono">{fmt(M.readB, 1)}</b></span></div>}
        </div>
        <div className="bh-grid">
          <div><small>Costo</small><b>S/ {fmt(M.cur.cost, 0)}</b><Delta v={pct(M.cur.cost, M.prv.cost)} /></div>
          <div><small>Demanda máxima</small><b>{fmt(M.peak.kw, 0)} kW</b><span className="muted xs">{fmtLong(M.peak.t, 1)}</span></div>
          <div><small>Consumo específico</small><b>{fmt(kwht, 1)} kWh/t</b><Delta v={pct(kwht, kwhtP)} /></div>
          <div><small>Producción paddy</small><b>{fmt(M.tons, 0)} t</b><Delta v={pct(M.tons, M.tonsP)} goodDown={false} /></div>
          <div><small>Energía en hora punta</small><b>{fmt(hpShare, 1)}%</b><span className="muted xs">S/ {fmt(M.cur.costHP, 0)} en HP</span></div>
          <div><small>Factor de carga</small><b>{fmt(M.lf * 100, 0)}%</b><span className="muted xs">energía / (pico × horas)</span></div>
        </div>
      </div>

      <Card title="Consumo diario" subtitle="Barras: este mes · línea: mes anterior · pulsa un día para ver su perfil horario">
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <ComposedChart data={M.days} margin={{ top: 10, right: 8, left: -6, bottom: 0 }} onClick={(x) => x?.activePayload && setDay(x.activePayload[0].payload.t)}>
              <CartesianGrid stroke="#eef0f3" vertical={false} />
              <XAxis dataKey="d" tick={ax} tickLine={false} axisLine={{ stroke: '#e3e6ea' }} />
              <YAxis tick={ax} tickLine={false} axisLine={false} width={48} />
              <Tooltip contentStyle={tip} cursor={{ fill: 'rgba(37,99,235,.06)' }} labelFormatter={(l, p) => p?.[0]?.payload?.label} formatter={(v, n) => [`${fmt(v, 0)} kWh`, n === 'cur' ? 'Este mes' : 'Mes anterior']} />
              <Bar dataKey="cur" radius={[3, 3, 0, 0]} isAnimationActive={false} style={{ cursor: 'pointer' }}>
                {M.days.map((d) => <Cell key={d.t} fill={day === d.t ? '#1d4ed8' : new Date(d.t).getDay() === 0 ? '#93c5fd' : '#3b82f6'} />)}
              </Bar>
              <Line dataKey="prev" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {day && <DayDetail t={day} onClose={() => setDay(null)} />}
      </Card>

      <div className="grid g-2-1">
        <Card title="Consumo por área" subtitle={`Medido ${fmt(M.measured, 0)} kWh de ${fmt(M.cur.energy, 0)} kWh · no asignado ${fmt(((M.cur.energy - M.measured) / (M.cur.energy || 1)) * 100, 1)}%`}>
          <table className="tbl">
            <thead><tr><th>Área</th><th className="r">Este mes</th><th className="r">Mes anterior</th><th className="r">Variación</th><th style={{ width: '22%' }}>Participación</th><th className="r">kWh/t</th></tr></thead>
            <tbody>
              {M.areaRows.sort((a, b) => b.c - a.c).map((r) => (
                <tr key={r.a.id} className={`click ${areaSel === r.a.id ? 'sel-row' : ''}`} onClick={() => setAreaSel(areaSel === r.a.id ? null : r.a.id)}>
                  <td><span className="row"><i className="sw" style={{ background: r.a.color }} />{r.a.name}</span></td>
                  <td className="r num"><b>{fmt(r.c, 0)}</b></td>
                  <td className="r num muted">{fmt(r.p, 0)}</td>
                  <td className="r"><Delta v={r.d} /></td>
                  <td><div className="share"><i style={{ width: `${(r.c / (M.measured || 1)) * 100}%`, background: r.a.color }} /><span>{fmt((r.c / (M.measured || 1)) * 100, 0)}%</span></div></td>
                  <td className="r num">{fmt(r.kwht, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {areaSel && <AreaDetail area={M.areaRows.find((r) => r.a.id === areaSel)} s={s} e={e} ps={ps} onClose={() => setAreaSel(null)} onOpen={() => nav(`/areas/${areaSel}`)} />}
        </Card>
        <Card title="Últimos 12 meses" subtitle="Pulsa un mes para analizarlo">
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={M.year} margin={{ top: 10, right: 4, left: -6, bottom: 0 }} onClick={(x) => x?.activePayload && (setOff(x.activePayload[0].payload.off), setDay(null), setAreaSel(null))}>
                <CartesianGrid stroke="#eef0f3" vertical={false} />
                <XAxis dataKey="label" tick={ax} tickLine={false} axisLine={{ stroke: '#e3e6ea' }} />
                <YAxis tick={ax} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => `${fmt(v / 1000, 0)}k`} />
                <Tooltip contentStyle={tip} cursor={{ fill: 'rgba(37,99,235,.06)' }} formatter={(v, n) => [n === 'energy' ? `${fmt(v, 0)} kWh` : `S/ ${fmt(v, 0)}`, n === 'energy' ? 'Energía' : 'Costo']} />
                <Bar dataKey="energy" radius={[3, 3, 0, 0]} isAnimationActive={false} style={{ cursor: 'pointer' }}>
                  {M.year.map((y) => <Cell key={y.off} fill={y.off === off ? '#2563eb' : '#bfdbfe'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}

function DayDetail({ t, onClose }) {
  const main = mainMeter()
  const data = useMemo(() => {
    const same = [1, 2, 3, 4].map((w) => t - w * 7 * DAY)
    return Array.from({ length: 24 }, (_, h) => ({
      h: `${String(h).padStart(2, '0')}:00`,
      dia: t + h * HOUR > Date.now() ? null : hourlyKw(main, t + h * HOUR),
      ref: same.reduce((a, d) => a + hourlyKw(main, d + h * HOUR), 0) / same.length,
    }))
  }, [t]) // eslint-disable-line
  const st = stats(main, t, t + DAY), pk = peakInfo(main, t, t + DAY)
  return (
    <div className="detail">
      <div className="row between mb12">
        <div><b>{new Date(t).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</b>
          <div className="muted xs">{fmt(st.energy, 0)} kWh · pico {fmt(pk.kw, 0)} kW a las {new Date(pk.t).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} · S/ {fmt(st.cost, 0)} · {fmt(tonsRange(t, t + DAY), 0)} t</div></div>
        <button className="icon-btn sm" onClick={onClose}><X size={14} /></button>
      </div>
      <div style={{ height: 210 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
            <CartesianGrid stroke="#eef0f3" vertical={false} />
            <XAxis dataKey="h" tick={ax} tickLine={false} axisLine={{ stroke: '#e3e6ea' }} interval={2} />
            <YAxis tick={ax} tickLine={false} axisLine={false} width={48} />
            <Tooltip contentStyle={tip} formatter={(v, n) => [`${fmt(v, 0)} kW`, n === 'dia' ? 'Este día' : 'Promedio mismo día (4 sem.)']} />
            <Legend iconType="plainline" wrapperStyle={{ fontSize: 11 }} formatter={(v) => (v === 'dia' ? 'Este día' : 'Promedio del mismo día de la semana (4 sem.)')} />
            <Line dataKey="ref" stroke="#9aa2ad" strokeDasharray="4 3" strokeWidth={1.6} dot={false} isAnimationActive={false} />
            <Line dataKey="dia" stroke="#2563eb" strokeWidth={2.2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function AreaDetail({ area, s, e, ps, onClose, onOpen }) {
  const data = useMemo(() => {
    const out = []
    for (let t = s, i = 0; t < e; t += DAY, i++) {
      out.push({ d: new Date(t).getDate(), cur: area.am.reduce((a, m) => a + stats(m, t, t + DAY).energy, 0), prev: area.am.reduce((a, m) => a + stats(m, ps + i * DAY, ps + (i + 1) * DAY).energy, 0) })
    }
    return out
  }, [area, s, e, ps])
  return (
    <div className="detail">
      <div className="row between mb12">
        <b className="row"><i className="sw" style={{ background: area.a.color }} />{area.a.name} · consumo diario</b>
        <div className="row gap4"><button className="btn sm" onClick={onOpen}>Ir al área <ArrowUpRight size={13} /></button><button className="icon-btn sm" onClick={onClose}><X size={14} /></button></div>
      </div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
            <CartesianGrid stroke="#eef0f3" vertical={false} />
            <XAxis dataKey="d" tick={ax} tickLine={false} axisLine={{ stroke: '#e3e6ea' }} />
            <YAxis tick={ax} tickLine={false} axisLine={false} width={48} />
            <Tooltip contentStyle={tip} formatter={(v, n) => [`${fmt(v, 0)} kWh`, n === 'cur' ? 'Este mes' : 'Mes anterior']} labelFormatter={(l) => `Día ${l}`} />
            <Line dataKey="prev" stroke="#9aa2ad" strokeDasharray="4 3" strokeWidth={1.6} dot={false} isAnimationActive={false} />
            <Line dataKey="cur" stroke={area.a.color} strokeWidth={2.2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
