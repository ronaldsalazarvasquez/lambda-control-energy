// Datos de demostración: Molino de arroz (plantilla de industria)

export const INDUSTRY_TEMPLATES = {
  arroz: {
    name: 'Molino de arroz',
    areas: [
      { id: 'recepcion', name: 'Recepción y Pre-limpieza', short: 'Recepción', color: '#06b6d4', icon: 'Truck', machines: [
        { name: 'Tolva de recepción TR-01', kw: 1.5 }, { name: 'Elevador de cangilones E-01', kw: 7.5 },
        { name: 'Prelimpiadora PL-01', kw: 5.5 }, { name: 'Faja transportadora FT-01', kw: 4 }, { name: 'Balanza de flujo', kw: 1.1 } ] },
      { id: 'secado', name: 'Secado de paddy', short: 'Secado', color: '#f59e0b', icon: 'Flame', machines: [
        { name: 'Secadora de columna SC-01 (ventilador)', kw: 30 }, { name: 'Secadora de columna SC-02 (ventilador)', kw: 30 },
        { name: 'Horno de cascarilla HC-01', kw: 7.5 }, { name: 'Elevadores de secado E-02/E-03', kw: 11 }, { name: 'Silos de reposo (aireación)', kw: 7.5 } ] },
      { id: 'descascarado', name: 'Descascarado', short: 'Descascarado', color: '#10b981', icon: 'Disc3', machines: [
        { name: 'Descascaradora de rodillos DR-01', kw: 22 }, { name: 'Descascaradora de rodillos DR-02', kw: 22 },
        { name: 'Separadora mesa paddy MP-01', kw: 5.5 }, { name: 'Aspirador de cascarilla AC-01', kw: 15 } ] },
      { id: 'pulido', name: 'Pulido y Blanqueo', short: 'Pulido', color: '#2563eb', icon: 'Sparkles', machines: [
        { name: 'Blanqueadora de piedra BL-01', kw: 45 }, { name: 'Pulidora de agua PA-01', kw: 37 },
        { name: 'Pulidora de agua PA-02', kw: 37 }, { name: 'Ventilador de polvillo VP-01', kw: 11 }, { name: 'Ciclón de polvillo', kw: 5.5 } ] },
      { id: 'clasificacion', name: 'Clasificación y Selección', short: 'Clasificación', color: '#8b5cf6', icon: 'ScanEye', machines: [
        { name: 'Clasificadora rotativa CR-01', kw: 4 }, { name: 'Cilindro trieur CT-01', kw: 3 },
        { name: 'Selectora óptica de color SO-01', kw: 7.5 }, { name: 'Selectora óptica de color SO-02', kw: 7.5 }, { name: 'Elevadores E-04/E-05', kw: 7.5 } ] },
      { id: 'envasado', name: 'Envasado y Almacén', short: 'Envasado', color: '#ec4899', icon: 'Package', machines: [
        { name: 'Envasadora automática EV-01', kw: 5.5 }, { name: 'Cosedora de sacos', kw: 1.5 },
        { name: 'Faja de despacho FD-01', kw: 3 }, { name: 'Tolvas de producto terminado', kw: 2.2 } ] },
      { id: 'servicios', name: 'Servicios auxiliares', short: 'Servicios', color: '#64748b', icon: 'Wrench', machines: [
        { name: 'Compresor de tornillo CT-01', kw: 37 }, { name: 'Compresor de tornillo CT-02 (respaldo)', kw: 22 },
        { name: 'Secador de aire', kw: 3 }, { name: 'Bombas de agua', kw: 5.5 }, { name: 'Iluminación y oficinas', kw: 15 } ] },
    ],
  },
  generico: {
    name: 'Industria genérica',
    areas: [
      { id: 'produccion', name: 'Producción', short: 'Producción', color: '#2563eb', icon: 'Factory', machines: [] },
      { id: 'servicios', name: 'Servicios auxiliares', short: 'Servicios', color: '#64748b', icon: 'Wrench', machines: [] },
      { id: 'oficinas', name: 'Oficinas', short: 'Oficinas', color: '#10b981', icon: 'Building2', machines: [] },
    ],
  },
}

