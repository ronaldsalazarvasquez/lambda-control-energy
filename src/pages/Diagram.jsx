import { useAuth } from '../lib/useAuth'
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts'
import { VarModal } from '../components/VarChart'
import { driverById } from '../data/catalog'
import { useNavigate } from 'react-router-dom'
import { ReactFlow, ReactFlowProvider, Background, Controls, Handle, Position, addEdge, useNodesState, useEdgesState, useReactFlow, ConnectionMode, ConnectionLineType, BaseEdge, getSmoothStepPath, useInternalNode } from '@xyflow/react'
import { Pencil, Save, X, Trash2, Eye, ChartSpline, ArrowUpRight, WifiOff, Activity } from 'lucide-react'
import { useStore, useNow } from '../store'
import { Field, Badge } from '../components/ui'
import { liveVars, meterById, fmt, seriesWin, readings, stats, startOfDay, HOUR } from '../lib/sim'

const DiagCtx = createContext({ edit: false, inspect: null, onInspect: () => {} })
import { seedDiagram } from '../data/seed'

const K = '#1e293b'
const SYM = {
  grid: { h: 64, label: 'Red / acometida', svg: <g stroke={K} strokeWidth="2" fill="none"><path d="M32 4 L18 44 M32 4 L46 44 M22 20 H42 M20 32 H44 M18 44 H46" /><path d="M32 44 V64" /></g> },
  transformer: { h: 92, label: 'Transformador', svg: <g stroke={K} strokeWidth="2" fill="none"><path d="M32 0 V14 M32 78 V92" /><circle cx="32" cy="32" r="18" /><circle cx="32" cy="58" r="18" /></g> },
  generator: { h: 70, label: 'Grupo electrógeno', svg: <g stroke={K} strokeWidth="2" fill="none"><circle cx="32" cy="30" r="20" /><text x="32" y="36" textAnchor="middle" fontSize="16" fontWeight="700" fill={K} stroke="none">G~</text><path d="M32 50 V70" /></g> },
  breaker: { h: 64, label: 'Interruptor', svg: <g stroke={K} strokeWidth="2" fill="none"><path d="M32 0 V18 M32 46 V64" /><path d="M32 46 L20 22" /><path d="M28 14 l8 8 M36 14 l-8 8" /></g> },
  meter: { h: 64, label: 'Medidor', svg: <g stroke={K} strokeWidth="2" fill="#fff"><path d="M32 0 V12 M32 52 V64" fill="none" /><circle cx="32" cy="32" r="20" /><text x="32" y="36" textAnchor="middle" fontSize="10.5" fontWeight="700" fill={K} stroke="none">kWh</text></g> },
  motor: { h: 56, label: 'Motor', svg: <g stroke={K} strokeWidth="2" fill="#fff"><path d="M32 0 V12" /><circle cx="32" cy="32" r="20" /><text x="32" y="31" textAnchor="middle" fontSize="14" fontWeight="700" fill={K} stroke="none">M</text><text x="32" y="44" textAnchor="middle" fontSize="10" fill={K} stroke="none">3~</text></g> },
  load: { h: 48, label: 'Carga', svg: <g stroke={K} strokeWidth="2" fill={K}><path d="M32 0 V24" fill="none" /><path d="M20 24 H44 L32 44Z" /></g> },
  capacitor: { h: 60, label: 'Banco de condensadores', svg: <g stroke={K} strokeWidth="2" fill="none"><path d="M32 0 V24 M32 32 V48" /><path d="M16 24 H48 M16 32 H48" strokeWidth="3" /><path d="M24 48 H40 M27 53 H37 M30 58 H34" /></g> },
}

// Puntos de conexión en los 4 lados (modo flexible: cualquier punto se une con cualquiera)
function Ports() {
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="source" id="top" position={Position.Top} />
      <Handle type="target" id="bottom" position={Position.Bottom} />
      <Handle type="source" id="left" position={Position.Left} style={{ top: 32 }} />
      <Handle type="source" id="right" position={Position.Right} style={{ top: 32 }} />
    </>
  )
}

