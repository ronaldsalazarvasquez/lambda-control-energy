import { useEffect, useMemo, useState } from 'react'
import { icons, X, Search, Check, CheckCircle2, AlertTriangle, Info, Pencil } from 'lucide-react'
import { useStore } from '../store'

export function Icon({ name, size = 18, ...rest }) {
  const I = icons[name] || icons.Circle
  return <I size={size} strokeWidth={1.8} {...rest} />
}

export function Card({ title, actions, children, className = '', pad = true, subtitle }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-h">
          <div>
            <h3>{title}</h3>
            {subtitle && <p className="muted sm">{subtitle}</p>}
          </div>
          <div className="row gap8">{actions}</div>
        </header>
      )}
      <div className={pad ? 'card-b' : ''}>{children}</div>
    </section>
  )
}

export function Modal({ open, onClose, title, children, footer, width = 640 }) {
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ width }}>
        <header className="modal-h">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </header>
        <div className="modal-b">{children}</div>
        {footer && <footer className="modal-f">{footer}</footer>}
      </div>
    </div>
  )
}

export function Segmented({ value, onChange, options, size }) {
  return (
    <div className={`seg ${size === 'sm' ? 'seg-sm' : ''}`}>
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        return (
          <button key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>
        )
      })}
    </div>
  )
}

export function Field({ label, children, hint, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <small className="muted">{hint}</small>}
    </label>
  )
}

export function Badge({ tone = 'gray', children, dot }) {
  return <span className={`badge b-${tone}`}>{dot && <i className="dot" />}{children}</span>
}

export function Status({ status }) {
  return status === 'online' ? <span className="status">Online</span> : <span className="status off">Sin comunicación</span>
}
export const StatusDot = Status

export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast t-${t.type}`}>
          {t.type === 'error' ? <AlertTriangle size={16} /> : t.type === 'info' ? <Info size={16} /> : <CheckCircle2 size={16} />}
          {t.msg}
        </div>
      ))}
    </div>
  )
}

export function Empty({ icon = 'Inbox', title, children }) {
  return (
    <div className="empty">
      <Icon name={icon} size={34} />
      <h4>{title}</h4>
      {children}
    </div>
  )
}

// Selector de medidores agrupado por área
export function MeterPicker({ value = [], onChange, multi = true }) {
  const meters = useStore((s) => s.meters)
  const areas = useStore((s) => s.areas)
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const f = (m) => (m.id + ' ' + m.name).toLowerCase().includes(q.toLowerCase())
    const g = [{ id: '_main', name: 'Planta', color: '#111827', items: meters.filter((m) => !m.areaId && f(m)) }]
    areas.forEach((a) => g.push({ id: a.id, name: a.name, color: a.color, items: meters.filter((m) => m.areaId === a.id && f(m)) }))
    return g.filter((x) => x.items.length)
  }, [meters, areas, q])
  const toggle = (id) => {
    if (!multi) return onChange([id])
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  }
  const toggleGroup = (items) => {
    const ids = items.map((m) => m.id)
    const all = ids.every((id) => value.includes(id))
    onChange(all ? value.filter((v) => !ids.includes(v)) : [...new Set([...value, ...ids])])
  }
  return (
    <div className="picker">
      <div className="search"><Search size={15} /><input placeholder="Buscar medidor…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="picker-list">
        {groups.map((g) => (
          <div key={g.id} className="picker-g">
            <div className="picker-gh">
              <span><i className="sw" style={{ background: g.color }} />{g.name}</span>
              {multi && <button className="link sm" onClick={() => toggleGroup(g.items)}>Seleccionar área</button>}
            </div>
            {g.items.map((m) => (
              <button key={m.id} className={`picker-i ${value.includes(m.id) ? 'on' : ''}`} onClick={() => toggle(m.id)}>
                <span className="chk">{value.includes(m.id) && <Check size={12} />}</span>
                <b>{m.id}</b> {m.name}
                {m.status === 'offline' && <span className="status off">offline</span>}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Spark({ data, color = '#60a5fa', h = 34 }) {
  if (!data?.length) return null
  const max = Math.max(...data), min = Math.min(...data)
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${h - ((v - min) / (max - min || 1)) * (h - 4) - 2}`).join(' ')
  return (
    <svg viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" className="spark" style={{ height: h }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// Ícono de medidor de energía (tablero con display y bornes)
export function MeterIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="2.5" width="17" height="19" rx="2.5" />
      <rect x="6.5" y="5.5" width="11" height="5" rx="1" />
      <path d="M8.5 8h1.5M11.5 8h1M14 8h1.5" />
      <circle cx="12" cy="15" r="2.3" />
      <path d="M12 15l1.2-1.1" />
      <path d="M7 19.5v-1M17 19.5v-1" />
    </svg>
  )
}

// Nombre editable en línea: clic en el lápiz (o doble clic) → Enter guarda, Esc cancela
export function InlineEdit({ value, onSave, enabled = true, className = '', as: Tag = 'span', placeholder = 'Sin nombre' }) {
  const [edit, setEdit] = useState(false)
  const [v, setV] = useState(value)
  useEffect(() => { if (!edit) setV(value) }, [value, edit])
  if (!enabled) return <Tag className={className}>{value}</Tag>
  const commit = () => { const t = v.trim(); setEdit(false); if (t && t !== value) onSave(t) }
  if (edit) {
    return (
      <input className={`inline-input ${className}`} autoFocus value={v} placeholder={placeholder}
        onChange={(e) => setV(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setV(value); setEdit(false) } }}
        onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} />
    )
  }
  return (
    <Tag className={`inline-edit ${className}`} onDoubleClick={(e) => { e.stopPropagation(); setEdit(true) }} title="Doble clic para renombrar">
      {value}
      <button type="button" className="ie-btn" title="Renombrar" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); e.preventDefault(); setEdit(true) }}><Pencil size={12} /></button>
    </Tag>
  )
}
