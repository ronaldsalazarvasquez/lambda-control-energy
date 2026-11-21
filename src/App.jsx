import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Sidebar, Topbar } from './components/Layout'
import { Toasts } from './components/ui'
import { useStore } from './store'
import { liveVars } from './lib/sim'
import { ruleValue, scanVoltageEvents } from './lib/alerts'
import Home from './pages/Home'
import Login from './pages/Login'
import Console, { Plants } from './pages/Console'
import { useAuth } from './lib/useAuth'
import { ROUTE_PERM } from './lib/saas'
import { Denied, PlanGate } from './components/Gate'
import UpgradeModal from './components/UpgradeModal'
import Balance from './pages/Balance'
import Dashboards from './pages/Dashboards'
import DashboardView from './pages/DashboardView'
import Meters from './pages/Meters'
import MeterDetail from './pages/MeterDetail'
import Areas from './pages/Areas'
import Diagram from './pages/Diagram'
import Integrations from './pages/Integrations'
import Reports from './pages/Reports'
import Alerts from './pages/Alerts'
import Settings from './pages/Settings'

function useAlertEngine() {
  useEffect(() => {
    scanVoltageEvents()
    const run = () => {
      const { rules, meters, alerts, plant, pushAlert } = useStore.getState()
      rules.filter((r) => r.enabled).forEach((r) => {
        const targets = r.meterId === '*' ? meters : meters.filter((m) => m.id === r.meterId)
        targets.forEach((m) => {
          if (alerts.some((a) => a.ruleId === r.id && a.meterId === m.id && (!a.ack || Date.now() - a.ts < 30 * 60000))) return
          let hit = false, val
          const lim = ruleValue(r, plant)
          if (r.metric === 'offline') hit = m.status === 'offline'
          else {
            const v = liveVars(m)
            if (!v) return
            val = v[r.metric]
            hit = r.op === '>' ? val > lim : val < lim
          }
          if (hit) pushAlert({ ruleId: r.id, meterId: m.id, metric: r.metric, title: r.name, severity: r.severity, detail: `${m.id} ${m.name}: ${r.metric === 'offline' ? 'sin respuesta del equipo' : `${r.metric} = ${val?.toFixed(2)} ${r.op} ${lim.toFixed(2)}`}` })
        })
      })
      scanVoltageEvents()
    }
    const t = setInterval(run, 30000)
    return () => clearInterval(t)
  }, [])
}

export default function App() {
  const loc = useLocation()
  const { user, can, feature } = useAuth()
  useAlertEngine()
  if (!user) return <><Login /><Toasts /></>
  const full = (loc.pathname.startsWith('/integraciones') && can('config.integrations')) || (loc.pathname.startsWith('/unifilar') && feature('unifilar'))
  // Protege las rutas según el rol
  const G = (path, el) => { const perm = ROUTE_PERM[path]; return perm && !can(perm) ? <Denied /> : el }
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar />
        <main className={`content ${full ? 'content-full' : ''}`}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/consola" element={G('/consola', <Console />)} />
            <Route path="/plantas" element={G('/plantas', <Plants />)} />
            <Route path="/balance" element={<Balance />} />
            <Route path="/dashboards" element={<Dashboards />} />
            <Route path="/dashboards/:id" element={<DashboardView />} />
            <Route path="/medidores" element={<Meters />} />
            <Route path="/medidores/:id" element={<MeterDetail />} />
            <Route path="/areas" element={<Areas />} />
            <Route path="/areas/:id" element={<Areas />} />
            <Route path="/unifilar" element={<PlanGate feature="unifilar"><Diagram /></PlanGate>} />
            <Route path="/integraciones" element={G('/integraciones', <Integrations />)} />
            <Route path="/reportes" element={G('/reportes', <Reports />)} />
            <Route path="/alertas" element={<Alerts />} />
            <Route path="/configuracion" element={G('/configuracion', <Settings />)} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
      </div>
      <UpgradeModal />
      <Toasts />
    </div>
  )
}