// Estado del medidor: normal, alerta (carga alta / FP bajo) o falla (sin comunicación)
export function meterState(m, v) {
  if (!m || !v) return 'fault'
  const pct = v.P / (m.isMain ? 630 : m.nominalKw || 1)
  return pct > 0.9 || v.PF < 0.9 ? 'warn' : 'ok'
}
const MCOL = {
  ok: { s: '#10b981', f: '#ecfdf5', t: '#047857' },
  warn: { s: '#f59e0b', f: '#fffbeb', t: '#b45309' },
  fault: { s: '#ef4444', f: '#fef2f2', t: '#b91c1c' },
}

function El({ data, selected }) {
  const now = useNow()
  const ctx = useContext(DiagCtx)
  if (data.kind === 'bus') {
    const w = data.width || 600
    const taps = data.taps || 6
    const tops = Math.max(2, Math.floor((w - 20) / 65))
    return (
      <div className={`el-bus ${selected ? 'sel' : ''}`} style={{ width: w }}>
        <Handle type="target" id="in" position={Position.Top} style={{ left: data.inX ?? 552 }} />
        <Handle type="target" id="in2" position={Position.Top} style={{ left: data.in2X ?? 852 }} />
        {Array.from({ length: tops }, (_, k) => <Handle key={`u${k}`} type="source" id={`u${k}`} position={Position.Top} style={{ left: 30 + k * 65 }} />)}
        {Array.from({ length: taps }, (_, k) => <Handle key={k} type="source" id={`t${k}`} position={Position.Bottom} style={{ left: 62 + k * 130 }} />)}
        {Array.from({ length: taps }, (_, k) => 127 + k * 130 < w && <Handle key={`x${k}`} type="source" id={`x${k}`} position={Position.Bottom} style={{ left: 127 + k * 130 }} />)}
        <span className="el-bus-l">{data.label}</span>
      </div>
    )
  }
  const s = SYM[data.kind] || SYM.load
  const m = data.meterId ? meterById(data.meterId) : null
  const v = m ? liveVars(m, now) : null
  const st = data.kind === 'meter' && m ? meterState(m, v) : null
  const c = st ? MCOL[st] : null
  return (
    <div className={`el ${selected ? 'sel' : ''} ${st ? `m-${st}` : ''} ${m && !ctx.edit ? 'clickable nopan nodrag' : ''} ${ctx.inspect === m?.id ? 'inspecting' : ''}`} style={{ height: s.h }}
      onPointerDown={(e) => { if (m && !ctx.edit) { e.currentTarget.dataset.px = e.clientX; e.currentTarget.dataset.py = e.clientY } }}
      onPointerUp={(e) => {
        if (!m || ctx.edit) return
        const dx = Math.abs(e.clientX - (+e.currentTarget.dataset.px || e.clientX)), dy = Math.abs(e.clientY - (+e.currentTarget.dataset.py || e.clientY))
        if (dx < 10 && dy < 10) { e.stopPropagation(); ctx.onInspect(m.id) }
      }}
      title={m && !ctx.edit ? 'Ver detalle del medidor' : undefined}>
      <Ports />
      {c ? (
        <svg width="64" height={s.h} viewBox={`0 0 64 ${s.h}`}>
          <path d="M32 0 V12 M32 52 V64" stroke={K} strokeWidth="2" />
          {st === 'fault' && <circle cx="32" cy="32" r="25" fill="none" stroke={c.s} strokeWidth="2" className="m-pulse" />}
          <circle cx="32" cy="32" r="20" fill={c.f} stroke={c.s} strokeWidth="2.6" />
          <text x="32" y="36" textAnchor="middle" fontSize="10.5" fontWeight="700" fill={c.t}>kWh</text>
        </svg>
      ) : <svg width="64" height={s.h} viewBox={`0 0 64 ${s.h}`}>{s.svg}</svg>}
      <div className={`el-l ${['motor', 'load'].includes(data.kind) ? 'below' : ''}`}>
        <b>{data.label}</b>
        {data.sub && <small>{data.sub}</small>}
        {m && (v
          ? <span className="el-kw" style={{ color: st === 'ok' ? 'var(--ink)' : c?.t }}>{fmt(v.P, 1)} <i>kW</i></span>
          : <span className="el-off">Sin datos</span>)}
      </div>
    </div>
  )
}
const nodeTypes = { el: El }

