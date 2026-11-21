import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { INDUSTRY_TEMPLATES, seedMeters, seedPlant, seedRules, seedAlerts, seedDashboards, seedFlow, seedDiagram, SANMARTIN_META, seedTenants, seedDirectory, genTenant, seedRequests } from './data/seed'
import { setRegistry } from './lib/sim'

const uid = (p = 'id') => `${p}-${Math.random().toString(36).slice(2, 9)}`

// Espacio de trabajo de una planta (lo que ven las pantallas de monitoreo)
export const WS_KEYS = ['plant', 'areas', 'meters', 'dashboards', 'rules', 'alerts', 'flow', 'diagram']
const pick = (s) => Object.fromEntries(WS_KEYS.map((k) => [k, s[k]]))

const initial = () => {
  const meters = seedMeters()
  return {
    plant: { ...seedPlant(), ...SANMARTIN_META },
    areas: INDUSTRY_TEMPLATES.arroz.areas.map((a) => ({ ...a })),
    meters,
    dashboards: seedDashboards(),
    rules: seedRules(),
    alerts: seedAlerts(),
    flow: seedFlow(),
    diagram: seedDiagram(meters),
    currentPlantId: SANMARTIN_META.id,
    tenants: seedTenants(),
    directory: seedDirectory(),
    requests: seedRequests(),
    session: null,
  }
}

// Todas las plantas (la activa se toma del estado vivo)
export const allPlants = (s) => {
  const map = { ...s.tenants, [s.currentPlantId]: pick(s) }
  return Object.values(map).map((t) => t)
}
export const currentUser = (s) => s.directory?.find((u) => u.id === s.session?.userId) || null
export const plantsFor = (s, user) => allPlants(s).filter((t) => user && (user.plants === '*' || user.plants.includes(t.plant.id)))