export const seedMeters = () => [
  { id: 'MED-001', name: 'General', desc: 'Tablero general TGBT', areaId: null, parentId: null, isMain: true, driverId: 'schneider-pm5560', protocol: 'Modbus TCP', ip: '192.168.10.21', port: 502, slaveId: 1, status: 'online', nominalKw: 630, pfBase: 0.96, profile: 'process' },
  { id: 'MED-002', name: 'Recepción', desc: 'Tablero TD-01 recepción', areaId: 'recepcion', parentId: 'MED-001', driverId: 'eastron-sdm630', protocol: 'Modbus RTU', ip: 'RS485 / COM1', port: 9600, slaveId: 2, status: 'online', nominalKw: 22, pfBase: 0.91, profile: 'process' },
  { id: 'MED-003', name: 'Secado', desc: 'Tablero TD-02 secadoras', areaId: 'secado', parentId: 'MED-001', driverId: 'siemens-pac3200', protocol: 'Modbus TCP', ip: '192.168.10.23', port: 502, slaveId: 1, status: 'online', nominalKw: 95, pfBase: 0.93, profile: 'continuous' },
  { id: 'MED-004', name: 'Descascarado', desc: 'Tablero TD-03 descascarado', areaId: 'descascarado', parentId: 'MED-001', driverId: 'abb-m4m30', protocol: 'Modbus RTU', ip: 'RS485 / COM1', port: 9600, slaveId: 4, status: 'online', nominalKw: 68, pfBase: 0.92, profile: 'process' },
  { id: 'MED-005', name: 'Pulido', desc: 'Tablero TD-04 pulido y blanqueo', areaId: 'pulido', parentId: 'MED-001', driverId: 'janitza-umg96pa', protocol: 'Modbus TCP', ip: '192.168.10.25', port: 502, slaveId: 1, status: 'online', nominalKw: 140, pfBase: 0.86, profile: 'process' },
  { id: 'MED-006', name: 'Clasificación', desc: 'Tablero TD-05 selectoras', areaId: 'clasificacion', parentId: 'MED-001', driverId: 'gavazzi-em24', protocol: 'Modbus RTU', ip: 'RS485 / COM2', port: 9600, slaveId: 6, status: 'online', nominalKw: 32, pfBase: 0.94, profile: 'process' },
  { id: 'MED-007', name: 'Envasado', desc: 'Tablero TD-06 envasado', areaId: 'envasado', parentId: 'MED-001', driverId: 'circutor-cvmc10', protocol: 'Modbus RTU', ip: 'RS485 / COM2', port: 9600, slaveId: 7, status: 'online', nominalKw: 14, pfBase: 0.9, profile: 'process' },
  { id: 'MED-008', name: 'Compresores', desc: 'Sala de compresores', areaId: 'servicios', parentId: 'MED-001', driverId: 'schneider-pm2220', protocol: 'Modbus RTU', ip: 'RS485 / COM1', port: 19200, slaveId: 8, status: 'online', nominalKw: 52, pfBase: 0.88, profile: 'compressor' },
  { id: 'MED-009', name: 'Iluminación y oficinas', desc: 'Tablero TD-08 servicios generales', areaId: 'servicios', parentId: 'MED-001', driverId: 'generic-modbus', protocol: 'Modbus TCP', ip: '192.168.10.29', port: 502, slaveId: 1, status: 'offline', nominalKw: 15, pfBase: 0.95, profile: 'lighting' },
]

export const seedPlant = () => ({
  name: 'Molino San Martín',
  company: 'Agroindustrias del Norte S.A.C.',
  location: 'Chiclayo, Lambayeque',
  industry: 'arroz',
  currency: 'S/',
  tariffHP: 0.62, // hora punta
  tariffFP: 0.41, // fuera de punta
  peakStart: 18,
  peakEnd: 23,
  contractedKw: 520,
  voltage: 440,
  vLowPct: 5, // límite inferior de tensión (% de la nominal)
  vHighPct: 5, // límite superior
  vMinDurS: 60, // duración mínima del evento (s)
  frequency: 60,
  capacityTph: 10, // toneladas paddy / hora
  co2Factor: 0.42, // kg CO2 / kWh (SEIN)
  targetKwht: 55,
})

