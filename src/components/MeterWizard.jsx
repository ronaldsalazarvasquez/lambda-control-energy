import { useEffect, useMemo, useState } from 'react'
import { Search, Check, Loader2, CheckCircle2, Plus, Trash2, Cpu } from 'lucide-react'
import { Modal, Field, Segmented, Badge } from './ui'
import { DRIVERS, BRAND_COLORS, DEFAULT_REGISTER_MAP, driverById, VARIABLES } from '../data/catalog'
import { useStore } from '../store'
import { brandTag } from '../data/catalog'

const STEPS = ['Modelo', 'Comunicación', 'Ubicación']

export function RegisterMap({ value, onChange }) {
  const set = (i, patch) => onChange(value.map((r, k) => (k === i ? { ...r, ...patch } : r)))
  return (
    <div className="regmap">
      <table className="tbl tbl-in">
        <thead><tr><th>Variable</th><th>Dirección</th><th>Tipo</th><th>Escala</th><th>Unidad</th><th /></tr></thead>
        <tbody>
          {value.map((r, i) => (
            <tr key={i}>
              <td><select value={r.var} onChange={(e) => set(i, { var: e.target.value, name: VARIABLES[e.target.value].label, unit: VARIABLES[e.target.value].unit })}>{Object.entries(VARIABLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></td>
              <td><input type="number" value={r.address} onChange={(e) => set(i, { address: +e.target.value })} /></td>
              <td><select value={r.type} onChange={(e) => set(i, { type: e.target.value })}>{['int16', 'uint16', 'int32', 'uint32', 'float32', 'int64'].map((t) => <option key={t}>{t}</option>)}</select></td>
              <td><input type="number" step="0.001" value={r.scale} onChange={(e) => set(i, { scale: +e.target.value })} /></td>
              <td className="muted">{r.unit}</td>
              <td><button className="icon-btn sm danger" onClick={() => onChange(value.filter((_, k) => k !== i))}><Trash2 size={13} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn ghost sm mt8" onClick={() => onChange([...value, { name: 'Potencia reactiva', var: 'Q', address: 3067, type: 'float32', scale: 1, unit: 'kvar' }])}><Plus size={14} /> Agregar registro</button>
    </div>
  )
}

export function useConnTest() {
  const [state, setState] = useState(null)
  const run = (meter) => {
    setState({ status: 'testing' })
    setTimeout(() => {
      const ok = !(meter?.ip || '').includes('.99')
      setState(ok ? { status: 'ok', ms: Math.round(18 + Math.random() * 40), regs: driverById(meter.driverId).registers || meter.registerMap?.length || 5 } : { status: 'fail' })
    }, 1300)
  }
  return [state, run, () => setState(null)]
}

export function ConnResult({ state }) {
  if (!state) return null
  if (state.status === 'testing') return <div className="conn conn-wait"><Loader2 size={16} className="spin" /> Probando conexión…</div>
  if (state.status === 'ok') return <div className="conn conn-ok"><CheckCircle2 size={16} /> Conexión exitosa · {state.ms} ms · {state.regs} registros leídos</div>
  return <div className="conn conn-fail">No responde: verifique IP, ID esclavo y cableado RS485.</div>
}

export default function MeterWizard({ open, onClose, initial }) {
  const { areas, meters, addMeter, updateMeter, toast } = useStore()
  const editing = !!initial
  const blank = { driverId: '', protocol: 'Modbus TCP', ip: '192.168.10.', port: 502, slaveId: 1, baud: 9600, parity: 'N', poll: 5, name: '', desc: '', areaId: areas[0]?.id || null, parentId: meters.find((m) => m.isMain)?.id || null, nominalKw: 30, profile: 'process', registerMap: DEFAULT_REGISTER_MAP }
  const [step, setStep] = useState(0)
  const [m, setM] = useState(blank)
  const [q, setQ] = useState('')
  const [brand, setBrand] = useState('Todas')
  const [test, runTest, resetTest] = useConnTest()

  useEffect(() => { if (open) { setStep(editing ? 1 : 0); setM(initial ? { ...blank, ...initial } : blank); resetTest() } }, [open]) // eslint-disable-line

  const brands = ['Todas', ...new Set(DRIVERS.map((d) => d.brand))]
  const list = useMemo(() => DRIVERS.filter((d) => (brand === 'Todas' || d.brand === brand) && (d.brand + d.model).toLowerCase().includes(q.toLowerCase())), [q, brand])
  const driver = m.driverId ? driverById(m.driverId) : null
  const rtu = m.protocol === 'Modbus RTU'

  const finish = () => {
    const data = { ...m, ip: rtu ? `RS485 / ${m.com || 'COM1'}` : m.ip, port: rtu ? m.baud : m.port, name: m.name || driver.model }
    if (editing) { updateMeter(initial.id, data); toast(`${initial.id} actualizado`) }
    else { const id = addMeter(data); toast(`Medidor ${id} agregado y en lectura`) }
    onClose()
  }
  const canNext = step === 0 ? !!m.driverId : step === 1 ? true : !!m.name

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Editar ${initial.id}` : 'Agregar medidor'} width={860}
      footer={<>
        {step > 0 && <button className="btn ghost" onClick={() => setStep(step - 1)}>Atrás</button>}
        <div className="grow" />
        {step < 2 ? <button className="btn primary" disabled={!canNext} onClick={() => setStep(step + 1)}>Siguiente</button>
          : <button className="btn primary" disabled={!canNext} onClick={finish}>{editing ? 'Guardar cambios' : 'Agregar medidor'}</button>}
      </>}>
      <div className="steps">
        {STEPS.map((s, i) => (
          <button key={s} className={`step ${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`} onClick={() => (i < step || (i === 1 && m.driverId) || editing) && setStep(i)}>
            <span>{i < step ? <Check size={13} /> : i + 1}</span>{s}
          </button>
        ))}
      </div>

      {step === 0 && (
        <>
          <div className="row gap8 wrap mb12">
            <div className="search grow"><Search size={15} /><input placeholder="Buscar marca o modelo…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <select className="mini-select" value={brand} onChange={(e) => setBrand(e.target.value)}>{brands.map((b) => <option key={b}>{b}</option>)}</select>
          </div>
          <div className="drv-grid">
            {list.map((d) => (
              <button key={d.id} className={`drv ${m.driverId === d.id ? 'on' : ''}`} onClick={() => setM({ ...m, driverId: d.id, protocol: d.protocols[0], port: d.protocols[0] === 'Modbus TCP' ? 502 : 9600 })}>
                <span className="drv-logo">{brandTag(d.brand)}</span>
                <span className="drv-t"><small>{d.brand}</small><b>{d.model}</b><span className="row gap4 wrap">{d.protocols.map((p) => <Badge key={p}>{p.replace('Modbus ', '')}</Badge>)}</span></span>
                {m.driverId === d.id && <Check size={16} className="drv-chk" />}
              </button>
            ))}
          </div>
          <p className="muted sm mt12">¿Tu equipo no está en la lista? Elige <b>Modbus TCP / RTU genérico</b> y define el mapa de registros.</p>
        </>
      )}

      {step === 1 && driver && (
        <div>
          <div className="drv-sel"><span className="drv-logo">{brandTag(driver.brand)}</span><div><small className="muted">{driver.brand}</small><b> {driver.model}</b><div className="muted xs">{driver.accuracy} · {driver.vars.length} variables · {driver.generic ? 'mapa personalizado' : `${driver.registers} registros predefinidos`}</div></div></div>
          <Field label="Protocolo" className="mt12"><Segmented value={m.protocol} onChange={(v) => setM({ ...m, protocol: v })} options={driver.protocols} /></Field>
          <div className="form-grid mt12">
            {rtu ? (<>
              <Field label="Puerto serie"><select value={m.com || 'COM1'} onChange={(e) => setM({ ...m, com: e.target.value })}>{['COM1', 'COM2', 'COM3', '/dev/ttyUSB0'].map((x) => <option key={x}>{x}</option>)}</select></Field>
              <Field label="Velocidad (baudios)"><select value={m.baud} onChange={(e) => setM({ ...m, baud: +e.target.value })}>{[4800, 9600, 19200, 38400, 115200].map((x) => <option key={x}>{x}</option>)}</select></Field>
              <Field label="Paridad / bits"><select value={m.parity} onChange={(e) => setM({ ...m, parity: e.target.value })}><option value="N">8-N-1</option><option value="E">8-E-1</option><option value="O">8-O-1</option></select></Field>
            </>) : (<>
              <Field label="Dirección IP"><input value={m.ip} onChange={(e) => setM({ ...m, ip: e.target.value })} /></Field>
              <Field label="Puerto TCP"><input type="number" value={m.port} onChange={(e) => setM({ ...m, port: +e.target.value })} /></Field>
            </>)}
            <Field label="ID esclavo (Unit ID)"><input type="number" min="1" max="247" value={m.slaveId} onChange={(e) => setM({ ...m, slaveId: +e.target.value })} /></Field>
            <Field label="Intervalo de lectura"><select value={m.poll} onChange={(e) => setM({ ...m, poll: +e.target.value })}>{[1, 2, 5, 10, 30, 60].map((x) => <option key={x} value={x}>{x} s</option>)}</select></Field>
          </div>
          {driver.generic && (<><h4 className="mt16 mb8">Mapa de registros Modbus</h4><RegisterMap value={m.registerMap || []} onChange={(registerMap) => setM({ ...m, registerMap })} /></>)}
          <div className="row gap8 mt16"><button className="btn ghost" onClick={() => runTest(m)}>Probar conexión</button><ConnResult state={test} /></div>
        </div>
      )}

      {step === 2 && (
        <div className="form-grid">
          <Field label="Nombre del medidor"><input value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} placeholder="Ej. Pulidora PA-03" /></Field>
          <Field label="Descripción / tablero"><input value={m.desc} onChange={(e) => setM({ ...m, desc: e.target.value })} placeholder="Ej. Tablero TD-04" /></Field>
          <Field label="Área"><select value={m.areaId || ''} onChange={(e) => setM({ ...m, areaId: e.target.value || null })}><option value="">— Sin área (planta) —</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
          <Field label="Medidor aguas arriba" hint="Define la jerarquía para balances de energía"><select value={m.parentId || ''} onChange={(e) => setM({ ...m, parentId: e.target.value || null })}><option value="">— Ninguno —</option>{meters.filter((x) => x.id !== initial?.id).map((x) => <option key={x.id} value={x.id}>{x.id} · {x.name}</option>)}</select></Field>
          <Field label="Potencia nominal (kW)"><input type="number" value={m.nominalKw} onChange={(e) => setM({ ...m, nominalKw: +e.target.value })} /></Field>
          <Field label="Régimen de operación"><select value={m.profile} onChange={(e) => setM({ ...m, profile: e.target.value })}><option value="process">Proceso (2 turnos)</option><option value="continuous">Continuo 24 h (secado)</option><option value="compressor">Compresores</option><option value="lighting">Iluminación</option></select></Field>
        </div>
      )}
    </Modal>
  )
}
