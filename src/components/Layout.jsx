import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, LayoutDashboard, Gauge, Boxes, FileBarChart, Bell, Settings, Workflow, Network, CalendarRange, ChevronDown, AlertTriangle, Info, CircleAlert, Building2, Factory, LogOut, Check, Search, Lock } from 'lucide-react'
import { useStore, plantsFor, useNow } from '../store'
import { alertLink } from '../lib/alerts'
import { useAuth } from '../lib/useAuth'
import { ROLES, ROUTE_PERM, PLANS } from '../lib/saas'

const NAV = [
  { to: '/consola', label: 'Consola', icon: Building2, perm: 'console' },
  { to: '/plantas', label: 'Plantas', icon: Factory, perm: 'plants.switch', hideFor: ['superadmin'] },
  { sep: true, perm: 'plants.switch' },
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/balance', label: 'Balance', icon: CalendarRange },
  { to: '/dashboards', label: 'Dashboards', icon: LayoutDashboard },
  { to: '/medidores', label: 'Medidores', icon: Gauge },
  { to: '/areas', label: 'Áreas', icon: Boxes },
  { to: '/reportes', label: 'Reportes', icon: FileBarChart },
  { to: '/alertas', label: 'Alertas', icon: Bell, badge: true },
  { sep: true },
  { to: '/unifilar', label: 'Unifilar', icon: Network, feature: 'unifilar' },
  { to: '/integraciones', label: 'Integración', icon: Workflow },
  { to: '/configuracion', label: 'Ajustes', icon: Settings },
]

const TITLES = {
  '/': 'Sistema de Gestión de Energía', '/balance': 'Balance energético', '/dashboards': 'Dashboards', '/medidores': 'Medidores de energía', '/areas': 'Áreas de planta',
  '/unifilar': 'Diagrama unifilar', '/integraciones': 'Integraciones y comunicación', '/reportes': 'Reportes energéticos', '/alertas': 'Alertas', '/configuracion': 'Configuración',
  '/consola': 'Consola Beez', '/plantas': 'Mis plantas',
}

export function BeezMark({ size = 34 }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      <path d="M20 2.5 35.2 11.25v17.5L20 37.5 4.8 28.75v-17.5Z" fill="#f2b705" />
      <path d="M20 9.5 29.1 14.75v10.5L20 30.5 10.9 25.25v-10.5Z" fill="none" stroke="#111827" strokeWidth="2.2" />
      <path d="M21.6 13.5 16.6 21h4l-1.6 6 5.4-8h-4.2Z" fill="#111827" />
    </svg>
  )
}