export const seedRules = () => [
  { id: 'r1', name: 'Factor de potencia bajo', meterId: '*', metric: 'PF', op: '<', value: 0.9, severity: 'warning', enabled: true },
  { id: 'r2', name: 'Demanda cerca de potencia contratada', meterId: 'MED-001', metric: 'P', op: '>', value: 480, severity: 'critical', enabled: true },
  { id: 'r3', name: 'Medidor sin comunicación', meterId: '*', metric: 'offline', op: '=', value: 1, severity: 'critical', enabled: true },
  { id: 'r5', name: 'Subtensión en ingreso a planta', meterId: 'MED-001', metric: 'V12', op: '<', dynamic: 'vlow', value: 418, severity: 'warning', enabled: true },
  { id: 'r6', name: 'Sobretensión en ingreso a planta', meterId: 'MED-001', metric: 'V12', op: '>', dynamic: 'vhigh', value: 462, severity: 'warning', enabled: true },
  { id: 'r4', name: 'THD de corriente alto', meterId: 'MED-005', metric: 'THDI', op: '>', value: 15, severity: 'info', enabled: true },
]

const ago = (min) => Date.now() - min * 60000
export const seedAlerts = () => [
  { id: 'a1', ruleId: 'r3', meterId: 'MED-009', metric: 'offline', title: 'Medidor sin comunicación', detail: 'MED-009 Iluminación y oficinas no responde (timeout Modbus 3 s)', severity: 'critical', ts: ago(42), ack: false },
  { id: 'a2', ruleId: 'r1', meterId: 'MED-005', metric: 'PF', title: 'Factor de potencia bajo', detail: 'MED-005 Pulido: FP 0.86 < 0.90 — riesgo de penalidad por energía reactiva', severity: 'warning', ts: ago(95), ack: false },
  { id: 'a3', ruleId: 'r4', meterId: 'MED-005', metric: 'THDI', title: 'THD de corriente alto', detail: 'MED-005 Pulido: THDi 16.2 % > 15 %', severity: 'info', ts: ago(300), ack: true },
  { id: 'a4', ruleId: 'r2', meterId: 'MED-001', metric: 'P', title: 'Demanda cerca de potencia contratada', detail: 'MED-001 General: 492 kW > 480 kW (94 % de lo contratado)', severity: 'critical', ts: ago(60 * 20), ack: true },
]

let pid = 0
const P = (type, title, x, y, w, h, config = {}) => ({ i: `p${++pid}-${Math.random().toString(36).slice(2, 6)}`, type, title, x, y, w, h, config })

export const dashboardTemplates = {
  blank: () => [],
  resumen: (ids = ['MED-003', 'MED-004', 'MED-005', 'MED-006']) => [
    P('stat', 'Consumo de energía', 0, 0, 3, 3, { metric: 'energy', meterIds: ['MED-001'] }),
    P('stat', 'Demanda máxima', 3, 0, 3, 3, { metric: 'demand', meterIds: ['MED-001'] }),
    P('stat', 'Consumo específico', 6, 0, 3, 3, { metric: 'kwht', meterIds: ['MED-001'] }),
    P('stat', 'Costo estimado', 9, 0, 3, 3, { metric: 'cost', meterIds: ['MED-001'] }),
    P('timeseries', 'Potencia por área', 0, 3, 8, 7, { metric: 'power', meterIds: ids, stacked: true }),
    P('pie', 'Distribución por área', 8, 3, 4, 7, { groupBy: 'area' }),
    P('bar', 'Energía diaria', 0, 10, 6, 7, { metric: 'energy', meterIds: ['MED-001'], range: '7d' }),
    P('heatmap', 'Mapa de calor horario', 6, 10, 6, 7, { meterIds: ['MED-001'], range: '7d' }),
    P('counter', 'Totalizadores de energía', 0, 17, 12, 7, { meterIds: [] }),
  ],
  area: (meterId) => [
    P('gauge', 'Potencia instantánea', 0, 0, 3, 6, { meterId, metric: 'P' }),
    P('stat', 'Energía', 3, 0, 3, 3, { metric: 'energy', meterIds: [meterId] }),
    P('stat', 'Costo', 6, 0, 3, 3, { metric: 'cost', meterIds: [meterId] }),
    P('stat', 'Factor de potencia', 9, 0, 3, 3, { metric: 'pf', meterIds: [meterId] }),
    P('counter', 'Totalizador', 3, 3, 4, 5, { meterIds: [meterId] }),
    P('live', 'Variables eléctricas', 7, 3, 5, 5, { meterId, vars: ['V12', 'I1', 'P', 'PF', 'Q', 'F'] }),
    P('timeseries', 'Tendencia de potencia', 0, 8, 7, 7, { metric: 'power', meterIds: [meterId] }),
    P('bar', 'Energía diaria', 7, 8, 5, 7, { metric: 'energy', meterIds: [meterId], range: '7d' }),
  ],
  calidad: () => [
    P('gauge', 'FP General', 0, 0, 3, 6, { meterId: 'MED-001', metric: 'PF' }),
    P('gauge', 'FP Pulido', 3, 0, 3, 6, { meterId: 'MED-005', metric: 'PF' }),
    P('gauge', 'THDi Pulido', 6, 0, 3, 6, { meterId: 'MED-005', metric: 'THDI' }),
    P('gauge', 'Voltaje General', 9, 0, 3, 6, { meterId: 'MED-001', metric: 'V12' }),
    P('table', 'Variables por medidor', 0, 6, 12, 8, {}),
  ],
}

