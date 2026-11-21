import { useAuth } from '../lib/useAuth'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, Handle, Position, addEdge, useNodesState, useEdgesState, useReactFlow } from '@xyflow/react'
import { Rocket, Search, Trash2, Bug, X, ChevronDown, ChevronRight, Cpu, UserPlus, Copy, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useStore, useNow } from '../store'
import { Icon, Field, Segmented, Badge, MeterIcon } from '../components/ui'
import { DRIVERS, driverById, VARIABLES, DEFAULT_REGISTER_MAP, BRAND_COLORS } from '../data/catalog'
import { RegisterMap, useConnTest, ConnResult } from '../components/MeterWizard'
import { liveVars, meterById, fmt } from '../lib/sim'

// Color sutil por categoría: solo en el ícono y puertos (puntos clave)
const CAT = {
  'Comunicación': '#6366f1',
  'Dispositivos': '#0d9488',
  'Procesamiento': '#d97706',
  'Salidas': '#2563eb',
}
export const NODE_KINDS = {
  'modbus-tcp': { label: 'Modbus TCP', cat: 'Comunicación', icon: 'Network', in: false, out: true },
  'modbus-rtu': { label: 'Modbus RTU', cat: 'Comunicación', icon: 'Cable', in: false, out: true },
  'mqtt-in': { label: 'MQTT entrada', cat: 'Comunicación', icon: 'RadioTower', in: false, out: true },
  opcua: { label: 'OPC UA', cat: 'Comunicación', icon: 'Server', in: false, out: true },
  device: { label: 'Medidor', cat: 'Dispositivos', icon: 'meter', in: true, out: true },
  scale: { label: 'Escalar', cat: 'Procesamiento', icon: 'Scaling', in: true, out: true },
  filter: { label: 'Banda muerta', cat: 'Procesamiento', icon: 'Filter', in: true, out: true },
  function: { label: 'Función', cat: 'Procesamiento', icon: 'Code', in: true, out: true },
  sum: { label: 'Medidor virtual', cat: 'Procesamiento', icon: 'Sigma', in: true, out: true },
  kwht: { label: 'kWh por tonelada', cat: 'Procesamiento', icon: 'Wheat', in: true, out: true },
  database: { label: 'Histórico', cat: 'Salidas', icon: 'Database', in: true, out: false },
  dashboard: { label: 'Dashboards', cat: 'Salidas', icon: 'LayoutDashboard', in: true, out: false },
  alarm: { label: 'Alertas', cat: 'Salidas', icon: 'BellRing', in: true, out: false, color: '#dc2626' },
  'mqtt-out': { label: 'MQTT salida', cat: 'Salidas', icon: 'Send', in: true, out: false },
  debug: { label: 'Debug', cat: 'Salidas', icon: 'Bug', in: true, out: false },
}
Object.values(NODE_KINDS).forEach((k) => { k.color = k.color || CAT[k.cat] })

const KindIcon = ({ kind, size }) => (NODE_KINDS[kind]?.icon === 'meter' ? <MeterIcon size={size} /> : <Icon name={NODE_KINDS[kind]?.icon} size={size} />)

function FlowNode({ data, selected }) {
  const now = useNow()
  const k = NODE_KINDS[data.kind] || NODE_KINDS.function
  const drv = data.kind === 'device' ? driverById(data.config?.driverId) : null
  const m = data.meterId ? meterById(data.meterId) : null
  const v = m ? liveVars(m, now) : null
  let st = { t: data._deployed ? 'activo' : 'sin desplegar', c: '' }
  if (data.kind === 'device') st = !m ? { t: 'sin vincular', c: '' } : v ? { t: `${fmt(v.P, 1)} kW`, c: 'ok' } : { t: 'sin respuesta', c: 'err' }
  return (
    <div className={`fn ${selected ? 'sel' : ''} ${drv ? 'dev' : ''}`} style={{ '--c': drv ? BRAND_COLORS[drv.brand] : k.color }}>
      {k.in && <Handle type="target" position={Position.Left} />}
      <span className="fn-ic"><KindIcon kind={data.kind} size={20} /></span>
      <span className="fn-l">{data.label}</span>
      {drv && <span className="fn-m">{drv.brand === 'Genérico' ? 'Modbus genérico' : `${drv.brand} · ${drv.model}`}</span>}
      <span className={`fn-st ${st.c}`}>{st.t}</span>
      {k.out && <Handle type="source" position={Position.Right} />}
    </div>
  )
}
const nodeTypes = { flow: FlowNode }

