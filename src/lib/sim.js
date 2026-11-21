// Motor de simulación determinista de datos de medidores.
// Reemplazable luego por la API real (histórico + tiempo real).

export const HOUR = 3600e3
export const DAY = 86400e3

let REG = { meters: [], plant: {} }
let cache = new Map()

export function setRegistry(meters, plant) {
  if (REG.meters !== meters || REG.plant !== plant) {
    REG = { meters, plant }
    cache = new Map()
    cumCache.clear()
    evCache.clear()
  }
}
// Semilla por medidor/planta: cada planta del SaaS genera datos distintos
const K = (m) => m.seed || m.id
const PK = () => REG.plant?.seedKey || ''
export const getMeters = () => REG.meters
export const getPlant = () => REG.plant
export const meterById = (id) => REG.meters.find((m) => m.id === id)
export const mainMeter = () => REG.meters.find((m) => m.isMain) || REG.meters[0]

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}
export function rnd(key) {
  let t = (hash(String(key)) + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const processF = (h, dow) => {
  let f = h >= 6 && h < 22 ? 0.86 : 0.13
  if (h === 6 || h === 21) f = 0.55
  if (h >= 12 && h < 13) f *= 0.8 // refrigerio
  if (dow === 0) f *= 0.3
  return f
}
const PROFILES = {
  process: processF,
  continuous: (h, dow) => 0.78 + 0.08 * Math.sin(((h - 4) / 24) * 2 * Math.PI) - (dow === 0 ? 0.2 : 0),
  compressor: (h, dow) => processF(h, dow) * 0.8 + 0.14,
  lighting: (h) => (h >= 18 || h < 6 ? 0.9 : h >= 8 && h < 17 ? 0.45 : 0.6),
}

const children = (id) => REG.meters.filter((m) => m.parentId === id)

export function hourlyKw(m, ts) {
  const hs = Math.floor(ts / HOUR) * HOUR
  const key = m.id + '|' + hs
  const c = cache.get(key)
  if (c !== undefined) return c
  let kw
  const ch = children(m.id)
  if (ch.length) {
    kw = ch.reduce((a, x) => a + hourlyKw(x, hs), 0) * 1.025
  } else {
    const d = new Date(hs)
    const f = (PROFILES[m.profile] || PROFILES.process)(d.getHours(), d.getDay())
    const dayF = 0.9 + 0.2 * rnd(K(m) + 'd' + Math.floor(hs / DAY))
    kw = (m.nominalKw || 10) * f * dayF * (0.93 + 0.14 * rnd(K(m) + hs))
  }
  cache.set(key, kw)
  return kw
}

export function tariffAt(ts) {
  const p = REG.plant
  const h = new Date(ts).getHours()
  return h >= (p.peakStart ?? 18) && h < (p.peakEnd ?? 23) ? p.tariffHP ?? 0.6 : p.tariffFP ?? 0.4
}

// Estadísticas de un medidor en [start, end)
export function stats(m, start, end) {
  const now = Date.now()
  end = Math.min(end, now)
  let energy = 0, cost = 0, costHP = 0, maxKw = 0, hours = 0, energyHP = 0
  if (!m || end <= start) return { energy, cost, costHP, maxKw, hours, energyHP, avgKw: 0 }
  for (let t = Math.floor(start / HOUR) * HOUR; t < end; t += HOUR) {
    const a = Math.max(t, start), b = Math.min(t + HOUR, end)
    if (b <= a) continue
    const frac = (b - a) / HOUR
    const kw = hourlyKw(m, t)
    const e = kw * frac
    const tar = tariffAt(t)
    energy += e
    cost += e * tar
    if (tar === REG.plant.tariffHP) { costHP += e * tar; energyHP += e }
    hours += frac
    const peak = kw * (1.04 + 0.05 * rnd(K(m) + 'pk' + t))
    if (peak > maxKw) maxKw = peak
  }
  return { energy, cost, costHP, energyHP, maxKw, hours, avgKw: hours ? energy / hours : 0 }
}

export function tonsRange(start, end) {
  const now = Date.now()
  end = Math.min(end, now)
  const cap = REG.plant.capacityTph || 8
  let t0 = 0
  for (let t = Math.floor(start / HOUR) * HOUR; t < end; t += HOUR) {
    const a = Math.max(t, start), b = Math.min(t + HOUR, end)
    if (b <= a) continue
    const d = new Date(t)
    const f = processF(d.getHours(), d.getDay())
    if (f > 0.4) t0 += cap * (f / 0.86) * (0.85 + 0.15 * rnd(PK() + 'tons' + t)) * ((b - a) / HOUR)
  }
  return t0
}

export function pfAt(m, now = Date.now()) {
  if (!m) return 0
  const ch = children(m.id)
  if (ch.length) return Math.min(0.99, (m.pfBase || 0.95) + 0.008 * Math.sin(now / 9000))
  return Math.min(0.995, (m.pfBase || 0.93) + 0.012 * Math.sin(now / 7000 + hash(K(m))))
}

// ---------- Rangos de tiempo ----------
export const RANGES = {
  today: { label: 'Hoy' },
  '24h': { label: 'Últimas 24 h' },
  '7d': { label: 'Últimos 7 días' },
  '30d': { label: 'Últimos 30 días' },
  month: { label: 'Mes actual' },
}

export function windowFor(range, now = Date.now()) {
  const mid = new Date(now); mid.setHours(0, 0, 0, 0)
  switch (range) {
    case 'today': return [mid.getTime(), now]
    case '7d': return [mid.getTime() - 6 * DAY, now]
    case '30d': return [mid.getTime() - 29 * DAY, now]
    case 'month': { const s = new Date(mid); s.setDate(1); return [s.getTime(), now] }
    default: return [now - 24 * HOUR, now]
  }
}
export function prevWindow(range, now = Date.now()) {
  const [s, e] = windowFor(range, now)
  const len = e - s
  return [s - len, s]
}

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export function buckets(range, gran) {
  const now = Date.now()
  const [s] = windowFor(range, now)
  const out = []
  if (gran === 'hour') {
    for (let t = Math.floor(s / HOUR) * HOUR; t < now; t += HOUR) {
      const d = new Date(t)
      out.push({ start: t, end: t + HOUR, label: `${String(d.getHours()).padStart(2, '0')}:00`, long: `${DOW[d.getDay()]} ${d.getDate()} · ${String(d.getHours()).padStart(2, '0')}:00` })
    }
  } else {
    const d0 = new Date(s); d0.setHours(0, 0, 0, 0)
    for (let t = d0.getTime(); t < now; t += DAY) {
      const d = new Date(t)
      out.push({ start: t, end: t + DAY, label: `${DOW[d.getDay()]} ${d.getDate()}`, long: d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' }) })
    }
  }
  return out
}

export function autoGran(range, type) {
  if (range === 'today' || range === '24h') return 'hour'
  if (range === '7d' && type === 'timeseries') return 'hour'
  return 'day'
}

export function metricValue(s, metric) {
  switch (metric) {
    case 'energy': return s.energy
    case 'cost': return s.cost
    case 'demand': return s.maxKw
    default: return s.avgKw
  }
}

export function series(meters, range, gran, metric) {
  return buckets(range, gran).map((b) => {
    const row = { label: b.label, long: b.long, t: b.start }
    meters.forEach((m) => { row[m.id] = metricValue(stats(m, b.start, b.end), metric) })
    return row
  })
}

// ---------- Tiempo real ----------
export function liveKw(m, now = Date.now()) {
  if (!m || m.status === 'offline') return null
  const base = hourlyKw(m, now)
  const h = hash(K(m))
  return base * (1 + 0.035 * Math.sin(now / 6000 + h) + 0.02 * Math.sin(now / 2300 + h * 3) + 0.025 * (rnd(K(m) + Math.floor(now / 2000)) - 0.5))
}

export function liveVars(m, now = Date.now()) {
  if (!m || m.status === 'offline') return null
  const V = REG.plant.voltage || 440
  const h = hash(K(m))
  const P = liveKw(m, now)
  const PF = pfAt(m, now)
  const S = P / PF
  const Q = Math.sqrt(Math.max(0, S * S - P * P))
  const v = (k) => voltageAt(m, now, k) * (1 + 0.0015 * Math.sin(now / 5000 + h + k) + 0.001 * (rnd(K(m) + k + Math.floor(now / 2000)) - 0.5))
  const V12 = v(0), V23 = v(1), V31 = v(2)
  const Iavg = (S * 1000) / (Math.sqrt(3) * ((V12 + V23 + V31) / 3))
  const i = (k) => Iavg * (1 + [0.02, -0.015, 0.008][k] + 0.01 * Math.sin(now / 4000 + k + h))
  const midnight = new Date(now); midnight.setHours(0, 0, 0, 0)
  const eToday = stats(m, midnight.getTime(), now).energy
  return {
    P, Q, S, PF, V12, V23, V31,
    I1: i(0), I2: i(1), I3: i(2),
    F: (REG.plant.frequency || 60) + 0.03 * Math.sin(now / 11000),
    E: totalizer(m, now),
    ER: totalizer(m, now) * Math.tan(Math.acos(m.pfBase || 0.93)) * 0.62,
    THDV: 2.2 + 1.2 * rnd(K(m) + 'tv') + 0.3 * Math.sin(now / 8000),
    THDI: (m.id === 'MED-005' ? 15.2 : 6 + 6 * rnd(K(m) + 'ti')) + 1.2 * Math.sin(now / 6000 + h),
    eToday,
  }
}

// ---------- Formato ----------
const nf = (d) => new Intl.NumberFormat('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d })
export const fmt = (n, d = 0) => (n == null || isNaN(n) ? '—' : nf(d).format(n))
export const fmtAuto = (n) => (n == null || isNaN(n) ? '—' : Math.abs(n) >= 100 ? fmt(n, 0) : Math.abs(n) >= 10 ? fmt(n, 1) : fmt(n, 2))

export const METRICS = {
  energy: { label: 'Energía', unit: 'kWh' },
  power: { label: 'Potencia promedio', unit: 'kW' },
  demand: { label: 'Demanda máxima', unit: 'kW' },
  cost: { label: 'Costo', unit: 'S/' },
  pf: { label: 'Factor de potencia', unit: '' },
  kwht: { label: 'Consumo específico', unit: 'kWh/t' },
  tons: { label: 'Producción (paddy)', unit: 't' },
  co2: { label: 'Emisiones CO₂', unit: 'kg' },
}

// Agregado de una métrica sobre varios medidores en una ventana
export function aggregate(meters, metric, start, end) {
  if (metric === 'tons') return tonsRange(start, end)
  if (metric === 'pf') {
    const now = Math.min(end, Date.now())
    const ms = meters.filter(Boolean)
    if (!ms.length) return 0
    return ms.reduce((a, m) => a + pfAt(m, now), 0) / ms.length
  }
  const ss = meters.filter(Boolean).map((m) => stats(m, start, end))
  if (metric === 'kwht') {
    const t = tonsRange(start, end)
    return t ? ss.reduce((a, s) => a + s.energy, 0) / t : 0
  }
  if (metric === 'co2') return ss.reduce((a, s) => a + s.energy, 0) * (REG.plant.co2Factor || 0.42)
  if (metric === 'demand') return ss.reduce((a, s) => a + s.maxKw, 0)
  return ss.reduce((a, s) => a + metricValue(s, metric), 0)
}


// ---------- Totalizadores (contadores de energía acumulada) ----------
// Lectura = base fija del equipo + energía acumulada desde EPOCH (1° del mes anterior)
const EPOCH = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.getTime() })()
const cumCache = new Map()
function cumToHour(m, hs) {
  const key = m.id + '|c|' + hs
  if (cumCache.has(key)) return cumCache.get(key)
  let acc = 0, t = EPOCH
  // reutiliza el último punto cacheado si existe
  for (let k = hs - HOUR; k >= EPOCH; k -= HOUR) {
    const c = cumCache.get(m.id + '|c|' + k)
    if (c !== undefined) { acc = c; t = k; break }
  }
  for (; t < hs; t += HOUR) acc += hourlyKw(m, t)
  cumCache.set(key, acc)
  return acc
}
export function totalizer(m, t = Date.now()) {
  if (!m) return null
  t = Math.min(t, Date.now())
  if (t < EPOCH) t = EPOCH
  const hs = Math.floor(t / HOUR) * HOUR
  const base = 180000 + (hash(K(m)) % 900000) + (m.isMain ? 4200000 : 0)
  return base + cumToHour(m, hs) + hourlyKw(m, hs) * ((t - hs) / HOUR)
}
export const reactiveTotal = (m, t) => totalizer(m, t) * Math.tan(Math.acos(m?.pfBase || 0.93)) * 0.62
export function startOfDay(t = Date.now()) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }
export function startOfMonth(t = Date.now()) { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(1); return d.getTime() }
export function readings(m, now = Date.now()) {
  const cur = totalizer(m, now)
  const d0 = totalizer(m, startOfDay(now))
  const m0 = totalizer(m, startOfMonth(now))
  return { cur, d0, m0, day: cur - d0, month: cur - m0, kvarh: reactiveTotal(m, now) }
}

// ---------- Series por ventana arbitraria (zoom) ----------
const MIN = 60e3
export function pointKw(m, t) {
  const base = hourlyKw(m, t)
  const k = Math.floor(t / (5 * MIN))
  return base * (1 + 0.05 * Math.sin(k / 2.3 + hash(K(m))) + 0.05 * (rnd(K(m) + 'p' + k) - 0.5))
}
export function stepFor(span, type) {
  if (type === 'bar') return span <= 3 * HOUR ? 15 * MIN : span <= 2.1 * DAY ? HOUR : DAY
  if (span <= 6 * HOUR) return 5 * MIN
  if (span <= 2.1 * DAY) return 15 * MIN
  if (span <= 10 * DAY) return HOUR
  return DAY
}
const p2 = (n) => String(n).padStart(2, '0')
export function fmtTime(t, step, span) {
  const d = new Date(t)
  if (step >= DAY) return `${DOW[d.getDay()]} ${d.getDate()}`
  if (span > 1.1 * DAY) return `${DOW[d.getDay()]} ${p2(d.getHours())}:${p2(d.getMinutes())}`
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`
}
export function fmtLong(t, step) {
  const d = new Date(t)
  const day = d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
  return step >= DAY ? day : `${day} · ${p2(d.getHours())}:${p2(d.getMinutes())}`
}
export function seriesWin(meters, start, end, metric, type = 'timeseries') {
  const now = Date.now()
  end = Math.min(end, now)
  const span = end - start
  const step = stepFor(span, type)
  const out = []
  let t = step >= DAY ? startOfDay(start) : Math.floor(start / step) * step
  for (; t < end; t += step) {
    const b = step >= DAY ? (() => { const d = new Date(t); d.setDate(d.getDate() + 1); return d.getTime() })() : t + step
    const row = { t, label: fmtTime(t, step, span), long: fmtLong(t, step) }
    meters.forEach((m) => {
      if (step < HOUR) {
        const kw = pointKw(m, t)
        row[m.id] = metric === 'energy' ? kw * (step / HOUR) : metric === 'cost' ? kw * (step / HOUR) * tariffAt(t) : kw
      } else row[m.id] = metricValue(stats(m, Math.max(t, start), Math.min(b, end)), metric)
    })
    out.push(row)
    if (step >= DAY) t = b - step
  }
  return { rows: out, step }
}


// ---------- Tensión de ingreso y eventos de calidad ----------
// Eventos deterministas de la red: huecos (sag) diurnos y sobretensiones (swell) nocturnas
function dayEvents(k) {
  if (evCache.has(k)) return evCache.get(k)
  const d = k * DAY, out = []
  if (rnd(PK() + 'sag' + k) < 0.55) {
    const s0 = d + (12 + 12 * rnd(PK() + 'sagh' + k)) * HOUR // horario local aprox. (UTC-5)
    out.push({ type: 'sag', start: s0, end: s0 + (2 + 5 * rnd(PK() + 'sagd' + k)) * MIN, depth: 0.07 + 0.07 * rnd(PK() + 'sagx' + k) })
  }
  if (rnd(PK() + 'swell' + k) < 0.3) {
    const s0 = d + (6 + 4 * rnd(PK() + 'swh' + k)) * HOUR
    out.push({ type: 'swell', start: s0, end: s0 + (8 + 20 * rnd(PK() + 'swd' + k)) * MIN, depth: -(0.055 + 0.03 * rnd(PK() + 'swx' + k)) })
  }
  evCache.set(k, out)
  return out
}
const evCache = new Map()
export function plantEvents(start, end) {
  const out = []
  for (let k = Math.floor(start / DAY) - 1; k <= Math.floor(end / DAY); k++) out.push(...dayEvents(k))
  const now = Date.now()
  return out.filter((e) => e.end > start && e.start < end && e.start < now)
}
function eventAt(t) {
  if (t > Date.now()) return null
  return dayEvents(Math.floor(t / DAY)).find((e) => t >= e.start && t < e.end)
}
export function voltageAt(m, t, k = 0) {
  const V = REG.plant.voltage || 440
  const main = mainMeter()
  const load = main ? hourlyKw(main, t) / (REG.plant.contractedKw || 520) : 0.5
  const ev = eventAt(t)
  const drop = m && !m.isMain ? 0.006 : 0 // caída en alimentadores
  return V * (1 + 0.012 * Math.sin(t / (3 * HOUR) + 1) + 0.004 * Math.sin(t / (11 * MIN)) - 0.022 * load - drop - 0.006 * k - (ev ? ev.depth : 0))
}

// Valor de cualquier variable en un instante (para curvas históricas)
export function varAt(m, key, t) {
  const kw = pointKw(m, t)
  const pf = Math.min(0.995, (m.pfBase || 0.93) + 0.012 * Math.sin(t / (40 * MIN) + hash(K(m))))
  const V = voltageAt(m, t)
  const I = (kw * 1000) / (1.732 * V * pf)
  switch (key) {
    case 'P': return kw
    case 'PF': return pf
    case 'S': return kw / pf
    case 'Q': return Math.sqrt(Math.max(0, (kw / pf) ** 2 - kw * kw))
    case 'V12': return V
    case 'V23': return voltageAt(m, t, 1)
    case 'V31': return voltageAt(m, t, 2)
    case 'I1': return I * 1.02
    case 'I2': return I * 0.985
    case 'I3': return I * 1.008
    case 'F': return (REG.plant.frequency || 60) + 0.03 * Math.sin(t / (17 * MIN)) + (eventAt(t) ? -0.08 : 0)
    case 'THDV': return 2.2 + 1.2 * rnd(K(m) + 'tv') + 0.6 * (kw / (m.nominalKw || 100))
    case 'THDI': return (m.id === 'MED-005' ? 13 : 5 + 5 * rnd(K(m) + 'ti')) + 3 * Math.sin(t / (2 * HOUR))
    case 'E': return totalizer(m, t)
    default: return kw
  }
}
export function varSeries(m, key, start, end) {
  end = Math.min(end, Date.now())
  const span = end - start
  const step = span <= 6 * HOUR ? MIN : span <= 26 * HOUR ? 5 * MIN : span <= 8 * DAY ? 20 * MIN : HOUR
  const evs = key.startsWith('V') ? plantEvents(start, end) : []
  const rows = []
  for (let t = Math.floor(start / step) * step; t < end; t += step) {
    const v = varAt(m, key, t)
    let min = v, max = v
    // en pasos gruesos conserva el extremo de eventos cortos dentro del intervalo
    const ev = evs.find((e) => e.start < t + step && e.end > t)
    if (ev) { const ex = varAt(m, key, Math.max(t, ev.start) + 1); min = Math.min(min, ex); max = Math.max(max, ex) }
    rows.push({ t, v: ev && step > MIN ? (ev.type === 'sag' ? min : max) : v, band: [min, max] })
  }
  return { rows, step }
}
export function peakInfo(m, start, end) {
  end = Math.min(end, Date.now())
  let best = { kw: 0, t: start }
  for (let t = Math.floor(start / HOUR) * HOUR; t < end; t += HOUR) {
    const kw = hourlyKw(m, t) * (1.04 + 0.05 * rnd(K(m) + 'pk' + t))
    if (kw > best.kw) best = { kw, t: t + Math.floor(rnd('pm' + t) * 50) * MIN }
  }
  return best
}
export const monthRange = (off = 0) => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(1); d.setMonth(d.getMonth() - off)
  const s = d.getTime(); const e2 = new Date(d); e2.setMonth(e2.getMonth() + 1)
  return [s, Math.min(e2.getTime(), Date.now()), e2.getTime()]
}
export const TOTALIZER_FROM = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.getTime() }
