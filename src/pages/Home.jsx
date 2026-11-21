import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot, ReferenceLine } from 'recharts'
import { Zap, PlugZap, Gauge, Coins, Wheat, TrendingUp, TrendingDown, ChevronRight, Leaf, Cloud, CalendarDays, ArrowRight, LayoutDashboard, Calculator, Activity } from 'lucide-react'
import { useStore, useNow, useMinute } from '../store'
import { Card, Segmented, Status } from '../components/ui'
import { BarPanel, PiePanel, LivePanel } from '../components/widgets'
import { aggregate, windowFor, prevWindow, fmt, RANGES, series, liveKw, mainMeter, tonsRange, stats, readings, plantEvents } from '../lib/sim'

function Kpi({ icon: I, title, value, unit, prefix, delta, goodDown = true, pill, children }) {
  const good = goodDown ? delta <= 0 : delta >= 0
  return (
    <div className="kpi card">
      <div className="kpi-top"><span className="kpi-t">{title}</span><span className="kpi-ic"><I size={15} strokeWidth={1.8} /></span></div>
      <div className="kpi-v">{prefix && <small>{prefix}</small>}{value}{unit && <small>{unit}</small>}{pill}</div>
      {delta != null && (
        <div className={`delta ${good ? 'up' : 'down'}`}>{delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {delta >= 0 ? '+' : ''}{fmt(delta, 1)}% <span className="muted">vs. periodo anterior</span></div>
      )}
      {children}
    </div>
  )
}

export default function Home() {
  const minute = useMinute()
  const now = useNow()
  const nav = useNavigate()
  const meters = useStore((s) => s.meters)
  const areas = useStore((s) => s.areas)
  const plant = useStore((s) => s.plant)
  const [range, setRange] = useState('7d')
  const [areaId, setAreaId] = useState('all')
  const [gran, setGran] = useState('semana')
  const [liveMeter, setLiveMeter] = useState('MED-001')

  const scope = useMemo(() => (areaId === 'all' ? [mainMeter()] : meters.filter((m) => m.areaId === areaId)), [areaId, meters])
  const scopeIds = scope.map((m) => m.id)

  const k = useMemo(() => {
    const [s, e] = windowFor(range), [ps, pe] = prevWindow(range)
    const d = (metric) => { const v = aggregate(scope, metric, s, e), p = aggregate(scope, metric, ps, pe); return { v, d: p ? ((v - p) / p) * 100 : 0 } }
    return { energy: d('energy'), demand: d('demand'), cost: d('cost'), kwht: d('kwht'), tons: tonsRange(s, e) }
  }, [minute, range, scopeIds.join()]) // eslint-disable-line
  const pf = aggregate(scope, 'pf', 0, now)

  const trend = useMemo(() => series(scope, '24h', 'hour', 'power').map((r) => ({ ...r, v: scope.reduce((a, m) => a + r[m.id], 0) })), [minute, scopeIds.join()]) // eslint-disable-line
  const peak = trend.reduce((a, r) => (r.v > a.v ? r : a), { v: 0, t: 0 })
  const liveTotal = scope.reduce((a, m) => a + (liveKw(m, now) || 0), 0)

  const today = useMemo(() => {
    const [s, e] = windowFor('24h')
    const st = stats(mainMeter(), s, e)
    const tons = tonsRange(s, e)
    const kwht = tons ? st.energy / tons : 0
    const saving = kwht ? Math.max(0, (kwht - plant.targetKwht * 0.92) / kwht) : 0
    return { ...st, tons, kwht, saving, co2: st.energy * plant.co2Factor }
  }, [minute, plant]) // eslint-disable-line

  const barRange = gran === 'dia' ? 'today' : gran === 'semana' ? '7d' : '30d'
  const online = meters.filter((m) => m.status === 'online').length
  const areaName = areaId === 'all' ? 'Toda la planta' : areas.find((a) => a.id === areaId)?.name
  const mainR = readings(mainMeter(), now)
  const evs7 = useMemo(() => plantEvents(Date.now() - 7 * 86400e3, Date.now()).filter((e) => Math.abs(e.depth) * 100 >= plant.vLowPct).length, [minute, plant]) // eslint-disable-line

  return (
    <div className="page">
      <div className="toolbar">
        <div className="muted sm">Vista general · <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{areaName}</b></div>
        <div className="row gap8 wrap">
          <label className="select"><CalendarDays size={15} />
            <select value={range} onChange={(e) => setRange(e.target.value)}>{Object.entries(RANGES).map(([key, r]) => <option key={key} value={key}>{r.label}</option>)}</select>
          </label>
          <label className="select">
            <select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
              <option value="all">Toda la planta</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <Link to="/dashboards" className="btn"><LayoutDashboard size={15} /> Mis dashboards</Link>
        </div>
      </div>

      <div className="kpis">
        <Kpi icon={Zap} title="Consumo total" value={fmt(k.energy.v, 0)} unit="kWh" delta={k.energy.d} />
        <Kpi icon={PlugZap} title="Demanda máxima" value={fmt(k.demand.v, 0)} unit="kW" delta={k.demand.d}>
          {areaId === 'all' && <div className="bar-mini"><i style={{ width: `${Math.min(100, (k.demand.v / plant.contractedKw) * 100)}%` }} /><span>{fmt((k.demand.v / plant.contractedKw) * 100, 0)}% de {plant.contractedKw} kW contratados</span></div>}
        </Kpi>
        <Kpi icon={Gauge} title="Factor de potencia" value={fmt(pf, 2)}
          pill={<span className={`pill ${pf >= 0.95 ? 'p-green' : pf >= 0.9 ? 'p-amber' : 'p-red'}`}>{pf >= 0.95 ? 'Óptimo' : pf >= 0.9 ? 'Aceptable' : 'Penalizable'}</span>} />
        <Kpi icon={Coins} title="Costo estimado" prefix="S/" value={fmt(k.cost.v, 2)} delta={k.cost.d} />
        <Kpi icon={Wheat} title="Consumo específico" value={fmt(k.kwht.v, 1)} unit="kWh/t" delta={k.kwht.d}>
          <div className="muted xs">{fmt(k.tons, 0)} t de paddy · meta {plant.targetKwht} kWh/t</div>
        </Kpi>
      </div>

      <div className="grid g-2-1">
        <Card title="Consumo energético" actions={<Segmented size="sm" value={gran} onChange={setGran} options={[{ value: 'dia', label: 'Día' }, { value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mes' }]} />}>
          <div style={{ height: 290 }}>
            <BarPanel config={{ metric: 'energy', meterIds: scopeIds, stacked: true }} range={barRange} />
          </div>
        </Card>
        <Card title="Tendencia de potencia" subtitle={<>Últimas 24 horas · actual <b style={{ color: 'var(--ink)' }}>{fmt(liveTotal, 1)} kW</b></>}>
          <div style={{ height: 290 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 26, right: 10, left: -10, bottom: 0 }}>
                <defs><linearGradient id="trendG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563eb" stopOpacity={0.28} /><stop offset="1" stopColor="#2563eb" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid stroke="#eef0f3" vertical={false} />
                <XAxis dataKey="t" type="category" tickFormatter={(t) => `${String(new Date(t).getHours()).padStart(2, '0')}:00`} tick={{ fontSize: 11, fill: '#8a929e' }} tickLine={false} axisLine={{ stroke: '#e3e6ea' }} interval={3} />
                <YAxis tick={{ fontSize: 11, fill: '#8a929e' }} tickLine={false} axisLine={false} width={44} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e3e6ea' }} formatter={(v) => [`${fmt(v, 1)} kW`, 'Potencia']} labelFormatter={(l, p) => p?.[0]?.payload?.long || l} />
                <Area type="monotone" dataKey="v" stroke="#2563eb" strokeWidth={2} fill="url(#trendG)" isAnimationActive={false} />
                <ReferenceLine x={peak.t} stroke="#b9c0c9" strokeDasharray="3 3" />
                <ReferenceDot x={peak.t} y={peak.v} r={4} fill="#111827" stroke="#fff" strokeWidth={2}
                  label={{ value: `Pico ${fmt(peak.v, 0)} kW`, position: 'top', fontSize: 11, fontWeight: 600, fill: '#111827' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid g-3">
        <Card title="Distribución por áreas"><PiePanel config={{ groupBy: 'area' }} range={range} /></Card>
        <Card title={liveMeter === 'MED-001' ? 'Ingreso a planta' : 'Variables eléctricas'} subtitle={<>Pulsa una variable para ver su curva · <Link to="/alertas" className="link xs">{evs7} eventos de tensión en 7 días</Link></>} actions={
          <select className="mini-select" value={liveMeter} onChange={(e) => setLiveMeter(e.target.value)}>
            {meters.map((m) => <option key={m.id} value={m.id}>{m.id} · {m.name}</option>)}
          </select>}>
          <LivePanel config={{ meterId: liveMeter }} vars={['V12', 'V23', 'V31', 'I1', 'I2', 'I3', 'P', 'PF', 'F']} />
        </Card>
        <Card title="Medidores" subtitle={`${online} de ${meters.length} en línea · totalizador kWh`} actions={<Link to="/medidores" className="link xs">Ver todos</Link>}>
          <div className="meter-list">
            {meters.filter((m) => areaId === 'all' || m.areaId === areaId).slice(0, 5).map((m) => {
              const kw = liveKw(m, now)
              const r = readings(m, now)
              return (
                <button key={m.id} className="meter-row" onClick={() => nav(`/medidores/${m.id}`)}>
                  <span className="m-n"><b>{m.id} · {m.name}</b><small>{kw == null ? <Status status={m.status} /> : `${fmt(kw, 1)} kW · hoy ${fmt(r.day, 0)} kWh`}</small></span>
                  <span className="m-v"><b className="mono">{fmt(r.cur, 1)}</b><small>kWh</small></span>
                  <ChevronRight size={15} className="muted" />
                </button>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="grid">
        <Card title="Resumen energético · últimas 24 h">
          <div className="summary">
            <div><span className="s-ic"><Coins size={16} /></span><div><small>Costo estimado</small><b>S/ {fmt(today.cost, 2)}</b><span className="muted xs">HP S/ {fmt(today.costHP, 2)} · {fmt(today.cost / (today.energy || 1), 2)} S/kWh</span></div></div>
            <div><span className="s-ic"><Leaf size={16} /></span><div><small>Ahorro potencial</small><b>{fmt(today.saving * 100, 1)}%</b><span className="muted xs">≈ {fmt(today.saving * today.energy, 0)} kWh vs. meta</span></div></div>
            <div><span className="s-ic"><Cloud size={16} /></span><div><small>Emisiones CO₂</small><b>{fmt(today.co2, 0)} kg</b><span className="muted xs">factor {plant.co2Factor} kg/kWh</span></div></div>
            <div><span className="s-ic"><Calculator size={16} /></span><div><small>Totalizador general</small><b className="mono" style={{ fontSize: 16 }}>{fmt(mainR.cur, 0)}</b><span className="muted xs">mes: {fmt(mainR.month, 0)} kWh</span></div></div>
            <div className="s-state"><span className="muted"><Activity size={13} style={{ verticalAlign: -2 }} /> Comunicación</span><b>{online === meters.length ? 'Todos los equipos responden' : `${meters.length - online} equipo(s) sin respuesta`}</b><Link to="/alertas" className="link xs">Ver alertas <ArrowRight size={12} /></Link></div>
          </div>
        </Card>
      </div>
    </div>
  )
}