function Palette({ onAdd }) {
  const { feature } = useAuth()
  const locked = (it) => ['mqtt-in', 'mqtt-out', 'opcua'].includes(it.kind) && !feature('mqtt')
  const [q, setQ] = useState('')
  const [closed, setClosed] = useState({})
  const cats = Object.keys(CAT)
  const items = [
    ...Object.entries(NODE_KINDS).filter(([k]) => k !== 'device').map(([kind, n]) => ({ kind, label: n.label, cat: n.cat })),
    ...DRIVERS.map((d) => ({ kind: 'device', driverId: d.id, label: `${d.brand === 'Genérico' ? '' : d.brand.split(' ')[0] + ' '}${d.model}`, cat: 'Dispositivos' })),
  ].filter((i) => i.label.toLowerCase().includes(q.toLowerCase()))
  const onDrag = (e, it) => { e.dataTransfer.setData('application/lce', JSON.stringify(it)); e.dataTransfer.effectAllowed = 'move' }
  return (
    <aside className="fl-pal">
      <div className="search"><Search size={14} /><input placeholder="Filtrar nodos" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {cats.map((c) => (
        <div key={c}>
          <button className="pal-cat" onClick={() => setClosed({ ...closed, [c]: !closed[c] })}>{closed[c] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}<i style={{ background: CAT[c] }} />{c}</button>
          {!closed[c] && items.filter((i) => i.cat === c).map((it) => (
            <div key={it.label} className={`pal-i ${locked(it) ? 'locked' : ''}`} draggable={!locked(it)} onDragStart={(e) => onDrag(e, it)} onDoubleClick={() => !locked(it) && onAdd(it)} style={{ '--c': it.driverId ? BRAND_COLORS[driverById(it.driverId).brand] : NODE_KINDS[it.kind].color }} title={locked(it) ? 'Disponible desde el plan Pro' : 'Arrastra al lienzo o doble clic'}>
              <span className="fn-ic"><KindIcon kind={it.kind} size={14} /></span><span>{it.label}</span>
            </div>
          ))}
        </div>
      ))}
    </aside>
  )
}

