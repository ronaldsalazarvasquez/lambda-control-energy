import { useAuth } from '../lib/useAuth'
import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { VarModal } from '../components/VarChart'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { ArrowLeft, Pencil, Trash2, Cpu, Power, LayoutDashboard, Activity } from 'lucide-react'
import { useStore, useNow, useMinute } from '../store'
import { Card, StatusDot, Badge, Modal, Segmented, Empty, InlineEdit } from '../components/ui'
import { TimeseriesPanel, BarPanel, LivePanel, GaugePanel } from '../components/widgets'
import MeterWizard, { useConnTest, ConnResult } from '../components/MeterWizard'
import { driverById, BRAND_COLORS } from '../data/catalog'
import { liveVars, fmt, stats, windowFor, RANGES, buckets, hourlyKw, readings } from '../lib/sim'
import { brandTag } from '../data/catalog'
import { dashboardTemplates } from '../data/seed'

export default function MeterDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const now = useNow()
  const minute = useMinute()
  const { meters, areas, updateMeter, removeMeter, addDashboard, toast } = useStore()
  const m = meters.find((x) => x.id === id)
  const [range, setRange] = useState('24h')
  const [wiz, setWiz] = useState(false)
  const [del, setDel] = useState(false)
  const [test, runTest] = useConnTest()
  const { can } = useAuth()
  const [sp, setSp] = useSearchParams()
  const ev = sp.get('ev') ? +sp.get('ev') : null

  const s = useMemo(() => { if (!m) return null; const [a, b] = windowFor(range); return stats(m, a, b) }, [m, range, minute]) // eslint-disable-line
  const phases = useMemo(() => {
    if (!m) return []
    return buckets('24h', 'hour').map((b, k) => {
      const kw = hourlyKw(m, b.start)
      const I = (kw * 1000) / (1.732 * 440 * (m.pfBase || 0.93))
      return { label: b.label, I1: I * 1.02, I2: I * 0.985, I3: I * (1.005 + 0.01 * Math.sin(k)) }
    })
  }, [m, minute]) // eslint-disable-line

  if (!m) return <div className="page"><Empty icon="Cpu" title="Medidor no encontrado"><button className="btn" onClick={() => nav('/medidores')}>Volver</button></Empty></div>
  const d = driverById(m.driverId)
  const a = areas.find((x) => x.id === m.areaId)
  const v = liveVars(m, now)
  const children = meters.filter((x) => x.parentId === m.id)

  return (
    <div className="page">
      <div className="dash-bar">
        <div className="row gap12">
          <button className="icon-btn" onClick={() => nav('/medidores')}><ArrowLeft size={18} /></button>
          <span className="drv-logo lg">{brandTag(d.brand)}</span>
          <div>
            <h2 className="row gap8">{m.id} · <InlineEdit value={m.name} enabled={can('config.meters')} onSave={(name) => { updateMeter(m.id, { name }); toast('Nombre actualizado') }} /> <StatusDot status={m.status} /></h2>
            <p className="muted sm">{d.brand} {d.model} · {m.protocol} {m.ip}{m.protocol === 'Modbus TCP' ? `:${m.port}` : ''} · ID {m.slaveId} {a && <>· <i className="sw" style={{ background: a.color }} /> {a.name}</>}</p>
          </div>
        </div>
        <div className="row gap8 wrap">
          <Segmented size="sm" value={range} onChange={setRange} options={['today', '24h', '7d', '30d'].map((k) => ({ value: k, label: RANGES[k].label.replace('Últimos ', '').replace('Últimas ', '') }))} />
          <button className="btn ghost" onClick={() => runTest(m)}><Activity size={15} /> Probar</button>
          {can('config.meters') && <button className="btn ghost" onClick={() => { updateMeter(m.id, { status: m.status === 'online' ? 'offline' : 'online' }); toast(m.status === 'online' ? 'Lectura pausada' : 'Lectura reanudada', 'info') }}><Power size={15} /> {m.status === 'online' ? 'Pausar' : 'Reanudar'}</button>}
          {can('dash.edit') && <button className="btn ghost" onClick={() => { const did = addDashboard({ name: `Medidor ${m.id} ${m.name}`, description: d.model, panels: dashboardTemplates.area(m.id) }); nav(`/dashboards/${did}`) }}><LayoutDashboard size={15} /> Crear dashboard</button>}
          {can('config.meters') && <button className="btn ghost" onClick={() => setWiz(true)}><Pencil size={15} /> Editar</button>}
          {!m.isMain && can('config.meters') && <button className="btn ghost danger" onClick={() => setDel(true)}><Trash2 size={15} /></button>}
        </div>
      </div>
      <ConnResult state={test} />

      {(() => { const r = readings(m, now); return (
        <div className="reads">
          <div className="main"><small>Totalizador · energía activa importada</small><div className="odo">{fmt(r.cur, 1)}<small>kWh</small></div></div>
          <div><small>Lectura 00:00 de hoy</small><div className="odo">{fmt(r.d0, 1)}</div></div>
          <div><small>Consumo de hoy</small><div className="odo">{fmt(r.day, 1)}<small>kWh</small></div></div>
          <div><small>Consumo del mes</small><div className="odo">{fmt(r.month, 0)}<small>kWh</small></div></div>
          <div><small>Totalizador reactiva</small><div className="odo">{fmt(r.kvarh, 0)}<small>kvarh</small></div></div>
        </div>) })()}

      <div className="kpis k4">
        <div className="card kpi"><div className="kpi-b"><span className="kpi-t">Energía ({RANGES[range].label.toLowerCase()})</span><div className="kpi-v">{fmt(s.energy, 0)}<small> kWh</small></div></div></div>
        <div className="card kpi"><div className="kpi-b"><span className="kpi-t">Demanda máxima</span><div className="kpi-v">{fmt(s.maxKw, 1)}<small> kW</small></div></div></div>
        <div className="card kpi"><div className="kpi-b"><span className="kpi-t">Potencia promedio</span><div className="kpi-v">{fmt(s.avgKw, 1)}<small> kW</small></div></div></div>
        <div className="card kpi"><div className="kpi-b"><span className="kpi-t">Costo</span><div className="kpi-v"><small>S/ </small>{fmt(s.cost, 2)}</div><span className="muted xs">Hora punta: S/ {fmt(s.costHP, 2)}</span></div></div>
      </div>

      <div className="grid g-1-2">
        <Card title="Potencia instantánea"><div style={{ height: 210 }}><GaugePanel config={{ meterId: m.id, metric: 'P' }} /></div></Card>
        <Card title="Variables eléctricas" subtitle="Pulsa una variable para ver su curva histórica">
          <LivePanel config={{ meterId: m.id }} vars={['V12', 'V23', 'V31', 'I1', 'I2', 'I3', 'P', 'Q', 'S', 'PF', 'F', 'THDI']} />
        </Card>
      </div>

      <div className="grid g-2">
        <Card title="Tendencia de potencia"><div style={{ height: 280 }}><TimeseriesPanel config={{ metric: 'power', meterIds: [m.id], _key: 'md' }} range={range} /></div></Card>
        <Card title="Energía consumida"><div style={{ height: 280 }}><BarPanel config={{ metric: 'energy', meterIds: [m.id] }} range={range === '24h' || range === 'today' ? range : range} /></div></Card>
      </div>

      <div className="grid g-2">
        <Card title="Corrientes por fase (24 h)">
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={phases} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} interval={3} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={44} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(x) => `${fmt(x, 1)} A`} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line dataKey="I1" name="L1" stroke="#ef4444" dot={false} strokeWidth={2} isAnimationActive={false} />
                <Line dataKey="I2" name="L2" stroke="#f59e0b" dot={false} strokeWidth={2} isAnimationActive={false} />
                <Line dataKey="I3" name="L3" stroke="#2563eb" dot={false} strokeWidth={2} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Información del equipo">
          <dl className="dl">
            <dt>Marca / modelo</dt><dd>{d.brand} {d.model}</dd>
            <dt>Precisión</dt><dd>{d.accuracy}</dd>
            <dt>Protocolo</dt><dd><Badge tone="blue">{m.protocol}</Badge></dd>
            <dt>Dirección</dt><dd className="mono">{m.ip}{m.protocol === 'Modbus TCP' ? `:${m.port}` : ` · ${m.port} bps`} · Unit ID {m.slaveId}</dd>
            <dt>Potencia nominal</dt><dd>{m.nominalKw} kW</dd>
            <dt>Medidor padre</dt><dd>{m.parentId ? <button className="link" onClick={() => nav(`/medidores/${m.parentId}`)}>{m.parentId}</button> : '—'}</dd>
            <dt>Medidores hijos</dt><dd>{children.length ? children.map((c) => <button key={c.id} className="link mr8" onClick={() => nav(`/medidores/${c.id}`)}>{c.id}</button>) : '—'}</dd>
            <dt>Contador energía</dt><dd className="mono">{fmt(readings(m, now).cur, 1)} kWh</dd>
            <dt>Última lectura</dt><dd>{m.status === 'online' ? new Date(now).toLocaleTimeString('es-PE') : 'Sin datos'}</dd>
          </dl>
        </Card>
      </div>

      {ev && <VarModal meter={m} varKey={sp.get('var') || 'P'} at={ev} onClose={() => setSp({})} />}
      <MeterWizard open={wiz} onClose={() => setWiz(false)} initial={m} />
      <Modal open={del} onClose={() => setDel(false)} title="Eliminar medidor" width={420}
        footer={<><button className="btn ghost" onClick={() => setDel(false)}>Cancelar</button><button className="btn danger" onClick={() => { removeMeter(m.id); toast(`${m.id} eliminado`); nav('/medidores') }}>Eliminar</button></>}>
        <p>¿Eliminar <b>{m.id} {m.name}</b>? Dejará de leerse y desaparecerá de los dashboards.</p>
      </Modal>
    </div>
  )
}