export const seedDashboards = () => [
  { id: 'd-resumen', name: 'Resumen de planta', description: 'Indicadores clave del molino · energía, demanda y consumo específico', range: '24h', favorite: true, panels: dashboardTemplates.resumen(), updated: Date.now(),
    annotations: [
      { id: 'an1', t: Date.now() - 5 * 3600e3, text: 'Arranque turno B', author: 'Operador turno A' },
      { id: 'an2', t: Date.now() - 9 * 3600e3, end: Date.now() - 8 * 3600e3, text: 'Mantenimiento pulidora PA-02', author: 'Jefe de planta' },
    ] },
  { id: 'd-pulido', name: 'Pulido y Blanqueo', description: 'Área de mayor consumo de la planta', range: '24h', favorite: false, panels: dashboardTemplates.area('MED-005'), updated: Date.now(), annotations: [] },
  { id: 'd-calidad', name: 'Calidad de energía', description: 'Factor de potencia, armónicos y tensión', range: '24h', favorite: false, panels: dashboardTemplates.calidad(), updated: Date.now(), annotations: [] },
]

// ---------- Flujo de integración (estilo Node-RED) ----------
export const seedFlow = () => {
  const nodes = [
    { id: 'n-tcp', type: 'flow', position: { x: 0, y: 240 }, data: { kind: 'modbus-tcp', label: 'Gateway TCP', config: { ip: '192.168.10.0/24', port: 502, poll: 5 } } },
    { id: 'n-rtu', type: 'flow', position: { x: 0, y: 820 }, data: { kind: 'modbus-rtu', label: 'Bus RS485', config: { port: 'COM1', baud: 9600, parity: 'N', poll: 5 } } },
    { id: 'n-m1', type: 'flow', position: { x: 260, y: 0 }, data: { kind: 'device', label: 'MED-001 General', meterId: 'MED-001', config: { driverId: 'schneider-pm5560' } } },
    { id: 'n-m3', type: 'flow', position: { x: 260, y: 165 }, data: { kind: 'device', label: 'MED-003 Secado', meterId: 'MED-003', config: { driverId: 'siemens-pac3200' } } },
    { id: 'n-m5', type: 'flow', position: { x: 260, y: 330 }, data: { kind: 'device', label: 'MED-005 Pulido', meterId: 'MED-005', config: { driverId: 'janitza-umg96pa' } } },
    { id: 'n-m9', type: 'flow', position: { x: 260, y: 495 }, data: { kind: 'device', label: 'MED-009 Iluminación', meterId: 'MED-009', config: { driverId: 'generic-modbus' } } },
    { id: 'n-m2', type: 'flow', position: { x: 260, y: 660 }, data: { kind: 'device', label: 'MED-002 Recepción', meterId: 'MED-002', config: { driverId: 'eastron-sdm630' } } },
    { id: 'n-m4', type: 'flow', position: { x: 260, y: 825 }, data: { kind: 'device', label: 'MED-004 Descascarado', meterId: 'MED-004', config: { driverId: 'abb-m4m30' } } },
    { id: 'n-m8', type: 'flow', position: { x: 260, y: 990 }, data: { kind: 'device', label: 'MED-008 Compresores', meterId: 'MED-008', config: { driverId: 'schneider-pm2220' } } },
    { id: 'n-scale', type: 'flow', position: { x: 540, y: 240 }, data: { kind: 'scale', label: 'Normalizar', config: { factor: 1, offset: 0 } } },
    { id: 'n-dead', type: 'flow', position: { x: 540, y: 820 }, data: { kind: 'filter', label: 'Banda muerta 0.5 %', config: { deadband: 0.5 } } },
    { id: 'n-kwht', type: 'flow', position: { x: 820, y: 80 }, data: { kind: 'kwht', label: 'kWh / t paddy', config: { source: 'Balanza de flujo' } } },
    { id: 'n-db', type: 'flow', position: { x: 820, y: 380 }, data: { kind: 'database', label: 'Histórico', config: { retention: '5 años' } } },
    { id: 'n-dash', type: 'flow', position: { x: 820, y: 680 }, data: { kind: 'dashboard', label: 'Dashboards', config: {} } },
    { id: 'n-alarm', type: 'flow', position: { x: 820, y: 960 }, data: { kind: 'alarm', label: 'Motor de alertas', config: {} } },
  ]
  const e = (s, t) => ({ id: `e-${s}-${t}`, source: s, target: t, animated: true })
  const edges = [
    e('n-tcp', 'n-m1'), e('n-tcp', 'n-m3'), e('n-tcp', 'n-m5'), e('n-tcp', 'n-m9'),
    e('n-rtu', 'n-m2'), e('n-rtu', 'n-m4'), e('n-rtu', 'n-m8'),
    e('n-m1', 'n-scale'), e('n-m3', 'n-scale'), e('n-m5', 'n-scale'), e('n-m9', 'n-scale'),
    e('n-m2', 'n-dead'), e('n-m4', 'n-dead'), e('n-m8', 'n-dead'),
    e('n-scale', 'n-kwht'), e('n-scale', 'n-db'), e('n-dead', 'n-db'), e('n-scale', 'n-dash'), e('n-dead', 'n-dash'), e('n-dead', 'n-alarm'), e('n-scale', 'n-alarm'),
  ]
  return { nodes, edges, deployed: true }
}