// ---------- Líneas del unifilar ----------
export const LINE_TYPES = {
  power: { label: 'Potencia', desc: 'Circuito energizado en operación normal', style: { stroke: K, strokeWidth: 2.5 } },
  backup: { label: 'Respaldo / emergencia', desc: 'Normalmente abierto (grupo, ATS)', style: { stroke: K, strokeWidth: 2.2, strokeDasharray: '8 5' } },
  planned: { label: 'Proyectada', desc: 'Circuito futuro, aún no instalado', style: { stroke: '#9aa2ad', strokeWidth: 2.2, strokeDasharray: '4 4' } },
  comms: { label: 'Comunicación', desc: 'Señal Modbus / datos, no es potencia', style: { stroke: '#2563eb', strokeWidth: 1.5, strokeDasharray: '2 4' } },
}
export const lineKind = (e) => e.data?.kind || (e.style?.strokeDasharray ? 'backup' : 'power')

// Conexión a barra siempre vertical, en la posición del equipo
function SldEdge({ id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected, style }) {
  const sN = useInternalNode(source), tN = useInternalNode(target)
  const isBus = (n) => n?.data?.kind === 'bus'
  const busPoint = (bus, x, y) => {
    const bx = bus.internals.positionAbsolute.x, by = bus.internals.positionAbsolute.y
    const bw = bus.measured?.width || bus.data.width || 600, bh = bus.measured?.height || 8
    return [Math.min(Math.max(x, bx + 3), bx + bw - 3), y < by + bh / 2 ? by : by + bh]
  }
  const ortho = (x1, y1, x2, y2) => (Math.abs(x1 - x2) < 1 ? `M${x1},${y1} L${x2},${y2}` : `M${x1},${y1} L${x1},${(y1 + y2) / 2} L${x2},${(y1 + y2) / 2} L${x2},${y2}`)
  let path
  if (isBus(sN) && !isBus(tN)) { const [x, y] = busPoint(sN, targetX, targetY); path = ortho(x, y, targetX, targetY) }
  else if (isBus(tN) && !isBus(sN)) { const [x, y] = busPoint(tN, sourceX, sourceY); path = ortho(sourceX, sourceY, x, y) }
  else [path] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 0 })
  const st = { ...LINE_TYPES[data?.kind || 'power'].style, ...(selected ? { stroke: '#2563eb', filter: 'drop-shadow(0 0 3px rgba(37,99,235,.5))' } : {}) }
  return <BaseEdge id={id} path={path} style={st} interactionWidth={16} />
}
const edgeTypes = { sld: SldEdge }

function LineSample({ kind, w = 34 }) {
  return <svg width={w} height="10" aria-hidden><line x1="1" y1="5" x2={w - 1} y2="5" {...Object.fromEntries(Object.entries(LINE_TYPES[kind].style).map(([k, v]) => [k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), v]))} /></svg>
}



