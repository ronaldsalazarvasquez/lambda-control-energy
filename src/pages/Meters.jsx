import { useAuth } from '../lib/useAuth'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Cpu, Wifi, WifiOff, Calculator, Zap, Download } from 'lucide-react'
import { useStore, useNow, useMinute } from '../store'
import { Badge, Status, Segmented, Spark, MeterIcon } from '../components/ui'
import MeterWizard from '../components/MeterWizard'
import { driverById } from '../data/catalog'
import { liveVars, fmt, readings, totalizer, reactiveTotal, buckets, hourlyKw, startOfMonth } from '../lib/sim'

export { brandTag } from '../data/catalog'

const toInput = (t) => { const d = new Date(t); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }

function MeterCard({ m, now, area, onClick }) {
  const minute = useMinute()
  const d = driverById(m.driverId)
  const v = liveVars(m, now)
  const r = readings(m, now)
  const c = area?.color || '#2563eb'
  const spark = useMemo(() => buckets('24h', 'hour').map((b) => hourlyKw(m, b.start)), [m, minute]) // eslint-disable-line
  const load = v ? Math.min(100, (v.P / (m.isMain ? 630 : m.nominalKw || 1)) * 100) : 0
  return (
    <button className="mcard" onClick={onClick} style={{ '--c': c }}>
      <div className="mc-h">
        <span className="mc-ic"><MeterIcon size={20} /></span>
        <div className="grow">
          <div className="row between"><span className="mono">{m.id}</span><span className={`st-pill ${m.status}`}>{m.status === 'online' ? 'Online' : 'Sin comunicación'}</span></div>
          <div className="mc-n">{m.name}</div>
          <div className="muted xs">{area?.name || 'Planta'} · {d.brand} {d.model}</div>
        </div>
      </div>
      <div className="mc-odo">
        <div className="row between"><span className="upper">Totalizador kWh</span><span className="muted xs">kvarh {fmt(r.kvarh, 0)}</span></div>
        <div className="odo">{fmt(r.cur, 1)}</div>
      </div>
      <div className="mc-grid">
        <div><small>Potencia</small><b>{v ? fmt(v.P, 1) : '—'}<i>kW</i></b><span className="mc-load"><i style={{ width: `${load}%` }} /></span></div>
        <div><small>Hoy</small><b>{fmt(r.day, 0)}<i>kWh</i></b></div>
        <div><small>Mes</small><b>{fmt(r.month, 0)}<i>kWh</i></b></div>
      </div>
      <div className="mc-foot"><span>24 h</span><Spark data={spark} h={26} color={c} /><span>FP {v ? fmt(v.PF, 2) : '—'}</span></div>
    </button>
  )
}

function Readings({ list, areas }) {
  const now = useNow()
  const { toast } = useStore()
  const [cut, setCut] = useState(null) // fecha de corte
  const [from, setFrom] = useState(startOfMonth())
  const tCut = cut || now
  const rows = list.map((m) => {
    const a = totalizer(m, from), b = totalizer(m, tCut)
    return { m, area: areas.find((x) => x.id === m.areaId), a, b, diff: b - a, kvarh: reactiveTotal(m, tCut) }
  })
  const csv = () => {
    const head = ['Medidor', 'Nombre', 'Área', `Lectura inicial (${new Date(from).toLocaleString('es-PE')})`, `Lectura final (${new Date(tCut).toLocaleString('es-PE')})`, 'Consumo kWh', 'Reactiva kvarh']
    const lines = rows.map((r) => [r.m.id, r.m.name, r.area?.name || 'Planta', r.a.toFixed(1), r.b.toFixed(1), r.diff.toFixed(1), r.kvarh.toFixed(1)].join(';'))
    const blob = new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const el = document.createElement('a'); el.href = URL.createObjectURL(blob); el.download = 'lecturas-totalizadores.csv'; el.click()
    toast('Lecturas exportadas')
  }
  return (
    <>
      <div className="filters">
        <label className="field" style={{ maxWidth: 220 }}><span>Lectura inicial</span><input type="datetime-local" value={toInput(from)} onChange={(e) => setFrom(new Date(e.target.value).getTime())} /></label>
        <label className="field" style={{ maxWidth: 220 }}><span>Lectura final</span><input type="datetime-local" value={toInput(tCut)} onChange={(e) => setCut(new Date(e.target.value).getTime())} /></label>
        <div className="row gap6" style={{ alignSelf: 'flex-end' }}>
          <button className="btn sm" onClick={() => { setFrom(startOfMonth()); setCut(null) }}>Mes actual</button>
          <button className="btn sm" onClick={() => { const d = new Date(startOfMonth()); d.setMonth(d.getMonth() - 1); setFrom(d.getTime()); setCut(startOfMonth()) }}>Mes anterior</button>
          <button className="btn sm" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setFrom(d.getTime()); setCut(null) }}>Hoy</button>
        </div>
        <span className="grow" />
        <button className="btn" style={{ alignSelf: 'flex-end' }} onClick={csv}><Download size={15} /> Exportar lecturas</button>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Medidor</th><th>Área</th><th className="r">Lectura inicial kWh</th><th className="r">Lectura final kWh</th><th className="r">Consumo kWh</th><th className="r">Reactiva kvarh</th><th>Estado</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.m.id}>
                <td><b>{r.m.id}</b> <span className="muted">{r.m.name}</span></td>
                <td>{r.area ? <span className="row"><i className="sw" style={{ background: r.area.color }} />{r.area.short}</span> : <span className="muted">Planta</span>}</td>
                <td className="r mono">{fmt(r.a, 1)}</td>
                <td className="r mono">{fmt(r.b, 1)}</td>
                <td className="r num"><b>{fmt(r.diff, 1)}</b></td>
                <td className="r mono">{fmt(r.kvarh, 1)}</td>
                <td><Status status={r.m.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted xs pad">Consumo = lectura final − lectura inicial del totalizador de energía activa importada (kWh) de cada equipo.</p>
    </>
  )
}