// ---------- Diagrama unifilar ----------
export const seedDiagram = (meters) => {
  const nodes = [
    { id: 'u-grid', type: 'el', position: { x: 560, y: 0 }, data: { kind: 'grid', label: 'Red ENSA 10 kV' } },
    { id: 'u-tr', type: 'el', position: { x: 560, y: 110 }, data: { kind: 'transformer', label: 'TR-01 630 kVA', sub: '10 / 0.44 kV · Dyn5' } },
    { id: 'u-brk', type: 'el', position: { x: 560, y: 240 }, data: { kind: 'breaker', label: 'IG 1000 A' } },
    { id: 'u-mg', type: 'el', position: { x: 560, y: 330 }, data: { kind: 'meter', label: 'MED-001', meterId: 'MED-001' } },
    { id: 'u-bus', type: 'el', position: { x: 40, y: 450 }, data: { kind: 'bus', label: 'Barra TGBT 440 V', width: 1180, taps: 9 } },
    { id: 'u-gen', type: 'el', position: { x: 860, y: 110 }, data: { kind: 'generator', label: 'GE-01 250 kVA', sub: 'Respaldo' } },
    { id: 'u-ats', type: 'el', position: { x: 860, y: 240 }, data: { kind: 'breaker', label: 'ATS 400 A' } },
  ]
  const edges = [
    { id: 'ue1', source: 'u-grid', target: 'u-tr' }, { id: 'ue2', source: 'u-tr', target: 'u-brk' },
    { id: 'ue3', source: 'u-brk', target: 'u-mg' }, { id: 'ue4', source: 'u-mg', target: 'u-bus', targetHandle: 'in' },
    { id: 'ue5', source: 'u-gen', target: 'u-ats' },
    { id: 'ue6', source: 'u-ats', target: 'u-bus', targetHandle: 'in2', style: { strokeDasharray: '6 4' } },
  ]
  const feeders = meters.filter((m) => !m.isMain)
  const loads = { 'MED-002': 'Elevadores y prelimpia', 'MED-003': 'Secadoras SC-01/02', 'MED-004': 'Descascaradoras', 'MED-005': 'Blanqueadora / pulidoras', 'MED-006': 'Selectoras ópticas', 'MED-007': 'Envasadora', 'MED-008': 'Compresores CT-01/02', 'MED-009': 'Alumbrado y oficinas' }
  feeders.forEach((m, k) => {
    const x = 70 + k * 130
    nodes.push({ id: `u-b-${m.id}`, type: 'el', position: { x, y: 540 }, data: { kind: 'breaker', label: `Q${k + 1}` } })
    nodes.push({ id: `u-m-${m.id}`, type: 'el', position: { x, y: 630 }, data: { kind: 'meter', label: m.id, meterId: m.id } })
    nodes.push({ id: `u-l-${m.id}`, type: 'el', position: { x, y: 750 }, data: { kind: m.id === 'MED-009' ? 'load' : 'motor', label: loads[m.id] || m.name } })
    edges.push({ id: `ueb-${m.id}`, source: 'u-bus', sourceHandle: `t${k}`, target: `u-b-${m.id}` })
    edges.push({ id: `uem-${m.id}`, source: `u-b-${m.id}`, target: `u-m-${m.id}` })
    edges.push({ id: `uel-${m.id}`, source: `u-m-${m.id}`, target: `u-l-${m.id}` })
  })
  nodes.push({ id: 'u-cap-b', type: 'el', position: { x: 70 + feeders.length * 130, y: 540 }, data: { kind: 'breaker', label: 'QC' } })
  nodes.push({ id: 'u-cap', type: 'el', position: { x: 70 + feeders.length * 130, y: 640 }, data: { kind: 'capacitor', label: 'Banco 150 kvar', sub: '6 pasos automático' } })
  edges.push({ id: 'uecap', source: 'u-bus', sourceHandle: `t${feeders.length}`, target: 'u-cap-b' })
  edges.push({ id: 'uecap2', source: 'u-cap-b', target: 'u-cap' })
  return { nodes, edges }
}