// Panel flotante con la información clave del medidor (para gestión energética)
function MeterInspector({ id, onClose }) {
  const now = useNow()
  const nav = useNavigate()
  const { areas, plant, alerts, toast } = useStore()
  const [curve, setCurve] = useState(null)
  const m = meterById(id)
  const data = useMemo(() => {
    if (!m) return null
    const { rows } = seriesWin([m], now - 24 * HOUR, now, 'power')
    const pts = rows.map((r) => ({ t: r.t, kw: r[m.id] }))
    const peak = pts.reduce((a, r) => (r.kw > a.kw ? r : a), { kw: 0, t: 0 })
    const avg = pts.reduce((a, r) => a + r.kw, 0) / (pts.length || 1)
    const night = pts.filter((r) => { const h = new Date(r.t).getHours(); return h >= 0 && h < 5 })
    const nightAvg = night.reduce((a, r) => a + r.kw, 0) / (night.length || 1)
    const today = stats(m, startOfDay(now), now)
    return { pts, peak, avg, nightAvg, today, r: readings(m, now) }
  }, [id, Math.floor(now / 60000)]) // eslint-disable-line
  if (!m || !data) return null
  const v = liveVars(m, now)
  const st = meterState(m, v)
  const c = MCOL[st]
  const d = driverById(m.driverId)
  const area = areas.find((a) => a.id === m.areaId)
  const nominal = m.isMain ? plant.contractedKw : m.nominalKw
  const load = v ? v.P / (nominal || 1) : 0
  const open = alerts.filter((a) => !a.ack && a.meterId === m.id)
  const tips = []
  if (v) {
    if (v.PF < 0.9) tips.push({ k: 'warn', t: `Factor de potencia ${fmt(v.PF, 2)}: bajo 0,90 puede generar cargos por energía reactiva. Evaluar compensación (banco de condensadores).` })
    if (load > 0.85) tips.push({ k: 'warn', t: `Carga al ${fmt(load * 100, 0)} % de su capacidad nominal (${fmt(nominal, 0)} kW). Vigilar sobrecarga y demanda máxima.` })
    if (v.THDI > 15) tips.push({ k: 'warn', t: `Distorsión armónica de corriente ${fmt(v.THDI, 1)} %: típica de variadores; considerar filtros si persiste.` })
    if (data.nightAvg > data.avg * 0.45 && m.profile === 'process') tips.push({ k: 'info', t: `Consumo nocturno de ${fmt(data.nightAvg, 1)} kW (${fmt((data.nightAvg / data.avg) * 100, 0)} % del promedio): revisar equipos encendidos fuera de turno.` })
    if (!tips.length) tips.push({ k: 'ok', t: 'Operación dentro de parámetros normales.' })
  }
  const lastSeen = now - (17 + (m.id.charCodeAt(m.id.length - 1) % 40)) * 60000
  return (
    <div className="insp">
      <div className="insp-h">
        <span className="insp-dot" style={{ background: c.s }} />
        <div className="grow"><b>{m.id} · {m.name}</b><small>{area?.name || 'Planta'} · {d.brand} {d.model}</small></div>
        <button className="icon-btn sm" onClick={onClose}><X size={15} /></button>
      </div>
      {!v ? (
        <div className="insp-b">
          <div className="insp-fault"><WifiOff size={18} /><div><b>Sin comunicación</b><small>Última lectura hace {Math.round((now - lastSeen) / 60000)} min</small></div></div>
          <dl className="insp-dl">
            <dt>Protocolo</dt><dd>{m.protocol}</dd>
            <dt>Dirección</dt><dd className="mono">{m.ip}{m.protocol === 'Modbus TCP' ? `:${m.port}` : ''} · ID {m.slaveId}</dd>
            <dt>Totalizador</dt><dd className="mono">{fmt(data.r.cur, 1)} kWh</dd>
          </dl>
          <p className="insp-note">Revisar: alimentación del medidor, cableado RS485 o red, y que la dirección/ID coincidan con la configuración.</p>
          <div className="insp-act"><button className="btn sm" onClick={() => toast('Probando conexión… sin respuesta del equipo', 'error')}><Activity size={13} /> Probar conexión</button><button className="btn sm primary" onClick={() => nav(`/medidores/${m.id}`)}>Ir al medidor <ArrowUpRight size={13} /></button></div>
        </div>
      ) : (
        <div className="insp-b">
          <div className="insp-kw">
            <div><small>Potencia actual</small><b>{fmt(v.P, 1)} <i>kW</i></b></div>
            <div className="insp-load"><small>{fmt(load * 100, 0)} % de {fmt(nominal, 0)} kW</small><span><i style={{ width: `${Math.min(100, load * 100)}%`, background: c.s }} /></span></div>
          </div>
          <div className="insp-grid">
            <button onClick={() => setCurve('PF')}><small>FP</small><b className={v.PF < 0.9 ? 't-amber' : ''}>{fmt(v.PF, 2)}</b></button>
            <button onClick={() => setCurve('V12')}><small>Tensión</small><b>{fmt((v.V12 + v.V23 + v.V31) / 3, 0)} V</b></button>
            <button onClick={() => setCurve('I1')}><small>Corriente</small><b>{fmt((v.I1 + v.I2 + v.I3) / 3, 0)} A</b></button>
          </div>
          <div className="insp-chart">
            <div className="row between"><small className="muted">Potencia · últimas 24 h</small><small className="muted">pico {fmt(data.peak.kw, 0)} kW · {new Date(data.peak.t).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</small></div>
            <div style={{ height: 96 }}>
              <ResponsiveContainer>
                <AreaChart data={data.pts} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="insg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563eb" stopOpacity={0.28} /><stop offset="1" stopColor="#2563eb" stopOpacity={0.02} /></linearGradient></defs>
                  <XAxis dataKey="t" hide /><YAxis hide domain={[0, 'dataMax']} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} labelFormatter={(t) => new Date(t).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} formatter={(x) => [`${fmt(x, 1)} kW`, 'Potencia']} />
                  <ReferenceLine y={data.avg} stroke="#9aa2ad" strokeDasharray="3 3" />
                  <Area dataKey="kw" stroke="#2563eb" strokeWidth={1.8} fill="url(#insg)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="insp-e">
            <div><small>Hoy</small><b>{fmt(data.today.energy, 0)} kWh</b><i>S/ {fmt(data.today.cost, 0)}</i></div>
            <div><small>Mes</small><b>{fmt(data.r.month, 0)} kWh</b></div>
            <div><small>Totalizador</small><b className="mono">{fmt(data.r.cur, 0)}</b></div>
          </div>
          <ul className="insp-tips">{tips.map((t, i) => <li key={i} className={`tip-${t.k}`}>{t.t}</li>)}</ul>
          {open.length > 0 && <div className="insp-alert">{open.length} alerta(s) abierta(s) · {open[0].title}</div>}
          <div className="insp-act"><button className="btn sm" onClick={() => setCurve('P')}><ChartSpline size={13} /> Ver curvas</button><button className="btn sm primary" onClick={() => nav(`/medidores/${m.id}`)}>Ir al medidor <ArrowUpRight size={13} /></button></div>
        </div>
      )}
      {curve && <VarModal meter={m} varKey={curve} onClose={() => setCurve(null)} />}
    </div>
  )
}