function NodeConfig({ node, onChange, onDelete, onDuplicate }) {
  const { meters, areas, addMeter, toast } = useStore()
  const { plan } = useAuth()
  const full = meters.length >= plan.meters
  const [test, runTest, resetTest] = useConnTest()
  useEffect(() => resetTest(), [node?.id]) // eslint-disable-line
  if (!node) return (
    <div className="fl-empty"><MeterIcon size={30} /><p>Selecciona un nodo para configurarlo.</p><p className="muted xs">Arrastra nodos desde la paleta y únelos desde el punto derecho (salida) al izquierdo (entrada).</p></div>
  )
  const d = node.data, c = d.config || {}
  const set = (patch) => onChange({ ...d, ...patch })
  const setC = (patch) => set({ config: { ...c, ...patch } })
  const k = NODE_KINDS[d.kind]
  const drv = d.kind === 'device' ? driverById(c.driverId) : null
  const linked = d.meterId ? meters.find((m) => m.id === d.meterId) : null
  return (
    <div className="fl-cfg">
      <div className="row between mb12"><b className="row gap8"><span className="fn-ic" style={{ color: drv ? BRAND_COLORS[drv.brand] : k.color }}><KindIcon kind={d.kind} size={15} /></span>{k.label}</b>
        <div className="row gap4"><button className="icon-btn sm" title="Duplicar" onClick={onDuplicate}><Copy size={14} /></button><button className="icon-btn sm danger" title="Eliminar" onClick={onDelete}><Trash2 size={14} /></button></div></div>
      <Field label="Nombre"><input value={d.label} onChange={(e) => set({ label: e.target.value })} /></Field>

      {d.kind === 'device' && (<>
        <Field label="Driver (marca / modelo)" className="mt12">
          <select value={c.driverId} onChange={(e) => setC({ driverId: e.target.value, protocol: driverById(e.target.value).protocols[0] })}>
            {[...new Set(DRIVERS.map((x) => x.brand))].map((b) => <optgroup key={b} label={b}>{DRIVERS.filter((x) => x.brand === b).map((x) => <option key={x.id} value={x.id}>{x.model}</option>)}</optgroup>)}
          </select>
        </Field>
        <Field label="Protocolo" className="mt12"><Segmented size="sm" value={c.protocol || drv.protocols[0]} onChange={(v) => setC({ protocol: v })} options={drv.protocols} /></Field>
        <div className="form-grid mt12">
          {(c.protocol || drv.protocols[0]) === 'Modbus TCP'
            ? <><Field label="IP"><input value={c.ip ?? linked?.ip ?? '192.168.10.'} onChange={(e) => setC({ ip: e.target.value })} /></Field><Field label="Puerto"><input type="number" value={c.port ?? 502} onChange={(e) => setC({ port: +e.target.value })} /></Field></>
            : <Field label="Baudios"><select value={c.baud ?? 9600} onChange={(e) => setC({ baud: +e.target.value })}>{[9600, 19200, 38400].map((b) => <option key={b}>{b}</option>)}</select></Field>}
          <Field label="Unit ID"><input type="number" value={c.slaveId ?? linked?.slaveId ?? 1} onChange={(e) => setC({ slaveId: +e.target.value })} /></Field>
          <Field label="Lectura cada"><select value={c.poll ?? 5} onChange={(e) => setC({ poll: +e.target.value })}>{[1, 2, 5, 10, 30].map((x) => <option key={x} value={x}>{x} s</option>)}</select></Field>
        </div>
        {drv.generic ? (<><h5 className="mt12 mb8">Mapa de registros</h5><RegisterMap value={c.registerMap || DEFAULT_REGISTER_MAP} onChange={(registerMap) => setC({ registerMap })} /></>) : (
          <><h5 className="mt12 mb8">Variables del driver ({drv.vars.length})</h5><div className="chips">{drv.vars.map((v) => <span key={v} className="chip on">{VARIABLES[v].label}</span>)}</div></>
        )}
        <div className="row gap8 mt12 wrap"><button className="btn ghost sm" onClick={() => runTest({ ...c, ip: c.ip || linked?.ip })}>Probar conexión</button><ConnResult state={test} /></div>
        <h5 className="mt16 mb8">Medidor vinculado</h5>
        {linked ? <div className="row gap8"><Badge tone={linked.status === 'online' ? 'green' : 'red'}>{linked.id} · {linked.name}</Badge><button className="link sm" onClick={() => set({ meterId: null })}>Desvincular</button></div> : (<>
          <select className="mini-select" value="" onChange={(e) => set({ meterId: e.target.value })}><option value="">Vincular a medidor existente…</option>{meters.map((m) => <option key={m.id} value={m.id}>{m.id} · {m.name}</option>)}</select>
          <select className="mini-select mt8" value={c.areaId || ''} onChange={(e) => setC({ areaId: e.target.value })}><option value="">Área para nuevo medidor…</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          {full && <button className="limit-note mt8" onClick={() => useStore.getState().openUpgrade(`Tu plan ${plan.name} permite hasta ${plan.meters} medidores.`)}>Plan {plan.name}: límite de {plan.meters} medidores · Mejorar plan</button>}
          <button className="btn primary sm mt8" disabled={full} onClick={() => { const proto = c.protocol || drv.protocols[0]; const id = addMeter({ name: d.label, desc: `Creado desde flujo · ${drv.model}`, driverId: c.driverId, protocol: proto, ip: proto === 'Modbus TCP' ? c.ip || '192.168.10.50' : 'RS485 / COM1', port: proto === 'Modbus TCP' ? c.port || 502 : c.baud || 9600, slaveId: c.slaveId || 1, areaId: c.areaId || null, nominalKw: 25, registerMap: c.registerMap }); set({ meterId: id, label: `${id} ${d.label}` }); toast(`Medidor ${id} registrado`) }}><UserPlus size={14} /> Registrar como nuevo medidor</button>
        </>)}
      </>)}

      {d.kind === 'modbus-tcp' && <div className="form-grid mt12"><Field label="Red / IP"><input value={c.ip || ''} onChange={(e) => setC({ ip: e.target.value })} /></Field><Field label="Puerto"><input type="number" value={c.port || 502} onChange={(e) => setC({ port: +e.target.value })} /></Field><Field label="Timeout (ms)"><input type="number" value={c.timeout || 3000} onChange={(e) => setC({ timeout: +e.target.value })} /></Field><Field label="Reintentos"><input type="number" value={c.retries || 3} onChange={(e) => setC({ retries: +e.target.value })} /></Field></div>}
      {d.kind === 'modbus-rtu' && <div className="form-grid mt12"><Field label="Puerto"><select value={c.port || 'COM1'} onChange={(e) => setC({ port: e.target.value })}>{['COM1', 'COM2', '/dev/ttyUSB0'].map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="Baudios"><select value={c.baud || 9600} onChange={(e) => setC({ baud: +e.target.value })}>{[9600, 19200, 38400].map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="Paridad"><select value={c.parity || 'N'} onChange={(e) => setC({ parity: e.target.value })}><option value="N">Ninguna</option><option value="E">Par</option><option value="O">Impar</option></select></Field></div>}
      {(d.kind === 'mqtt-in' || d.kind === 'mqtt-out') && <div className="form-grid mt12"><Field label="Broker"><input value={c.broker || 'mqtt://192.168.10.5:1883'} onChange={(e) => setC({ broker: e.target.value })} /></Field><Field label="Tópico"><input value={c.topic || 'planta/energia/#'} onChange={(e) => setC({ topic: e.target.value })} /></Field></div>}
      {d.kind === 'opcua' && <Field label="Endpoint" className="mt12"><input value={c.endpoint || 'opc.tcp://192.168.10.8:4840'} onChange={(e) => setC({ endpoint: e.target.value })} /></Field>}
      {d.kind === 'scale' && <div className="form-grid mt12"><Field label="Multiplicador"><input type="number" step="any" value={c.factor ?? 1} onChange={(e) => setC({ factor: +e.target.value })} /></Field><Field label="Offset"><input type="number" step="any" value={c.offset ?? 0} onChange={(e) => setC({ offset: +e.target.value })} /></Field><Field label="Relación TC" hint="Ej. 400/5 → 80"><input type="number" value={c.ct ?? 1} onChange={(e) => setC({ ct: +e.target.value })} /></Field></div>}
      {d.kind === 'filter' && <Field label="Banda muerta (%)" className="mt12"><input type="number" step="0.1" value={c.deadband ?? 0.5} onChange={(e) => setC({ deadband: +e.target.value })} /></Field>}
      {d.kind === 'function' && <Field label="Código (JavaScript)" className="mt12"><textarea className="code" rows={9} value={c.code ?? '// msg.payload = { P, Q, PF, ... }\nif (msg.payload.PF < 0.9) {\n  msg.alarm = "FP bajo";\n}\nreturn msg;'} onChange={(e) => setC({ code: e.target.value })} /></Field>}
      {d.kind === 'sum' && <Field label="Operación" className="mt12"><select value={c.op || 'sum'} onChange={(e) => setC({ op: e.target.value })}><option value="sum">Suma de entradas</option><option value="diff">Diferencia (padre − hijos)</option><option value="avg">Promedio</option></select></Field>}
      {d.kind === 'kwht' && <Field label="Fuente de producción" className="mt12"><select value={c.source || 'Balanza de flujo'} onChange={(e) => setC({ source: e.target.value })}><option>Balanza de flujo</option><option>Ingreso manual por turno</option><option>Contador de sacos (envasado)</option></select></Field>}
      {d.kind === 'database' && <div className="form-grid mt12"><Field label="Motor"><select value={c.engine || 'TimescaleDB'} onChange={(e) => setC({ engine: e.target.value })}><option>TimescaleDB</option><option>InfluxDB</option><option>PostgreSQL</option></select></Field><Field label="Retención"><input value={c.retention || '5 años'} onChange={(e) => setC({ retention: e.target.value })} /></Field></div>}
    </div>
  )
}

function Editor() {
  const { flow, setFlow, toast } = useStore()
  const [nodes, setNodes, onNodesChange] = useNodesState(flow.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(flow.edges)
  const [sel, setSel] = useState(null)
  const [dirty, setDirty] = useState(!flow.deployed)
  const wide = typeof window === 'undefined' || window.innerWidth > 700
  const [showPal, setShowPal] = useState(wide)
  const [showProps, setShowProps] = useState(wide)
  const [debug, setDebug] = useState(false)
  const [msgs, setMsgs] = useState([])
  const wrap = useRef()
  const rf = useReactFlow()

  const markDirty = () => setDirty(true)
  const onConnect = useCallback((p) => { setEdges((es) => addEdge({ ...p, animated: true }, es)); markDirty() }, [setEdges])
  const addNode = (it, position) => {
    const id = `n-${Math.random().toString(36).slice(2, 8)}`
    const drv = it.driverId ? driverById(it.driverId) : null
    const pos = position || rf.screenToFlowPosition({ x: (wrap.current?.getBoundingClientRect().left || 0) + 300, y: (wrap.current?.getBoundingClientRect().top || 0) + 200 })
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { id, type: 'flow', position: pos, selected: true, data: { kind: it.kind, label: drv ? `Nuevo ${drv.model}` : it.label, config: drv ? { driverId: drv.id, protocol: drv.protocols[0], registerMap: drv.generic ? DEFAULT_REGISTER_MAP : undefined } : {} } }])
    setSel(id); markDirty()
  }
  const onDrop = (e) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/lce'); if (!raw) return
    addNode(JSON.parse(raw), rf.screenToFlowPosition({ x: e.clientX - 56, y: e.clientY - 40 }))
  }
  const selected = nodes.find((n) => n.id === sel)
  const deploy = () => {
    setNodes((ns) => ns.map((n) => ({ ...n, data: { ...n.data, _deployed: true } })))
    setFlow({ nodes: nodes.map((n) => ({ ...n, selected: false, data: { ...n.data, _deployed: true } })), edges, deployed: true })
    setDirty(false); toast('Flujo desplegado correctamente')
  }
  useEffect(() => { setNodes((ns) => ns.map((n) => ({ ...n, data: { ...n.data, _deployed: flow.deployed } }))) }, []) // eslint-disable-line
  useEffect(() => { const t = setTimeout(() => rf.fitView({ padding: 0.08, duration: 250 }), 220); return () => clearTimeout(t) }, [showPal, showProps, debug]) // eslint-disable-line

  // Mensajes de depuración simulados
  useEffect(() => {
    if (!debug) return
    const t = setInterval(() => {
      const devs = nodes.filter((n) => n.data.kind === 'device' && n.data.meterId)
      if (!devs.length) return
      const n = devs[Math.floor(Math.random() * devs.length)]
      const v = liveVars(meterById(n.data.meterId))
      const msg = v ? { topic: n.data.meterId, payload: { P: +v.P.toFixed(2), PF: +v.PF.toFixed(3), V12: +v.V12.toFixed(1), I1: +v.I1.toFixed(1) } } : { topic: n.data.meterId, error: 'Modbus timeout (3000 ms)' }
      setMsgs((m) => [{ id: Math.random(), ts: new Date().toLocaleTimeString('es-PE'), node: n.data.label, msg }, ...m].slice(0, 40))
    }, 1500)
    return () => clearInterval(t)
  }, [debug, nodes])

  return (
    <div className="fl">
      <div className="fl-bar">
        <div className="row gap8">
          <button className={`btn ghost sm ${showPal ? 'on' : ''}`} onClick={() => setShowPal(!showPal)} title="Mostrar / ocultar paleta">{showPal ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />} Nodos</button>
          <span className="tools-sep" />
          <b>Adquisición de energía</b>
          {dirty ? <Badge tone="amber">Cambios sin desplegar</Badge> : <span className="muted xs">Desplegado</span>}
        </div>
        <div className="row gap8">
          <span className="muted xs">{nodes.filter((n) => n.data.kind === 'device').length} dispositivos · {edges.length} conexiones</span>
          <button className={`btn ghost sm ${debug ? 'on' : ''}`} onClick={() => setDebug(!debug)}><Bug size={14} /> Debug</button>
          <button className={`btn ghost sm ${showProps ? 'on' : ''}`} onClick={() => setShowProps(!showProps)} title="Mostrar / ocultar propiedades">{showProps ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />} Propiedades</button>
          <button className="btn deploy" onClick={deploy}><Rocket size={15} /> Desplegar</button>
        </div>
      </div>
      <div className="fl-body">
        {showPal && <Palette onAdd={(it) => addNode(it)} />}
        <div className="fl-center">
          <div className="fl-canvas" ref={wrap} onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}>
            <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
              onNodesChange={(c) => { onNodesChange(c); if (c.some((x) => x.type === 'position' || x.type === 'remove')) markDirty() }}
              onEdgesChange={(c) => { onEdgesChange(c); if (c.some((x) => x.type === 'remove')) markDirty() }}
              onConnect={onConnect} onSelectionChange={({ nodes: s }) => setSel(s[0]?.id || null)}
              onNodeDoubleClick={() => setShowProps(true)}
              fitView fitViewOptions={{ padding: 0.08, maxZoom: 1.1 }} deleteKeyCode={['Backspace', 'Delete']} snapToGrid snapGrid={[10, 10]}
              defaultEdgeOptions={{ type: 'default', style: { stroke: '#a5b0bf', strokeWidth: 1.6 } }} proOptions={{ hideAttribution: true }}>
              <Background gap={18} size={1.3} color="#dfe3e9" />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable nodeColor={(n) => (n.data.kind === 'device' ? BRAND_COLORS[driverById(n.data.config?.driverId).brand] : NODE_KINDS[n.data.kind]?.color) || '#ccc'} nodeBorderRadius={6} style={{ width: 150, height: 100 }} />
            </ReactFlow>
          </div>
          {debug && (
            <div className="fl-debug">
              <div className="row between mb8"><b className="upper">Debug</b><div className="row gap4"><button className="link xs" onClick={() => setMsgs([])}>Limpiar</button><button className="icon-btn sm" onClick={() => setDebug(false)}><X size={13} /></button></div></div>
              {msgs.length === 0 && <p className="muted xs">Esperando mensajes de los medidores…</p>}
              {msgs.map((m) => (
                <div key={m.id} className="dbg"><span className="muted">{m.ts} · {m.node}</span><code className={m.msg.error ? 't-red' : ''}>{JSON.stringify(m.msg.error ? m.msg : m.msg.payload)}</code></div>
              ))}
            </div>
          )}
        </div>
        {showProps && (
          <aside className="fl-side">
            <div className="fl-side-h"><b className="upper">Propiedades</b><button className="icon-btn sm" onClick={() => setShowProps(false)}><X size={13} /></button></div>
            <NodeConfig node={selected}
              onChange={(data) => { setNodes((ns) => ns.map((n) => (n.id === sel ? { ...n, data } : n))); markDirty() }}
              onDelete={() => { setNodes((ns) => ns.filter((n) => n.id !== sel)); setEdges((es) => es.filter((e) => e.source !== sel && e.target !== sel)); setSel(null); markDirty() }}
              onDuplicate={() => { const id = `n-${Math.random().toString(36).slice(2, 8)}`; setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { ...selected, id, selected: true, position: { x: selected.position.x + 30, y: selected.position.y + 120 }, data: { ...selected.data, meterId: null, label: selected.data.label + ' (copia)' } }]); setSel(id); markDirty() }} />
          </aside>
        )}
      </div>
    </div>
  )
}

export default function Integrations() {
  return <ReactFlowProvider><Editor /></ReactFlowProvider>
}