export const useStore = create(
  persist(
    (set, get) => ({
      ...initial(),
      toasts: [],

      toast: (msg, type = 'success') => {
        const id = uid('t')
        set((s) => ({ toasts: [...s.toasts, { id, msg, type }] }))
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200)
      },

      updatePlant: (patch) => set((s) => ({ plant: { ...s.plant, ...patch } })),

      // ---------- SaaS: sesión, plantas y accesos ----------
      login: (email) => {
        const u = get().directory.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
        if (!u) return null
        set({ session: { userId: u.id, at: Date.now() } })
        if (u.plants !== '*' && !u.plants.includes(get().currentPlantId)) get().switchPlant(u.plants[0])
        return u
      },
      logout: () => set({ session: null }),
      switchPlant: (id) => {
        const s = get()
        if (id === s.currentPlantId || !s.tenants[id]) return
        const tenants = { ...s.tenants, [s.currentPlantId]: pick(s) }
        const next = tenants[id]
        delete tenants[id]
        set({ ...next, tenants, currentPlantId: id })
      },
      setPlantMeta: (id, patch) => set((s) => (id === s.currentPlantId
        ? { plant: { ...s.plant, ...patch } }
        : { tenants: { ...s.tenants, [id]: { ...s.tenants[id], plant: { ...s.tenants[id].plant, ...patch } } } })),
      createPlant: (data) => {
        const t = genTenant({ id: uid('p'), feeders: [3, 6], scale: 0.5, status: 'Prueba', since: new Date().toISOString().slice(0, 10), renewal: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), ...data })
        set((s) => ({ tenants: { ...s.tenants, [t.plant.id]: t } }))
        return t.plant.id
      },
      // Mejora de plan
      upgrade: null,
      openUpgrade: (reason = '') => set({ upgrade: { reason } }),
      closeUpgrade: () => set({ upgrade: null }),
      submitRequest: (r) => set((s) => ({ requests: [{ id: uid('rq'), at: Date.now(), status: 'pendiente', ...r }, ...(s.requests || [])] })),
      resolveRequest: (id, status) => {
        const r = get().requests.find((x) => x.id === id)
        if (!r) return
        if (status === 'aprobada') get().setPlantMeta(r.plantId, { plan: r.to, billing: r.cycle, status: 'Activo' })
        set((s) => ({ requests: s.requests.map((x) => (x.id === id ? { ...x, status, resolvedAt: Date.now() } : x)) }))
      },
      addUser: (u) => set((s) => ({ directory: [...s.directory, { ...u, id: uid('u') }] })),
      updateUser: (id, patch) => set((s) => ({ directory: s.directory.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
      removeUser: (id) => set((s) => ({ directory: s.directory.filter((u) => u.id !== id) })),

      // Medidores
      addMeter: (m) => {
        const nums = get().meters.map((x) => parseInt(x.id.split('-')[1]) || 0)
        const id = m.id || `MED-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`
        const main = get().meters.find((x) => x.isMain)
        const meter = { status: 'online', pfBase: 0.93, profile: 'process', parentId: main?.id || null, ...m, id }
        set((s) => ({ meters: [...s.meters, meter] }))
        return id
      },
      updateMeter: (id, patch) => set((s) => ({ meters: s.meters.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removeMeter: (id) => set((s) => ({ meters: s.meters.filter((m) => m.id !== id).map((m) => (m.parentId === id ? { ...m, parentId: null } : m)) })),

      // Áreas
      addArea: (a) => { const id = uid('area'); set((s) => ({ areas: [...s.areas, { machines: [], icon: 'Factory', ...a, id }] })); return id },
      updateArea: (id, patch) => set((s) => ({ areas: s.areas.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      removeArea: (id) => set((s) => ({ areas: s.areas.filter((a) => a.id !== id), meters: s.meters.map((m) => (m.areaId === id ? { ...m, areaId: null } : m)) })),

      // Dashboards
      addDashboard: (d) => { const id = uid('d'); set((s) => ({ dashboards: [...s.dashboards, { range: '24h', panels: [], annotations: [], ...d, id, updated: Date.now() }] })); return id },
      addAnnotation: (dashId, a) => set((s) => ({ dashboards: s.dashboards.map((d) => (d.id === dashId ? { ...d, annotations: [...(d.annotations || []), { id: uid('an'), author: currentUser(s)?.name || 'Usuario', ...a }] } : d)) })),
      removeAnnotation: (dashId, id) => set((s) => ({ dashboards: s.dashboards.map((d) => (d.id === dashId ? { ...d, annotations: (d.annotations || []).filter((x) => x.id !== id) } : d)) })),
      updateDashboard: (id, patch) => set((s) => ({ dashboards: s.dashboards.map((d) => (d.id === id ? { ...d, ...patch, updated: Date.now() } : d)) })),
      removeDashboard: (id) => set((s) => ({ dashboards: s.dashboards.filter((d) => d.id !== id) })),
      duplicateDashboard: (id) => {
        const d = get().dashboards.find((x) => x.id === id)
        if (!d) return
        return get().addDashboard({ ...JSON.parse(JSON.stringify(d)), name: d.name + ' (copia)', favorite: false })
      },

      // Alertas
      ackAlert: (id) => set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, ack: true } : a)) })),
      ackAll: () => set((s) => ({ alerts: s.alerts.map((a) => ({ ...a, ack: true })) })),
      addRule: (r) => set((s) => ({ rules: [...s.rules, { enabled: true, ...r, id: uid('r') }] })),
      updateRule: (id, patch) => set((s) => ({ rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      removeRule: (id) => set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),
      pushAlert: (a) => set((s) => ({ alerts: [{ id: uid('a'), ts: Date.now(), ack: false, ...a }, ...s.alerts].slice(0, 200) })),

      setFlow: (patch) => set((s) => ({ flow: { ...s.flow, ...patch } })),
      setDiagram: (patch) => set((s) => ({ diagram: { ...s.diagram, ...patch } })),

      applyIndustry: (key) => set(() => ({ areas: INDUSTRY_TEMPLATES[key].areas.map((a) => ({ ...a })) })),
      resetDemo: () => set((s) => ({ ...initial(), session: s.session })),
    }),
    {
      name: 'beez-energy-v2',
      version: 7,
      // v1: colores de gráficos más vivos para las áreas existentes
      migrate: (state, version) => {
        const map = { '#7c8ea3': '#06b6d4', '#c19a3d': '#f59e0b', '#5f7f73': '#10b981', '#2f4d7a': '#2563eb', '#7a6f9b': '#8b5cf6', '#a8786a': '#ec4899', '#9aa3ad': '#64748b' }
        if (state?.areas) state.areas = state.areas.map((a) => ({ ...a, color: map[a.color] || a.color }))
        // v2: nodos cuadrados → nueva disposición del flujo de demostración
        if (version < 2) state.flow = seedFlow()
        // v3: límites de tensión y reglas de calidad en el ingreso
        if (version < 3) {
          state.plant = { vLowPct: 5, vHighPct: 5, vMinDurS: 60, ...state.plant }
          const add = seedRules().filter((r) => r.dynamic && !state.rules?.some((x) => x.id === r.id))
          state.rules = [...(state.rules || []), ...add]
          state.alerts = (state.alerts || []).map((a) => ({ metric: state.rules.find((r) => r.id === a.ruleId)?.metric, ...a }))
          state.flow = seedFlow()
        }
        if (version < 4) state.flow = seedFlow()
        // v5: SaaS multi-planta, directorio de usuarios y sesión
        if (version < 5) {
          state.plant = { ...state.plant, ...SANMARTIN_META }
          state.currentPlantId = SANMARTIN_META.id
          state.tenants = seedTenants()
          state.directory = seedDirectory()
          state.session = null
          delete state.users
          delete state.ui
        }
        // v6: facturación y solicitudes de mejora
        if (version < 6) {
          const meta = { 'p-sanmartin': { billing: 'anual', paymentStatus: 'Al día' }, 'p-cortijo': { billing: 'mensual', paymentStatus: 'Pendiente' }, 'p-santarosa': { billing: 'mensual', paymentStatus: 'Al día' }, 'p-andes': { billing: 'anual', paymentStatus: 'Al día' }, 'p-arrocera': { billing: 'anual', paymentStatus: 'Al día' } }
          const fix = (pl) => ({ billing: 'mensual', paymentStatus: 'Al día', lastLogin: Date.now() - 864e5, ...(meta[pl.id] || {}), ...pl })
          state.plant = fix(state.plant)
          Object.values(state.tenants || {}).forEach((t) => { t.plant = fix(t.plant) })
          state.requests = seedRequests()
        }
        // v7: fechas de alta escalonadas (historial de MRR)
        if (version < 7) {
          const since = { 'p-sanmartin': ['2026-04-01', '2027-04-01'], 'p-cortijo': ['2026-08-15', '2026-12-15'], 'p-andes': ['2026-02-01', '2027-02-01'], 'p-arrocera': ['2025-12-01', '2026-12-01'] }
          const fix = (pl) => (since[pl.id] ? { ...pl, since: since[pl.id][0], renewal: since[pl.id][1] } : pl)
          state.plant = fix(state.plant)
          Object.values(state.tenants || {}).forEach((t) => { t.plant = fix(t.plant) })
        }
        return state
      },
      partialize: ({ toasts, upgrade, ...rest }) => Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function')),
    }
  )
)

// Mantener el motor de simulación sincronizado
const sync = (s) => setRegistry(s.meters, s.plant)
sync(useStore.getState())
useStore.subscribe(sync)

// Reloj global (un solo intervalo para toda la app)
export const useTick = create(() => ({ now: Date.now() }))
setInterval(() => useTick.setState({ now: Date.now() }), 2000)

export const useNow = () => useTick((s) => s.now)
// Cambia cada minuto: útil para memoizar cálculos históricos
export const useMinute = () => useTick((s) => Math.floor(s.now / 60000))