function Editor() {
  const { diagram, setDiagram, meters, toast } = useStore()
  const { can } = useAuth()
  const [nodes, setNodes, onNodesChange] = useNodesState(diagram.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(diagram.edges)
  const [edit, setEdit] = useState(false)
  const [sel, setSel] = useState(null)
  const [selEdge, setSelEdge] = useState(null)
  const [inspect, setInspect] = useState(null)
  const wrap = useRef()
  const rf = useReactFlow()
  const onConnect = useCallback((p) => {
    if (p.source === p.target) return
    setEdges((es) => addEdge({ ...p, id: `ue-${Math.random().toString(36).slice(2, 8)}`, data: { kind: 'power' } }, es))
  }, [setEdges])
  const selected = nodes.find((n) => n.id === sel)
  const setData = (patch) => setNodes((ns) => ns.map((n) => (n.id === sel ? { ...n, data: { ...n.data, ...patch } } : n)))

  const onDrop = (e) => {
    e.preventDefault()
    const kind = e.dataTransfer.getData('application/el'); if (!kind) return
    const id = `u-${Math.random().toString(36).slice(2, 8)}`
    setNodes((ns) => [...ns, { id, type: 'el', position: rf.screenToFlowPosition({ x: e.clientX - 32, y: e.clientY - 20 }), data: kind === 'bus' ? { kind, label: 'Barra nueva', width: 500, taps: 4, inX: 250, in2X: 400 } : { kind, label: SYM[kind].label } }])
    setSel(id)
  }
  const save = () => { setDiagram({ nodes: nodes.map((n) => ({ ...n, selected: false })), edges }); setEdit(false); toast('Diagrama unifilar guardado') }
  const cancel = () => { setNodes(diagram.nodes); setEdges(diagram.edges); setEdit(false) }
  const styledEdges = edges.map((e) => ({ ...e, type: 'sld', data: { ...(e.data || {}), kind: lineKind(e) }, animated: false }))
  const curEdge = edges.find((e) => e.id === selEdge)
  const setEdgeKind = (kind) => setEdges((es) => es.map((e) => (e.id === selEdge ? { ...e, data: { ...(e.data || {}), kind }, style: undefined } : e)))

  return (
    <div className="fl">
      <div className="fl-bar">
        <div className="row gap8"><b>Diagrama unifilar · Subestación y TGBT</b>{edit && <Badge tone="amber">Editando</Badge>}</div>
        <div className="row gap8">
          {edit ? (<>
            <button className="btn ghost sm" onClick={() => { const d = seedDiagram(meters); setNodes(d.nodes); setEdges(d.edges); toast('Diagrama regenerado desde medidores', 'info') }}>Autogenerar desde medidores</button>
            <button className="btn ghost sm" onClick={cancel}><X size={14} /> Cancelar</button>
            <button className="btn primary sm" onClick={save}><Save size={14} /> Guardar</button>
          </>) : can('config.diagram') && <button className="btn primary sm" onClick={() => { setInspect(null); setEdit(true) }}><Pencil size={14} /> Editar diagrama</button>}
        </div>
      </div>
      <div className="fl-body">
        {edit && (
          <aside className="fl-pal">
            <div className="pal-cat">Símbolos IEC</div>
            {[...Object.entries(SYM), ['bus', { label: 'Barra', h: 10 }]].map(([k, s]) => (
              <div key={k} className="pal-sym" draggable onDragStart={(e) => { e.dataTransfer.setData('application/el', k); e.dataTransfer.effectAllowed = 'move' }}>
                {k === 'bus' ? <span className="mini-bus" /> : <svg width="28" height="28" viewBox={`0 0 64 ${s.h}`}>{s.svg}</svg>}
                <span>{s.label}</span>
              </div>
            ))}
            <p className="muted xs pad">Arrastra símbolos al lienzo y conéctalos de abajo (salida) hacia arriba (entrada). Supr para borrar.</p>
          </aside>
        )}
        <div className={`fl-canvas diagram ${edit ? 'editing' : ''}`} ref={wrap} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
          <DiagCtx.Provider value={{ edit, inspect, onInspect: setInspect }}>
          <ReactFlow nodes={nodes} edges={styledEdges} onPaneClick={() => setInspect(null)} onNodeClick={(_, n) => { if (!edit && n.data?.meterId) setInspect(n.data.meterId) }} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
            nodesDraggable={edit} nodesConnectable={edit} elementsSelectable deleteKeyCode={edit ? ['Backspace', 'Delete'] : null}
            connectionMode={ConnectionMode.Loose} connectionRadius={30} connectionLineType={ConnectionLineType.Step} connectionLineStyle={{ stroke: '#2563eb', strokeWidth: 2, strokeDasharray: '6 4' }}
            isValidConnection={(c) => c.source !== c.target}
            onSelectionChange={({ nodes: s, edges: es }) => { setSel(s[0]?.id || null); setSelEdge(s.length ? null : es[0]?.id || null) }} fitView fitViewOptions={{ padding: 0.08 }} snapToGrid snapGrid={[10, 10]} minZoom={0.2} proOptions={{ hideAttribution: true }}>
            <Background gap={20} size={1} color={edit ? '#d3d8de' : '#f0f2f5'} />
            <Controls showInteractive={false} />
          </ReactFlow>
          </DiagCtx.Provider>
          {inspect && !edit && <MeterInspector id={inspect} onClose={() => setInspect(null)} />}
          {!edit && <div className="diag-legend vertical"><b className="upper">Estado de medidores</b><span className="lg-i"><i className="lg-ok" />Normal</span><span className="lg-i"><i className="lg-warn" />Carga alta o FP bajo</span><span className="lg-i"><i className="lg-fault" />Sin comunicación</span><b className="upper lg-sec">Líneas</b>{Object.keys(LINE_TYPES).map((k) => <span key={k} className="lg-i"><LineSample kind={k} />{LINE_TYPES[k].label}</span>)}<span className="lg-hint">Pulsa un medidor para ver su información</span></div>}
          {edit && <div className="diag-legend">Arrastra entre puntos azules para conectar · pulsa una línea para cambiar su tipo</div>}
        </div>
        {edit && !selected && curEdge && (
          <aside className="fl-side">
            <div className="fl-cfg">
              <div className="row between mb12"><b>Línea</b><button className="icon-btn sm danger" title="Eliminar línea" onClick={() => { setEdges((es) => es.filter((e) => e.id !== selEdge)); setSelEdge(null) }}><Trash2 size={14} /></button></div>
              <p className="muted xs mb12">Elige qué representa esta conexión en el unifilar.</p>
              <div className="line-opts">
                {Object.entries(LINE_TYPES).map(([k, t]) => (
                  <button key={k} className={`line-opt ${lineKind(curEdge) === k ? 'on' : ''}`} onClick={() => setEdgeKind(k)}>
                    <LineSample kind={k} w={46} />
                    <span><b>{t.label}</b><small>{t.desc}</small></span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}
        {edit && selected && (
          <aside className="fl-side">
            <div className="fl-cfg">
              <div className="row between mb12"><b>{selected.data.kind === 'bus' ? 'Barra' : SYM[selected.data.kind]?.label}</b><button className="icon-btn sm danger" onClick={() => { setNodes((ns) => ns.filter((n) => n.id !== sel)); setEdges((es) => es.filter((e) => e.source !== sel && e.target !== sel)); setSel(null) }}><Trash2 size={14} /></button></div>
              <Field label="Etiqueta"><input value={selected.data.label} onChange={(e) => setData({ label: e.target.value })} /></Field>
              <Field label="Detalle" className="mt12"><input value={selected.data.sub || ''} onChange={(e) => setData({ sub: e.target.value })} placeholder="Ej. 630 kVA · 10/0.44 kV" /></Field>
              {selected.data.kind === 'meter' && (
                <Field label="Medidor vinculado" className="mt12">
                  <select value={selected.data.meterId || ''} onChange={(e) => setData({ meterId: e.target.value || null, label: e.target.value || selected.data.label })}>
                    <option value="">— Sin vincular —</option>
                    {meters.map((m) => <option key={m.id} value={m.id}>{m.id} · {m.name}</option>)}
                  </select>
                </Field>
              )}
              {selected.data.kind === 'bus' && (<div className="form-grid mt12">
                <Field label="Ancho (px)"><input type="number" step="10" value={selected.data.width} onChange={(e) => setData({ width: +e.target.value })} /></Field>
                <Field label="Salidas"><input type="number" min="1" max="20" value={selected.data.taps} onChange={(e) => setData({ taps: +e.target.value })} /></Field>
              </div>)}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

export default function Diagram() {
  return <ReactFlowProvider><Editor /></ReactFlowProvider>
}