// =====================================================================
// SaaS: plantas cliente, directorio de usuarios
// =====================================================================
export const SANMARTIN_META = { id: 'p-sanmartin', seedKey: '', plan: 'pro', status: 'Activo', since: '2026-04-01', renewal: '2027-04-01', contact: 'Jorge Paredes', billing: 'anual', paymentStatus: 'Al día', lastLogin: Date.now() - 2 * 3600e3 }

const FEEDERS = [
  { name: 'Recepción', areaId: 'recepcion', driverId: 'eastron-sdm630', protocol: 'Modbus RTU', nominalKw: 22, profile: 'process', pfBase: 0.91 },
  { name: 'Secado', areaId: 'secado', driverId: 'siemens-pac3200', protocol: 'Modbus TCP', nominalKw: 95, profile: 'continuous', pfBase: 0.93 },
  { name: 'Descascarado', areaId: 'descascarado', driverId: 'abb-m4m30', protocol: 'Modbus RTU', nominalKw: 68, profile: 'process', pfBase: 0.92 },
  { name: 'Pulido', areaId: 'pulido', driverId: 'janitza-umg96pa', protocol: 'Modbus TCP', nominalKw: 140, profile: 'process', pfBase: 0.87 },
  { name: 'Clasificación', areaId: 'clasificacion', driverId: 'gavazzi-em24', protocol: 'Modbus RTU', nominalKw: 32, profile: 'process', pfBase: 0.94 },
  { name: 'Envasado', areaId: 'envasado', driverId: 'circutor-cvmc10', protocol: 'Modbus RTU', nominalKw: 14, profile: 'process', pfBase: 0.9 },
  { name: 'Compresores', areaId: 'servicios', driverId: 'schneider-pm2220', protocol: 'Modbus RTU', nominalKw: 52, profile: 'compressor', pfBase: 0.88 },
  { name: 'Iluminación', areaId: 'servicios', driverId: 'generic-modbus', protocol: 'Modbus TCP', nominalKw: 15, profile: 'lighting', pfBase: 0.95 },
  { name: 'Pulido línea 2', areaId: 'pulido', driverId: 'socomec-a40', protocol: 'Modbus TCP', nominalKw: 120, profile: 'process', pfBase: 0.88 },
  { name: 'Secado 2', areaId: 'secado', driverId: 'lovato-dmg800', protocol: 'Modbus TCP', nominalKw: 80, profile: 'continuous', pfBase: 0.93 },
  { name: 'Selectoras ópticas', areaId: 'clasificacion', driverId: 'siemens-pac4200', protocol: 'Modbus TCP', nominalKw: 28, profile: 'process', pfBase: 0.95 },
  { name: 'Bombas y pozos', areaId: 'servicios', driverId: 'schneider-pm5560', protocol: 'Modbus TCP', nominalKw: 30, profile: 'compressor', pfBase: 0.9 },
]

