// Catálogo de drivers de medidores soportados.
// Cada driver define protocolos y variables que expone (mapa de registros simplificado).

export const VARIABLES = {
  V12: { label: 'Voltaje L1-L2', unit: 'V', group: 'Voltaje' },
  V23: { label: 'Voltaje L2-L3', unit: 'V', group: 'Voltaje' },
  V31: { label: 'Voltaje L3-L1', unit: 'V', group: 'Voltaje' },
  I1: { label: 'Corriente L1', unit: 'A', group: 'Corriente' },
  I2: { label: 'Corriente L2', unit: 'A', group: 'Corriente' },
  I3: { label: 'Corriente L3', unit: 'A', group: 'Corriente' },
  P: { label: 'Potencia activa', unit: 'kW', group: 'Potencia' },
  Q: { label: 'Potencia reactiva', unit: 'kvar', group: 'Potencia' },
  S: { label: 'Potencia aparente', unit: 'kVA', group: 'Potencia' },
  PF: { label: 'Factor de potencia', unit: '', group: 'Potencia' },
  F: { label: 'Frecuencia', unit: 'Hz', group: 'Red' },
  E: { label: 'Energía activa', unit: 'kWh', group: 'Energía' },
  THDV: { label: 'THD Voltaje', unit: '%', group: 'Calidad' },
  THDI: { label: 'THD Corriente', unit: '%', group: 'Calidad' },
}

const ALL = Object.keys(VARIABLES)
const BASIC = ['V12', 'V23', 'V31', 'I1', 'I2', 'I3', 'P', 'Q', 'S', 'PF', 'F', 'E']

export const DRIVERS = [
  { id: 'schneider-pm5560', brand: 'Schneider Electric', model: 'PowerLogic PM5560', protocols: ['Modbus TCP', 'Modbus RTU'], accuracy: 'Clase 0.2S', vars: ALL, registers: 146 },
  { id: 'schneider-pm2220', brand: 'Schneider Electric', model: 'PowerLogic PM2220', protocols: ['Modbus RTU'], accuracy: 'Clase 0.5S', vars: ALL, registers: 98 },
  { id: 'siemens-pac3200', brand: 'Siemens', model: 'SENTRON PAC3200', protocols: ['Modbus TCP'], accuracy: 'Clase 0.5S', vars: ALL, registers: 120 },
  { id: 'siemens-pac4200', brand: 'Siemens', model: 'SENTRON PAC4200', protocols: ['Modbus TCP', 'Modbus RTU'], accuracy: 'Clase 0.2S', vars: ALL, registers: 210 },
  { id: 'abb-m4m30', brand: 'ABB', model: 'M4M 30', protocols: ['Modbus RTU', 'Modbus TCP'], accuracy: 'Clase 0.5S', vars: ALL, registers: 132 },
  { id: 'janitza-umg96pa', brand: 'Janitza', model: 'UMG 96-PA', protocols: ['Modbus TCP', 'Modbus RTU'], accuracy: 'Clase 0.5S', vars: ALL, registers: 180 },
  { id: 'gavazzi-em24', brand: 'Carlo Gavazzi', model: 'EM24-DIN', protocols: ['Modbus RTU'], accuracy: 'Clase 1', vars: BASIC, registers: 64 },
  { id: 'circutor-cvmc10', brand: 'Circutor', model: 'CVM-C10', protocols: ['Modbus RTU'], accuracy: 'Clase 0.5S', vars: ALL, registers: 88 },
  { id: 'socomec-a40', brand: 'Socomec', model: 'DIRIS A-40', protocols: ['Modbus RTU', 'Modbus TCP'], accuracy: 'Clase 0.5S', vars: ALL, registers: 140 },
  { id: 'lovato-dmg800', brand: 'Lovato', model: 'DMG800', protocols: ['Modbus RTU', 'Modbus TCP'], accuracy: 'Clase 0.5S', vars: ALL, registers: 110 },
  { id: 'eastron-sdm630', brand: 'Eastron', model: 'SDM630-Modbus', protocols: ['Modbus RTU'], accuracy: 'Clase 1', vars: BASIC, registers: 52 },
  { id: 'generic-modbus', brand: 'Genérico', model: 'Modbus TCP / RTU genérico', protocols: ['Modbus TCP', 'Modbus RTU'], accuracy: 'Definido por usuario', vars: BASIC, registers: 0, generic: true },
]

export const BRAND_COLORS = {
  'Schneider Electric': '#3dcd58',
  Siemens: '#009999',
  ABB: '#ff000f',
  Janitza: '#e30613',
  'Carlo Gavazzi': '#0067b1',
  Circutor: '#e2001a',
  Socomec: '#003e7e',
  Lovato: '#00529c',
  Eastron: '#f39200',
  Genérico: '#64748b',
}

export const driverById = (id) => DRIVERS.find((d) => d.id === id) || DRIVERS[DRIVERS.length - 1]

export const DEFAULT_REGISTER_MAP = [
  { name: 'Voltaje L1-L2', var: 'V12', address: 3019, type: 'float32', scale: 1, unit: 'V' },
  { name: 'Corriente L1', var: 'I1', address: 2999, type: 'float32', scale: 1, unit: 'A' },
  { name: 'Potencia activa total', var: 'P', address: 3059, type: 'float32', scale: 0.001, unit: 'kW' },
  { name: 'Factor de potencia', var: 'PF', address: 3083, type: 'float32', scale: 1, unit: '' },
  { name: 'Energía activa', var: 'E', address: 3203, type: 'int64', scale: 0.001, unit: 'kWh' },
]

export const brandTag = (brand) => ({ 'Schneider Electric': 'SE', Siemens: 'SI', ABB: 'ABB', Janitza: 'JZ', 'Carlo Gavazzi': 'CG', Circutor: 'CI', Socomec: 'SO', Lovato: 'LO', Eastron: 'EA', Genérico: 'MB' }[brand] || brand.slice(0, 2).toUpperCase())