export function Sidebar() {
  const unack = useStore((s) => s.alerts.filter((a) => !a.ack).length)
  const { user, can, feature } = useAuth()
  const items = NAV.filter((n) => {
    const perm = n.perm || ROUTE_PERM[n.to]
    if (perm && !can(perm)) return false
    if (n.hideFor?.includes(user?.role)) return false
    return true
  })
  return (
    <aside className="sidebar">
      <div className="logo">
        <BeezMark />
        <b>BEEZ</b>
        <span>INDUSTRIES</span>
      </div>
      <nav>
        {items.map((n, i) => n.sep ? <div key={i} className="nav-sep" /> : (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-i ${isActive ? 'on' : ''}`}>
            <span className="nav-ic"><n.icon size={19} strokeWidth={1.8} />
              {n.badge && unack > 0 && <em className="nav-badge">{unack}</em>}
              {n.feature && !feature(n.feature) && <em className="nav-lock"><Lock size={9} /></em>}
            </span>
            <span className="nav-l">{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

function useOutside(ref, cb) {
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && cb()
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, []) // eslint-disable-line
}

function PlantSwitcher() {
  const nav = useNavigate()
  const { user, can } = useAuth()
  const state = useStore()
  const plant = state.plant
  const plants = plantsFor(state, user)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef()
  useOutside(ref, () => setOpen(false))
  const multi = plants.length > 1
  return (
    <div className="psw" ref={ref}>
      <button className={`psw-btn ${multi ? '' : 'static'}`} onClick={() => multi && setOpen(!open)}>
        <span className="psw-ic"><Factory size={16} /></span>
        <span className="psw-t"><b>{plant.name}</b><small>{plant.company} · Plan {PLANS[plant.plan]?.name}</small></span>
        {multi && <ChevronDown size={15} className="muted" />}
      </button>
      {open && (
        <div className="dropdown psw-dd">
          <div className="search" style={{ margin: 8 }}><Search size={14} /><input autoFocus placeholder="Buscar planta…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="psw-list">
            {plants.filter((t) => (t.plant.name + t.plant.company).toLowerCase().includes(q.toLowerCase())).map((t) => (
              <button key={t.plant.id} className={`psw-i ${t.plant.id === plant.id ? 'on' : ''}`} onClick={() => { state.switchPlant(t.plant.id); setOpen(false); nav('/') }}>
                <span className="grow"><b>{t.plant.name}</b><small>{t.plant.location} · {t.meters.length} medidores</small></span>
                <span className={`plan-tag p-${t.plant.plan}`}>{PLANS[t.plant.plan]?.name}</span>
                {t.plant.id === plant.id && <Check size={14} />}
              </button>
            ))}
          </div>
          {can('console') && <button className="psw-foot" onClick={() => { setOpen(false); nav('/consola') }}>Administrar plantas en la consola →</button>}
        </div>
      )}
    </div>
  )
}

function UserMenu() {
  const nav = useNavigate()
  const { user } = useAuth()
  const logout = useStore((s) => s.logout)
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useOutside(ref, () => setOpen(false))
  if (!user) return null
  const ini = user.name.split(' ').map((x) => x[0]).slice(0, 2).join('')
  return (
    <div className="user-wrap" ref={ref}>
      <button className="user" onClick={() => setOpen(!open)}>
        <span className="avatar">{ini}</span>
        <div><b>{user.name}</b><small>{ROLES[user.role].label}</small></div>
        <ChevronDown size={15} className="muted" />
      </button>
      {open && (
        <div className="dropdown user-dd">
          <div className="ud-h"><span className="avatar">{ini}</span><div><b>{user.name}</b><small>{user.email}</small><span className={`role-tag r-${user.role}`}>{ROLES[user.role].label}</span></div></div>
          <div className="ud-org">{user.org}</div>
          <button className="ud-i" onClick={() => { logout(); nav('/') }}><LogOut size={15} /> Cerrar sesión</button>
        </div>
      )}
    </div>
  )
}

export function Topbar() {
  const now = useNow()
  const loc = useLocation()
  const nav = useNavigate()
  const alerts = useStore((s) => s.alerts)
  const ackAlert = useStore((s) => s.ackAlert)
  const [bell, setBell] = useState(false)
  const ref = useRef()
  useOutside(ref, () => setBell(false))
  const key = '/' + (loc.pathname.split('/')[1] || '')
  const d = new Date(now)
  const unack = alerts.filter((a) => !a.ack)
  const global = key === '/consola' || key === '/plantas'
  return (
    <header className="topbar">
      {global ? <div className="tb-title"><h1>{TITLES[key]}</h1><p>Beez Corp · plataforma multi-planta</p></div> : <PlantSwitcher />}
      <div className="tb-right">
        {!global && <>
          <div className="tb-status"><span>Última lectura</span><b>{d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })} · {d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</b></div>
          <div className="tb-sep" />
          <div className="bell" ref={ref}>
            <button className="icon-btn" onClick={() => setBell(!bell)}><Bell size={18} strokeWidth={1.8} />{unack.length > 0 && <em>{unack.length}</em>}</button>
            {bell && (
              <div className="dropdown bell-dd">
                <div className="dd-h"><b>Notificaciones</b><button className="link sm" onClick={() => { setBell(false); nav('/alertas') }}>Ver todas</button></div>
                {unack.length === 0 && <p className="muted sm pad">Sin alertas pendientes.</p>}
                {unack.slice(0, 5).map((a) => (
                  <div key={a.id} className="dd-alert">
                    {a.severity === 'critical' ? <CircleAlert size={16} className="t-red" /> : a.severity === 'warning' ? <AlertTriangle size={16} className="t-amber" /> : <Info size={16} className="muted" />}
                    <div style={{ cursor: 'pointer' }} onClick={() => { setBell(false); nav(alertLink(a)) }}><b>{a.title}</b><p className="muted xs">{a.detail}</p></div>
                    <button className="link xs" onClick={() => ackAlert(a.id)}>Reconocer</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="tb-sep" />
        </>}
        <UserMenu />
      </div>
    </header>
  )
}