function genFlow(meters) {
  const tcp = meters.filter((m) => m.protocol === 'Modbus TCP'), rtu = meters.filter((m) => m.protocol !== 'Modbus TCP')
  const nodes = [], edges = []
  const e = (s, t) => edges.push({ id: `e-${s}-${t}`, source: s, target: t, animated: true })
  let y = 0
  const place = (list, gw, label, kind) => {
    if (!list.length) return
    const y0 = y
    list.forEach((m) => { nodes.push({ id: `n-${m.id}`, type: 'flow', position: { x: 260, y }, data: { kind: 'device', label: `${m.id} ${m.name}`, meterId: m.id, config: { driverId: m.driverId } } }); e(gw, `n-${m.id}`); e(`n-${m.id}`, 'n-norm'); y += 165 })
    nodes.push({ id: gw, type: 'flow', position: { x: 0, y: (y0 + y - 165) / 2 }, data: { kind, label } })
  }
  place(tcp, 'n-tcp', 'Gateway TCP', 'modbus-tcp')
  place(rtu, 'n-rtu', 'Bus RS485', 'modbus-rtu')
  const mid = Math.max(0, (y - 165) / 2)
  nodes.push({ id: 'n-norm', type: 'flow', position: { x: 540, y: mid }, data: { kind: 'scale', label: 'Normalizar', config: { factor: 1 } } })
  ;[['n-db', 'database', 'Histórico'], ['n-dash', 'dashboard', 'Dashboards'], ['n-alarm', 'alarm', 'Motor de alertas']].forEach(([id, kind, label], k) => {
    nodes.push({ id, type: 'flow', position: { x: 820, y: mid - 200 + k * 200 }, data: { kind, label, config: {} } }); e('n-norm', id)
  })
  return { nodes, edges, deployed: true }
}

export function genTenant({ id, name, company, location, plan, feeders, scale = 1, status = 'Activo', since, renewal, contact, mainDriver = 'schneider-pm5560', billing = 'mensual', paymentStatus = 'Al día', lastLogin = Date.now() - 864e5 }) {
  const meters = [{ id: 'MED-001', name: 'General', desc: 'Tablero general TGBT', areaId: null, parentId: null, isMain: true, driverId: mainDriver, protocol: 'Modbus TCP', ip: '192.168.1.10', port: 502, slaveId: 1, status: 'online', nominalKw: 400, pfBase: 0.95, profile: 'process', seed: `${id}-MED-001` }]
  feeders.forEach((fi, k) => {
    const f = FEEDERS[fi], mid = `MED-${String(k + 2).padStart(3, '0')}`
    meters.push({ id: mid, name: f.name, desc: `Tablero ${f.name.toLowerCase()}`, areaId: f.areaId, parentId: 'MED-001', driverId: f.driverId, protocol: f.protocol,
      ip: f.protocol === 'Modbus TCP' ? `192.168.1.${20 + k}` : 'RS485 / COM1', port: f.protocol === 'Modbus TCP' ? 502 : 9600, slaveId: k + 2,
      status: 'online', nominalKw: Math.round(f.nominalKw * scale), pfBase: f.pfBase, profile: f.profile, seed: `${id}-${mid}` })
  })
  const used = new Set(meters.map((m) => m.areaId).filter(Boolean))
  const areas = INDUSTRY_TEMPLATES.arroz.areas.filter((a) => used.has(a.id)).map((a) => ({ ...a }))
  const contractedKw = Math.max(60, Math.round((meters.slice(1).reduce((a, m) => a + m.nominalKw, 0) * 0.95) / 10) * 10)
  const feederIds = meters.filter((m) => !m.isMain).slice(0, 4).map((m) => m.id)
  return {
    plant: { ...seedPlant(), id, seedKey: id, name, company, location, plan, status, since, renewal, contact, billing, paymentStatus, lastLogin, contractedKw, capacityTph: Math.max(2, Math.round(10 * scale)) },
    areas, meters,
    dashboards: [{ id: 'd-resumen', name: 'Resumen de planta', description: 'Indicadores clave de la planta', range: '24h', favorite: true, panels: dashboardTemplates.resumen(feederIds), annotations: [], updated: Date.now() }],
    rules: seedRules(), alerts: [], flow: genFlow(meters), diagram: seedDiagram(meters),
  }
}