export default function Meters() {
  const nav = useNavigate()
  const now = useNow()
  const { meters, areas } = useStore()
  const { can, plan } = useAuth()
  const full = meters.length >= plan.meters
  const [q, setQ] = useState('')
  const [area, setArea] = useState('all')
  const [status, setStatus] = useState('all')
  const [view, setView] = useState('table')
  const [wiz, setWiz] = useState(false)

  const list = useMemo(() => meters.filter((m) => {
    const d = driverById(m.driverId)
    return (area === 'all' || m.areaId === area || (area === 'none' && !m.areaId)) && (status === 'all' || m.status === status) &&
      (m.id + m.name + d.brand + d.model + m.ip).toLowerCase().includes(q.toLowerCase())
  }), [meters, q, area, status])

  const online = meters.filter((m) => m.status === 'online').length
  const main = meters.find((m) => m.isMain)
  const mainR = main ? readings(main, now) : null

  return (
    <div className="page">
      <div className="page-h">
        <div><h2>Medidores</h2><p className="muted">Equipos conectados por Modbus TCP / RTU. Totalizadores, lecturas instantáneas y estado de comunicación.</p></div>
        {can('config.meters') && <div className="row gap8">{full && <button className="limit-note" onClick={() => useStore.getState().openUpgrade(`Tu plan ${plan.name} permite hasta ${plan.meters} medidores.`)}>Plan {plan.name}: {meters.length} de {plan.meters} medidores · Mejorar plan</button>}<button className="btn primary" disabled={full} title={full ? 'Límite del plan alcanzado' : ''} onClick={() => setWiz(true)}><Plus size={16} /> Agregar medidor</button></div>}
      </div>

      <div className="mini-kpis">
        <div className="card mk"><Cpu size={18} /><div><b>{meters.length}</b><span>Medidores</span></div></div>
        <div className="card mk"><Wifi size={18} /><div><b>{online}</b><span>En línea</span></div></div>
        <div className="card mk"><WifiOff size={18} className={meters.length - online ? 't-red' : ''} /><div><b>{meters.length - online}</b><span>Sin comunicación</span></div></div>
        <div className="card mk"><Calculator size={18} /><div><b className="mono" style={{ fontSize: 16 }}>{fmt(mainR?.cur, 0)}</b><span>Totalizador general kWh</span></div></div>
        <div className="card mk"><Zap size={18} /><div><b>{fmt(mainR?.month, 0)} kWh</b><span>Consumo del mes</span></div></div>
      </div>

      <div className="card">
        <div className="filters">
          <div className="search grow"><Search size={15} /><input placeholder="Buscar por código, nombre, marca, IP…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className="mini-select" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="all">Todas las áreas</option><option value="none">Planta (sin área)</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <Segmented size="sm" value={status} onChange={setStatus} options={[{ value: 'all', label: 'Todos' }, { value: 'online', label: 'En línea' }, { value: 'offline', label: 'Offline' }]} />
          <Segmented size="sm" value={view} onChange={setView} options={[{ value: 'table', label: 'Tabla' }, { value: 'cards', label: 'Tarjetas' }, { value: 'reads', label: 'Lecturas' }]} />
        </div>

        {view === 'reads' && <Readings list={list} areas={areas} />}
        {view === 'table' && (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Código</th><th>Nombre</th><th>Área</th><th>Marca / modelo</th><th>Comunicación</th><th className="r">kW</th><th className="r">Totalizador kWh</th><th className="r">Hoy kWh</th><th className="r">Mes kWh</th><th>Estado</th></tr></thead>
              <tbody>
                {list.map((m) => {
                  const d = driverById(m.driverId), v = liveVars(m, now), a = areas.find((x) => x.id === m.areaId), r = readings(m, now)
                  return (
                    <tr key={m.id} className="click" onClick={() => nav(`/medidores/${m.id}`)}>
                      <td><b>{m.id}</b></td>
                      <td>{m.name}<div className="muted xs">{m.desc}</div></td>
                      <td>{a ? <span className="row"><i className="sw" style={{ background: a.color }} />{a.short}</span> : <span className="muted">Planta</span>}</td>
                      <td><span className="xs muted">{d.brand}</span><br />{d.model}</td>
                      <td><Badge>{m.protocol}</Badge><div className="muted xs mono mt8">{m.ip}{m.protocol === 'Modbus TCP' ? `:${m.port}` : ` · ${m.port} bps`} · ID {m.slaveId}</div></td>
                      <td className="r num">{fmt(v?.P, 1)}</td>
                      <td className="r mono"><b>{fmt(r.cur, 1)}</b></td>
                      <td className="r num">{fmt(r.day, 0)}</td>
                      <td className="r num">{fmt(r.month, 0)}</td>
                      <td><Status status={m.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {view === 'cards' && (
          <div className="mcards">
            {list.map((m) => <MeterCard key={m.id} m={m} now={now} area={areas.find((x) => x.id === m.areaId)} onClick={() => nav(`/medidores/${m.id}`)} />)}
          </div>
        )}
      </div>
      <MeterWizard open={wiz} onClose={() => setWiz(false)} />
    </div>
  )
}