export const seedTenants = () => Object.fromEntries([
  genTenant({ id: 'p-cortijo', name: 'Molino El Cortijo', company: 'Molinera El Cortijo E.I.R.L.', location: 'Sullana, Piura', plan: 'starter', feeders: [1, 3, 6, 7], scale: 0.6, since: '2026-08-15', renewal: '2026-12-15', contact: 'Miguel Ruiz', billing: 'mensual', paymentStatus: 'Pendiente', lastLogin: Date.now() - 5 * 3600e3 }),
  genTenant({ id: 'p-santarosa', name: 'Piladora Santa Rosa', company: 'Santa Rosa Agro S.A.C.', location: 'Ferreñafe, Lambayeque', plan: 'starter', feeders: [3, 6], scale: 0.4, status: 'Prueba', since: '2026-11-01', renewal: '2026-12-01', contact: 'Elena Quispe', mainDriver: 'gavazzi-em24', lastLogin: Date.now() - 3 * 864e5 }),
  genTenant({ id: 'p-andes', name: 'Arrocera Los Andes', company: 'Agroindustrial Los Andes S.A.', location: 'Jaén, Cajamarca', plan: 'pro', feeders: [0, 1, 2, 3, 4, 5, 6], scale: 0.9, since: '2026-02-01', renewal: '2027-02-01', contact: 'Raúl Campos', mainDriver: 'siemens-pac4200', billing: 'anual', paymentStatus: 'Al día', lastLogin: Date.now() - 26 * 3600e3 }),
  genTenant({ id: 'p-arrocera', name: 'Planta Pacasmayo', company: 'Corporación Arrocera del Norte S.A.', location: 'Pacasmayo, La Libertad', plan: 'enterprise', feeders: [0, 1, 9, 2, 3, 8, 4, 10, 5, 6, 7, 11], scale: 1.4, since: '2025-12-01', renewal: '2026-12-01', contact: 'Rosa Díaz', mainDriver: 'janitza-umg96pa', billing: 'anual', paymentStatus: 'Al día', lastLogin: Date.now() - 40 * 60e3 }),
].map((t) => [t.plant.id, t]))

export const seedDirectory = () => [
  { id: 'u-ronald', name: 'Ronald Salazar', email: 'ronald.salazar@beezcorp.com', role: 'superadmin', org: 'Beez Corp', plants: '*' },
  { id: 'u-andrea', name: 'Andrea Ríos', email: 'andrea.rios@beezcorp.com', role: 'superadmin', org: 'Beez Corp', plants: '*' },
  { id: 'u-carlos', name: 'Carlos Mendoza', email: 'carlos.mendoza@electrointegra.pe', role: 'integrator', org: 'ElectroIntegra S.A.C.', plants: ['p-sanmartin', 'p-cortijo', 'p-santarosa'] },
  { id: 'u-jorge', name: 'Jorge Paredes', email: 'jorge.paredes@molinosanmartin.pe', role: 'plant_admin', org: 'Agroindustrias del Norte S.A.C.', plants: ['p-sanmartin'] },
  { id: 'u-lucia', name: 'Lucía Vega', email: 'lucia.vega@molinosanmartin.pe', role: 'supervisor', org: 'Agroindustrias del Norte S.A.C.', plants: ['p-sanmartin'] },
  { id: 'u-pedro', name: 'Pedro Huamán', email: 'pedro.huaman@molinosanmartin.pe', role: 'operator', org: 'Agroindustrias del Norte S.A.C.', plants: ['p-sanmartin'] },
  { id: 'u-miguel', name: 'Miguel Ruiz', email: 'miguel.ruiz@elcortijo.pe', role: 'plant_admin', org: 'Molinera El Cortijo E.I.R.L.', plants: ['p-cortijo'] },
  { id: 'u-rosa', name: 'Rosa Díaz', email: 'rosa.diaz@arroceradelnorte.com', role: 'plant_admin', org: 'Corporación Arrocera del Norte S.A.', plants: ['p-arrocera'] },
  { id: 'u-raul', name: 'Raúl Campos', email: 'raul.campos@losandes.com.pe', role: 'plant_admin', org: 'Agroindustrial Los Andes S.A.', plants: ['p-andes'] },
]
export const DEMO_PASSWORD = 'beez2026'

export const seedRequests = () => [
  { id: 'rq1', plantId: 'p-cortijo', from: 'starter', to: 'pro', cycle: 'anual', by: 'Miguel Ruiz', email: 'miguel.ruiz@elcortijo.pe', phone: '+51 9•• ••• •••', via: 'WhatsApp', at: Date.now() - 6 * 3600e3,
    note: 'Vamos a medir la línea de pulido y los compresores, necesitamos más de 5 medidores.', status: 'pendiente' },
  { id: 'rq2', plantId: 'p-santarosa', from: 'starter', to: 'starter', cycle: 'mensual', by: 'Elena Quispe', email: 'elena.quispe@santarosaagro.pe', phone: '', via: 'Correo', at: Date.now() - 30 * 3600e3,
    note: 'Queremos pasar de prueba a contrato al terminar el mes.', status: 'pendiente' },
]
